'use client'

import { use, useEffect, useMemo, useState } from 'react'
import type { ContextItem, Manifest, ManifestFile } from '@contextops/schema'
//  ⚠ `@contextops/compiler` 가 아니라 `/tag` 다. index 는 node:crypto 를 재수출해서
//    브라우저 번들에 못 들어간다 — 이유는 그 패키지의 package.json 주석에 있다.
import { traceLines, type TraceTag } from '@contextops/compiler/tag'

import { messageOf } from '../../../../../../../lib/web/api'
import { downloadPackZip, fetchItems, fetchManifest, fetchPackFile, fetchSyncStatus, type ProjectRef } from '../../../../../../../lib/web/queries'
import { useAsync } from '../../../../../../../lib/web/use-async'
import { ConfidenceChip, CtxTag, ItemStatusChip, TypeIcon } from '../../../../../../../components/chips'
import { countReceived } from '../../../../../../../components/sync'
import { EvidenceList } from '../../../../../../../components/evidence'
import { ProjectGate } from '../../../../../../../components/project-gate'
import { EmptyState, ErrorState, Skeleton } from '../../../../../../../components/states'

// =====================================================================
//  화면 7 — Pack Explorer (SPEC §9 · DESIGN_BRIEF §4 「화면 7」)
//
//  🔴 **이 화면이 P7 을 사람이 눈으로 확인하는 자리다.** 줄을 누르면 그 줄이 어느 항목에서
//     왔는지, 그 항목의 근거가 무엇인지가 오른쪽에 뜬다. 태그가 없는 줄은
//     「이 줄은 어느 항목에도 속하지 않습니다」라고 **그대로 말한다** — 감추면
//     근거 없는 줄이 있는지 없는지 화면에서 알 수 없다.
//
//  ★ 3열이다: 파일 트리 240 / 내용 flexible / 항목·근거 320 (DESIGN_BRIEF §4).
//  ★ 태그를 읽는 것은 `@contextops/compiler` 의 `traceLines` 다 — **쓰는 코드와 같은 파일**에
//    있어서 형식이 갈라질 수 없다.
//
//  ⚠ 내용은 렌더된 Markdown 이 아니라 **소스 그대로**다. 렌더하면 태그가 사라져서
//    「기기에 깔리는 것과 같은 것을 보고 있다」가 거짓이 된다.
// =====================================================================

export default function PackPage({
  params,
}: {
  params: Promise<{ team: string; project: string; semver: string }>
}) {
  const { team, project, semver } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ project: p }) => <PackExplorer project={p} semver={semver} />}
    </ProjectGate>
  )
}

function PackExplorer({ project, semver }: { project: ProjectRef; semver: string }) {
  const manifest = useAsync(() => fetchManifest(project.id, semver), [project.id, semver])
  //  항목은 오른쪽 패널이 「제목·상태·근거」를 붙이는 데 쓴다. 없어도 화면은 열린다 —
  //  그래서 실패해도 여기서 죽이지 않는다 (빈 색인으로 둔다).
  const items = useAsync(() => fetchItems(project.id, {}), [project.id])
  const [path, setPath] = useState<string | null>(null)

  if (manifest.result.state === 'loading') return <div className="card pad"><Skeleton rows={6} /></div>
  if (manifest.result.state === 'error') {
    return <div className="card"><ErrorState error={manifest.result.error} retry={manifest.reload} /></div>
  }

  const m = manifest.result.data
  //  ⚠ 처음 열리는 파일은 **CLAUDE.md** 다. 경로순 첫째(`.claude/rules/…`)를 열면
  //    사람이 Pack 의 현관이 아니라 곁방부터 보게 된다 (눈으로 확인하고 고쳤다).
  const first = m.files.find((f) => f.path === 'CLAUDE.md') ?? m.files[0]
  const current = m.files.find((f) => f.path === path) ?? first
  const byItemId = new Map<string, ContextItem>(
    items.result.state === 'ready' ? items.result.data.items.map((i) => [i.id, i]) : [],
  )

  return (
    <>
      <PackHeader project={project} manifest={m} semver={semver} />
      <div className="row items-start">
        <FileTree files={m.files} current={current} onPick={setPath} />
        {current
          ? <FileView project={project} semver={semver} file={current} manifest={m} byItemId={byItemId} />
          : <EmptyState message="이 Pack에는 파일이 없습니다." />}
      </div>
    </>
  )
}

