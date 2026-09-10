'use client'

import { use, useState } from 'react'
import {
  ITEM_STATUSES, ITEM_TYPES, SCOPE_KINDS, type ContextItemView, type ItemStatus, type ItemType, type ScopeKind,
} from '@contextops/schema'

import { writeDoor } from '../../../../../../lib/web/actor'
import { ApiClientError, messageOf, reasonOf } from '../../../../../../lib/web/api'
import {
  fetchItems, fetchVersions, publishVersion, updateItemStatus,
  type ProjectRef, type VersionRow,
} from '../../../../../../lib/web/queries'
import { OWNER_LABEL } from '../../../../../../lib/web/screens'
import { SEMVER_BUMPS, SEMVER_RULE, nextSemver, type SemverBump } from '../../../../../../lib/web/semver'
import { SCOPE_VALUE_EXAMPLE } from '../../../../../../lib/web/context-doc'
import { ITEM_GIST_KEY, itemGist } from '../../../../../../lib/web/item-gist'
import { dateText } from '../../../../../../lib/web/time'
import { useAsync } from '../../../../../../lib/web/use-async'
import {
  ConfidenceChip, CtxTag, ITEM_STATUS_CHIP, ITEM_TYPE_LABEL, ItemStatusChip, Note, SCOPE_KIND_LABEL, VersionPill,
} from '../../../../../../components/chips'
import { ContextDoc } from '../../../../../../components/context-doc'
import { Jargon } from '../../../../../../components/jargon'
import { FactLine, itemsFact } from '../../../../../../components/fact-line'
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

//  범위는 **종류와 값 두 칸**이다 (2026-09-11 · 한 칸에 `종류:값` 문법을 적게 했었다). 서버로 갈 때만 `scopeQuery` 가 합친다.
type Filter = { type?: ItemType; status?: ItemStatus; scopeKind?: ScopeKind; scopeValue?: string }

/** `?scope=` 는 `kind` 또는 `kind:value` 다 (SPEC §5). 두 칸을 한 문자열로 합치는 자리는 **여기 하나**다. */
function scopeQuery(filter: Filter): string | undefined {
  if (filter.scopeKind === undefined) return undefined
  return filter.scopeValue ? `${filter.scopeKind}:${filter.scopeValue}` : filter.scopeKind
}

/** 발행 직후 화면이 알아야 하는 것 — 문장과 [Pack 보기] 의 목적지. `publishVersion` 응답의 일부다. */
type Published = Pick<Awaited<ReturnType<typeof publishVersion>>, 'semver' | 'file_count' | 'manifest_hash'>

