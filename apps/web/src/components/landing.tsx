import styles from './landing.module.css'

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
//     이다. v1.1.0 은 승인된 제안이 그 항목을 고친 판이라(`scripts/demo-seed.ts` 의
//     `DEMO_PROPOSALS`), 씨앗의 v1.0.0 문장을 적으면 첫 화면과 앱이 다른 문장을 말한다.
//     `test/web-landing.test.ts` 가 그 표와 `scripts/seed.ts` 의 `paylabDrafts()` 에 대조한다 —
//     픽스처가 바뀌면 랜딩이 거짓말을 하기 전에 시험이 빨개진다.
//
//  ⚠ **없는 것은 안 만든다** — 이 저장소의 규칙이다 (누르면 아무 일도 안 하는 버튼 금지):
//    · [2분 영상 보기] — 영상이 없다 (PLAN P6). 영상이 생기는 바퀴에 버튼 한 줄이다.
//    · 터미널 재생(§10.4) · 스텝 썸네일 — 컴포넌트와 캡처가 없다 (PLAN P5 첫 행).
//    · GitHub · Known limitations 링크 — 공개 URL 이 아직 없다 (FINDINGS 122 · 🙋).
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

/** C-2. 어떻게 동작하나요 — 3단계. ⚠ 썸네일은 없다 (캡처가 아직 없다 · PLAN P5). */
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

/** 푸터. ⚠ GitHub · Known limitations 링크는 공개 URL 이 생기면 여기 한 줄씩이다 (FINDINGS 122). */
export const LANDING_FOOT = {
  brand: 'ContextOps',
  event: 'Wanted AI Championship 2026 출품작',
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
        <WhyNotGit />
        <HowItWorks />
        <TrustBoundary />
        <Install />
      </main>
      <Foot />
    </div>
  )
}
