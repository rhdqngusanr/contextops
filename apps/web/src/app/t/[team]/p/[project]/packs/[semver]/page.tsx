'use client'

import { use, useEffect, useMemo, useState } from 'react'
import type { ContextItem, Manifest, ManifestFile } from '@contextops/schema'
//  ⚠ `@contextops/compiler` 가 아니라 `/tag` 다. index 는 node:crypto 를 재수출해서
//    브라우저 번들에 못 들어간다 — 이유는 그 패키지의 package.json 주석에 있다.
import { traceLines, type TraceTag } from '@contextops/compiler/tag'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { messageOf } from '../../../../../../../lib/web/api'
import { downloadPackZip, fetchItems, fetchManifest, fetchPackFile, fetchSyncStatus, fetchVersions, type ProjectRef } from '../../../../../../../lib/web/queries'
import { useAsync } from '../../../../../../../lib/web/use-async'
import { ITEM_TYPE_LABEL, ConfidenceChip, CtxTag, ItemStatusChip, Note, VersionPill } from '../../../../../../../components/chips'
import { Jargon } from '../../../../../../../components/jargon'
import { formatBytes } from '../../../../../../../lib/web/bytes'
import { ITEM_GIST_KEY, itemGist } from '../../../../../../../lib/web/item-gist'
import { packBlocks } from '../../../../../../../lib/web/pack-blocks'
import { orderPackFiles, splitPackPath } from '../../../../../../../lib/web/pack-files'
import { countReceived } from '../../../../../../../components/sync'
import { EvidenceList } from '../../../../../../../components/evidence'
import { ProjectGate } from '../../../../../../../components/project-gate'
import { ErrorState, ScreenEmpty, Skeleton } from '../../../../../../../components/states'

// =====================================================================
//  화면 7 — Pack Explorer (SPEC §9 · DESIGN_BRIEF §4 「화면 7」)
//
//  🔴 **이 화면이 P7 을 사람이 눈으로 확인하는 자리다.** 문단(원본 보기에서는 줄)을 누르면 그것이 어느
//     항목에서 왔는지, 그 항목의 근거가 무엇인지가 오른쪽에 뜬다. 태그가 없는 문단은
//     「이 문단은 어느 항목에도 속하지 않습니다」라고 **그대로 말한다** — 감추면
//     근거 없는 줄이 있는지 없는지 화면에서 알 수 없다. 「문단/줄」 낱말은 `UNIT` 표 하나다.
//  ★ 본문이 오면 **첫 항목 문단이 골라진 채** 선다 (2026-09-11) — 누르기 전까지 오른쪽이 빈 칸이면
//    이 화면의 주장(출처가 붙는다)이 첫 3초에 안 보인다. 주소(`#L`)가 있으면 그것이 이긴다.
//
//  ★ 3열이다: 파일 트리 240 / 내용 flexible / 항목·근거 320 (DESIGN_BRIEF §4).
//  ★ 태그를 읽는 것은 `@contextops/compiler` 의 `traceLines` 다 — **쓰는 코드와 같은 파일**에
//    있어서 형식이 갈라질 수 없다.
//
//  ★ 2026-09-11 — 기본은 **문서로 읽기**다 (`packBlocks` · 항목 블록 단위로 누른다, 꼬리표는 블록 끝의 칩). [원본 보기]가 옛 줄 보기다.
//  ⚠ 원본 보기는 렌더된 Markdown 이 아니라 **소스 그대로**다. 렌더하면 태그가 사라져서
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
      {({ project: p }) => <PackExplorer base={`/t/${team}/p/${project}`} project={p} semver={semver} />}
    </ProjectGate>
  )
}