function ContextView({ base, project, canEdit }: { base: string; project: ProjectRef; canEdit: boolean }) {
  const [filter, setFilter] = useState<Filter>({})
  //  기본은 **문서로 보기** (2026-09-11 · 「Context 화면도 문서처럼 읽기 쉽게」) — 표는 [표로 보기] 뒤에 있다. 둘 다 같은 항목·같은 드로어다.
  const [mode, setMode] = useState<'doc' | 'table'>('doc')
  const [selected, setSelected] = useState<ContextItemView | null>(null)
  const [publishing, setPublishing] = useState(false)
  //  🔴 읽기 전용 주체가 [발행하기] 를 눌렀을 때 **모달 대신** 그 자리에 뜨는 이유 (FINDINGS 135).
  const [refused, setRefused] = useState<string | null>(null)
  //  발행 직후의 한 줄 + 그 버전으로 가는 문. 문장은 `afterPublish` 가 만든다 (모달은 결과만 넘긴다).
  const [toast, setToast] = useState<{ text: string; semver: string } | null>(null)
  //  상태를 바꾸는 중인 목적지와 실패 문구. 드로어 하나만 열리므로 항목별로 나눌 필요가 없다.
  const [statusBusy, setStatusBusy] = useState<ItemStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const items = useAsync(
    () => fetchItems(project.id, { type: filter.type, status: filter.status, scope: scopeQuery(filter) }),
    [project.id, filter.type, filter.status, filter.scopeKind, filter.scopeValue],
  )
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

  function afterPublish(published: Published) {
    setPublishing(false)
    //  「manifest」는 화면 7 과 같은 낱말 「확인표」다 (DESIGN_BRIEF §4 화면 5 · ⑭).
    setToast({
      semver: published.semver,
      text: `v${published.semver} 을 발행했습니다 · 파일 ${published.file_count}개 · 확인표 ${published.manifest_hash.slice(0, 8)}`,
    })
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
            {/* 🔴 잰 것만 적는다 — 「미발행 변경 N건」은 계산할 문이 없다 (위 주석). 항목 수는 밑의 사실 한 줄이 말한다 — 여기선 상한에 닿았을 때만. */}
            {items.result.state === 'ready' && items.result.data.items.length >= items.result.data.limit
              ? <span className="meta">{items.result.data.limit}개까지만 보여 줍니다. 거르개로 좁혀 보세요.</span>
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
      {/* 사실 한 줄 (2026-09-11) — 「30개 중 적용 중 27」이 표보다 먼저. 문장의 정본은 `fact-line.tsx`. */}
      {items.result.state === 'ready' ? <FactLine parts={itemsFact(items.result.data.items.map((i) => i.status))} /> : null}

      {/* 발행 기록 (2026-09-11) — 표 30행 밑에 있던 발행 목록을 머리로 올렸다. 「몇 번 발행했나 · 마지막이 언제인가」가
          접힌 채로 먼저 보이고, 펼치면 같은 표다. 행이 없거나 아직/못 읽었으면 접지 않고 그 자리에서 말한다. */}
      {versions.result.state === 'ready' && versions.result.data.versions.length > 0 ? (
        <details className="card">
          {/* 서버가 발행 시각 내림차순으로 준다 (`versions/route.ts`) — 첫 행이 마지막 발행이다. */}
          <summary className="pad-sm text-section">
            발행 기록 {versions.result.data.versions.length}건 · 마지막 {dateText(versions.result.data.versions[0]!.published_at)}
          </summary>
          <VersionHistory
            versions={versions.result.data.versions}
            packHref={(semver) => `${base}/packs/${semver}`}
            empty={null}
          />
        </details>
      ) : (
        <section className="card">
          <div className="pad-sm"><h2 className="text-section">발행 기록</h2></div>
          {versions.result.state === 'loading' ? <div className="pad"><Skeleton rows={3} /></div> : null}
          {versions.result.state === 'error' ? <ErrorState error={versions.result.error} retry={versions.reload} /> : null}
          {versions.result.state === 'ready' ? <ScreenEmpty slot="context.versions" base={base} /> : null}
        </section>
      )}

      {refused ? <ReadOnlyNotice reason={refused} onClose={() => setRefused(null)} /> : null}

      {toast ? (
        <div className="card pad-sm row-between wrap">
          <Note tone="ok">{toast.text}</Note>
          {/* 발행 뒤의 다음 걸음 — 결과를 어디서 보나. 낱말은 발행 기록의 [Pack 보기] 와 같다 (`versions.tsx`). */}
          <span className="row">
            <a className="btn btn-sm" href={`${base}/packs/${toast.semver}`}>Pack 보기</a>
            <button type="button" className="btn btn-sm" onClick={() => setToast(null)}>닫기</button>
          </span>
        </div>
      ) : null}

      <div className="row-between wrap">
        <FilterBar filter={filter} onChange={setFilter} />
        <span className="row wrap">
          {/* 보기 토글 — 문서로(기본) / 표로. 화면 7 과 같은 짝이다. */}
          <button type="button" className="btn btn-sm" aria-pressed={mode === 'doc'} onClick={() => setMode('doc')}>문서로 보기</button>
          <button type="button" className="btn btn-sm" aria-pressed={mode === 'table'} onClick={() => setMode('table')}>표로 보기</button>
        </span>
      </div>

      <div className="row items-start">
        <section className="card grow scroll-x">
          {items.result.state === 'loading' ? <div className="pad"><Skeleton rows={6} /></div> : null}
          {items.result.state === 'error' ? <ErrorState error={items.result.error} retry={items.reload} /> : null}
          {items.result.state === 'ready' ? (
            items.result.data.items.length === 0
              //  문구도 다음 행동도 `EMPTY_PLACES` 가 정본이다 (FINDINGS 133).
              ? <ScreenEmpty slot="context.items" base={base} />
              : mode === 'doc'
                ? <ContextDoc items={items.result.data.items} selected={selected} onSelect={setSelected} />
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
        <span className="label">종류</span>
        <select
          className="select"
          value={filter.type ?? ''}
          onChange={(e) => onChange({ ...filter, type: (e.target.value || undefined) as ItemType | undefined })}
        >
          <option value="">전체</option>
          {/* 낱말은 표에서 (`ITEM_TYPE_LABEL`) — 값(enum)은 그대로고 보이는 글자만 사람 말이다 (2026-09-11). */}
          {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABEL[t]}</option>)}
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
          {ITEM_STATUSES.map((s) => <option key={s} value={s}>{ITEM_STATUS_CHIP[s].label}</option>)}
        </select>
      </label>
      <label className="row">
        <span className="label">범위</span>
        {/* 종류는 표와 같은 낱말(`SCOPE_KIND_LABEL`)로 고르고, 값은 뒤 칸에 적는다 (2026-09-11 — 한 칸에
            `종류:값` 문법을 가르쳤고, 표에서 본 「업무」를 쳐도 아무것도 안 걸렸다). 종류를 바꾸면 값은 비운다. */}
        <select
          className="select"
          value={filter.scopeKind ?? ''}
          onChange={(e) => onChange({ ...filter, scopeKind: (e.target.value || undefined) as ScopeKind | undefined, scopeValue: undefined })}
        >
          <option value="">전체</option>
          {SCOPE_KINDS.map((k) => <option key={k} value={k}>{SCOPE_KIND_LABEL[k]}</option>)}
        </select>
      </label>
      {/* 값 칸은 값이 있는 범위에만 — `SCOPE_VALUE_EXAMPLE` 이 빈 종류(프로젝트 전체)는 칸이 없다.
          ⚠ `input-filter` 가 「예시가 안 잘리는 폭」을 준다 — 폭은 `--filter-input-ch` 가 정본이고 예시를 늘리면
             그 값도 같이 늘려야 한다 (FINDINGS 158 · design-tokens.test.ts ⑧ 이 가장 긴 예시로 잰다). */}
      {filter.scopeKind !== undefined && SCOPE_VALUE_EXAMPLE[filter.scopeKind] !== '' ? (
        <input
          className="input mono input-filter"
          aria-label={`${SCOPE_KIND_LABEL[filter.scopeKind]} 값`}
          placeholder={SCOPE_VALUE_EXAMPLE[filter.scopeKind]}
          value={filter.scopeValue ?? ''}
          onChange={(e) => onChange({ ...filter, scopeValue: e.target.value || undefined })}
        />
      ) : null}
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
          {/* 「종류」는 거르개·화면 3 과 같은 낱말이다. 「개정」 열은 뺐다 — 드로어의 꼬리표가 말한다 (2026-09-11 · 한 행에 같은 수가 두 번 섰다). */}
          <th>종류</th>
          <th>제목</th>
          <th>범위</th>
          <th>상태</th>
          <th>근거 확신</th>
          <th>근거 수</th>
          {/* DESIGN_BRIEF §4 화면 5 의 표 순서 그대로다 — 근거 수 다음이 「갱신」이다. */}
          <th>갱신</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            aria-selected={selected?.id === item.id}
            data-tone={ITEM_STATUS_CHIP[item.status].tone === 'warn' ? 'warn' : undefined}
            onClick={() => onSelect(item)}
          >
            <td><span className="meta">{ITEM_TYPE_LABEL[item.type]}</span></td>
            <td>
              <div className="col-tight">
                <span className="ink">{item.title}</span>
                {/* 행에서는 꼬리표만 — 개정 수는 드로어에 있다. */}
                <CtxTag itemId={item.id} title={item.title} />
              </div>
            </td>
            {/* 범위는 사람 말 · 값 (`SCOPE_KIND_LABEL`) — `project`·`domain:refund` 가 그대로 찍혀 있었다 (2026-09-10 저녁). 문서 보기와 같은 모양. */}
            <td className="meta">{SCOPE_KIND_LABEL[item.scope.kind]}{item.scope.value ? <span className="mono"> · {item.scope.value}</span> : null}</td>
            <td><ItemStatusChip status={item.status} /></td>
            <td><ConfidenceChip confidence={item.confidence} /></td>
            {/* 🔴 근거 수는 숫자만 두지 않는다 — 0 이면 낱말과 색으로 같이 말한다 (특수문자 없이 · 2026-09-11). */}
            <td className={item.source_refs.length === 0 ? 'ink-warn' : 'mono'}>
              {item.source_refs.length === 0 ? '없음' : item.source_refs.length}
            </td>
            <td className="mono meta">{dateText(item.updated_at)}</td>
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
        <CtxTag itemId={item.id} revision={item.revision} title={item.title} />
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
      {/* 설명은 이 항목의 본문이다 — 읽어야 하는 글자는 `ink-2` (§3 · 메타 회색이었다 2026-09-11). */}
      <p className="ink-2">{item.body}</p>

      <EvidenceList refs={item.source_refs} />

      <div className="col-tight">
        <span className="label">내용</span>
        {/* 한 줄은 타입별 표(`lib/web/item-gist.ts`)가 고른다 — 화면에 분기가 없다. 값 전체는 접어 둔다 (2026-09-10 저녁 —
            JSON 이 「타입별 값」이라는 이름으로 그대로 서 있었다). */}
        <p className="key-line"><span className="key">{ITEM_GIST_KEY[item.type]}</span>{itemGist(item)}</p>
        <Jargon text={`${item.title} ${itemGist(item)} ${item.body}`} />
        {/* 저장된 JSON 은 팀장(owner)에게만 — 게스트·member 에게 펼쳐 볼 이유가 없는 개발자 화면이고, 펼치면 「무슨 오류가 났나」로 읽힌다 (2026-09-11). */}
        {canEdit ? (
          <details>
            <summary className="meta">저장된 값 그대로 (개발자용)</summary>
            <pre className="scroll-x mono meta">{JSON.stringify(item.data, null, 2)}</pre>
          </details>
        ) : null}
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
  /** 발행 결과를 그대로 넘긴다 — 문장은 화면(`afterPublish`)이 만들고, 모달은 말하지 않는다. */
  onDone: (published: Published) => void
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
      onDone(published)
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
            ? <span className="meta">첫 발행은 무엇을 고르든 v1.0.0 입니다.</span>
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

        {error ? <p className="meta ink-bad" role="alert">{error}</p> : null}
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
