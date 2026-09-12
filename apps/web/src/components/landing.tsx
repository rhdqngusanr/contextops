import { Fragment, type CSSProperties } from 'react'

import { ReplayFrames, ShotsManifest } from '@contextops/schema'

import replayRecording from '../../../../fixtures/replay/sync.json'
import shotsManifest from '../../public/shots/manifest.json'
import type { Locale } from '../lib/i18n/locale'
import { SUBMISSION_IDENTITY } from '../lib/web/submission'
import { ART } from '../lib/web/art'
import { DEMO_TOUR } from '../lib/web/tour'
import { SITE_TEXT } from '../lib/web/site'
//  ⚠ 값으로 들여온다 (영어 한 벌). 저쪽은 이 파일에서 **타입만** 들여오므로 실행시 고리가 없다.
import { LANDING_EN } from './landing.en'
import { LocaleToggle } from './locale-toggle'
import styles from './landing.module.css'
import { TerminalReplay } from './terminal-replay'
import { Note } from './chips'

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
  //  🔴 머리 세 문장의 정본은 `lib/web/site.ts` 의 `SITE_TEXT` 다 — 링크 미리보기(`<head>` · og.png)와 같은 문장이어야 한다 (INBOX H2).
  //  ⚠ 이 표는 **한국어 한 벌**이다. 영어 한 벌은 `landing.en.ts` 에 같은 모양으로 있고,
  //    `test/web-landing-en.test.ts` 가 두 벌의 키가 글자 그대로 같은지 센다.
  eyebrow: SITE_TEXT.ko.eyebrow,
  title: SITE_TEXT.ko.tagline,
  subtitle: SITE_TEXT.ko.description,
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
    //  세기(`severity`)는 사람 말이 먼저, 값은 괄호 안 — 「must」가 규칙의 세기라는 걸 심사위원은 모른다 (2026-09-11). 시험이 괄호 안을 픽스처와 대조한다.
    detail: '강제 규칙(must) — 지켰는지 코드 리뷰에서 확인합니다',
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
  //  ⚠ 걸음은 코스 표에서 그대로 온다 — 랜딩이 문장을 다시 적지 않는다 (정본 `lib/web/tour.ts`).
  stops: DEMO_TOUR.stops,
  //  하려는 말은 「시안이 아니라 실제 화면」이다 — 경로·단계 이름은 괄호 뒤로 (2026-09-11).
  foot: '위 캡처는 시안이 아니라, 자동 검사가 실제 앱을 띄워 매번 새로 찍은 화면입니다 — 낡은 그림이 남지 않습니다. (검사 스크립트: tools/walkthrough.ps1)',
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
      //  「diff」는 위 풀이 띠에 없는 낱말이다 — 문장 안에서 바로 푼다 (2026-09-11).
      body: '변경 기록(diff)은 무엇이 바뀌었는지만 남깁니다. 누가 어떤 근거로 정했는지가 없으면, AI 도 사람도 그 규칙을 믿을 이유가 없습니다.',
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
      //  ⚠ 「A 가 맞다 · B 가 맞다」가 아니다 — 충돌 카드는 두 쪽을 무엇인지로 부른다(`lib/web/conflict-sides.ts` · 「지금 규칙 / 옛 규칙」「문서 / 코드」)
      //    고 버튼은 「… 쪽이 맞음」이다. 이름이 종류마다 달라서 「처럼」으로 예를 든다 — 버튼 틀은 `conflict-card.tsx` 와 같은 낱말 (2026-09-11).
      body: '문서끼리, 또는 문서와 코드가 다르게 말하면 충돌 카드로 올립니다. 「지금 규칙 쪽이 맞음 · 옛 규칙 쪽이 맞음 · 둘 다 보류」처럼 어느 쪽을 따를지는 사람이 고릅니다.',
      hand: [{ who: 'ai', does: '충돌 카드로 질문을 올린다' }, { who: 'human', does: '어느 쪽을 따를지, 아니면 보류할지 고른다' }],
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
    //  「훅」은 검은 창 셋째 줄과 06 절 꼬리(P6 「훅은 파일을 바꾸지 않는다」)에 나오는데 풀이가 없었다 (2026-09-11).
    { term: '훅(Hook)', means: 'Claude Code 를 열고 닫을 때 플러그인이 자동으로 도는 작은 장치 — 새 판을 알리고 작업을 보고할 뿐, 파일은 바꾸지 않습니다' },
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
  //  하려는 말은 「지어낸 대사가 아니다」다 — 녹화 파일 경로는 괄호 뒤로 (2026-09-11).
  source: '지어낸 대사가 아니라, 배포되는 플러그인을 실제로 돌려 남긴 출력입니다. '
    + '사이의 작업은 생략했고, 타이핑과 줄 사이 간격만 읽을 수 있게 늘렸습니다. (녹화 원본: fixtures/replay/sync.json)',
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
  //  안심시키는 문단이라 「스키마」「훅」을 문장 안에서 바로 푼다 — 표의 칸에 붙인 「쉬운 말로」 층과 같은 자리 (2026-09-11).
  foot: '서버로 올라가는 것은 정해진 모양(스키마)을 통과한 항목뿐입니다. 코드 본문·비밀값·개인 메모리·대화는 어떤 경우에도 서버로 가지 않고, 개발자 쪽에서 자동으로 도는 훅은 파일을 바꾸지 않습니다.',
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
    //  개발자 낱말 셋을 각각 한 마디로 푼다 — README·제출서의 같은 줄 주석과 글자 그대로 같아야 한다 (`readme.test.ts` · 2026-09-11).
    { where: '터미널', cmd: 'claude plugin install contextops', note: '자동으로 도는 작은 장치(훅) · Claude Code 안의 명령(Skill) · 실행 도구(CLI) 가 함께 깔립니다' },
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
  /** 머리글 내비의 이름 — 화면 낭독기가 읽는다. 보이는 글자가 아니라서 눈에 안 띄지만 언어를 탄다. */
  navLabel: '절로 가기',
  event: 'Wanted AI Championship 2026 출품작',
  //  라벨은 「팀명」이고 푸터가 이름을 「 」로 감싼다 — 「팀 퇴직했는데…」로 한 문장처럼 읽혔다 (2026-09-11).
  team: { label: '팀명', name: SUBMISSION_IDENTITY.team },
  github: { label: 'GitHub', href: SUBMISSION_IDENTITY.repoUrl },
  //  한글 푸터에서 유일한 영어 라벨이었다 — 문서 이름(KNOWN_LIMITATIONS)은 href 에 남고 라벨은 사람 말.
  limits: { label: '알려진 한계', href: `${SUBMISSION_IDENTITY.repoUrl}/blob/main/${SUBMISSION_IDENTITY.limitsPath}` },
  health: { label: '서버 상태', href: '/api/v1/health' },
  //  개인정보 처리방침 — 문장의 정본은 `lib/web/privacy.ts` (INBOX H4). 앱 안 링크라 rel 이 없다.
  privacy: { label: '개인정보 처리방침', href: '/privacy' },
} as const

