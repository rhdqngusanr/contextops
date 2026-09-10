import { Fragment, type CSSProperties } from 'react'

import { ReplayFrames, ShotsManifest } from '@contextops/schema'

import replayRecording from '../../../../fixtures/replay/sync.json'
import shotsManifest from '../../public/shots/manifest.json'
import { ART } from '../lib/web/art'
import { DEMO_TOUR } from '../lib/web/tour'
import { SITE } from '../lib/web/site'
import styles from './landing.module.css'
import { TerminalReplay } from './terminal-replay'

// =====================================================================
//  화면 1 — 랜딩 `/` (SPEC §9 표 1행 · DESIGN_BRIEF §4 「화면 1」)
//
//  목표: 심사위원이 10초 안에 문제를 이해하고, 클릭 하나로 샘플 팀에 들어간다.
//  스크롤 없이 첫 화면에 A(헤드라인) · B(Before/After) · C(둘러보기 버튼)가 보인다.
//
//  🔴 **정적이다** (SPEC §9 표의 「상태」 칸). 세션을 읽지 않는다 — 읽는 순간 랜딩이
//     로그인 상태에 따라 두 모양이 되고, 시크릿 창에서 보는 첫 화면이 갈린다 (GATE 3).
//     그래서 이 파일에는 `'use client'` 도 `readSession` 도 없다. 시험이 그것을 센다.
//
//  🔴 **문구는 전부 아래 표에 산다.** JSX 는 표를 읽기만 한다.
//     ★ 왜 — 시험이 「Before/After 의 답이 실제 Pack 규칙과 같은가」를 재려면 문장을
//       들여올 수 있어야 한다. JSX 안에 박힌 문장은 아무도 못 잰다.
//
//  🔴 **Before/After 는 paylab 픽스처다** (SPEC §10.1 · DESIGN_BRIEF 화면 1 의 주의 두 줄).
//     DESIGN_BRIEF 의 「북스택」 문구는 목업이다. 여기 실린 것은 픽스처의 「의도된
//     어긋남」 첫째 — 문서는 「5회 · 지수 백오프」, 코드는 「3회 · 500ms 고정」 — 이고,
//     After 의 답은 **게스트가 `/demo` 에서 실제로 보는 v1.1.0 의 그 줄**(`item_policy_retry`)
//     이다. v1.1.0 은 승인된 제안이 그 항목을 고친 판이라(`src/lib/demo/seed-demo.ts` 의
//     `DEMO_PROPOSALS`), 씨앗의 v1.0.0 문장을 적으면 첫 화면과 앱이 다른 문장을 말한다.
//     `test/web-landing.test.ts` 가 그 표와 `src/lib/demo/seed.ts` 의 `paylabDrafts()` 에 대조한다 —
//     픽스처가 바뀌면 랜딩이 거짓말을 하기 전에 시험이 빨개진다.
//
//  ⚠ **없는 것은 안 만든다** — 이 저장소의 규칙이다 (누르면 아무 일도 안 하는 버튼 금지):
//    · [2분 영상 보기] — 영상이 없다 (PLAN P6). 영상이 생기는 바퀴에 버튼 한 줄이다.
//      터미널 재생(§10.4)은 있다 — `TERMINAL_REPLAY` · 녹화는 관통이 남긴 실제 출력이다.
//
//  🔴 **제품 화면은 손으로 만들지 않는다** (FINDINGS 131 · B-2 `PRODUCT_TOUR`).
//     그림 목록의 정본은 이 파일이 **아니라** `apps/web/e2e/plan.ts` 의 `PUBLISHED` 이고,
//     관통의 `shots` → `shotcopy` 단계가 진짜 화면을 찍어 `public/shots/manifest.json` 에
//     적는다. 이 파일은 그 manifest 를 **읽기만** 한다.
//     ⛔ **파일 이름을 여기 적지 마라** — 적는 순간 계획에 한 줄을 더해도 랜딩이 안 따라오고,
//       「그림이 낡았는데 아무도 모르는」 상태가 그대로 돌아온다.
//     ★ 새 화면을 첫 화면에 싣는 법: `e2e/plan.ts` 의 `PUBLISHED` 에 **한 줄** → 관통 한 번.
//    · GitHub · Known limitations 링크 — **있다** (80바퀴 · `SUBMISSION_IDENTITY` · FINDINGS 122).
//      설치 첫 줄의 마켓플레이스 이름도 **자리표시자가 아니다** (FINDINGS 140 · 2026-09-08) —
//      저장소 뿌리에 `.claude-plugin/marketplace.json` 을 두었고, 이름은
//      `SUBMISSION_IDENTITY.marketplaceRef`(= 저장소 URL 에서 파생)에서 온다.
//      🙋 **새 PC 에서 add → install → /contextops:init 까지 밟는 것**은 아직이다 (PLAN P5 둘째 행).
//
//  ⚠ accent 는 이 화면에 **하나**다 — [샘플 팀으로 둘러보기]. 다른 버튼은 outline.
// =====================================================================

/** A. 헤드라인 (DESIGN_BRIEF 화면 1 A). */
export const LANDING_HEAD = {
  //  🔴 머리 세 문장의 정본은 `lib/web/site.ts` 다 — 링크 미리보기(`<head>` · og.png)와 같은 문장이어야 한다 (INBOX H2).
  eyebrow: SITE.eyebrow,
  title: SITE.tagline,
  subtitle: SITE.description,
  note: '팀장은 브라우저에서 15분, 개발자는 명령 한 줄.',
  /** 🔴 이 화면의 유일한 accent. `/demo` 가 게스트 세션을 받아 샘플 팀으로 보낸다. */
  cta: { label: '샘플 팀으로 둘러보기', href: '/demo' },
  login: { label: '로그인', href: '/login' },
} as const

/**
 * B. Before/After — paylab 픽스처의 「의도된 어긋남」 첫째 (SPEC §10.1).
 *
 * ⚠ `after.text` 는 데모 v1.1.0 이 `item_policy_retry` 에 싣는 `data.rule`(승인된 제안의
 *   문장 · `DEMO_PROPOSALS`)과 **글자 그대로** 같아야 한다 (시험이 잰다). 랜딩이 「팀은
 *   이렇게 답한다」고 보여 주는 문장이 실제 Pack 에 없는 문장이면, 그건 첫 화면에서부터
 *   근거 없는 줄이다 (P7 의 정신).
 */