function PackExplorer({ base, project, semver }: { base: string; project: ProjectRef; semver: string }) {
  const manifest = useAsync(() => fetchManifest(project.id, semver), [project.id, semver])
  //  항목은 오른쪽 패널이 「제목·상태·근거」를 붙이는 데 쓴다. 없어도 화면은 열린다 —
  //  그래서 실패해도 여기서 죽이지 않는다 (빈 색인으로 둔다).
  const items = useAsync(() => fetchItems(project.id, {}), [project.id])
  //  「지금 보는 것이 팀이 쓰는 판인가, 옛 판인가」 — 목록(`VersionHistory`)과 같은 문을 읽는다. 못 읽으면 말하지 않는다.
  const versions = useAsync(() => fetchVersions(project.id), [project.id])
  const [path, setPath] = useState<string | null>(null)

  if (manifest.result.state === 'loading') return <div className="card pad"><Skeleton rows={6} /></div>
  if (manifest.result.state === 'error') {
    return <div className="card"><ErrorState error={manifest.result.error} retry={manifest.reload} /></div>
  }

  const m = manifest.result.data
  //  ⚠ 처음 열리는 파일은 **현관(CLAUDE.md)** 이고 트리의 맨 윗줄도 그것이다 — 둘 다 `orderPackFiles` 한 곳에서 나온다.
  //    경로순 첫째(`.claude/rules/…`)를 열면 사람이 Pack 의 현관이 아니라 곁방부터 보게 된다 (눈으로 확인하고 고쳤다).
  const ordered = orderPackFiles(m.files)
  const first = ordered[0]
  const current = ordered.find((f) => f.path === path) ?? first
  const byItemId = new Map<string, ContextItem>(
    items.result.state === 'ready' ? items.result.data.items.map((i) => [i.id, i]) : [],
  )
  //  undefined = 아직 모름/못 읽음 · null = 공식 판이 없음 · 문자열 = 공식 판의 semver. 화면은 아는 것만 말한다.
  const official = versions.result.state === 'ready'
    ? (versions.result.data.versions.find((v) => v.is_official)?.semver ?? null)
    : undefined

  return (
    <>
      <PackHeader base={base} project={project} manifest={m} semver={semver} official={official} />
      <div className="row items-start">
        <FileTree files={ordered} current={current} onPick={setPath} />
        {current
          ? <FileView project={project} semver={semver} file={current} manifest={m} byItemId={byItemId} />
          : <ScreenEmpty slot="pack.files" base={base} />}
      </div>
    </>
  )
}