/** 문장 하나에 `/contextops:x` 가 여럿일 수 있다 — Skill 이름을 전부 뽑는다 (시험이 쓴다). */
export function skillNamesIn(text: string): string[] {
  return [...text.matchAll(/\/contextops:([a-z-]+)/g)].map((m) => m[1] as string)
}

/**
 * 머리글의 절 링크 — 절 제목의 **짧은 판**이다 (제목은 문장이라 머리글에 넣으면 한 줄을 다 먹는다).
 * ⚠ 열쇠는 `SECTIONS` 의 `id` 다. 절을 더하면 여기 한 줄이고, 없으면 그 절은 머리글에 안 뜬다.
 */
export const LANDING_NAV = {
  'landing-why': '왜 git 이 아닌가',
  'landing-how': '어떻게 동작하나',
  'landing-ai': 'AI 활용',
  'landing-install': '설치',
} as const

// ---------------------------------------------------------------------
//  🔴 **한국어 한 벌** — 위 표들을 묶은 것 (2026-09-12 · 영어 모드)
//
//  ★ 왜 묶는가 — 아래 모양 함수들이 표를 **모듈 전역에서** 읽고 있었다. 그 상태로는 언어를
//    바꿀 자리가 없다(전역을 갈아끼우면 동시에 들어온 두 요청이 서로의 언어를 덮는다).
//    묶어서 **인자로** 내려보내면 요청마다 자기 언어를 들고 간다.
//
//  ★ 왜 표 이름을 안 바꿨나 — `LANDING_HEAD`·`BEFORE_AFTER` … 는 시험 11개가 이름으로
//    붙잡고 있고(「Before/After 의 답이 실제 Pack 규칙과 같은가」 같은 것들), 그 시험들은
//    **한국어 문장**을 재는 것이 일이다. 이름을 바꾸면 그 시험들이 언어 작업과 무관하게
//    전부 흔들린다. 그래서 한국어 표는 있던 이름 그대로 두고, 여기서 묶기만 한다.
// ---------------------------------------------------------------------