export const BEFORE_AFTER = {
  //  2026-09-10 사용자: 「문구가 안 와닿는다」 — 카드 위에 한 줄로 **무엇을 보고 있는지**부터 말한다.
  caption: '같은 질문을 같은 팀 두 사람의 Claude Code 에 던졌습니다.',
  //  PSP = 결제사. 심사위원이 결제 개발자가 아니어도 읽히게 괄호로 푼다 (2026-09-10).
  prompt: '결제사(PSP) 호출이 실패하면 몇 번까지 재시도해?',
  //  작은 이름표들 — 모양이 아니라 낱말이라 표에 산다 (질문 줄 · 「쉬운 말로」 줄 · 근거 목록).
  askKey: '질문',
  plainKey: '쉬운 말로',
  //  ★ 2026-09-10 저녁 — 「이런 것들의 디자인이 너무 부족하고 대충 만든 것 같다」. 답은 대화의 한 줄이 됐다:
  //    누가(머리글자) · 무엇을 읽고(`read`) · 어디서(`source`) · 답(`text`) · 「쉬운 말로」(`plain` — **횟수가 먼저, 굵게**).
  //    `plain` 은 README 「실제로 이렇게 달라집니다」의 같은 줄과 같은 말이다 — 비개발자가 A·B·After 를 숫자로 견준다.
  before: {
    tag: '지금',
    title: '사람마다 다른 답',
    answers: [
      {
        who: 'A',
        name: 'A 의 Claude Code',
        read: '팀 문서를 읽었습니다',
        source: 'paylab-docs/goals.md §3.1',
        text: '문서에는 최대 5회, 지수 백오프로 재시도하라고 되어 있습니다. 고정 간격은 금지입니다.',
        plain: { count: '5번까지', how: '기다리는 시간을 점점 늘려 가며' },
      },
      {
        who: 'B',
        name: 'B 의 Claude Code',
        read: '실제 코드를 읽었습니다',
        source: 'paylab-api/src/payment/retry.ts:11',
        text: '코드에는 MAX_RETRY = 3, 간격은 500ms 고정으로 되어 있습니다.',
        plain: { count: '3번까지', how: '0.5초 간격으로 똑같이' },
      },
    ],
    foot: 'A 는 문서를, B 는 코드를 읽었습니다. 둘 다 틀리지 않았는데 팀은 둘로 갈립니다.',
  },
  after: {
    tag: 'ContextOps',
    /** 버전은 데모가 실제로 발행하는 판이다 — 시험이 `seed-demo.ts` 와 대조한다. */
    title: 'Team Context v1.1.0',
    name: 'A · B · C 의 Claude Code',
    read: '팀장이 승인한 규칙을 읽었습니다',
    /** 씨앗 초안의 id — Pack 의 역추적 태그(`<!-- ctx:… -->`)에 그대로 실리는 값이다. */
    itemId: 'item_policy_retry',
    text: 'PSP 호출은 최대 5회까지 재시도한다. 간격은 지수 백오프(0.5s·1s·2s·4s·8s)이고, '
      + '재시도 대상은 타임아웃과 5xx 뿐이다.',
    plain: { count: '5번까지', how: '기다리는 시간은 0.5초 → 8초로 늘리고, 응답이 없거나(타임아웃) 상대 서버가 고장 났을 때(5xx)만' },
    detail: 'must · 강제: 리뷰에서 본다',
    evidenceKey: '근거',
    evidence: ['paylab-docs/goals.md §3.1', 'paylab-api/src/payment/retry.ts:11–14', '팀장 승인'],
    foot: '팀장이 승인한 이 한 문장을 A·B·C 모두 같은 버전으로 받습니다.',
  },
} as const

/**
 * B-2. 제품 화면 (FINDINGS 131 · DESIGN_BRIEF 화면 1 B-2).
 *
 * 🔴 **그림은 관통이 방금 찍은 진짜 화면이다.** 목록·대체텍스트·크기는 전부
 *   `public/shots/manifest.json` 에서 오고, 그 파일은 `shotcopy` 단계가 쓴다.
 *   여기 표에는 **절 제목과 설명**만 있다 — 파일 이름은 한 자도 없다.
 */
export const PRODUCT_TOUR = {
  //  2026-09-10 사용자: 「데모 예시가 안 와닿고 심사위원이 3분에 이해 못 할 것 같다」 — 이 절이 **3분 코스**가 됐다.
  //  제목·설명은 코스의 정본(`lib/web/tour.ts`)에서 오고, 캡처 넉 장은 코스의 네 걸음과 같은 화면이다 (시험이 대조).
  title: DEMO_TOUR.title,
  lead: `${DEMO_TOUR.lead} 위의 [샘플 팀으로 둘러보기]를 누르면 같은 순서로 안내가 붙습니다.`,
  foot: '캡처는 검증 시나리오(tools/walkthrough.ps1)의 shots 단계가 매번 다시 찍습니다 — 낡은 그림이 남지 않습니다.',
} as const

/**
 * 랜딩이 실을 캡처. 모듈을 읽을 때 한 번 계약으로 판다 — 모양이 어긋난 manifest 는
 * **빌드에서** 죽는다 (렌더에서가 아니라). `REPLAY_FRAMES` 와 같은 자리다.
 */
export const PRODUCT_SHOTS = ShotsManifest.parse(shotsManifest).shots

/** C-1. 왜 git 으로 안 되나요 — 세 문장 카드 + 한 줄. */
export const WHY_NOT_GIT = {
  //  심사위원이 제일 먼저 던지는 질문을 제목으로 — 그 답이 세 줄이다.
  title: '「CLAUDE.md 를 git 에 올리면 되지 않나요?」',
  //  낱말 풀이 — 제목에 개발자 낱말이 둘이다. 비개발자 심사위원이 여기서 멈추지 않게 (2026-09-10 저녁 · 「밑의 절도 이해되게」).
  glossary: [
    { term: 'CLAUDE.md', means: '개발자의 AI(Claude Code)가 일을 시작하기 전에 읽는 팀 규칙 파일' },
    { term: 'git', means: '코드를 보관하고 「무엇이 바뀌었나」를 남기는 저장소' },
    { term: '레포', means: '저장소 하나 — 보통 서비스 하나에 하나씩 있습니다' },
  ],
  exampleKey: '예를 들면',
  cards: [
    {
      //  2026-09-10 사용자: 「팀장이 git 을 안 쓴다」는 문장이 웃기다 — 사람을 깎는 말이 아니라 **결정이 나는 자리**를 말한다.
      head: '결정은 레포 밖에서 납니다',
      body: '목표·정책은 문서와 회의에서 정해집니다. 그걸 CLAUDE.md 로 옮기는 일은 개발자 각자의 손에 맡겨져 있어서, 사람마다 다른 파일이 됩니다.',
      //  「예를 들면」 — 주장 하나에 장면 하나. 위의 Before/After 와 같은 재시도 이야기라 새로 외울 것이 없다.
      example: '「재시도는 5번까지」는 회의에서 정해졌는데, 그걸 파일로 옮긴 사람은 A 뿐입니다. B 의 파일에는 그 줄이 없습니다.',
    },
    {
      head: '한 팀의 규칙은 여러 레포에 걸칩니다',
      body: '결제 팀의 재시도 규칙은 API·웹훅·정산 레포에 똑같이 적용돼야 합니다. 레포마다 복사해 두면 어느 날 하나만 바뀝니다.',
      example: '결제 API·웹훅·정산, 저장소 셋에 같은 규칙을 복사해 두면 하나가 바뀌어도 나머지 둘은 모릅니다.',
    },
    {
      head: 'git 은 「왜」를 남기지 않습니다',
      body: 'diff 는 무엇이 바뀌었는지만 남깁니다. 누가 어떤 근거로 정했는지가 없으면, AI 도 사람도 그 규칙을 믿을 이유가 없습니다.',
      example: '「3 → 5 로 바뀜」은 남지만, 누가 어떤 회의에서 왜 그렇게 정했는지는 남지 않습니다.',
    },
  ],
  line: 'ContextOps 는 흩어진 결정을 팀장이 승인한 한 벌로 만들고, 모든 팀원의 AI 에 같은 버전으로 꽂습니다.',
} as const