function PackHeader({ project, manifest, semver }: { project: ProjectRef; manifest: Manifest; semver: string }) {
  return (
    <header className="row-between wrap">
      <div className="col-tight">
        <h1 className="text-section">Pack v{semver}</h1>
        <div className="row wrap meta mono">
          <span title={manifest.manifest_hash}>manifest {manifest.manifest_hash.slice(0, 8)}</span>
          <span title={manifest.snapshot_hash}>snapshot {manifest.snapshot_hash.slice(0, 8)}</span>
          <span>compiler {manifest.compiler_version}</span>
          <span>template {manifest.template_version}</span>
          <span>파일 {manifest.files.length}</span>
        </div>
      </div>
      {/* DESIGN_BRIEF §4 화면 7 「상단 우측: [Pack 다운로드 (.zip)] · 이 Pack을 받은 기기 9 / 12」 */}
      <div className="row wrap">
        <ReceivedBy project={project} manifest={manifest} />
        <DownloadZip project={project} semver={semver} />
      </div>
    </header>
  )
}

/**
 * 「이 Pack 을 받은 기기 9 / 12」 — 화면 9 와 **같은 문**(`sync-status`)을 읽고
 * 「받았다」의 기준도 같은 표(`countReceived`)다. 못 읽으면 칸을 비운다 — 숫자를 지어내지 않는다.
 */
function ReceivedBy({ project, manifest }: { project: ProjectRef; manifest: Manifest }) {
  const sync = useAsync(() => fetchSyncStatus(project.id), [project.id])
  if (sync.result.state !== 'ready') return null
  const devices = sync.result.data.devices
  return (
    <span className="meta" title="마지막 보고의 manifest 해시가 이 Pack 과 같은 기기">
      이 Pack을 받은 기기 <span className="mono ink">{countReceived(devices, manifest.manifest_hash)} / {devices.length}</span>
    </span>
  )
}

/**
 * [Pack 다운로드 (.zip)] — `GET …/packs/{semver}/zip`. 화면 9 의 `manual` 이 가리키는 길이다.
 * ★ `<a href>` 가 아니라 fetch 인 이유 — 세션 토큰은 `Authorization` 머리로만 나간다
 *   (`lib/web/api.ts`). 링크로 걸면 브라우저가 머리 없이 열어서 401 페이지를 저장한다.
 * ⚠ 파일 이름은 서버가 준 것을 그대로 쓴다 (`content-disposition`).
 */
function DownloadZip({ project, semver }: { project: ProjectRef; semver: string }) {
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; error: unknown }>({ kind: 'idle' })

  async function download(): Promise<void> {
    setState({ kind: 'busy' })
    try {
      const { blob, filename } = await downloadPackZip(project.id, semver)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setState({ kind: 'idle' })
    } catch (error) {
      setState({ kind: 'error', error })
    }
  }

  return (
    <span className="row">
      <button type="button" className="btn btn-sm" disabled={state.kind === 'busy'} onClick={() => void download()}>
        {state.kind === 'busy' ? '받는 중…' : 'Pack 다운로드 (.zip)'}
      </button>
      {state.kind === 'error' ? <span className="meta ink-bad">✕ {messageOf(state.error)}</span> : null}
    </span>
  )
}

function FileTree({
  files,
  current,
  onPick,
}: {
  files: ManifestFile[]
  current: ManifestFile | undefined
  onPick: (path: string) => void
}) {
  return (
    <nav className="card pad-sm col-tight pack-tree scroll-x">
      <span className="label">파일</span>
      {files.map((f) => (
        <button
          key={f.path}
          type="button"
          className="btn btn-sm row-between tree-item"
          aria-current={f.path === current?.path ? 'true' : undefined}
          onClick={() => onPick(f.path)}
        >
          <span className="mono">{f.path}</span>
          {/* sha 앞 4자 — 같은 파일이 버전 간에 바뀌었는지 눈으로 잡는 자리 */}
          <span className="mono ink-3 tree-sha" title={f.sha256}>{f.sha256.slice(0, 4)}</span>
        </button>
      ))}
    </nav>
  )
}