function PackHeader({
  base,
  project,
  manifest,
  semver,
  official,
}: {
  base: string
  project: ProjectRef
  manifest: Manifest
  semver: string
  /** 공식 판의 semver · `null` = 공식 판 없음 · `undefined` = 아직 모름/못 읽음. */
  official: string | null | undefined
}) {
  return (
    <header className="row-between wrap">
      <div className="col-tight">
        {/* 「공식」 칩은 목록(`VersionHistory`)의 것과 같은 `VersionPill` 이다 — 목록에는 있는데 상세에서 사라졌다 (2026-09-11). `.mono` 는 서체만이라 표제 크기 그대로다. */}
        <h1 className="text-section row wrap">Pack <VersionPill semver={semver} official={official === semver} /></h1>
        {/* 파일 수가 먼저, 해시는 「확인표」「승인본」이라는 이름을 달고, 도구 버전은 맨 뒤 (2026-09-10 저녁). 값은 전부 그대로다. */}
        <div className="row wrap meta mono">
          <span>파일 {manifest.files.length}</span>
          <span title={manifest.manifest_hash}>확인표(manifest) {manifest.manifest_hash.slice(0, 8)}</span>
          <span title={manifest.snapshot_hash}>승인본(snapshot) {manifest.snapshot_hash.slice(0, 8)}</span>
          <span>도구 compiler {manifest.compiler_version} · template {manifest.template_version}</span>
        </div>
        {/* 있는 것만 말한다 — 못 읽었거나(undefined) 공식 판이 없으면(null) 아무것도 안 그린다. 링크는 잉크 밑줄 — 검정 알약은 [Pack 다운로드] 하나뿐이다. */}
        {official === semver ? (
          <p className="ink-2">지금 팀의 공식 판입니다. 팀원 기기가 받는 파일이 이 파일들입니다.</p>
        ) : typeof official === 'string' ? (
          <p className="ink-2">옛 판입니다. 지금 공식은 <a href={`${base}/packs/${official}`}>v{official}</a> 입니다.</p>
        ) : null}
      </div>
      {/* DESIGN_BRIEF §4 화면 7 「상단 우측: [Pack 다운로드 (.zip)] · 이 Pack을 받은 기기 9 / 12」 */}
      <div className="row wrap">
        <ReceivedBy project={project} manifest={manifest} />
        <DownloadZip project={project} semver={semver} />
      </div>
      {/* 사람 말 한 줄 (2026-09-11) — 세 칸이 각각 무엇인지. 기본 보기가 문단이라 「줄」이 아니다. */}
      <p className="ink-2">왼쪽은 AI 가 읽는 파일 목록, 가운데는 그 파일의 실제 내용입니다. 아무 문단이나 누르면 오른쪽에 그 문단이 어느 문서·코드에서 왔는지 뜹니다.</p>
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
    <span className="meta" title="마지막 보고 때 받은 파일이 이 판과 똑같은 기기 — 확인표(해시)로 대조">
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
      {state.kind === 'error' ? <Note tone="bad">{messageOf(state.error)}</Note> : null}
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
      {files.map((f) => {
        //  폴더는 작은 회색 윗줄, 파일 이름은 잉크 아랫줄 — 240px 에서 `arch|itecture.md` 처럼 낱말 가운데가 접혔다 (2026-09-11).
        const { dir, name } = splitPackPath(f.path)
        return (
          <button
            key={f.path}
            type="button"
            className="btn btn-sm row-between tree-item"
            aria-current={f.path === current?.path ? 'true' : undefined}
            onClick={() => onPick(f.path)}
          >
            <span className="col-tight">
              {dir === '' ? null : <span className="mono meta">{dir}</span>}
              <span className="mono ink">{name}</span>
            </span>
            {/* sha 앞 4자 — 같은 파일이 버전 간에 바뀌었는지 눈으로 잡는 자리 */}
            <span className="mono ink-3 tree-sha" title={f.sha256}>{f.sha256.slice(0, 4)}</span>
          </button>
        )
      })}
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
  //  문서로 읽기가 기본이다 — 원본(줄 번호 · 꼬리표 그대로)은 토글 (2026-09-11).
  const [mode, setMode] = useState<'doc' | 'raw'>('doc')

  const lines = body.result.state === 'ready' ? body.result.data.split('\n') : []
  //  ⚠ 본문이 길다. 파일이 바뀔 때만 다시 훑는다.
  const trace = useMemo(
    () => (body.result.state === 'ready' ? traceLines(body.result.data) : new Map<number, TraceTag>()),
    [body.result],
  )
  const selectedTag = line === null ? undefined : trace.get(line)
  const blocks = useMemo(() => (body.result.state === 'ready' ? packBlocks(body.result.data) : []), [body.result])

  useEffect(() => {
    const m = /^#L(\d+)$/.exec(window.location.hash)
    if (m) {
      setLine(Number(m[1]) - 1)
      return
    }
    //  주소가 없으면 첫 항목 문단을 골라 둔다 — 오른쪽에 그 항목·근거가 바로 뜬다. `setLine` 만이고
    //  `replaceState` 는 부르지 않는다 — 주소는 사람이 누를 때만 남긴다.
    const firstTagged = blocks.find((b) => b.tag !== null)
    if (firstTagged) setLine(firstTagged.end)
  }, [file.path, blocks])

  function pick(index: number): void {
    setLine(index)
    //  `replaceState` 다 — 줄을 훑을 때마다 뒤로 가기 기록이 쌓이면 못 빠져나온다.
    window.history.replaceState(null, '', `#L${index + 1}`)
  }

  if (body.result.state === 'loading') return <div className="card pad grow"><Skeleton rows={10} /></div>
  if (body.result.state === 'error') {
    return <div className="card grow"><ErrorState error={body.result.error} retry={body.reload} /></div>
  }

  return (
    <>
      <section className="card grow scroll-x">
        <div className="pad-sm row-between wrap">
          <span className="mono ink">{file.path}</span>
          <span className="row wrap">
            {/* 보기 토글 — 문서로(기본) / 원본(줄 번호·꼬리표). 둘 다 같은 줄 → 항목 표를 읽는다. */}
            <button type="button" className="btn btn-sm" aria-pressed={mode === 'doc'} onClick={() => setMode('doc')}>문서로 보기</button>
            <button type="button" className="btn btn-sm" aria-pressed={mode === 'raw'} onClick={() => setMode('raw')}>원본 보기</button>
            {/* 「확인값」은 머리의 「확인표」·ReceivedBy 의 「확인표(해시)로 대조」와 같은 낱말 계열 — `sha256`·`B` 는 개발자 낱말이었다 (2026-09-11). 값은 그대로. */}
            <span className="meta" title={`sha256 ${file.sha256}`}>확인값 <span className="mono">{file.sha256.slice(0, 8)}</span> · {formatBytes(file.size)}</span>
          </span>
        </div>
        {mode === 'doc' ? (
          //  문서로 — 항목 블록마다 누를 수 있다. 꼬리표(HTML 주석)는 렌더에서 빠지고 블록 끝의 칩이 대신 선다 (P7 은 그대로).
          <div className="pack-doc md">
            {blocks.map((b) => (
              b.tag === null ? (
                <div key={b.start} className="pack-block pack-block-plain">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.text}</ReactMarkdown>
                </div>
              ) : (
                <div
                  key={b.start}
                  role="button"
                  tabIndex={0}
                  className="pack-block"
                  aria-selected={selectedTag !== undefined && b.tag === selectedTag}
                  onClick={() => pick(b.end)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(b.end) } }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.text}</ReactMarkdown>
                  <CtxTag itemId={b.tag.itemId} revision={b.tag.revision} title={ctxTitle(byItemId.get(b.tag.itemId))} />
                </div>
              )
            ))}
          </div>
        ) : (
          /* 원본 그대로. 렌더하지 않는다 — 태그가 보여야 역추적이 글자로 보인다. */
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
        )}
      </section>

      <aside className="card pad col pack-side">
        <TracePanel unit={UNIT[mode]} tag={selectedTag} picked={line !== null} item={selectedTag ? byItemId.get(selectedTag.itemId) : undefined} />
        <Excluded manifest={manifest} byItemId={byItemId} />
      </aside>
    </>
  )
}