/** C-2. 어떻게 동작하나요 — 3단계. ⚠ 썸네일은 없다 (production 캡처가 아직 없다 · PLAN P5 둘째 행). */
export const HOW_IT_WORKS = {
  title: '어떻게 동작하나요',
  lead: '팀장은 브라우저에서 세 단계, 개발자는 명령 한 줄입니다.',
  plainKey: '쉬운 말로',
  //  걸음마다 「쉬운 말로」 한 줄(README 「세 걸음」과 같은 말)이 먼저 서고, 제품의 문장(`body`)은 그 밑에 작게.
  //  `actors` 는 누가·어디서 — 팀장은 브라우저, AI 는 후보만, 발행 뒤는 AI 없음, 개발자의 AI 는 Claude Code 안 (P3·P4·P5).
  steps: [
    {
      head: '가져와서 정리한다',
      body: '목표 문서·회의록을 붙여 넣거나 질문 10개에 답하면, AI 가 규칙·마일스톤 후보를 뽑고 서로 어긋난 것을 찾아 질문으로 만듭니다. 결정은 사람이 합니다.',
      plain: '흩어진 문서·회의·코드에서 팀이 지켜야 할 것을 모읍니다. 서로 어긋난 것은 카드로 물어봅니다.',
      actors: ['팀장 · 브라우저', 'AI · 후보와 질문만'],
    },
    {
      head: '승인해서 발행한다',
      body: '팀장이 승인한 항목만 CLAUDE.md 한 벌로 묶여 버전이 붙습니다. 모든 팀원의 Claude Code 가 같은 버전을 받고, 받은 파일이 정말 같은지 확인표(해시)로 검증됩니다. 승인 뒤에는 AI 가 끼어들지 않습니다.',
      plain: '팀장이 승인한 것만, 모든 팀원의 AI 에 같은 버전으로 갑니다. 이제 누구에게 물어도 같은 답이 나옵니다.',
      actors: ['팀장 · 브라우저', 'AI 없음 · 정해진 규칙대로'],
    },
    {
      head: '진행이 근거와 함께 보인다',
      body: '개발자의 AI 가 작업을 마치면 어떤 파일을 고쳤는지 보고합니다. 로드맵은 마일스톤 단위로 채워지고, 완료 판정은 사람이 합니다.',
      plain: '각자의 AI 가 일을 마칠 때마다 「어느 계획의 무엇이었는지」를 근거와 함께 보고합니다. 그래서 계획이 어디까지 왔는지 보입니다.',
      actors: ['개발자의 AI · Claude Code 안', '완료 확인 · 사람'],
    },
  ],
} as const

/**
 * C-2b. AI 는 어디까지 쓰나 — 심사 기준 「AI 활용 적절성」에 대한 랜딩의 답 (2026-09-10 · 사용자 「문구가 안 와닿는다」).
 * ⚠ 쓰는 곳·안 쓰는 곳이 전부 실제 코드다: 구조화·충돌 탐지는 `lib/ai`(P3) · 발행·배포는 LLM 0 (P4) · 훅은 보고만 (SPEC §8.6).
 */
export const AI_USE = {
  title: 'AI 는 어디까지 쓰나요',
  lead: 'AI 는 후보와 질문을 만듭니다. 결정은 사람이 하고, 배포는 AI 없이 정해진 규칙대로 돕니다.',
  /** 손바뀜 줄의 이름표 — `who` 값 하나가 여기 한 줄이다. */
  who: { ai: 'AI', none: 'AI 없음', human: '사람' },
  //  줄마다 「누가 → 누가」 손바뀜이 먼저 선다 (2026-09-10 저녁). 둘째 자리는 늘 사람이거나 「AI 없음」 — 결정은 사람 · 승인 뒤 LLM 0 (P4).
  rows: [
    {
      head: '문서를 항목 후보로 바꿉니다',
      body: '붙여 넣은 문서에서 규칙·마일스톤 후보를 뽑고 근거 위치를 같이 답니다 (서버쪽 모델은 Gemini). 후보는 후보일 뿐, 승인 버튼은 사람 몫입니다.',
      hand: [{ who: 'ai', does: '후보를 뽑고 근거 위치를 단다' }, { who: 'human', does: '승인 버튼을 누른다' }],
    },
    {
      head: '서로 어긋난 결정을 찾아 묻습니다',
      body: '문서끼리, 또는 문서와 코드가 다르게 말하면 충돌 카드로 올립니다. 「A 가 맞다 · B 가 맞다 · 보류」는 사람이 고릅니다.',
      hand: [{ who: 'ai', does: '충돌 카드로 질문을 올린다' }, { who: 'human', does: 'A 가 맞다 · B 가 맞다 · 보류를 고른다' }],
    },
    {
      head: '승인 뒤에는 쓰지 않습니다',
      body: '발행과 배포는 AI 없이 정해진 규칙대로만 돕니다. 같은 승인본은 언제나 똑같은 파일이 되고, 어느 기기가 무엇을 받았는지 확인표(해시)로 검증됩니다.',
      hand: [{ who: 'human', does: '발행 버튼을 누른다' }, { who: 'none', does: '정해진 규칙대로만 파일을 만들고 나눈다' }],
    },
    {
      head: '개발자의 AI 는 보고만 합니다',
      body: '작업 끝에 어떤 경로를 고쳤는지 근거를 올립니다. 완료를 스스로 선언하지 못하고, 사람이 확인해야 완료가 됩니다.',
      hand: [{ who: 'ai', does: '고친 파일 경로를 근거로 올린다' }, { who: 'human', does: '완료를 확인한다' }],
    },
  ],
} as const

/**
 * C-3. 터미널 재생 (SPEC §10.4 · DESIGN_BRIEF 화면 1 C-3).
 *
 * 🔴 **줄은 전부 녹화에서 온다** — `fixtures/replay/sync.json` 은 관통 sync 단계가 배포되는
 *   플러그인을 진짜 소켓으로 돌려 남긴 stdout 이고, 관통이 매번 다시 녹화해 대조한다.
 *   여기 표에는 **설명과 마일스톤**만 있다. 마일스톤은 씨앗(`src/lib/demo/seed.ts` 의 `paylabDrafts()`)의
 *   PL-M1 과 글자 그대로 같아야 한다 — 시험이 잰다. 오른쪽 패널이 「근거 n / 3」이라고 말하려면
 *   그 3 이 실제 Pack 의 done_when 이어야 한다 (P7).
 * ⚠ DESIGN_BRIEF 의 「BS-M2 1/3 → 2/3」은 목업 문구다. 녹화는 paylab 이고 0/3 → 1/3 이다 —
 *   보고 하나가 실제로 그만큼만 바꾼다.
 */
