import { ITEM_TYPES, SCOPE_KINDS, SOURCE_REF_KINDS } from '@contextops/schema'
import { ENFORCEMENT_LABEL, scopePackPath, srcKindOf, type TraceTag } from '@contextops/compiler'

// =====================================================================
//  🔴 **「데모 Pack 이 이 표의 몇 갈래를 실제로 보여 주나」의 정본 표** (FINDINGS 89·93·94)
//
//  ★ 왜 이 파일이 따로 있나 — 「표가 살아 있나」와 「데모가 그걸 보여 주나」는 **다른
//    질문**이다. 앞의 것은 `compiler/test/liveness.test.ts` 가 여러 바퀴 초록으로 쟀고,
//    그 사이 심사자가 읽는 종이에는 `enforcement` 가 한 갈래, 근거가 두 갈래,
//    scope 가 두 갈래뿐이었다. **뒤의 것은 아무도 안 세고 있었다.**
//
//  ★ 왜 축마다 상수를 만들지 않았나 — 89 가 `PACK_ENFORCEMENT_MIN` 하나를 만들었고,
//    93·94 를 같은 식으로 하면 상수가 넷이 되고 관통에 검사가 네 벌 복사된다.
//    **축을 하나 더하는 것이 「이 표에 한 줄」이어야 한다** (CLAUDE.md 「확장은 표에 한 줄」).
//
//  ★ 새 축을 더하는 절차 — 두 곳이다:
//    ① 아래 `PACK_COVERAGE` 에 한 줄 (`all`·`min`·`why`·`shown`)
//    ② 필요하면 `PackView` 에 재료 한 칸 (지금은 본문·경로·태그·타입 넷이면 충분하다)
//    관통(`walkthrough-publish.ts`)은 고칠 것이 없다 — 이 표를 **읽기만** 한다.
//
//  ⚠ **`all` 을 여기 손으로 적지 마라.** 정본 패키지의 배열을 그대로 쓴다 — 베끼면
//    표가 늘었을 때 이 검사가 옛 갈래 수를 기준으로 계속 초록을 낸다.
//  ⚠ **`min` 을 「전 갈래」로 잡지 마라.** 픽스처의 모든 줄은 원문까지 역추적된다(P7).
//    원문이 없는 갈래를 채우려면 문장을 지어내야 하고 그 순간 P7 이 깨진다.
//    각 줄의 `why` 에 **「지금 몇 갈래이고 왜 그 수인가」**를 적는다.
// =====================================================================

/** 관통이 받아 든 Pack — 갈래를 세는 재료는 여기서만 온다. */
export type PackView = {
  /** 받은 Pack 본문 전부. **사람이 읽는 종이** 그 자체다 */
  texts: readonly string[]
  /** Manifest 에 실린 파일 경로 전부 */
  paths: readonly string[]
  /** 본문에서 되읽은 역추적 태그 전부 (`parseTraceTag`) */
  tags: readonly TraceTag[]
  /** 항목 id → 그 항목의 타입. 씨앗이 아는 것을 그대로 넘긴다 */
  typeOf: ReadonlyMap<string, string>
}

export type CoverageAxis = {
  /** 표의 전 갈래. **정본 패키지에서 그대로 온다** */
  readonly all: readonly string[]
  /** 종이에 서야 하는 최소 갈래 수 */
  readonly min: number
  /** 🔴 왜 그 수인가 · 전 갈래가 아니면 왜 아닌가 */
  readonly why: string
  /** Pack 에서 실제로 보이는 갈래 */
  readonly shown: (pack: PackView) => ReadonlySet<string>
}

/**
 * `scopePackPath(kind, '*')` 를 파일 이름 대조용 정규식으로 바꾼다.
 * ⚠ 별표만 자리를 비우고 나머지는 전부 글자 그대로다 — `.` 이 아무 글자나 되면
 *   `domain-a.md` 패턴이 `domainXamd` 같은 것도 맞다고 답한다.
 */
function pathMatcher(pattern: string): RegExp {
  const parts = pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, (c) => `\\${c}`))
  return new RegExp(`^${parts.join('[^/]+')}$`)
}

/** 태그 조각들에서 근거 종류를 뽑는다 — 접두사를 아는 곳은 `srcKindOf` 하나다. */
function srcKinds(tags: readonly TraceTag[]): Set<string> {
  const seen = new Set<string>()
  for (const tag of tags) {
    for (const fragment of tag.src) {
      const kind = srcKindOf(fragment)
      if (kind) seen.add(kind)
    }
  }
  return seen
}

