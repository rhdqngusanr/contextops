'use client'

import { use, useState } from 'react'
import {
  ITEM_STATUSES, ITEM_TYPES, type ContextItemView, type ItemStatus, type ItemType,
} from '@contextops/schema'

import { writeDoor } from '../../../../../../lib/web/actor'
import { ApiClientError, messageOf, reasonOf } from '../../../../../../lib/web/api'
import {
  fetchItems, fetchVersions, publishVersion, updateItemStatus,
  type ProjectRef, type VersionRow,
} from '../../../../../../lib/web/queries'
import { OWNER_LABEL } from '../../../../../../lib/web/screens'
import { SEMVER_BUMPS, SEMVER_RULE, nextSemver, type SemverBump } from '../../../../../../lib/web/semver'
import { ITEM_GIST_KEY, itemGist } from '../../../../../../lib/web/item-gist'
import { dateText } from '../../../../../../lib/web/time'
import { useAsync } from '../../../../../../lib/web/use-async'
import { ConfidenceChip, CtxTag, ITEM_STATUS_CHIP, ITEM_TYPE_LABEL, ItemStatusChip, SCOPE_KIND_LABEL, VersionPill } from '../../../../../../components/chips'
import { Jargon } from '../../../../../../components/jargon'
import { EvidenceList } from '../../../../../../components/evidence'
import { ItemStatusActions } from '../../../../../../components/item-status-actions'
import { ProjectGate } from '../../../../../../components/project-gate'
import { ErrorState, ReadOnlyNotice, ScreenEmpty, Skeleton } from '../../../../../../components/states'
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
      {({ team: t, project: p }) => (
        //  🔴 상태를 바꾸는 문은 owner 만이다 (`PATCH …/context-items/{itemId}`).
        //     화면이 그것을 알아야 member 에게 누를 때마다 403 을 내는 버튼을 안 그린다.
        <ContextView base={`/t/${team}/p/${project}`} project={p} canEdit={t.role === 'owner'} />
      )}
    </ProjectGate>
  )
}

type Filter = { type?: ItemType; status?: ItemStatus; scope?: string }