export const TERMINAL_REPLAY = {
  title: '개발자 쪽에서는 이렇게 보입니다',
  lead: 'Claude Code 를 열면 설치된 플러그인이 새 버전을 알리고, /contextops:sync 한 줄로 받습니다. '
    + '작업을 마치면 AI 가 근거와 함께 보고하고, 오른쪽 Roadmap 이 같은 순간 바뀝니다.',
  //  낱말 풀이 — 검은 창을 처음 보는 심사위원을 위해 (2026-09-10 저녁).
  glossary: [
    { term: 'Claude Code', means: '개발자가 쓰는 AI 코딩 도구 — 터미널(검은 창) 안에서 돕니다' },
    { term: '플러그인', means: 'Claude Code 에 끼우는 ContextOps 의 작은 부품 — 새 버전을 알리고 한 줄로 받게 합니다' },
    { term: 'Roadmap', means: '계획이 어디까지 왔는지 근거와 함께 보는 화면' },
  ],
  //  🔴 「무슨 일이 일어나나」 넷 — 녹화(`fixtures/replay/sync.json`)가 실제로 찍은 숫자만 말한다: v0.9.0 → v1.0.0 · 파일 8개 · 근거 0/3 → 1/3.
  //    시험이 녹화 본문과 대조한다 — 녹화가 다시 찍혀 숫자가 바뀌면 여기가 빨개진다.
  legendTitle: '무슨 일이 일어나나',
  legend: [
    '개발자가 Claude Code 를 열면 플러그인이 알립니다 — 지금 적용된 판은 v0.9.0, 팀의 공식 판은 v1.0.0, 파일 8개.',
    '/contextops:sync 한 줄로 받습니다 — 파일 8개가 v1.0.0 으로 바뀌고, 원본은 백업에 남고, 서버에는 「적용됨」이라고 보고합니다.',
    '작업을 마친 AI 가 /contextops:progress 로 보고합니다 — 어느 마일스톤의 어느 조건을, 어떤 파일 몇 번째 줄이 근거인지.',
    '오른쪽 Roadmap 의 「근거 0 / 3」이 「1 / 3」이 됩니다. 완료 확인은 사람이 합니다 — AI 가 스스로 완료를 선언하지 않습니다.',
  ],
  source: '배포되는 플러그인을 실제로 돌려 남긴 출력입니다 (fixtures/replay/sync.json). '
    + '사이의 작업은 생략했고, 타이핑과 줄 사이 간격만 읽을 수 있게 늘렸습니다.',
  milestone: {
    id: 'PL-M1',
    title: '재시도·타임아웃 정리',
    done_when: [
      'PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다',
      '모든 외부 호출에 타임아웃이 걸려 있다',
      '재시도 횟수와 간격이 설정값으로 빠져 있다',
    ],
  },
} as const

/** 녹화는 모듈을 읽을 때 한 번 계약으로 판다 — 모양이 어긋난 파일은 빌드에서 죽는다 (렌더에서가 아니라). */
export const REPLAY_FRAMES = ReplayFrames.parse(replayRecording)

/**
 * C-4. 서버가 아는 것 / 모르는 것 — P1 의 얼굴 (SPEC §0.1 · DESIGN_BRIEF 화면 1 C-4).
 * ⚠ 「모르는 것」 열은 P1 이 적은 넷(코드 본문·secret·개인 Memory·대화)을 **전부** 덮어야
 *   한다 — 시험이 센다. 하나라도 빠지면 첫 화면이 제품의 첫 주장을 반만 말한다.
 */
export const TRUST_BOUNDARY = {
  title: '서버는 코드를 보지 않습니다',
  //  칸마다 「쉬운 말로」 한 줄 (README 「우리 서버가 보는 것 / 절대 못 보는 것」의 같은 줄 · 2026-09-10 저녁). 줄 수는 `rows` 와 같다 — 시험이 센다.
  knows: {
    head: '서버가 받는 것',
    rows: [
      '팀·프로젝트 이름과 ID',
      '정리된 항목 (제목·규칙·마일스톤)',
      '팀장이 직접 등록한 문서 원문',
      '파일 경로 · 줄 번호 · 커밋 번호',
      '버전 · 확인표(해시)',
    ],
    plain: [
      '팀 이름과 프로젝트 이름',
      '정리된 규칙 문장',
      '팀장이 손수 붙여 넣은 것만',
      '「몇 번째 줄」이라는 위치 표시만',
      '몇 판인지 · 내용이 같은지',
    ],
  },
  unknown: {
    head: '절대 받지 않는 것',
    rows: [
      '저장소 코드 본문',
      '환경변수 · 비밀값(secret)',
      '개인 설정 파일(CLAUDE.local.md)',
      'Claude 의 개인 메모리(Auto Memory)',
      'Claude 대화 내용',
    ],
    plain: [
      '소스 코드 그 자체',
      '비밀번호·API 키 등 접속 정보',
      '개인이 따로 쓰는 메모',
      'AI 가 혼자 쌓아 둔 기억',
      'AI 와 주고받은 말 전부',
    ],
  },
  foot: '올라가는 것은 정해진 스키마를 통과한 항목뿐입니다. 코드 본문·비밀값·개인 메모리·대화는 어떤 경우에도 서버로 가지 않고, 훅은 파일을 바꾸지 않습니다.',
} as const

/**
 * 🔴 제출 정체 — **공개 저장소 URL 과 제출 팀명의 정본은 여기 하나다** (INBOX 2026-09-06 · FINDINGS 122).
 *
 * 랜딩 푸터(`LANDING_FOOT`)는 이 값을 읽고, README 머리 · `docs/SUBMISSION.md` 의 🙋 표 는 마크다운이라
 * import 를 못 하므로 **글자 그대로** 적되 `test/readme.test.ts` 가 세 곳이 같은 문자열인지 센다.
 * 값을 바꿀 때는 여기 한 줄 → 시험이 빨개지는 문서를 따라 고친다. 문서에서 먼저 고치면 갈린다.
 *
 * ⚠ 팀명은 사람이 적어 준 그대로다 — 띄어쓰기를 넣거나 빼지 마라.
 * ⚠ 아직 없는 값(production URL · 영상)은 여기 두지 않는다 — 없는 것을 있는 것처럼 적지 않는다.
 */