/**
 * 누르는 단위의 낱말 — 문서 보기는 문단(항목 블록), 원본 보기는 줄. 오른쪽 패널의 라벨·빈 문구·알림이 전부 이 표를 읽는다.
 * (문단을/줄을 · 문단이/줄이 · 문단은/줄은 — 둘 다 받침이라 조사가 같다.)
 */
const UNIT: Record<'doc' | 'raw', string> = { doc: '문단', raw: '줄' }

/** 꼬리표 칩의 툴팁 앞머리 — 「정책 · PSP 재시도」. 항목을 못 찾으면 없다 (지어내지 않음). 세 자리(문단 끝·출처 패널·안 들어간 항목)가 같은 것을 읽는다. */
function ctxTitle(item: ContextItem | undefined): string | undefined {
  return item === undefined ? undefined : `${ITEM_TYPE_LABEL[item.type]} · ${item.title}`
}

/** 🔴 P7 의 얼굴 — 고른 문단(줄) → 항목 → 원문. */
function TracePanel({
  unit,
  tag,
  picked,
  item,
}: {
  unit: string
  tag: TraceTag | undefined
  picked: boolean
  item: ContextItem | undefined
}) {
  if (!picked) {
    return (
      <div className="col-tight">
        <span className="label">이 {unit}의 출처</span>
        <p className="meta">{unit}을 누르면 그 {unit}이 어느 문서·코드에서 왔는지 보여줍니다.</p>
      </div>
    )
  }
  if (!tag) {
    //  🔴 감추지 않는다. 태그 없는 문단이 있다는 것 자체가 P7 의 판정 재료다.
    return (
      <div className="col-tight">
        <span className="label">이 {unit}의 출처</span>
        <Note tone="warn">이 {unit}은 어느 항목에도 속하지 않습니다 (절 머리·머리말).</Note>
      </div>
    )
  }
  return (
    <div className="col-tight">
      <span className="label">이 {unit}의 출처</span>
      <CtxTag itemId={tag.itemId} revision={tag.revision} title={ctxTitle(item)} />
      {item ? (
        <>
          <div className="row wrap">
            {/* 타입은 사람 말로 — `policy` 가 그대로 찍혀 있었다 (2026-09-10 저녁). 기호는 없다. */}
            <span className="meta">{ITEM_TYPE_LABEL[item.type]}</span>
            <ItemStatusChip status={item.status} />
            <ConfidenceChip confidence={item.confidence} />
          </div>
          <h3>{item.title}</h3>
          {itemGist(item) === item.title ? null : (
            <p className="key-line"><span className="key">{ITEM_GIST_KEY[item.type]}</span>{itemGist(item)}</p>
          )}
          <p className="ink-3">{item.body}</p>
          <Jargon text={`${item.title} ${itemGist(item)} ${item.body}`} />
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

/**
 * 제외된 항목 — 왜 Pack 에 안 들어갔는지 (DESIGN_BRIEF §4 화면 7 우측 접이식).
 * ★ 제목·종류를 앞에 세운다 — id 하나로는 **어느 규칙이** 빠졌는지 못 읽었다 (2026-09-11). 상태 칩은 「적용 중」이 아닐 때만
 *   (화면 5 문서 보기와 같은 규칙) — 답이 필요한 질문은 종류 라벨이 「왜 빠졌나」를 말하고, 초안·검토 중·폐기는 칩 글자가 말한다.
 * 🔴 이유 원문은 manifest 에 박힌 기록이라(P4 · 골든 잠금) 바꾸지도 감추지도 않는다. 항목을 못 찾으면 예전 모양 그대로 (지어내지 않음).
 */
function Excluded({ manifest, byItemId }: { manifest: Manifest; byItemId: Map<string, ContextItem> }) {
  if (manifest.excluded.length === 0) return null
  return (
    <details>
      <summary className="label">이 판에 안 들어간 항목 {manifest.excluded.length}</summary>
      <div className="col-tight">
        {manifest.excluded.map((e) => {
          const item = byItemId.get(e.item_id)
          return (
            <div key={e.item_id} className="col-tight">
              {item ? (
                <>
                  <b>{item.title}</b>
                  <span className="row wrap">
                    <span className="meta">{ITEM_TYPE_LABEL[item.type]}</span>
                    {item.status !== 'active' ? <ItemStatusChip status={item.status} /> : null}
                  </span>
                </>
              ) : null}
              <CtxTag itemId={e.item_id} title={ctxTitle(item)} />
              <span className="meta">{e.reason}</span>
            </div>
          )
        })}
      </div>
    </details>
  )
}
