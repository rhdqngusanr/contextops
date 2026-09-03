'use client'

import { use, useState } from 'react'
import {
  ITEM_STATUSES, ITEM_TYPES, type ContextItem, type ItemStatus, type ItemType,
} from '@contextops/schema'

import { ApiClientError, messageOf } from '../../../../../../lib/web/api'
import {
  fetchItems, fetchVersions, publishVersion, type ProjectRef, type VersionRow,
} from '../../../../../../lib/web/queries'
import { SEMVER_BUMPS, SEMVER_RULE, nextSemver, type SemverBump } from '../../../../../../lib/web/semver'
import { useAsync } from '../../../../../../lib/web/use-async'
import { ConfidenceChip, CtxTag, ItemStatusChip, TypeIcon, VersionPill } from '../../../../../../components/chips'
import { EvidenceList } from '../../../../../../components/evidence'
import { ProjectGate } from '../../../../../../components/project-gate'
import { EmptyState, ErrorState, Skeleton } from '../../../../../../components/states'
import { VersionHistory } from '../../../../../../components/versions'

// =====================================================================
//  화면 5 — Context (SPEC §9 · DESIGN_BRIEF §4 「화면 5」)
//
//  ★ 이 화면이 GATE 1 의 앞쪽이다: **항목을 보고 → 발행한다.** 뒤쪽(역추적)은 화면 7 이다.
//
//  🔴 **없는 숫자를 만들지 않는다.** DESIGN_BRIEF 는 상단에 「미발행 변경 7건」과
//     「semver 추천」을 적지만, 둘 다 **서버에 계산이 없다** (발행 전 snapshot 과
//     공식 snapshot 을 비교할 문이 없다 · SPEC §6 의 추천은 P3·P4 가 주인이다).
//     지어내면 「근거 없는 숫자는 화면에 없다」(DESIGN_BRIEF §2-1)가 깨진다.
//     대신 **잰 것만** 낸다: 활성 항목 수 · 공식 버전 · snapshot 해시.
//     차이는 docs/feedback/FINDINGS.md 에 적었다.
//
//  ⚠ accent 는 한 화면에 하나 — [발행하기] 뿐이다.
// =====================================================================

export default function ContextPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const { team, project } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ project: p }) => <ContextView base={`/t/${team}/p/${project}`} project={p} />}
    </ProjectGate>
  )
}

type Filter = { type?: ItemType; status?: ItemStatus; scope?: string }