export const SUBMISSION_IDENTITY = {
  team: '퇴직했는데저좀이직시켜주세요',
  repoUrl: 'https://github.com/rhdqngusanr/contextops',
  /**
   * `claude plugin marketplace add` 가 받는 이름 — **저장소 URL 에서 파생시킨다** (FINDINGS 140).
   * 손으로 또 적으면 저장소를 옮길 때 한쪽만 바뀌고, 그러면 설치 첫 줄이 조용히 실패한다.
   * ⚠ 이 이름이 먹히려면 저장소 뿌리에 `.claude-plugin/marketplace.json` 이 있어야 한다
   *   (`plugins[0].source` → `./plugin/contextops`). 없으면 「목록을 못 찾는다」로 끝난다.
   */
  get marketplaceRef(): string {
    return new URL(this.repoUrl).pathname.slice(1)
  },
  /** Known limitations 는 앱에 페이지를 또 만들지 않는다 — 같은 문서가 두 곳이 된다. 저장소의 그 파일로 건다. */
  limitsPath: 'docs/KNOWN_LIMITATIONS.md',
} as const

/**
 * C-5. 개발자 설치 — **지금 실제로 도는 명령**만 적는다 (SPEC §8.3 · `docs/evidence/2026-09-03-plugin`).
 * ⚠ `npx contextops` 는 아직 없다 (npm 에 올린 적이 없다). 없는 명령을 적으면 첫 시도가
 *   실패하고, 그건 「고장」으로 읽힌다.
 * 🔴 첫 줄의 저장소 이름은 `SUBMISSION_IDENTITY.marketplaceRef` 에서 온다 (FINDINGS 140) —
 *   자리표시자가 아니다. 플러그인 `setup` 이 찍는 같은 줄은 웹을 import 할 수 없어 글자로
 *   적혀 있고, `test/readme.test.ts` 가 둘이 같은 문자열인지 센다.
 * ⚠ `/contextops:…` 는 `plugin/contextops/skills/<이름>` 이 있어야 한다 (시험이 센다).
 */
export const INSTALL_STEPS = {
  title: '설치는 명령 두 줄, 그 다음은 Claude Code 안에서',
  /**
   * 🔴 Node 가 있어야 한다 — 훅(`scripts/*.mjs`)과 CLI 번들이 `node` 로 돈다. 네이티브 Claude Code 만 깐 사람은
   *   이 줄이 없으면 **매 세션 훅 오류 줄**을 본다 (2026-09-09 감사). 숫자의 정본은 `.nvmrc` 이고
   *   `test/readme.test.ts` 가 같은 값인지 잰다 (번들 target 도 그 값이다 · `plugin/contextops/scripts/build.ts`).
   */
  requires: 'Node 22 이상이 필요합니다 (node -v) — 훅과 CLI 가 Node 로 돕니다.',
  //  비개발자 심사위원이 「나도 뭘 깔아야 하나」에서 멈추지 않게 — 첫 줄이 이것이다 (2026-09-10 저녁).
  who: '개발자만 합니다. 팀장은 설치할 것이 없습니다 — 브라우저로 끝납니다.',
  //  `where` 는 그 줄을 어디에 치는가 — 터미널인지 Claude Code 안인지. 틀리면 첫 시도가 실패한다 (시험이 Skill 줄과 대조).
  lines: [
    { where: '터미널', cmd: `claude plugin marketplace add ${SUBMISSION_IDENTITY.marketplaceRef}`, note: '플러그인 저장소를 등록합니다' },
    { where: '터미널', cmd: 'claude plugin install contextops', note: '훅·Skill·CLI 가 함께 깔립니다' },
    //  ⚠ 셋째 줄은 Claude Code 안의 Skill 이다 — 터미널 명령이 아니다. 예전의 `node "$CLAUDE_PLUGIN_ROOT/…"` 는
    //    사용자 터미널에 없는 변수라 그대로 치면 「파일이 없다」였다. Skill 이 그 경로를 채운다.
    { where: 'Claude Code 안', cmd: '/contextops:setup <Sync 화면이 준 인자>', note: 'Claude Code 안에서. 웹의 Sync → [기기 추가] 가 이 줄을 통째로 줍니다 — 토큰은 저장소 밖에 둡니다' },
    { where: 'Claude Code 안', cmd: '/contextops:init', note: 'Claude Code 안에서 한 번. 저장소를 훑어 첫 항목을 올립니다' },
  ],
  foot: '그 다음은 팀장이 웹에서 승인하고, 개발자는 /contextops:sync 로 받습니다.',
} as const

/** 푸터 (DESIGN_BRIEF 화면 1 C-6: 제출 팀명 · GitHub 링크 · Known limitations 링크). 값은 `SUBMISSION_IDENTITY` 하나에서 온다. */
export const LANDING_FOOT = {
  brand: 'ContextOps',
  event: 'Wanted AI Championship 2026 출품작',
  team: { label: '팀', name: SUBMISSION_IDENTITY.team },
  github: { label: 'GitHub', href: SUBMISSION_IDENTITY.repoUrl },
  limits: { label: 'Known limitations', href: `${SUBMISSION_IDENTITY.repoUrl}/blob/main/${SUBMISSION_IDENTITY.limitsPath}` },
  health: { label: '서버 상태', href: '/api/v1/health' },
  //  개인정보 처리방침 — 문장의 정본은 `lib/web/privacy.ts` (INBOX H4). 앱 안 링크라 rel 이 없다.
  privacy: { label: '개인정보 처리방침', href: '/privacy' },
} as const

/** 문장 하나에 `/contextops:x` 가 여럿일 수 있다 — Skill 이름을 전부 뽑는다 (시험이 쓴다). */
export function skillNamesIn(text: string): string[] {
  return [...text.matchAll(/\/contextops:([a-z-]+)/g)].map((m) => m[1] as string)
}

// ---------------------------------------------------------------------
//  아래는 모양이다 — 문구는 위 표에서만 온다. 절의 번호(01…06)는 `Landing` 이 차례대로 매긴다.
//  ★ 왜 이 모양인가 — DESIGN_BRIEF §3 「테마」(2026-09-10 · Taste anti-slop 지침): 비대칭 격자 · 정의 목록 ·
//    번호 목록 · 아이콘 없음 · 왼쪽 정렬 · 검정 알약 하나. 「눈썹 칩 + 표제 + 부제 + 버튼 둘」 틀을 쓰지 않는다.
// ---------------------------------------------------------------------

/** 브랜드 마크 — `public/icon.svg` 와 같은 그림(검정 둥근 사각 + 확인 표시). 색은 토큰이라 SVG 속성에도 var 로 적는다. */
function BrandMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--ink)" />
      <path d="M19 33.5l8.5 8.5L45 24" fill="none" stroke="var(--on-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 절 머리 — 작은 모노 번호 · 표제체 제목 · (있으면) 한 줄 설명. id 는 `aria-labelledby` 가 읽는다. */
function SectionHead({ id, index, title, lead }: { id: string; index: string; title: string; lead?: string }) {
  return (
    <div className={styles.sectionHead}>
      <span className={styles.index} aria-hidden="true">{index}</span>
      <h2 id={id}>{title}</h2>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
    </div>
  )
}