function FileView({
  project,
  semver,
  file,
  manifest,
  byItemId,
}: {
  project: ProjectRef
  semver: string
  file: ManifestFile
  manifest: Manifest
  byItemId: Map<string, ContextItem>
}) {
  const body = useAsync(() => fetchPackFile(project.id, semver, file.path), [project.id, semver, file.path])
  //  ★ 고른 줄을 **주소에 남긴다** (`#L12`) — 「이 줄이 어느 항목에서 왔나」를 링크로
  //    건네줄 수 있어야 역추적이 리뷰에서 쓰인다. 버전은 불변이라(SPEC §6) 그 링크는
  //    영원히 같은 것을 가리킨다.
  //    ⚠ 서버 렌더에는 조각이 없다 — 마운트 뒤에 읽는다 (`useEffect`).
  const [line, setLine] = useState<number | null>(null)
  useEffect(() => {
    const m = /^#L(\d+)$/.exec(window.location.hash)
    if (m) setLine(Number(m[1]) - 1)
  }, [file.path])

  function pick(index: number): void {
    setLine(index)
    //  `replaceState` 다 — 줄을 훑을 때마다 뒤로 가기 기록이 쌓이면 못 빠져나온다.
    window.history.replaceState(null, '', `#L${index + 1}`)
  }

  const lines = body.result.state === 'ready' ? body.result.data.split('\n') : []
  //  ⚠ 본문이 길다. 파일이 바뀔 때만 다시 훑는다.
  const trace = useMemo(
    () => (body.result.state === 'ready' ? traceLines(body.result.data) : new Map<number, TraceTag>()),
    [body.result],
  )
  const selectedTag = line === null ? undefined : trace.get(line)

  if (body.result.state === 'loading') return <div className="card pad grow"><Skeleton rows={10} /></div>
  if (body.result.state === 'error') {
    return <div className="card grow"><ErrorState error={body.result.error} retry={body.reload} /></div>
  }

  return (
    <>
      <section className="card grow scroll-x">
        <div className="pad-sm row-between">
          <span className="mono ink">{file.path}</span>
          <span className="meta mono" title={file.sha256}>sha256 {file.sha256.slice(0, 8)} · {file.size}B</span>
        </div>
        {/* 소스 그대로. 렌더하지 않는다 — 태그가 보여야 역추적이 눈에 보인다. */}
        <pre className="pack-body mono">
          {lines.map((text, i) => (
            <button
              key={i}
              type="button"
              className="pack-line"
              aria-selected={selectedTag !== undefined && trace.get(i) === selectedTag}
              onClick={() => pick(i)}
            >
              <span className="pack-lineno ink-3">{i + 1}</span>
              <span className="pack-linetext">{text === '' ? ' ' : text}</span>
            </button>
          ))}
        </pre>
      </section>

      <aside className="card pad col pack-side">
        <TracePanel tag={selectedTag} picked={line !== null} item={selectedTag ? byItemId.get(selectedTag.itemId) : undefined} />
        <Excluded manifest={manifest} />
      </aside>
    </>
  )
}

/** 🔴 P7 의 얼굴 — 고른 줄 → 항목 → 원문. */
function TracePanel({
  tag,
  picked,
  item,
}: {
  tag: TraceTag | undefined
  picked: boolean
  item: ContextItem | undefined
}) {
  if (!picked) {
    return (
      <div className="col-tight">
        <span className="label">역추적</span>
        <p className="meta">줄을 누르면 그 줄이 어느 항목에서 왔는지 보여줍니다.</p>
      </div>
    )
  }
  if (!tag) {
    //  🔴 감추지 않는다. 태그 없는 줄이 있다는 것 자체가 P7 의 판정 재료다.
    return (
      <div className="col-tight">
        <span className="label">역추적</span>
        <p className="ink-warn">⚠ 이 줄은 어느 항목에도 속하지 않습니다 (머리말·빈 줄).</p>
      </div>
    )
  }
  return (
    <div className="col-tight">
      <span className="label">역추적</span>
      <CtxTag itemId={tag.itemId} revision={tag.revision} />
      {item ? (
        <>
          <div className="row wrap">
            <TypeIcon type={item.type} />
            <span className="meta mono">{item.type}</span>
            <ItemStatusChip status={item.status} />
            <ConfidenceChip confidence={item.confidence} />
          </div>
          <h3>{item.title}</h3>
          <p className="ink-3">{item.body}</p>
          <span className="label">근거</span>
          <EvidenceList refs={item.source_refs} />
        </>
      ) : (
        //  항목 목록을 못 읽었거나(권한·오류) 그 사이 폐기된 항목이다.
        //  태그가 가진 것만 그대로 보여 준다 — 지어내지 않는다.
        <div className="col-tight">
          <span className="meta">이 버전의 태그가 가진 값만 표시합니다.</span>
          <span className="meta mono">conf:{tag.confidence}</span>
          {tag.src.map((s) => <span key={s} className="meta mono scroll-x">{s}</span>)}
        </div>
      )}
    </div>
  )
}

/** 제외된 항목 — 왜 Pack 에 안 들어갔는지 (DESIGN_BRIEF §4 화면 7 우측 접이식). */
function Excluded({ manifest }: { manifest: Manifest }) {
  if (manifest.excluded.length === 0) return null
  return (
    <details>
      <summary className="label">제외된 항목 {manifest.excluded.length}</summary>
      <div className="col-tight">
        {manifest.excluded.map((e) => (
          <div key={e.item_id} className="col-tight">
            <CtxTag itemId={e.item_id} />
            <span className="meta">{e.reason}</span>
          </div>
        ))}
      </div>
    </details>
  )
}