export const LANDING_KO = {
  head: LANDING_HEAD,
  beforeAfter: BEFORE_AFTER,
  tour: PRODUCT_TOUR,
  why: WHY_NOT_GIT,
  how: HOW_IT_WORKS,
  ai: AI_USE,
  replay: TERMINAL_REPLAY,
  trust: TRUST_BOUNDARY,
  install: INSTALL_STEPS,
  foot: LANDING_FOOT,
  nav: LANDING_NAV,
} as const

/**
 * 🔴 **한 벌의 모양.** 영어 한 벌(`landing.en.ts` 의 `LANDING_EN`)이 이 타입을 받는다 —
 *    그래서 **칸이 하나라도 빠지면 타입 검사에서 막힌다.**
 *
 * ★ `Widen` 이 필요한 이유 — `as const` 때문에 위 표의 모든 문자열이 **리터럴 타입**이다
 *   (`'설치'` 는 `string` 이 아니라 `'설치'`). 그대로 쓰면 영어 한 벌이 한국어와 **글자까지**
 *   같아야 통과한다. 그래서 문자열만 넓힌다 — 모양(키·배열 길이 구조)은 그대로 강제된다.
 */
type Widen<T> = T extends string ? string
  : T extends readonly (infer U)[] ? readonly Widen<U>[]
    : T extends object ? { readonly [K in keyof T]: Widen<T[K]> }
      : T

export type LandingText = Widen<typeof LANDING_KO>

/** 모양 함수들이 받는 것 — 절 번호와 **이 요청의 문구 한 벌**. */
type SectionProps = { index: string; t: LandingText }

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