function ContextView({ base, project, canEdit }: { base: string; project: ProjectRef; canEdit: boolean }) {
  const [filter, setFilter] = useState<Filter>({})
  const [selected, setSelected] = useState<ContextItemView | null>(null)
  const [publishing, setPublishing] = useState(false)
  //  🔴 읽기 전용 주체가 [발행하기] 를 눌렀을 때 **모달 대신** 그 자리에 뜨는 이유 (FINDINGS 135).
  const [refused, setRefused] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  //  상태를 바꾸는 중인 목적지와 실패 문구. 드로어 하나만 열리므로 항목별로 나눌 필요가 없다.
  const [statusBusy, setStatusBusy] = useState<ItemStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const items = useAsync(() => fetchItems(project.id, filter), [project.id, filter.type, filter.status, filter.scope])
  const versions = useAsync(() => fetchVersions(project.id), [project.id])

  const official = versions.result.state === 'ready'
    ? versions.result.data.versions.find((v) => v.is_official) ?? null
    : null

  /**
   * 🔴 초안을 승인하는(그리고 되돌리는) 유일한 자리 (FINDINGS 79).
   * ⚠ 성공하면 **표를 다시 읽는다** — 상태 거르개가 걸려 있으면 이 행은 목록에서
   *   빠져야 하고, 「항목 N개」도 같이 움직인다. 안 읽으면 화면 4 가 배운 고장을
   *   그대로 되풀이한다 (카드가 서로 다른 두 말을 한다).
   */
  function changeStatus(item: ContextItemView, to: ItemStatus): void {
    setStatusBusy(to)
    setStatusError(null)
    updateItemStatus(project.id, item, to).then(
      (updated) => {
        setStatusBusy(null)
        setSelected(updated)
        items.reload()
      },
      (error: unknown) => {
        setStatusBusy(null)
        //  ⚠ 문구를 지어내지 않는다 — 서버가 낸 코드를 표가 사람 말로 바꾼다.
        setStatusError(messageOf(error))
      },
    )
  }

  /**
   * 🔴 발행 모달을 여는 **유일한 문**. 열기 전에 서버와 같은 표(`ACTOR_RULES.writes`)를 읽는다 —
   *   게스트에게 모달을 열어 버전·요약을 다 받은 뒤 403 을 보여 주는 것은 「할 수 있다」는 거짓말이다.
   * ⚠ 버튼은 숨기지 않는다. 막는 것은 서버다 (`lib/web/actor.ts` 머리 주석).
   */
  function openPublish(): void {
    const door = writeDoor()
    if (door.open) {
      setRefused(null)
      setPublishing(true)
      return
    }
    setRefused(door.reason)
  }

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
              ? <span className="meta">항목 {items.result.data.items.length}개{items.result.data.items.length >= items.result.data.limit ? ` · ${items.result.data.limit}개까지만 보여 줍니다 — 거르개로 좁혀 보세요` : ''}</span>
              : null}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openPublish}
          disabled={versions.result.state !== 'ready'}
        >
          발행하기
        </button>
      </header>
      {/* 사람 말 한 줄 (2026-09-10 저녁) — 이 표가 무엇인지, 무엇이 발행에 들어가는지. */}
      <p className="ink-2">팀이 승인한 목표·규칙·결정의 목록입니다. 「{ITEM_STATUS_CHIP.active.label}」인 항목만 발행에 들어갑니다.</p>

      {refused ? <ReadOnlyNotice reason={refused} onClose={() => setRefused(null)} /> : null}

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
              //  문구도 다음 행동도 `EMPTY_PLACES` 가 정본이다 (FINDINGS 133).
              ? <ScreenEmpty slot="context.items" base={base} />
              : <ItemTable items={items.result.data.items} selected={selected} onSelect={setSelected} />
          ) : null}
        </section>

        {selected ? (
          <ItemDrawer
            item={selected}
            canEdit={canEdit}
            busy={statusBusy}
            error={statusError}
            onStatusChange={(to) => changeStatus(selected, to)}
            onClose={() => { setSelected(null); setStatusError(null) }}
          />
        ) : null}
      </div>

      <section className="card">
        <div className="pad-sm"><h2 className="text-section">버전 히스토리</h2></div>
        {versions.result.state === 'loading' ? <div className="pad"><Skeleton rows={3} /></div> : null}
        {versions.result.state === 'error' ? <ErrorState error={versions.result.error} retry={versions.reload} /> : null}
        {versions.result.state === 'ready' ? (
          <VersionHistory
            versions={versions.result.data.versions}
            packHref={(semver) => `${base}/packs/${semver}`}
            empty={<ScreenEmpty slot="context.versions" base={base} />}
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
          //  승인 0개 — 모달을 닫고 **초안만** 보여 준다. 사람이 할 일이 발행 칸이 아니라 목록에 있다 (INBOX G12).
          onShowDrafts={() => { setPublishing(false); setFilter({ ...filter, status: 'draft' }) }}
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
        {/* SPEC §5 의 `?scope=` 는 `kind` 또는 `kind:value` 다. 그대로 적게 둔다.
            ⚠ `input-filter` 가 「이 문구가 안 잘리는 폭」을 준다 — 폭은 `--filter-input-ch` 가 정본이고
               문구를 늘리면 그 값도 같이 늘려야 한다 (FINDINGS 158 · design-tokens.test.ts 가 대조한다). */}
        <input
          className="input mono input-filter"
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
  items: ContextItemView[]
  selected: ContextItemView | null
  onSelect: (item: ContextItemView) => void
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>타입</th>
          <th>제목</th>
          <th>범위</th>
          <th>상태</th>
          <th>근거 확신</th>
          <th>근거</th>
          {/* DESIGN_BRIEF §4 화면 5 의 표 순서 그대로다 — 근거 수 다음이 「갱신」이다. */}
          <th>갱신</th>
          <th>개정</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            aria-selected={selected?.id === item.id}
            onClick={() => onSelect(item)}
          >
            <td><span className="meta">{ITEM_TYPE_LABEL[item.type]}</span></td>
            <td>
              <div className="col-tight">
                <span className="ink">{item.title}</span>
                <CtxTag itemId={item.id} revision={item.revision} />
              </div>
            </td>
            {/* 범위는 사람 말 + 값 (`SCOPE_KIND_LABEL`) — `project`·`domain:refund` 가 그대로 찍혀 있었다 (2026-09-10 저녁). */}
            <td className="meta">{SCOPE_KIND_LABEL[item.scope.kind]}{item.scope.value ? <span className="mono"> {item.scope.value}</span> : null}</td>
            <td><ItemStatusChip status={item.status} /></td>
            <td><ConfidenceChip confidence={item.confidence} /></td>
            {/* 🔴 근거 수는 숫자만 두지 않는다 — 0 이면 색과 아이콘으로 같이 말한다. */}
            <td className={item.source_refs.length === 0 ? 'mono ink-warn' : 'mono'}>
              {item.source_refs.length === 0 ? '⚠ 0' : item.source_refs.length}
            </td>
            <td className="mono meta">{dateText(item.updated_at)}</td>
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

function ItemDrawer({
  item,
  canEdit,
  busy,
  error,
  onStatusChange,
  onClose,
}: {
  item: ContextItemView
  canEdit: boolean
  busy: ItemStatus | null
  error: string | null
  onStatusChange: (to: ItemStatus) => void
  onClose: () => void
}) {
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
        <span className="meta">{ITEM_TYPE_LABEL[item.type]}</span>
        {/* 🔴 **담당자를 이름으로 그린다** (FINDINGS 168) — `owner_id`(uuid)만 있을 때는
            화면이 그릴 것이 없어서 그 칸이 「저장은 되는데 아무도 안 읽는」 상태였다.
            ⚠ 없으면 **자리 자체를 안 그린다** — 「담당 —」 은 없는 것을 있는 척한다. */}
        {item.owner === undefined ? null : (
          <span className="meta">{OWNER_LABEL} {item.owner.name}</span>
        )}
      </div>
      <p className="ink-3">{item.body}</p>

      <div className="col-tight">
        <span className="label">근거</span>
        <EvidenceList refs={item.source_refs} />
      </div>

      <div className="col-tight">
        <span className="label">내용</span>
        {/* 한 줄은 타입별 표(`lib/web/item-gist.ts`)가 고른다 — 화면에 분기가 없다. 값 전체는 접어 둔다 (2026-09-10 저녁 —
            JSON 이 「타입별 값」이라는 이름으로 그대로 서 있었다). */}
        <p className="key-line"><span className="key">{ITEM_GIST_KEY[item.type]}</span>{itemGist(item)}</p>
        <Jargon text={`${item.title} ${itemGist(item)} ${item.body}`} />
        <details>
          <summary className="meta">값 전체 보기</summary>
          <pre className="scroll-x mono meta">{JSON.stringify(item.data, null, 2)}</pre>
        </details>
      </div>

      {item.tags.length > 0 ? (
        <div className="row wrap">
          {item.tags.map((t) => <span key={t} className="ctx-tag">{t}</span>)}
        </div>
      ) : null}

      {/* 🔴 owner 가 아니면 문을 그리지 않는다 — 누를 때마다 403 인 버튼을 두지 않는다.
          ⚠ 그래도 「무엇이 있어야 바뀌나」는 말해 준다. 아무 말 없이 비면 사람은
             화면이 덜 만들어진 줄 안다. */}
      {canEdit ? (
        <ItemStatusActions
          state={{ status: item.status, busy, error }}
          onChange={onStatusChange}
        />
      ) : (
        //  🔴 게스트에게 「owner 만」은 거짓말이다 — 로그인해도 샘플 팀에서는 못 한다 (FINDINGS 121).
        //     문구는 서버와 같은 표에서 온다 (`writeDoor`). member 에게는 여전히 「owner 만」이 맞다.
        <span className="meta">{editCaption()}</span>
      )}
    </aside>
  )
}

/** 드로어에 문이 없을 때 적는 한 줄 — 읽기 전용 주체면 그 이유, 아니면 등급. */
function editCaption(): string {
  const door = writeDoor()
  return door.open ? '상태를 바꾸는 것은 팀장만 할 수 있습니다.' : door.reason
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
  onShowDrafts,
}: {
  projectId: string
  official: VersionRow | null
  baseVersionId: string | null
  onDone: (message: string) => void
  onCancel: () => void
  onStale: () => void
  /** 승인된 항목이 0개라 발행이 거절됐을 때 — 모달 대신 **초안 목록**으로 (INBOX G12). */
  onShowDrafts: () => void
}) {
  const [bump, setBump] = useState<SemverBump>('minor')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  //  🔴 「입력한 내용을 다시 확인해주세요」로 끝내지 않는다 — 원인이 `EMPTY_SNAPSHOT` 이면 다음 걸음은
  //     이 모달 안에 없다. 버튼 하나가 초안 목록으로 데려간다 (문장의 정본은 `REASON_HINT`).
  const [emptySnapshot, setEmptySnapshot] = useState(false)

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
      //  승인 0개 — 다시 눌러도 같은 400 이다. 할 일은 목록에 있다.
      setEmptySnapshot(err instanceof ApiClientError && reasonOf(err.details) === 'EMPTY_SNAPSHOT')
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
            ? <span className="meta">첫 발행은 등급과 무관하게 v1.0.0 입니다 (SPEC §6).</span>
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
        {emptySnapshot ? (
          <button type="button" className="btn btn-sm" onClick={onShowDrafts}>초안 보기</button>
        ) : null}

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