export const PACK_COVERAGE = {
  '강제 수단(enforcement)': {
    all: Object.keys(ENFORCEMENT_LABEL),
    min: 2,
    //  ★ 왜 2 인가 — 1 이면 「이 정책을 무엇이 강제하나」가 상수처럼 읽힌다. 사람은 같은
    //    말이 모든 줄에 붙어 있으면 그게 값이 아니라 장식인 줄 안다. 둘부터 값으로 읽힌다.
    //  ★ 왜 4 가 아닌가 — `permission`·`none` 은 goals.md 에 근거가 없다. 넷을 다 보이려면
    //    **문서를 먼저** 늘려야 한다 (SPEC §10.1 이 그 문서의 정본이다 · FINDINGS 89).
    why: '지금 2 (review · hook). permission·none 은 goals.md 에 근거가 없어 뺐다 — 문서를 먼저 늘려야 한다',
    shown: (pack) => new Set(
      (Object.keys(ENFORCEMENT_LABEL) as (keyof typeof ENFORCEMENT_LABEL)[])
        .filter((k) => pack.texts.some((t) => t.includes(ENFORCEMENT_LABEL[k]))),
    ),
  },

  '근거 종류(SourceRef)': {
    all: SOURCE_REF_KINDS,
    min: SOURCE_REF_KINDS.length,
    //  ★ 왜 전 갈래인가 — 넷 다 **지어내지 않고** 픽스처에서 나온다: 문서(goals.md) ·
    //    코드(`src/payment/retry.ts`) · 제안(발행이 붙인다) · 사람의 답변(씨앗 질문).
    //    하나라도 빠지면 「이 줄이 어디서 왔나」의 갈래 하나가 종이에 없다는 뜻이다.
    why: '지금 4 (전부). 넷 다 픽스처에 진짜 근거가 있다 — 하나라도 빠지면 그건 데모의 구멍이다',
    shown: (pack) => srcKinds(pack.tags),
  },

  '적용 범위(scope.kind)': {
    all: SCOPE_KINDS,
    min: SCOPE_KINDS.length,
    //  ★ 왜 전 갈래인가 — 셋이 **서로 다른 Pack 파일**을 만든다 (CLAUDE.md ·
    //    domain-{slug}.md · scoped-{slug}.md). 하나가 비면 파일 갈래 하나가 데모에
    //    통째로 없는 것이고, 「이 규칙은 여기에만 걸린다」가 종이에 안 나온다.
    //  ⚠ 파일 이름을 여기 적지 않는다 — `scopePackPath()` 가 partition 표에서 낸다.
    why: '지금 3 (전부). 셋이 서로 다른 Pack 파일을 만든다 — 하나가 비면 파일 갈래가 통째로 없다',
    shown: (pack) => new Set(
      SCOPE_KINDS.filter((kind) => {
        const re = pathMatcher(scopePackPath(kind, '*'))
        return pack.paths.some((p) => re.test(p))
      }),
    ),
  },

  '항목 종류(ItemType)': {
    all: ITEM_TYPES,
    min: 5,
    //  🔴 지금 서는 것은 다섯이다 — mission · goal · roadmap · policy · constraint.
    //     안 서는 다섯 중 `architecture`·`domain`·`open_question` 은 goals.md §5·§6·§7 에
    //     **원문이 이미 있는데 씨앗이 그 절을 건너뛴다.** `adr`·`workflow` 는 원문이 없다.
    //     이 줄의 `min` 을 올리는 것이 FINDINGS 94 다 — 픽스처를 늘리고 여기 숫자를 올려라.
    //  ⚠ 10 으로 올리지 마라. `adr`·`workflow` 는 문서를 먼저 늘려야 한다 (89 의 규칙).
    why: '지금 5. architecture·domain·open_question 은 원문이 goals.md 에 있다 (FINDINGS 94) · adr·workflow 는 원문이 없다',
    shown: (pack) => {
      const seen = new Set<string>()
      for (const tag of pack.tags) {
        const type = pack.typeOf.get(tag.itemId)
        if (type !== undefined) seen.add(type)
      }
      return seen
    },
  },
} as const satisfies Record<string, CoverageAxis>

export type CoverageReport = {
  axis: string
  shown: string[]
  missing: string[]
  ok: boolean
  min: number
  total: number
}

/** 표를 한 번 돌며 축마다 「몇 갈래가 종이에 섰나」를 낸다. 판정은 부르는 쪽이 찍는다. */
export function measureCoverage(pack: PackView): CoverageReport[] {
  return Object.entries(PACK_COVERAGE).map(([axis, spec]) => {
    const shown = spec.shown(pack)
    return {
      axis,
      shown: spec.all.filter((v) => shown.has(v)),
      missing: spec.all.filter((v) => !shown.has(v)),
      ok: shown.size >= spec.min,
      min: spec.min,
      total: spec.all.length,
    }
  })
}