function ContextView({ base, project }: { base: string; project: ProjectRef }) {
  const [filter, setFilter] = useState<Filter>({})
  const [selected, setSelected] = useState<ContextItem | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const items = useAsync(() => fetchItems(project.id, filter), [project.id, filter.type, filter.status, filter.scope])
  const versions = useAsync(() => fetchVersions(project.id), [project.id])

  const official = versions.result.state === 'ready'
    ? versions.result.data.versions.find((v) => v.is_official) ?? null
    : null

  function afterPublish(message: string) {
    setPublishing(false)
    setToast(message)
    versions.reload()
    items.reload()
  }

  return (
    <>
      <header className="row-between wrap">
        <div className="col-tight">
          <h1 className="text-section">{project.name}</h1>
          <div className="row wrap">
            {official
              ? <VersionPill semver={official.semver} hash={official.snapshot_hash} official />
              : <span className="meta">아직 발행된 버전이 없습니다.</span>}
            {items.result.state === 'ready'
              //  🔴 잰 것만 적는다 — 「미발행 변경 N건」은 계산할 문이 없다 (위 주석).
              ? <span className="meta">항목 {items.result.data.items.length}개</span>
              : null}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setPublishing(true)}
          disabled={versions.result.state !== 'ready'}
        >
          발행하기
        </button>
      </header>

      {toast ? (
        <div className="card pad-sm row-between">
          <span className="ink-ok">✓ {toast}</span>
          <button type="button" className="btn btn-sm" onClick={() => setToast(null)}>닫기</button>
        </div>
      ) : null}

      <FilterBar filter={filter} onChange={setFilter} />

      <div className="row items-start">
        <section className="card grow scroll-x">
          {items.result.state === 'loading' ? <div className="pad"><Skeleton rows={6} /></div> : null}
          {items.result.state === 'error' ? <ErrorState error={items.result.error} retry={items.reload} /> : null}
          {items.result.state === 'ready' ? (
            items.result.data.items.length === 0
              //  문구 정본은 DESIGN_BRIEF §5 다 — 여기서 지어내지 않는다.
              ? <EmptyState message="아직 항목이 없습니다. 가져오기에서 문서를 올리거나 질문에 답해보세요." />
              : <ItemTable items={items.result.data.items} selected={selected} onSelect={setSelected} />
          ) : null}
        </section>

        {selected ? <ItemDrawer item={selected} onClose={() => setSelected(null)} /> : null}
      </div>

      <section className="card">
        <div className="pad-sm"><h2 className="text-section">버전 히스토리</h2></div>
        {versions.result.state === 'loading' ? <div className="pad"><Skeleton rows={3} /></div> : null}
        {versions.result.state === 'error' ? <ErrorState error={versions.result.error} retry={versions.reload} /> : null}
        {versions.result.state === 'ready' ? (
          <VersionHistory
            versions={versions.result.data.versions}
            packHref={(semver) => `${base}/packs/${semver}`}
            emptyMessage="아직 발행된 버전이 없습니다. 항목을 확인하고 [발행하기]를 눌러보세요."
          />
        ) : null}
      </section>

      {publishing && versions.result.state === 'ready' ? (
        <PublishModal
          projectId={project.id}
          official={official}
          baseVersionId={versions.result.data.official_version_id}
          onDone={afterPublish}
          onCancel={() => setPublishing(false)}
          onStale={() => { versions.reload(); items.reload() }}
        />
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------------
//  필터 — 목록은 표이고, 선택지는 **스키마의 enum 이 그대로** 나온다.
//  ★ 왜 — 타입이 늘면 필터가 저절로 따라온다. 손으로 적으면 한 종류가 조용히 빠진다.
// ---------------------------------------------------------------------

function FilterBar({ filter, onChange }: { filter: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className="row wrap">
      <label className="row">
        <span className="label">타입</span>
        <select
          className="select"
          value={filter.type ?? ''}
          onChange={(e) => onChange({ ...filter, type: (e.target.value || undefined) as ItemType | undefined })}
        >
          <option value="">전체</option>
          {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="row">
        <span className="label">상태</span>
        <select
          className="select"
          value={filter.status ?? ''}
          onChange={(e) => onChange({ ...filter, status: (e.target.value || undefined) as ItemStatus | undefined })}
        >
          <option value="">전체</option>
          {ITEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="row">
        <span className="label">scope</span>
        {/* SPEC §5 의 `?scope=` 는 `kind` 또는 `kind:value` 다. 그대로 적게 둔다. */}
        <input
          className="input mono"
          placeholder="project · domain:billing"
          value={filter.scope ?? ''}
          onChange={(e) => onChange({ ...filter, scope: e.target.value || undefined })}
        />
      </label>
    </div>
  )
}

function ItemTable({
  items,
  selected,
  onSelect,
}: {
  items: ContextItem[]
  selected: ContextItem | null
  onSelect: (item: ContextItem) => void
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>타입</th>
          <th>제목</th>
          <th>scope</th>
          <th>상태</th>
          <th>confidence</th>
          <th>근거</th>
          <th>rev</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            aria-selected={selected?.id === item.id}
            onClick={() => onSelect(item)}
          >
            <td className="row"><TypeIcon type={item.type} /><span className="meta">{item.type}</span></td>
            <td>
              <div className="col-tight">
                <span className="ink">{item.title}</span>
                <CtxTag itemId={item.id} revision={item.revision} />
              </div>
            </td>
            <td className="mono meta">{item.scope.kind}{item.scope.value ? `:${item.scope.value}` : ''}</td>
            <td><ItemStatusChip status={item.status} /></td>
            <td><ConfidenceChip confidence={item.confidence} /></td>
            {/* 🔴 근거 수는 숫자만 두지 않는다 — 0 이면 색과 아이콘으로 같이 말한다. */}
            <td className={item.source_refs.length === 0 ? 'mono ink-warn' : 'mono'}>
              {item.source_refs.length === 0 ? '⚠ 0' : item.source_refs.length}
            </td>
            <td className="mono">{item.revision}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------
//  드로어 — 근거가 **본문 옆에** 있다 (DESIGN_BRIEF §2-1)
// ---------------------------------------------------------------------

function ItemDrawer({ item, onClose }: { item: ContextItem; onClose: () => void }) {
  return (
    <aside className="card pad col drawer">
      <div className="row-between">
        <CtxTag itemId={item.id} revision={item.revision} />
        <button type="button" className="btn btn-sm" onClick={onClose}>닫기</button>
      </div>
      <h3>{item.title}</h3>
      <div className="row wrap">
        <ItemStatusChip status={item.status} />
        <ConfidenceChip confidence={item.confidence} />
        <span className="meta mono">{item.type}</span>
      </div>
      <p className="ink-3">{item.body}</p>

      <div className="col-tight">
        <span className="label">근거</span>
        <EvidenceList refs={item.source_refs} />
      </div>

      <div className="col-tight">
        <span className="label">타입별 값</span>
        {/* 타입마다 모양이 다르다 (`ITEM_DATA`). 화면이 타입별 분기를 갖는 대신
            계약의 값을 그대로 보여 준다 — 잘못 보여 주는 것보다 낫다. */}
        <pre className="scroll-x mono meta">{JSON.stringify(item.data, null, 2)}</pre>
      </div>

      {item.tags.length > 0 ? (
        <div className="row wrap">
          {item.tags.map((t) => <span key={t} className="ctx-tag">{t}</span>)}
        </div>
      ) : null}
    </aside>
  )
}

// ---------------------------------------------------------------------
//  발행 모달 (DESIGN_BRIEF §4 화면 5 「발행 모달」)
// ---------------------------------------------------------------------

function PublishModal({
  projectId,
  official,
  baseVersionId,
  onDone,
  onCancel,
  onStale,
}: {
  projectId: string
  official: VersionRow | null
  baseVersionId: string | null
  onDone: (message: string) => void
  onCancel: () => void
  onStale: () => void
}) {
  const [bump, setBump] = useState<SemverBump>('minor')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target = nextSemver(official?.semver ?? null, bump)

  async function submit() {
    if (!target) return
    setBusy(true)
    setError(null)
    try {
      const published = await publishVersion(projectId, {
        semver: target,
        //  🔴 `base_version_id` 는 **빼면 안 되는 null** 이다 — 「기준이 없다」를 명시하지
        //     않으면 낡은 기준을 빠뜨린 요청과 구별할 수 없고 STALE_BASE 검사가 죽는다.
        base_version_id: baseVersionId,
        ...(summary.trim() ? { change_summary: summary.trim() } : {}),
      })
      onDone(`v${published.semver} 발행됨 · manifest ${published.manifest_hash.slice(0, 8)} · 파일 ${published.file_count}개`)
    } catch (err) {
      setBusy(false)
      setError(messageOf(err))
      //  409 는 「내가 본 것이 낡았다」다. 문구만 띄우고 끝내면 다시 눌러도 같은 409 다.
      if (err instanceof ApiClientError && err.code === 'STALE_BASE') onStale()
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="발행">
      <div className="card modal">
        <h2 className="text-section">발행하기</h2>
        <p className="meta">
          {official
            ? <>지금 공식은 <span className="mono">v{official.semver}</span> 입니다.</>
            : '첫 발행입니다. 기준 버전이 없습니다.'}
        </p>

        <div className="col-tight">
          <span className="label">버전 — 무엇이 바뀌었나요?</span>
          {/* ⚠ 「추천」이라고 적지 않는다. 서버가 계산하는 추천은 아직 없다. */}
          {SEMVER_BUMPS.map((kind) => {
            const value = nextSemver(official?.semver ?? null, kind)
            return (
              <label key={kind} className="row">
                <input type="radio" name="bump" checked={bump === kind} onChange={() => setBump(kind)} />
                <span className="mono ink">v{value ?? '—'}</span>
                <span className="meta">{SEMVER_RULE[kind].label} · {SEMVER_RULE[kind].why}</span>
              </label>
            )
          })}
          {official === null
            ? <span className="meta ink-4">첫 발행은 등급과 무관하게 v1.0.0 입니다 (SPEC §6).</span>
            : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="summary">변경 요약</label>
          <textarea
            id="summary"
            className="textarea"
            value={summary}
            placeholder="무엇이 왜 바뀌었는지 한두 줄"
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>

        <p className="meta">
          발행하면 연결된 기기에 <b>다음 세션부터</b> 알림이 갑니다. 실패하면 아무것도 바뀌지 않습니다.
        </p>

        {error ? <p className="meta ink-bad">✕ {error}</p> : null}

        <div className="row-between">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>취소</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || target === null}>
            {busy ? '발행 중' : `v${target ?? '—'} 발행`}
          </button>
        </div>
      </div>
    </div>
  )
}