function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>{LANDING_HEAD.eyebrow}</span>
        <h1 id="landing-title" className={styles.title}>{LANDING_HEAD.title}</h1>
        <p className={styles.subtitle}>{LANDING_HEAD.subtitle}</p>
        {/* ⚠ 버튼은 하나다. [2분 영상 보기] 는 영상이 생기면 여기 outline 한 줄이고,
            [로그인] 은 머리글에 이미 있다 — 덤프에서 「로그인 로그인」으로 겹쳐 보였다.
            ⚠ 마크업은 시험이 글자 그대로 잰다 — 클래스도 안의 글자도 더하지 마라. 화살표는 CSS 다. */}
        <div className={styles.ctaRow}>
          <a className="btn btn-primary" href={LANDING_HEAD.cta.href}>{LANDING_HEAD.cta.label}</a>
          <span className={styles.note}>{LANDING_HEAD.note}</span>
        </div>
      </div>
      <figure className={styles.heroArt}>
        {/* 그림의 정본은 `lib/web/art.ts` — 사람이 고른 생성 이미지다 (코드로 그린 그림이 아니다 · DESIGN_BRIEF §3 「그림」).
            첫 화면이라 즉시 받는다. 폭·높이는 정본이 준다 — 늦게 떠도 자리가 안 튄다. */}
        <img src={ART.hero.src} width={ART.hero.width} height={ART.hero.height} alt={ART.hero.alt} loading="eager" />
        {/* 스톱모션 프레임 — 바닥 그림(완성 장면) 위에 차례로 뜬다. 차례·박자는 CSS(`hero-stop` · nth-child 지연)가 정한다.
            장식 반복이라 alt 없이 aria-hidden 이다. 움직임 줄이기에서는 전부 사라지고 바닥만 남는다. */}
        {ART.heroFrames.map((f) => (
          <img key={f.src} className={styles.heroFrame} src={f.src} width={f.width} height={f.height} alt="" aria-hidden="true" loading="eager" />
        ))}
      </figure>
    </section>
  )
}