function Hero({ t }: { t: LandingText }) {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>{t.head.eyebrow}</span>
        <h1 id="landing-title" className={styles.title}>{t.head.title}</h1>
        <p className={styles.subtitle}>{t.head.subtitle}</p>
        {/* ⚠ 버튼은 하나다. [2분 영상 보기] 는 영상이 생기면 여기 outline 한 줄이고,
            [로그인] 은 머리글에 이미 있다 — 덤프에서 「로그인 로그인」으로 겹쳐 보였다.
            ⚠ 마크업은 시험이 글자 그대로 잰다 — 클래스도 안의 글자도 더하지 마라. 화살표는 CSS 다. */}
        <div className={styles.ctaRow}>
          <a className="btn btn-primary" href={t.head.cta.href}>{t.head.cta.label}</a>
          <span className={styles.note}>{t.head.note}</span>
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

function BeforeAfter({ t }: { t: LandingText }) {
  const { caption, prompt, askKey, plainKey, before, after } = t.beforeAfter
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
                  <Plain plain={a.plain} plainKey={plainKey} />
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
              <span className={`${styles.who} ${styles.whoAll}`} aria-hidden="true" />
              <div className={styles.replyBody}>
                <div className={styles.replyMeta}>
                  <span className={styles.replyName}>{after.name}</span>
                  <span className={styles.replyRead}>{after.read}</span>
                </div>
                <p className={`${styles.replyText} ${styles.replyTextBig}`}>{after.text}</p>
                <Plain plain={after.plain} plainKey={plainKey} />
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
function Plain({ plain, plainKey }: { plain: { count: string; how: string }; plainKey: string }) {
  return (
    <p className={styles.plain}>
      <span className={styles.plainKey}>{plainKey}</span>
      <strong className={styles.plainCount}>{plain.count}</strong>
      <span>{plain.how}</span>
    </p>
  )
}

function ProductShots({ index, t }: SectionProps) {
  return (
    <section className={`${styles.section} ${styles.sectionShots}`} aria-labelledby="landing-shots">
      <SectionHead id="landing-shots" index={index} title={t.tour.title} lead={t.tour.lead} />
      {/* 2×2 — 코스의 네 걸음이 네 칸이다 (2026-09-10 저녁 · 「큰 한 장 + 작은 장들」은 첫 장 밑이 비고 넷째 장이 홀로 남았다).
          카드 안의 카드가 아니다 — 그림 한 장 + 그 밑에 번호 동그라미·제목·볼 것·주소. */}
      <div className={styles.shotRow}>
        {PRODUCT_SHOTS.map((shot, i) => {
          //  코스의 「볼 것」 — 이 캡처가 코스의 몇째 걸음이고 무엇을 봐야 하는지 (정본 `lib/web/tour.ts`).
          //  🔴 **이 요청의 언어**에서 찾는다 — 예전엔 모듈 전역(`DEMO_TOUR`)을 봐서 영어 화면에서도 한국어가 떴다.
          const at = t.tour.stops.findIndex((s) => shot.src.endsWith(`/${s.path}`))
          const stop = t.tour.stops[at]
          return (
            <figure key={shot.file} className={styles.shot}>
              {/*  ⚠ `<img>` 다 — Next 의 `<Image>` 는 최적화 서버를 타는데, 이 장들은 이미
                  관통이 낸 고정 파일이고 랜딩은 정적이어야 한다 (①).
                  🔴 폭·높이는 manifest 가 준다 — 그림이 늦게 떠도 자리가 안 튄다.
                  첫 장만 즉시 받는다 (첫 스크롤 안에 있다). */}
              <img
                className={styles.shotImg}
                src={shot.file}
                alt={stop ? stop.title : shot.alt}
                width={shot.width}
                height={shot.height}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              <figcaption className={styles.shotCap}>
                {stop ? <span className={styles.no} aria-hidden="true">{at + 1}</span> : <span />}
                <span className={styles.shotTitle}>{stop ? stop.title : shot.alt}</span>
                {stop ? <span className={styles.shotSee}>{stop.see}</span> : null}
                {/* 근거는 숫자·판정 옆에 있다 — 이 그림이 「어느 화면」인지 (P7 의 정신) */}
                <span className={`meta mono ${styles.shotSrc}`}>{shot.src}</span>
              </figcaption>
            </figure>
          )
        })}
      </div>
      <p className={styles.foot}>{t.tour.foot}</p>
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

function WhyNotGit({ index, t }: SectionProps) {
  return (
    <section className={`${styles.section} ${styles.sectionWhy}`} aria-labelledby="landing-why">
      <SectionHead id="landing-why" index={index} title={t.why.title} />
      <Glossary items={t.why.glossary} />
      {/* 카드 셋이 아니라 정의 목록이다 — 번호 · 주장 | 설명 + 「예를 들면」 (anti-slop: 「아이콘-원-제목-문단」 카드 금지). */}
      <dl className={styles.defs}>
        {t.why.cards.map((c, i) => (
          <div key={c.head} className={styles.def}>
            <dt className={styles.defHead}>
              <span className={styles.no} aria-hidden="true">{i + 1}</span>
              <span>{c.head}</span>
            </dt>
            <dd>
              <p>{c.body}</p>
              <KeyLine k={t.why.exampleKey} text={c.example} />
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.statement}>{t.why.line}</p>
    </section>
  )
}

function HowItWorks({ index, t }: SectionProps) {
  //  단계 그림은 정본(`ART.steps`)이 단계 수와 같을 때만 — 하나라도 빠지면 글로만 선다 (반쪽 시리즈를 보이지 않는다).
  const art = ART.steps.length === t.how.steps.length ? ART.steps : null
  //  격자의 자리 — 그림·화살표는 1행, 글은 2행(그림이 없으면 1행). 열은 CSS 변수로 넘긴다 (`.flow*` 가 읽는다).
  const bodyRow = art ? 2 : 1
  const at = (col: number, row?: number): CSSProperties =>
    ({ '--col': String(col), ...(row === undefined ? {} : { '--row': String(row) }) }) as CSSProperties
  return (
    <section className={styles.section} aria-labelledby="landing-how">
      <SectionHead id="landing-how" index={index} title={t.how.title} lead={t.how.lead} />
      <div className={styles.flow}>
        {t.how.steps.map((s, i) => {
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
              {i < t.how.steps.length - 1 ? (
                <span className={`${styles.turn} ${styles.flowTurn}`} style={at(col + 1)} aria-hidden="true">→</span>
              ) : null}
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}

function AiUse({ index, t }: SectionProps) {
  return (
    <section className={styles.section} aria-labelledby="landing-ai">
      <SectionHead id="landing-ai" index={index} title={t.ai.title} lead={t.ai.lead} />
      {/* 정의 목록 — 「왜 git」과 같은 모양. 줄마다 「누가 → 누가」 손바뀜이 먼저 서고 설명은 그 밑 (아이콘 없이 글과 괘선으로만). */}
      <dl className={styles.defs}>
        {t.ai.rows.map((r, i) => (
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
                      {t.ai.who[h.who as keyof typeof t.ai.who]}
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

function Replay({ index, t }: SectionProps) {
  return (
    <section className={styles.section} aria-labelledby="landing-replay">
      <SectionHead id="landing-replay" index={index} title={t.replay.title} lead={t.replay.lead} />
      <Glossary items={t.replay.glossary} />
      <TerminalReplay frames={REPLAY_FRAMES} milestone={t.replay.milestone} />
      {/* 「무슨 일이 일어나나」 — 검은 창의 네 걸음을 사람 말로. 숫자는 녹화의 것이다 (시험이 대조). */}
      <div className="col-tight">
        <span className={styles.legendTitle}>{t.replay.legendTitle}</span>
        <ol className={styles.legend}>
          {t.replay.legend.map((t, i) => (
            <li key={t} className={styles.legendItem}>
              <span className={styles.no} aria-hidden="true">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className={styles.foot}>{t.replay.source}</p>
    </section>
  )
}

function TrustBoundary({ index, t }: SectionProps) {
  const { knows, unknown } = t.trust
  const rows = Math.max(knows.rows.length, unknown.rows.length)
  return (
    <section className={`${styles.section} ${styles.trust}`} aria-labelledby="landing-trust">
      <div className={styles.split}>
        <div className={styles.splitHead}>
          <SectionHead id="landing-trust" index={index} title={t.trust.title} />
          <p className={styles.foot}>{t.trust.foot}</p>
        </div>
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th><Note tone="ok">{knows.head}</Note></th>
                <th><Note tone="bad">{unknown.head}</Note></th>
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

function Install({ index, t }: SectionProps) {
  return (
    <section className={styles.section} aria-labelledby="landing-install">
      {/* 첫 줄은 「개발자만 합니다」 — 팀장·심사위원이 여기서 자기 일이 아님을 안다. 그 다음 한 줄이 한 행: 번호 · 어디서 · 명령 · 쉬운 설명. */}
      <SectionHead id="landing-install" index={index} title={t.install.title} lead={t.install.who} />
      <ol className={styles.installList}>
        {t.install.lines.map((l, i) => (
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
      <p className={styles.foot}>{t.install.requires}</p>
      <p className={styles.foot}>{t.install.foot}</p>
    </section>
  )
}

function Foot({ t }: { t: LandingText }) {
  return (
    <footer className={styles.footer}>
      <span className={styles.footBrand}>{t.foot.brand}</span>
      <span>{t.foot.event}</span>
      <span>{t.foot.team.label} 「{t.foot.team.name}」</span>
      <a className={styles.footLink} href={t.foot.github.href} rel="noreferrer">{t.foot.github.label}</a>
      <a className={styles.footLink} href={t.foot.limits.href} rel="noreferrer">{t.foot.limits.label}</a>
      <a className={styles.footLink} href={t.foot.health.href}>{t.foot.health.label}</a>
      <a className={styles.footLink} href={t.foot.privacy.href}>{t.foot.privacy.label}</a>
    </footer>
  )
}

/**
 * 절의 차례 — 번호는 여기서 한 번만 매긴다. 절을 넣고 빼면 번호가 따라온다.
 * ⚠ 머리글의 링크 셋도 이 표를 읽는다 (`nav` 가 있는 줄만). `href` 는 `/#<anchor>` 다 — 시험이 「앱 안 주소(`/`로 시작)」만
 *   허용하고, `/` 위에서는 그냥 그 절로 스크롤한다. 닻은 절을 감싸는 `<div id>` 에 있다 — h2 의 id(`landing-*`)를
 *   머리글에서 먼저 언급하면 「제품 화면이 왜 git 보다 먼저」를 재는 시험이 머리글의 링크를 절로 오해한다.
 */
//  ⚠ 머리글에 뜨는 낱말은 여기가 아니라 `LANDING_NAV` 다 (언어를 타므로) — 여기 있는 것은
//    **차례와 어느 절이 머리글에 뜨나**뿐이다. `nav: true` 인 절은 `LANDING_NAV` 에 줄이 있어야
//    하고, 그 짝은 `test/web-landing-en.test.ts` 가 센다.
const SECTIONS = [
  { render: ProductShots, id: 'landing-shots', nav: false },
  { render: WhyNotGit, id: 'landing-why', nav: true },
  { render: HowItWorks, id: 'landing-how', nav: true },
  { render: AiUse, id: 'landing-ai', nav: true },
  { render: Replay, id: 'landing-replay', nav: false },
  { render: TrustBoundary, id: 'landing-trust', nav: false },
  { render: Install, id: 'landing-install', nav: true },
] as const

/** 머리글에 뜨는 절의 id 목록 — 시험이 `LANDING_NAV` 의 열쇠와 대조한다. */
export const NAV_SECTION_IDS = SECTIONS.filter((s) => s.nav).map((s) => s.id)

/** 머리글 링크의 닻 — h2 의 id 에서 `landing-` 을 뗀 것 (`/#why` · `/#install`). */
function anchorOf(sectionId: string): string {
  return sectionId.replace(/^landing-/, '')
}

/**
 * 🔴 **언어는 인자로 받는다** (2026-09-12). 여기서 `serverLocale()` 을 부르지 않는 이유 —
 *    이 컴포넌트는 시험과 덤프 스크립트(`scripts/dump-landing.tsx`)가 **요청 없이** 그린다.
 *    안에서 요청을 읽으면 그 자리에서 죽는다. 요청을 아는 것은 `app/page.tsx` 하나다.
 * ⚠ 기본값이 한국어인 것은 `DEFAULT_LOCALE` 이 아니라 **부르는 쪽**이 정한다 — 여기서
 *   기본값을 또 정하면 정본이 둘이 된다.
 */
export function Landing({ locale }: { locale: Locale }) {
  const t: LandingText = locale === 'en' ? LANDING_EN : LANDING_KO
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/"><BrandMark />{t.foot.brand}</a>
        <nav className={styles.headerNav} aria-label={t.foot.navLabel}>
          {SECTIONS.filter((s) => s.nav).map((s) => (
            <a key={s.id} className={styles.navLink} href={`/#${anchorOf(s.id)}`}>{t.nav[s.id as keyof typeof t.nav]}</a>
          ))}
          <a className="btn btn-sm" href={t.head.login.href}>{t.head.login.label}</a>
          {/* 언어 토글은 머리글의 마지막 자리다 — 로그인 버튼 뒤. 누르면 쿠키를 쓰고 서버가 다시 그린다. */}
          <LocaleToggle />
        </nav>
      </header>
      <main className={styles.main}>
        <Hero t={t} />
        {/* Before/After 는 히어로 바로 밑의 두 열이다 — 그림이 오른쪽 자리를 가져가서 내려왔다 (문구·시험은 그대로). */}
        <BeforeAfter t={t} />
        {/* 🔴 제품 화면이 히어로 **바로 아래**다 — 심사위원은 10초 안에 판단하고, 그때 제품 화면이
            첫 스크롤 안에 있어야 한다 (FINDINGS 131 의 증상이 그것이었다). 차례는 `SECTIONS` 하나다. */}
        {SECTIONS.map((s, i) => (
          <div key={s.id} id={anchorOf(s.id)}>
            <s.render index={String(i + 1).padStart(2, '0')} t={t} />
          </div>
        ))}
      </main>
      <Foot t={t} />
    </div>
  )
}
