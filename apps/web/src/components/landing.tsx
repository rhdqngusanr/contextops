import { ReplayFrames, ShotsManifest } from '@contextops/schema'

import replayRecording from '../../../../fixtures/replay/sync.json'
import shotsManifest from '../../public/shots/manifest.json'
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
//      `<marketplace>` 는 여전히 자리표시자다 — 저장소에 `.claude-plugin/marketplace.json` 이 없어
//      URL 을 넣어도 첫 명령이 실패한다 (FINDINGS 140).
//
//  ⚠ accent 는 이 화면에 **하나**다 — [샘플 팀으로 둘러보기]. 다른 버튼은 outline.
// =====================================================================

/** A. 헤드라인 (DESIGN_BRIEF 화면 1 A). */
export const LANDING_HEAD = {
  eyebrow: 'Team Context for Claude Code',
  title: '팀의 지식과 Claude의 기억을 같은 방향으로',
  subtitle:
    '팀장이 승인한 목표·로드맵·결정을 모든 팀원의 Claude Code에 같은 버전으로 배포하고, '
    + '로드맵이 실제로 진행되는지 근거와 함께 보여줍니다.',
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
  prompt: 'PSP 호출이 실패하면 몇 번까지 재시도해?',
  before: {
    title: 'Before · 각자의 Claude',
    answers: [
      {
        who: 'A',
        source: 'paylab-docs/goals.md §3.1',
        text: '최대 5회까지 지수 백오프로 재시도합니다. 고정 간격은 금지라고 되어 있습니다.',
      },
      {
        who: 'B',
        source: 'paylab-api/src/payment/retry.ts:11',
        text: 'MAX_RETRY = 3 이고 간격은 500ms 고정입니다.',
      },
    ],
    foot: '같은 팀, 같은 질문, 다른 답',
  },
  after: {
    title: 'After · Team Context v1.1.0',
    /** 씨앗 초안의 id — Pack 의 역추적 태그(`<!-- ctx:… -->`)에 그대로 실리는 값이다. */
    itemId: 'item_policy_retry',
    text: 'PSP 호출은 최대 5회까지 재시도한다. 간격은 지수 백오프(0.5s·1s·2s·4s·8s)이고, '
      + '재시도 대상은 타임아웃과 5xx 뿐이다.',
    detail: 'must · 강제: 리뷰에서 본다',
    evidence: ['paylab-docs/goals.md §3.1', 'paylab-api/src/payment/retry.ts:11–14', '팀장 승인'],
    foot: 'A·B·C 모두 같은 답',
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
  title: '제품 화면',
  lead: '아래는 시안이 아니라 관통 시나리오가 실제 앱을 띄워 찍은 화면입니다. '
    + '캡처마다 어느 주소의 화면인지 같이 적었습니다.',
  foot: '캡처는 관통(tools/walkthrough.ps1)의 shots 단계가 매번 다시 찍습니다 — 낡은 그림이 남지 않습니다.',
} as const

/**
 * 랜딩이 실을 캡처. 모듈을 읽을 때 한 번 계약으로 판다 — 모양이 어긋난 manifest 는
 * **빌드에서** 죽는다 (렌더에서가 아니라). `REPLAY_FRAMES` 와 같은 자리다.
 */
export const PRODUCT_SHOTS = ShotsManifest.parse(shotsManifest).shots

/** C-1. 왜 git 으로 안 되나요 — 세 문장 카드 + 한 줄. */
export const WHY_NOT_GIT = {
  title: '왜 git으로 안 되나요?',
  cards: [
    {
      head: '팀장은 git을 안 씁니다',
      body: '목표·정책은 문서와 회의에 있고, 레포의 CLAUDE.md 는 개발자 개인이 각자 관리합니다.',
    },
    {
      head: '컨텍스트는 레포 하나에 갇히지 않습니다',
      body: '결제 팀의 재시도 규칙은 API·웹훅·정산 레포에 같이 적용됩니다. 레포마다 복사하면 갈립니다.',
    },
    {
      head: 'git은 「왜」를 모릅니다',
      body: 'diff 는 무엇이 바뀌었는지만 남깁니다. 누가 어떤 근거로 정했는지는 남지 않습니다.',
    },
  ],
  line: 'DeepWiki는 코드를 사람에게 설명합니다. ContextOps는 팀의 결정을 AI에게 꽂습니다.',
} as const

/** C-2. 어떻게 동작하나요 — 3단계. ⚠ 썸네일은 없다 (production 캡처가 아직 없다 · PLAN P5 둘째 행). */
export const HOW_IT_WORKS = {
  title: '어떻게 동작하나요',
  steps: [
    {
      head: '만든다',
      body: '문서·답변·코드에서 항목을 뽑고, 서로 어긋난 것은 사람이 결정합니다. 승인된 것만 남습니다.',
    },
    {
      head: '배포한다',
      body: '같은 snapshot 은 언제나 같은 Pack 입니다. 모든 기기가 같은 버전·같은 해시를 받습니다.',
    },
    {
      head: '진행이 보인다',
      body: '각자의 AI 가 작업 끝에 근거를 보고하고, 완료는 사람이 확인합니다. 행은 마일스톤입니다.',
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
  title: '터미널에서는 이렇게 보입니다',
  lead: '세션을 열면 훅이 새 버전을 알리고, /contextops:sync 로 받고, 작업을 마치면 agent 가 '
    + '근거와 함께 보고합니다. 오른쪽 Roadmap 이 같은 시각에 바뀝니다.',
  source: '관통 시나리오가 배포되는 플러그인을 실제로 돌려 남긴 출력입니다 (fixtures/replay/sync.json). '
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
  title: '서버가 아는 것 / 모르는 것',
  knows: {
    head: '서버가 아는 것',
    rows: [
      '팀·프로젝트 ID',
      '구조화된 항목 (제목·규칙·마일스톤)',
      '팀장이 직접 등록한 문서 원문',
      '경로 · 줄 번호 · 커밋 해시',
      '버전 · manifest 해시',
    ],
  },
  unknown: {
    head: '서버가 모르는 것',
    rows: [
      '저장소 코드 본문',
      '환경변수 · secret',
      '개인 CLAUDE.local.md',
      'Auto Memory',
      'Claude 대화 내용',
    ],
  },
  foot: '올라가는 것은 allowlist 스키마로만 통과합니다. 훅은 파일을 바꾸지 않습니다.',
} as const

/**
 * C-5. 개발자 설치 — **지금 실제로 도는 명령**만 적는다 (SPEC §8.3 · `docs/evidence/2026-09-03-plugin`).
 * ⚠ `npx contextops` 는 아직 없다 (npm 에 올린 적이 없다). 없는 명령을 적으면 첫 시도가
 *   실패하고, 그건 「고장」으로 읽힌다. `<marketplace>` 는 `setup` 이 찍는 안내와 같은 자리다.
 * ⚠ `/contextops:…` 는 `plugin/contextops/skills/<이름>` 이 있어야 한다 (시험이 센다).
 */
export const INSTALL_STEPS = {
  title: '개발자 설치',
  lines: [
    { cmd: 'claude plugin marketplace add <marketplace>', note: '플러그인 저장소를 등록한다' },
    { cmd: 'claude plugin install contextops', note: '플러그인을 깐다 (훅 · Skill · CLI)' },
    { cmd: 'node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" setup', note: '이 저장소를 프로젝트에 잇는다 — 토큰은 저장소 밖에' },
    { cmd: '/contextops:init', note: 'Claude Code 안에서 한 번. 저장소를 훑어 첫 항목을 올린다' },
  ],
  foot: '그 다음은 팀장이 웹에서 승인하고, /contextops:sync 로 받는다.',
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
  /** Known limitations 는 앱에 페이지를 또 만들지 않는다 — 같은 문서가 두 곳이 된다. 저장소의 그 파일로 건다. */
  limitsPath: 'docs/KNOWN_LIMITATIONS.md',
} as const

/** 푸터 (DESIGN_BRIEF 화면 1 C-6: 제출 팀명 · GitHub 링크 · Known limitations 링크). 값은 `SUBMISSION_IDENTITY` 하나에서 온다. */
export const LANDING_FOOT = {
  brand: 'ContextOps',
  event: 'Wanted AI Championship 2026 출품작',
  team: { label: '팀', name: SUBMISSION_IDENTITY.team },
  github: { label: 'GitHub', href: SUBMISSION_IDENTITY.repoUrl },
  limits: { label: 'Known limitations', href: `${SUBMISSION_IDENTITY.repoUrl}/blob/main/${SUBMISSION_IDENTITY.limitsPath}` },
  health: { label: '서버 상태', href: '/api/v1/health' },
} as const

/** 문장 하나에 `/contextops:x` 가 여럿일 수 있다 — Skill 이름을 전부 뽑는다 (시험이 쓴다). */
export function skillNamesIn(text: string): string[] {
  return [...text.matchAll(/\/contextops:([a-z-]+)/g)].map((m) => m[1] as string)
}

// ---------------------------------------------------------------------

function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroCopy}>
        <span className="label">{LANDING_HEAD.eyebrow}</span>
        <h1 id="landing-title" className={styles.title}>{LANDING_HEAD.title}</h1>
        <p className={styles.subtitle}>{LANDING_HEAD.subtitle}</p>
        {/* ⚠ 버튼은 하나다. [2분 영상 보기] 는 영상이 생기면 여기 outline 한 줄이고,
            [로그인] 은 머리글에 이미 있다 — 덤프에서 「로그인 로그인」으로 겹쳐 보였다. */}
        <div className="row wrap">
          <a className="btn btn-primary" href={LANDING_HEAD.cta.href}>{LANDING_HEAD.cta.label}</a>
        </div>
        <p className="meta">{LANDING_HEAD.note}</p>
      </div>
      <BeforeAfter />
    </section>
  )
}

