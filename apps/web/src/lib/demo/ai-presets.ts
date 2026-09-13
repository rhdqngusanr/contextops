// =====================================================================
//  🔴 게스트가 「AI 에게 지금 찾게 해 보기」로 넣어 보는 문장의 **정본 표** (SPEC §7.4 · 2026-09-13)
//
//  ★ 왜 자유 입력이 아니라 고른 문장인가 — ① 로그인 없는 문이라 아무 글이나 받으면 그 글이 우리 키를 타고 모델에 간다
//    (프롬프트 주입 · 개인정보를 붙여 넣는 사람 · 비용). ② 고른 문장은 **이 샘플 팀의 승인된 규칙과 실제로 어긋나는 것**이라,
//    버튼을 누른 사람이 「AI 가 무엇을 찾는 물건인가」를 한 번에 본다.
//  ★ 왜 여기 import 가 없나 — 서버 라우트(문장을 모델에 싣는다)와 화면(버튼 글자)이 같이 읽는다. `tenant.ts` 와 같은 이유.
//
//  ★ 문장을 하나 더하는 절차: ① 이 표에 한 줄(`id` 는 소문자·밑줄) ② `clashesWith` 는 데모 씨앗의 **적용 중** 항목 id 여야 한다 —
//    `test/api-demo-ai-once.test.ts` 가 씨앗에 그 항목이 active 로 있는지 잰다. 화면·라우트는 안 고친다.
//  ⚠ 문장은 샘플 팀에 새로 들어온 **메모의 한 줄**로 지어낸 것이다. 실제 회사·사람 이름을 넣지 마라.
//  ⚠ 모델에게 `clashesWith` 를 알려 주지 않는다 — 정답을 쥐여 주면 「AI 가 찾았다」가 거짓이 된다.
// =====================================================================

/** `packages/schema` 의 `Scope` 와 같은 모양 — 이 파일은 import 가 없어 모양만 적는다 (라우트에서 타입 검사가 맞춘다). */
type PresetScope = { readonly kind: 'project' } | { readonly kind: 'domain'; readonly value: string }

export interface DemoAiPreset {
  /** 요청 본문의 `preset` 값이자 체험 항목 id 의 꼬리 (`item_try_<id>`). */
  readonly id: string
  /** 버튼 글자 — 짧게 (375px 에서 셋이 두 줄 안에 선다). */
  readonly label: string
  /** 모델에 「바뀐 항목」으로 실리는 제목 = 새로 들어온 문장. */
  readonly title: string
  /** 그 문장이 어디서 왔다고 치는지 한 줄 — 모델도 사람도 같은 줄을 본다. */
  readonly body: string
  /** 그 메모가 미치는 범위 — 짝이 될 규칙과 범위가 겹쳐야 모델이 어긋남으로 본다 (conflict.ts 의 `scope=` 줄). */
  readonly scope: PresetScope
  /** 이 문장과 어긋나야 하는 **데모 씨앗의 적용 중 항목** — 시험이 존재를 잰다. 모델에게는 안 알려 준다. */
  readonly clashesWith: string
}

export const DEMO_AI_PRESETS = [
  {
    id: 'refund_three_days',
    label: '환불은 3영업일 안에',
    title: '환불은 접수 후 3영업일 안에 처리한다',
    body: '고객센터 운영 메모 — 금액 확인과 승인에 여유를 두려고 환불 처리 기한을 3영업일로 둔다.',
    scope: { kind: 'domain', value: 'refund' },
    clashesWith: 'item_policy_refund',
  },
  {
    id: 'float_money',
    label: '금액을 소수로 계산',
    title: '금액은 소수점 둘째 자리까지 부동소수로 계산한다',
    body: '해외 결제(달러) 준비 메모 — 환율 계산이 편하도록 금액을 소수(double)로 두고 더하고 뺀다.',
    scope: { kind: 'project' },
    clashesWith: 'item_policy_integer_money',
  },
  {
    id: 'log_card_number',
    label: '카드 번호를 로그에',
    title: '장애 조사를 위해 결제 요청 원문(카드 번호 포함)을 30일 동안 로그에 남긴다',
    body: '장애 회고 메모 — 원인을 못 찾은 건이 있어 결제 요청 본문 전체를 30일 보관하기로 했다.',
    scope: { kind: 'project' },
    clashesWith: 'item_policy_pii_log',
  },
] as const satisfies readonly DemoAiPreset[]

/** 체험 문장이 모델 앞에서 쓰는 항목 id — 실제 항목과 겹치지 않게 `item_try_` 로 시작한다 (`ItemId` 모양). */
export function demoTryItemId(presetId: string): string {
  return `item_try_${presetId}`
}

/** 이름으로 찾는다. 없으면 `undefined` — 라우트가 400 으로 말한다 (지어내지 않는다). */
export function findDemoAiPreset(id: string): DemoAiPreset | undefined {
  return DEMO_AI_PRESETS.find((p) => p.id === id)
}

/**
 * 모델이 질문 문장 안에서 항목을 **id 로** 부른 자리(`'item_try_float_money'는 …`)를 「제목」으로 바꾼다 — 화면에 id 가 서지 않게.
 *
 * ★ 왜 — 2026-09-13 production 실측에서 진짜 모델이 질문에 `item_policy_integer_money` 같은 id 를 그대로 적었다. 로그인 없는 사람
 *   (비개발자 심사위원)에게 그 낱말은 뜻이 없다. **모델이 고른 낱말은 그대로 두고 가리킨 대상의 이름만** 바꾼다 — 기록 카드도
 *   같은 예외를 적어 두었다(`lib/demo/seed.ts` 의 `RECORDED_CONFLICTS` 주석).
 * ⚠ 긴 id 부터 바꾼다 — `item_policy_refund` 를 먼저 바꾸면 `item_policy_refund_escalation` 이 「…」_escalation 으로 깨진다.
 * ⚠ 따옴표로 감싼 id 는 따옴표째 바꾸고, 표에 없는 id(앞뒤가 id 글자로 이어진 것 포함)는 건드리지 않는다 — 지어내지 않는다.
 */
export function nameItemsInQuestion(question: string, titles: ReadonlyMap<string, string>): string {
  let out = question
  for (const id of [...titles.keys()].sort((a, b) => b.length - a.length)) {
    const name = `「${titles.get(id)}」`
    //  id 는 `item_[a-z0-9_]` 모양뿐이라(`ItemId`) 정규식에 그대로 넣어도 특수문자가 없다.
    out = out
      .replace(new RegExp(`['"‘“\`]${id}['"’”\`]`, 'g'), name)
      .replace(new RegExp(`(?<![a-z0-9_])${id}(?![a-z0-9_])`, 'g'), name)
  }
  return out
}