function BeforeAfter() {
  const { caption, prompt, askKey, before, after } = BEFORE_AFTER
  return (
    <section className={styles.compareBand} aria-labelledby="landing-compare">
      <h2 id="landing-compare" className={styles.compareCaption}>{caption}</h2>

      {/* 질문은 한 줄, **한 번** — 두 세계가 같은 질문을 받았다는 것이 이 그림의 전제다 (시험이 한 번을 센다).
          한글 질문이라 모노가 아니다 — 모노는 왼쪽의 작은 이름표뿐. */}
      <div className={styles.ask}>
        <span className={styles.askKey}>{askKey}</span>
        <p className={styles.askText}>{prompt}</p>
      </div>

      <div className={styles.compare}>
        <article className={`${styles.pane} ${styles.paneBefore}`} aria-label={`${before.tag} — ${before.title}`}>
          <header className={styles.paneHead}>
            <span className={styles.paneTag}>{before.tag}</span>
            <h3 className={styles.paneTitle}>{before.title}</h3>
          </header>
          <div className={styles.thread}>
            {before.answers.map((a) => (
              <div key={a.who} className={styles.reply}>
                <span className={styles.who} aria-hidden="true">{a.who}</span>
                <div className={styles.replyBody}>
                  <div className={styles.replyMeta}>
                    <span className={styles.replyName}>{a.name}</span>
                    <span className={styles.replyRead}>{a.read}</span>
                    <code className={styles.replySource}>{a.source}</code>
                  </div>
                  <p className={styles.replyText}>{a.text}</p>
                  <Plain plain={a.plain} />
                </div>
              </div>
            ))}
          </div>
          <div className={styles.paneFoot}><span>{before.foot}</span></div>
        </article>

        {/* 읽는 방향 — 좁은 폭에서는 CSS 가 돌려 「↓」가 된다. 장식이라 읽지 않는다. */}
        <span className={styles.turn} aria-hidden="true">→</span>

        <article className={`${styles.pane} ${styles.paneAfter}`} aria-label={`${after.tag} — ${after.title}`}>
          <header className={styles.paneHead}>
            <span className={styles.paneTag}>{after.tag}</span>
            <h3 className={styles.paneTitle}>{after.title}</h3>
          </header>
          <div className={styles.thread}>
            <div className={styles.reply}>
              <span className={`${styles.who} ${styles.whoAll}`} aria-hidden="true">✓</span>
              <div className={styles.replyBody}>
                <div className={styles.replyMeta}>
                  <span className={styles.replyName}>{after.name}</span>
                  <span className={styles.replyRead}>{after.read}</span>
                </div>
                <p className={`${styles.replyText} ${styles.replyTextBig}`}>{after.text}</p>
                <Plain plain={after.plain} />
                <span className={styles.severity}>{after.detail}</span>
              </div>
            </div>
          </div>
          {/* 근거는 작아도 전부 적는다 — P7 의 얼굴이다. */}
          <div className={styles.evidence}>
            <span className={styles.evidenceKey}>{after.evidenceKey}</span>
            <ul className={styles.evidenceList}>
              {after.evidence.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
          <div className={styles.paneFoot}>
            <span>{after.foot}</span>
            <span className="ctx-tag">ctx:{after.itemId}</span>
          </div>
        </article>
      </div>
    </section>
  )
}

/** 「쉬운 말로」 한 줄 — 횟수가 먼저, 굵게. A·B·After 를 견주는 눈은 이 숫자만 본다 (README 의 같은 줄과 같은 말). */
function Plain({ plain }: { plain: { count: string; how: string } }) {
  return (
    <p className={styles.plain}>
      <span className={styles.plainKey}>{BEFORE_AFTER.plainKey}</span>
      <strong className={styles.plainCount}>{plain.count}</strong>
      <span>{plain.how}</span>
    </p>
  )
}

function ProductShots({ index }: { index: string }) {
  return (
    <section className={`${styles.section} ${styles.sectionShots}`} aria-labelledby="landing-shots">
      <SectionHead id="landing-shots" index={index} title={PRODUCT_TOUR.title} lead={PRODUCT_TOUR.lead} />
      {/* 2×2 — 코스의 네 걸음이 네 칸이다 (2026-09-10 저녁 · 「큰 한 장 + 작은 장들」은 첫 장 밑이 비고 넷째 장이 홀로 남았다).
          카드 안의 카드가 아니다 — 그림 한 장 + 그 밑에 번호 동그라미·제목·볼 것·주소. */}
      <div className={styles.shotRow}>
        {PRODUCT_SHOTS.map((shot, i) => {
          //  코스의 「볼 것」 — 이 캡처가 코스의 몇째 걸음이고 무엇을 봐야 하는지 (정본 `lib/web/tour.ts`).
          const at = DEMO_TOUR.stops.findIndex((t) => shot.src.endsWith(`/${t.path}`))
          const stop = DEMO_TOUR.stops[at]
          return (
            <figure key={shot.file} className={styles.shot}>
              {/*  ⚠ `<img>` 다 — Next 의 `<Image>` 는 최적화 서버를 타는데, 이 장들은 이미
                  관통이 낸 고정 파일이고 랜딩은 정적이어야 한다 (①).
                  🔴 폭·높이는 manifest 가 준다 — 그림이 늦게 떠도 자리가 안 튄다.
                  첫 장만 즉시 받는다 (첫 스크롤 안에 있다). */}
              <img
                className={styles.shotImg}
                src={shot.file}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              <figcaption className={styles.shotCap}>
                {stop ? <span className={styles.no} aria-hidden="true">{at + 1}</span> : <span />}
                <span className={styles.shotTitle}>{shot.alt}</span>
                {stop ? <span className={styles.shotSee}>{stop.see}</span> : null}
                {/* 근거는 숫자·판정 옆에 있다 — 이 그림이 「어느 화면」인지 (P7 의 정신) */}
                <span className={`meta mono ${styles.shotSrc}`}>{shot.src}</span>
              </figcaption>
            </figure>
          )
        })}
      </div>
      <p className={styles.foot}>{PRODUCT_TOUR.foot}</p>
    </section>
  )
}

/** 낱말 풀이 — 회색 띠 안에 「낱말 = 뜻」. 제목에 개발자 낱말이 있는 절(02·05)의 첫 줄이다. */
function Glossary({ items }: { items: readonly { term: string; means: string }[] }) {
  return (
    <dl className={styles.glossary}>
      {items.map((g) => (
        <div key={g.term} className={styles.gloss}>
          <dt className={styles.glossTerm}>{g.term}</dt>
          <dd className={styles.glossMeans}>{g.means}</dd>
        </div>
      ))}
    </dl>
  )
}

/** 「쉬운 말로」·「예를 들면」 한 줄 — 모노 이름표 + 문장 (Before/After 의 `Plain` 과 같은 줄, 숫자 알약만 없다). */
function KeyLine({ k, text }: { k: string; text: string }) {
  return (
    <p className={styles.keyLine}>
      <span className={styles.plainKey}>{k}</span>
      <span>{text}</span>
    </p>
  )
}

function WhyNotGit({ index }: { index: string }) {
  return (
    <section className={`${styles.section} ${styles.sectionWhy}`} aria-labelledby="landing-why">
      <SectionHead id="landing-why" index={index} title={WHY_NOT_GIT.title} />
      <Glossary items={WHY_NOT_GIT.glossary} />
      {/* 카드 셋이 아니라 정의 목록이다 — 번호 · 주장 | 설명 + 「예를 들면」 (anti-slop: 「아이콘-원-제목-문단」 카드 금지). */}
      <dl className={styles.defs}>
        {WHY_NOT_GIT.cards.map((c, i) => (
          <div key={c.head} className={styles.def}>
            <dt className={styles.defHead}>
              <span className={styles.no} aria-hidden="true">{i + 1}</span>
              <span>{c.head}</span>
            </dt>
            <dd>
              <p>{c.body}</p>
              <KeyLine k={WHY_NOT_GIT.exampleKey} text={c.example} />
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.statement}>{WHY_NOT_GIT.line}</p>
    </section>
  )
}

function HowItWorks({ index }: { index: string }) {
  //  단계 그림은 정본(`ART.steps`)이 단계 수와 같을 때만 — 하나라도 빠지면 글로만 선다 (반쪽 시리즈를 보이지 않는다).
  const art = ART.steps.length === HOW_IT_WORKS.steps.length ? ART.steps : null
  //  격자의 자리 — 그림·화살표는 1행, 글은 2행(그림이 없으면 1행). 열은 CSS 변수로 넘긴다 (`.flow*` 가 읽는다).
  const bodyRow = art ? 2 : 1
  const at = (col: number, row?: number): CSSProperties =>
    ({ '--col': String(col), ...(row === undefined ? {} : { '--row': String(row) }) }) as CSSProperties
  return (
    <section className={styles.section} aria-labelledby="landing-how">
      <SectionHead id="landing-how" index={index} title={HOW_IT_WORKS.title} lead={HOW_IT_WORKS.lead} />
      <div className={styles.flow}>
        {HOW_IT_WORKS.steps.map((s, i) => {
          const col = i * 2 + 1
          const a = art?.[i]
          return (
            <Fragment key={s.head}>
              {a ? <img className={styles.flowImg} style={at(col)} src={a.src} width={a.width} height={a.height} alt={a.alt} loading="lazy" /> : null}
              <div className={styles.flowBody} style={at(col, bodyRow)}>
                <div className={styles.stepHead}>
                  <span className={styles.no} aria-hidden="true">{i + 1}</span>
                  <h3>{s.head}</h3>
                </div>
                {/* 쉬운 말이 먼저, 제품의 문장은 그 밑에 작게 — 읽는 사람의 차례다. */}
                <p className={styles.stepPlain}>{s.plain}</p>
                <p className={styles.stepDetail}>{s.body}</p>
                <div className={styles.actors}>
                  {s.actors.map((x) => <span key={x} className={styles.actor}>{x}</span>)}
                </div>
              </div>
              {i < HOW_IT_WORKS.steps.length - 1 ? (
                <span className={`${styles.turn} ${styles.flowTurn}`} style={at(col + 1)} aria-hidden="true">→</span>
              ) : null}
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}

function AiUse({ index }: { index: string }) {
  return (
    <section className={styles.section} aria-labelledby="landing-ai">
      <SectionHead id="landing-ai" index={index} title={AI_USE.title} lead={AI_USE.lead} />
      {/* 정의 목록 — 「왜 git」과 같은 모양. 줄마다 「누가 → 누가」 손바뀜이 먼저 서고 설명은 그 밑 (아이콘 없이 글과 괘선으로만). */}
      <dl className={styles.defs}>
        {AI_USE.rows.map((r, i) => (
          <div key={r.head} className={styles.def}>
            <dt className={styles.defHead}>
              <span className={styles.no} aria-hidden="true">{i + 1}</span>
              <span>{r.head}</span>
            </dt>
            <dd>
              <div className={styles.hand}>
                {r.hand.map((h, j) => (
                  <span key={h.does} className={styles.handStep}>
                    {/* 화살표는 다음 걸음의 일부다 — 접힐 때 같이 내려간다. */}
                    {j > 0 ? <span className={styles.handArrow} aria-hidden="true">→</span> : null}
                    <span className={styles.handWho}>
                      {h.who === 'ai' ? <span className={styles.handDot} aria-hidden="true" /> : null}
                      {AI_USE.who[h.who]}
                    </span>
                    <span>{h.does}</span>
                  </span>
                ))}
              </div>
              <p>{r.body}</p>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Replay({ index }: { index: string }) {
  return (
    <section className={styles.section} aria-labelledby="landing-replay">
      <SectionHead id="landing-replay" index={index} title={TERMINAL_REPLAY.title} lead={TERMINAL_REPLAY.lead} />
      <Glossary items={TERMINAL_REPLAY.glossary} />
      <TerminalReplay frames={REPLAY_FRAMES} milestone={TERMINAL_REPLAY.milestone} />
      {/* 「무슨 일이 일어나나」 — 검은 창의 네 걸음을 사람 말로. 숫자는 녹화의 것이다 (시험이 대조). */}
      <div className="col-tight">
        <span className={styles.legendTitle}>{TERMINAL_REPLAY.legendTitle}</span>
        <ol className={styles.legend}>
          {TERMINAL_REPLAY.legend.map((t, i) => (
            <li key={t} className={styles.legendItem}>
              <span className={styles.no} aria-hidden="true">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className={styles.foot}>{TERMINAL_REPLAY.source}</p>
    </section>
  )
}

function TrustBoundary({ index }: { index: string }) {
  const { knows, unknown } = TRUST_BOUNDARY
  const rows = Math.max(knows.rows.length, unknown.rows.length)
  return (
    <section className={`${styles.section} ${styles.trust}`} aria-labelledby="landing-trust">
      <div className={styles.split}>
        <div className={styles.splitHead}>
          <SectionHead id="landing-trust" index={index} title={TRUST_BOUNDARY.title} />
          <p className={styles.foot}>{TRUST_BOUNDARY.foot}</p>
        </div>
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th><span className="ink-ok">✓</span> {knows.head}</th>
                <th><span className="ink-bad">✕</span> {unknown.head}</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <tr key={i}>
                  {/* 칸 = 제품의 말 + 그 밑에 쉬운 말. 「절대 받지 않는 것」은 굵게 — 이 표의 주장은 그 열이다 (README 도 그렇게 굵다). */}
                  <td>
                    <span className={styles.cellMain}>{knows.rows[i] ?? ''}</span>
                    {knows.plain[i] ? <span className={styles.cellPlain}>{knows.plain[i]}</span> : null}
                  </td>
                  <td>
                    <span className={`${styles.cellMain} ${styles.cellStrong}`}>{unknown.rows[i] ?? ''}</span>
                    {unknown.plain[i] ? <span className={styles.cellPlain}>{unknown.plain[i]}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function Install({ index }: { index: string }) {
  return (
    <section className={styles.section} aria-labelledby="landing-install">
      {/* 첫 줄은 「개발자만 합니다」 — 팀장·심사위원이 여기서 자기 일이 아님을 안다. 그 다음 한 줄이 한 행: 번호 · 어디서 · 명령 · 쉬운 설명. */}
      <SectionHead id="landing-install" index={index} title={INSTALL_STEPS.title} lead={INSTALL_STEPS.who} />
      <ol className={styles.installList}>
        {INSTALL_STEPS.lines.map((l, i) => (
          <li key={l.cmd} className={styles.installRow}>
            <span className={styles.no} aria-hidden="true">{i + 1}</span>
            <span className={styles.where}>{l.where}</span>
            <div className={styles.installBody}>
              {/* 명령은 검은 상자 안의 `<pre>` 다 — 글자로 뽑아도 명령 한 줄이고, 컨테이너는 scroll-x 다 (시험이 센다). */}
              <div className={`scroll-x ${styles.codeBlock}`}>
                <pre className={styles.pre}><span className={styles.cmd}>{l.cmd}</span></pre>
              </div>
              <span className={styles.installNote}>{l.note}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.foot}>{INSTALL_STEPS.requires}</p>
      <p className={styles.foot}>{INSTALL_STEPS.foot}</p>
    </section>
  )
}

function Foot() {
  return (
    <footer className={styles.footer}>
      <span className={styles.footBrand}>{LANDING_FOOT.brand}</span>
      <span>{LANDING_FOOT.event}</span>
      <span>{LANDING_FOOT.team.label} {LANDING_FOOT.team.name}</span>
      <a className={styles.footLink} href={LANDING_FOOT.github.href} rel="noreferrer">{LANDING_FOOT.github.label}</a>
      <a className={styles.footLink} href={LANDING_FOOT.limits.href} rel="noreferrer">{LANDING_FOOT.limits.label}</a>
      <a className={styles.footLink} href={LANDING_FOOT.health.href}>{LANDING_FOOT.health.label}</a>
      <a className={styles.footLink} href={LANDING_FOOT.privacy.href}>{LANDING_FOOT.privacy.label}</a>
    </footer>
  )
}

/**
 * 절의 차례 — 번호는 여기서 한 번만 매긴다. 절을 넣고 빼면 번호가 따라온다.
 * ⚠ 머리글의 링크 셋도 이 표를 읽는다 (`nav` 가 있는 줄만). `href` 는 `/#<anchor>` 다 — 시험이 「앱 안 주소(`/`로 시작)」만
 *   허용하고, `/` 위에서는 그냥 그 절로 스크롤한다. 닻은 절을 감싸는 `<div id>` 에 있다 — h2 의 id(`landing-*`)를
 *   머리글에서 먼저 언급하면 「제품 화면이 왜 git 보다 먼저」를 재는 시험이 머리글의 링크를 절로 오해한다.
 */
const SECTIONS = [
  { render: ProductShots, id: 'landing-shots', nav: null },
  //  머리글의 낱말은 절 제목의 **짧은 판**이다 — 제목은 문장이라 머리글에 넣으면 한 줄을 다 먹는다 (눈으로 봤다).
  { render: WhyNotGit, id: 'landing-why', nav: '왜 git 이 아닌가' },
  { render: HowItWorks, id: 'landing-how', nav: '어떻게 동작하나' },
  { render: AiUse, id: 'landing-ai', nav: 'AI 활용' },
  { render: Replay, id: 'landing-replay', nav: null },
  { render: TrustBoundary, id: 'landing-trust', nav: null },
  { render: Install, id: 'landing-install', nav: '설치' },
] as const

/** 머리글 링크의 닻 — h2 의 id 에서 `landing-` 을 뗀 것 (`/#why` · `/#install`). */
function anchorOf(sectionId: string): string {
  return sectionId.replace(/^landing-/, '')
}

export function Landing() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/"><BrandMark />{LANDING_FOOT.brand}</a>
        <nav className={styles.headerNav} aria-label="절로 가기">
          {SECTIONS.filter((s) => s.nav !== null).map((s) => (
            <a key={s.id} className={styles.navLink} href={`/#${anchorOf(s.id)}`}>{s.nav}</a>
          ))}
          <a className="btn btn-sm" href={LANDING_HEAD.login.href}>{LANDING_HEAD.login.label}</a>
        </nav>
      </header>
      <main className={styles.main}>
        <Hero />
        {/* Before/After 는 히어로 바로 밑의 두 열이다 — 그림이 오른쪽 자리를 가져가서 내려왔다 (문구·시험은 그대로). */}
        <BeforeAfter />
        {/* 🔴 제품 화면이 히어로 **바로 아래**다 — 심사위원은 10초 안에 판단하고, 그때 제품 화면이
            첫 스크롤 안에 있어야 한다 (FINDINGS 131 의 증상이 그것이었다). 차례는 `SECTIONS` 하나다. */}
        {SECTIONS.map((s, i) => (
          <div key={s.id} id={anchorOf(s.id)}>
            <s.render index={String(i + 1).padStart(2, '0')} />
          </div>
        ))}
      </main>
      <Foot />
    </div>
  )
}