function BeforeAfter() {
  const { prompt, before, after } = BEFORE_AFTER
  return (
    <div className={styles.compare} aria-label="Before/After">
      <div className={`card ${styles.compareCol}`}>
        <span className="label ink-bad">{before.title}</span>
        <code className={styles.prompt}>$ {prompt}</code>
        {before.answers.map((a) => (
          <div key={a.who} className="col-tight">
            <span className="meta mono">{a.who} · {a.source}</span>
            <p>{a.text}</p>
          </div>
        ))}
        <span className="meta">{before.foot}</span>
      </div>
      <div className={`card ${styles.compareCol}`}>
        <span className="label ink-ok">{after.title}</span>
        <code className={styles.prompt}>$ {prompt}</code>
        <div className="col-tight">
          <p className="ink">{after.text}</p>
          <span className="meta">{after.detail}</span>
          <span className="meta mono">근거: {after.evidence.join(' · ')}</span>
        </div>
        <div className="row wrap">
          <span className="meta">{after.foot}</span>
          <span className="ctx-tag">ctx:{after.itemId}</span>
        </div>
      </div>
    </div>
  )
}

function ProductShots() {
  return (
    <section className={styles.section} aria-labelledby="landing-shots">
      <h2 id="landing-shots">{PRODUCT_TOUR.title}</h2>
      <p className="ink">{PRODUCT_TOUR.lead}</p>
      <div className={styles.shotRow}>
        {PRODUCT_SHOTS.map((shot, i) => (
          <figure key={shot.file} className={`card ${styles.shot}`}>
            {/*  ⚠ `<img>` 다 — Next 의 `<Image>` 는 최적화 서버를 타는데, 이 세 장은 이미
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
            <figcaption className="col-tight">
              <span className="ink">{shot.alt}</span>
              {/* 근거는 숫자·판정 옆에 있다 — 이 그림이 「어느 화면」인지 (P7 의 정신) */}
              <span className="meta mono">{shot.src}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="meta">{PRODUCT_TOUR.foot}</p>
    </section>
  )
}

function WhyNotGit() {
  return (
    <section className={styles.section} aria-labelledby="landing-why">
      <h2 id="landing-why">{WHY_NOT_GIT.title}</h2>
      <div className={styles.threeUp}>
        {WHY_NOT_GIT.cards.map((c) => (
          <div key={c.head} className={`card ${styles.tile}`}>
            <h3>{c.head}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
      <p className="ink">{WHY_NOT_GIT.line}</p>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="landing-how">
      <h2 id="landing-how">{HOW_IT_WORKS.title}</h2>
      <ol className={styles.steps}>
        {HOW_IT_WORKS.steps.map((s, i) => (
          <li key={s.head} className={`card ${styles.tile}`}>
            <span className="label mono">{i + 1}</span>
            <h3>{s.head}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Replay() {
  return (
    <section className={styles.section} aria-labelledby="landing-replay">
      <h2 id="landing-replay">{TERMINAL_REPLAY.title}</h2>
      <p className="ink">{TERMINAL_REPLAY.lead}</p>
      <TerminalReplay frames={REPLAY_FRAMES} milestone={TERMINAL_REPLAY.milestone} />
      <p className="meta">{TERMINAL_REPLAY.source}</p>
    </section>
  )
}

function TrustBoundary() {
  const { knows, unknown } = TRUST_BOUNDARY
  const rows = Math.max(knows.rows.length, unknown.rows.length)
  return (
    <section className={styles.section} aria-labelledby="landing-trust">
      <h2 id="landing-trust">{TRUST_BOUNDARY.title}</h2>
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
                <td>{knows.rows[i] ?? ''}</td>
                <td>{unknown.rows[i] ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">{TRUST_BOUNDARY.foot}</p>
    </section>
  )
}

function Install() {
  return (
    <section className={styles.section} aria-labelledby="landing-install">
      <h2 id="landing-install">{INSTALL_STEPS.title}</h2>
      <div className={`card scroll-x ${styles.codeBlock}`}>
        {/* 줄 사이는 진짜 개행이다 — `<pre>` 라서 그대로 서고, 글자로 뽑아 읽어도 네 줄이다. */}
        <pre className={styles.pre}>
          {INSTALL_STEPS.lines.map((l, i) => (
            <span key={l.cmd}>
              {i > 0 ? '\n' : ''}
              <span className="ink">{l.cmd}</span>
              <span className="meta">  # {l.note}</span>
            </span>
          ))}
        </pre>
      </div>
      <p className="meta">{INSTALL_STEPS.foot}</p>
    </section>
  )
}

function Foot() {
  return (
    <footer className={styles.foot}>
      <span className="ink">{LANDING_FOOT.brand}</span>
      <span className="meta">{LANDING_FOOT.event}</span>
      <span className="meta">{LANDING_FOOT.team.label} {LANDING_FOOT.team.name}</span>
      <a className="meta" href={LANDING_FOOT.github.href} rel="noreferrer">{LANDING_FOOT.github.label}</a>
      <a className="meta" href={LANDING_FOOT.limits.href} rel="noreferrer">{LANDING_FOOT.limits.label}</a>
      <a className="meta" href={LANDING_FOOT.health.href}>{LANDING_FOOT.health.label}</a>
    </footer>
  )
}

export function Landing() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={`ink ${styles.brand}`}>{LANDING_FOOT.brand}</span>
        <a className="btn btn-sm" href={LANDING_HEAD.login.href}>{LANDING_HEAD.login.label}</a>
      </header>
      <main className={styles.main}>
        <Hero />
        {/* 🔴 히어로 **바로 아래**다 — 심사위원은 10초 안에 판단하고, 그때 제품 화면이
            첫 스크롤 안에 있어야 한다 (FINDINGS 131 의 증상이 그것이었다). */}
        <ProductShots />
        <WhyNotGit />
        <HowItWorks />
        <Replay />
        <TrustBoundary />
        <Install />
      </main>
      <Foot />
    </div>
  )
}
