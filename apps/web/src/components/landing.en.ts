import { SITE_TEXT } from '../lib/web/site'
import { DEMO_TOUR_EN } from '../lib/web/tour'
import { SUBMISSION_IDENTITY } from '../lib/web/submission'
import type { LandingText } from './landing'

// =====================================================================
//  랜딩의 **영어 한 벌** (2026-09-12)
//
//  🔴 이 파일은 `LandingText` 를 받는다 — 한국어 한 벌(`landing.tsx` 의 `LANDING_KO`)과
//     **모양이 같아야** 하고, 칸이 하나라도 빠지면 타입 검사에서 막힌다.
//
//  ★ 번역이 아니라 **같은 일을 하는 문장**이다. 한국어 쪽은 「비개발자 심사위원이 3분에
//    이해하는가」로 여러 번 고쳐진 문장이고(STATUS 의 여섯째·일곱째·여덟째 판), 영어 쪽도
//    같은 기준을 따른다 — 개발자 낱말은 문장 안에서 바로 풀고, 주장 하나에 장면 하나.
//
//  ⚠ **번역하면 안 되는 값들이 있다.** 그대로 둔 것과 이유:
//    · `source`·`itemId`·`evidence` 의 경로 — 실제 픽스처의 파일 경로다 (P7 의 역추적 대상)
//    · `cmd` — 실제로 치는 명령이다. 번역하면 그 줄은 작동하지 않는다
//    · `milestone.id`·`done_when` — 씨앗(`lib/demo/seed.ts`)의 글자와 같아야 한다.
//      🔴 **`done_when` 세 줄은 한국어 그대로다** — 데모 DB 에 심긴 문장이라 영어로 적으면
//      화면(Roadmap)과 랜딩이 다른 문장을 말한다. `EN_KEEPS_KOREAN` 에 이유와 함께 적혀 있다
//    · `team.name` — 사람이 적어 준 팀 이름이다 (고유명사)
//    · 재생 창(`legend`)의 숫자 — 녹화가 실제로 찍은 값이다
//
//  ⚠ 여기에 한국어가 남아 있으면 `test/web-landing-en.test.ts` 가 빨개진다.
//    일부러 남기는 것은 그 시험의 `EN_KEEPS_KOREAN` 에 **이유와 함께** 적어라.
// =====================================================================

export const LANDING_EN: LandingText = {
  head: {
    eyebrow: SITE_TEXT.en.eyebrow,
    title: SITE_TEXT.en.tagline,
    subtitle: SITE_TEXT.en.description,
    note: 'Fifteen minutes in a browser for the lead. One command for everyone else.',
    cta: { label: 'Explore the sample team', href: '/demo' },
    login: { label: 'Sign in', href: '/login' },
  },

  beforeAfter: {
    caption: 'We asked two teammates’ Claude Code the same question.',
    prompt: 'How many times should we retry a failed payment provider (PSP) call?',
    askKey: 'Question',
    plainKey: 'In plain words',
    before: {
      tag: 'Today',
      title: 'A different answer per person',
      answers: [
        {
          who: 'A',
          name: 'A’s Claude Code',
          read: 'read the team docs',
          source: 'paylab-docs/goals.md §3.1',
          text: 'The docs say retry up to 5 times with exponential backoff. Fixed intervals are not allowed.',
          plain: { count: 'up to 5 times', how: 'waiting a little longer after each try' },
        },
        {
          who: 'B',
          name: 'B’s Claude Code',
          read: 'read the actual code',
          source: 'paylab-api/src/payment/retry.ts:11',
          text: 'The code sets MAX_RETRY = 3 with a fixed 500ms interval.',
          plain: { count: 'up to 3 times', how: 'waiting the same 0.5 seconds every time' },
        },
      ],
      foot: 'A read the docs, B read the code. Neither is wrong, and the team is split in two.',
    },
    after: {
      tag: 'ContextOps',
      title: 'Team Context v1.1.0',
      name: 'A, B and C’s Claude Code',
      read: 'read the rule the team lead approved',
      itemId: 'item_policy_retry',
      text: 'PSP 호출은 최대 5회까지 재시도한다. 간격은 지수 백오프(0.5s·1s·2s·4s·8s)이고, '
        + '재시도 대상은 타임아웃과 5xx 뿐이다.',
      plain: {
        count: 'up to 5 times',
        how: 'stretching the wait from 0.5s to 8s, and only when the call timed out or the other server failed (5xx)',
      },
      detail: 'Mandatory rule (must) — checked during code review',
      evidenceKey: 'Evidence',
      evidence: ['paylab-docs/goals.md §3.1', 'paylab-api/src/payment/retry.ts:11–14', 'Approved by the team lead'],
      foot: 'A, B and C all receive this one approved sentence, at the same version.',
    },
  },

  tour: {
    title: DEMO_TOUR_EN.title,
    lead: `${DEMO_TOUR_EN.lead} The [Explore the sample team] button above walks you through the same four steps.`,
    stops: DEMO_TOUR_EN.stops,
    foot: 'Those screenshots are not mockups — an automated check boots the real app and retakes every one of them on each run, so a stale picture cannot survive. (check script: tools/walkthrough.ps1)',
  },

  why: {
    title: '“Can’t we just commit CLAUDE.md to git?”',
    glossary: [
      { term: 'CLAUDE.md', means: 'the team-rules file a developer’s AI (Claude Code) reads before it starts work' },
      { term: 'git', means: 'where code is stored, along with a record of what changed' },
      { term: 'repo', means: 'one such store — usually one per service' },
    ],
    exampleKey: 'For example',
    cards: [
      {
        head: 'Decisions are made outside the repo',
        body: 'Goals and policies get settled in documents and meetings. Copying them into CLAUDE.md is left to each developer, so everyone ends up with a different file.',
        example: '“Retry up to 5 times” was decided in a meeting, but only A put it in their file. B’s file does not have that line.',
      },
      {
        head: 'One team’s rules span several repos',
        body: 'The payments retry rule has to hold in the API, the webhook and the settlement repo alike. Copy it into each one and, some day, only one of them changes.',
        example: 'Copy the same rule into three repos and when one changes, the other two never hear about it.',
      },
      {
        head: 'git does not record the “why”',
        body: 'A change record (a diff) only says what changed. Without who decided it and on what grounds, neither the AI nor a person has a reason to trust the rule.',
        example: '“3 became 5” survives. Who decided it, in which meeting, and why does not.',
      },
    ],
    line: 'ContextOps turns scattered decisions into one set the team lead approves, and delivers it to every teammate’s AI at the same version.',
  },

  how: {
    title: 'How it works',
    lead: 'Three steps in the browser for the lead. One command for the developers.',
    plainKey: 'In plain words',
    steps: [
      {
        head: 'Bring it in and sort it out',
        body: 'Paste goal documents and meeting notes, or answer ten questions, and the AI proposes rules and milestones — then turns anything that contradicts itself into a question. People make the decisions.',
        plain: 'Collect what the team has to follow from scattered documents, meetings and code. Anything that disagrees comes back as a card to answer.',
        actors: ['Team lead · browser', 'AI · proposals and questions only'],
      },
      {
        head: 'Approve it and publish',
        body: 'Only the items the lead approves are bundled into one CLAUDE.md and given a version. Every teammate’s Claude Code receives that version, and a checksum proves the file they got is the same one. No AI is involved after approval.',
        plain: 'Only what the lead approved goes out — same version, everyone’s AI. Ask anyone now and you get the same answer.',
        actors: ['Team lead · browser', 'No AI · fixed rules only'],
      },
      {
        head: 'Progress shows up with its evidence',
        body: 'When a developer’s AI finishes a task, it reports which files it changed. The roadmap fills in milestone by milestone, and a person decides what counts as done.',
        plain: 'Each developer’s AI reports what plan item it just worked on, with the evidence. That is how you can see how far the plan actually got.',
        actors: ['Developer’s AI · inside Claude Code', 'Marking it done · a person'],
      },
    ],
  },

  ai: {
    title: 'How far does the AI go?',
    lead: 'The AI writes proposals and questions. People decide, and publishing runs by fixed rules with no AI at all.',
    who: { ai: 'AI', none: 'No AI', human: 'Person' },
    rows: [
      {
        head: 'It turns documents into candidate items',
        body: 'It pulls candidate rules and milestones out of what you pasted, and attaches where each one came from (the server-side model is Gemini). A candidate is only a candidate — the approve button belongs to a person.',
        hand: [{ who: 'ai', does: 'proposes items and cites where they came from' }, { who: 'human', does: 'presses approve' }],
      },
      {
        head: 'It finds decisions that contradict each other, and asks',
        body: 'When two documents — or a document and the code — say different things, it raises a conflict card. Which side to follow (“the current rule is right”, “the old rule is right”, “hold both”) is a person’s choice.',
        hand: [{ who: 'ai', does: 'raises the question as a conflict card' }, { who: 'human', does: 'picks a side, or holds' }],
      },
      {
        head: 'After approval, it is not used at all',
        body: 'Publishing and delivery run by fixed rules with no AI. The same approved set always produces byte-identical files, and a checksum proves which machine received what.',
        hand: [{ who: 'human', does: 'presses publish' }, { who: 'none', does: 'builds and delivers the files by fixed rules' }],
      },
      {
        head: 'The developer’s AI only reports',
        body: 'At the end of a task it submits which paths it changed, as evidence. It cannot declare itself finished — a person has to confirm.',
        hand: [{ who: 'ai', does: 'submits the changed file paths as evidence' }, { who: 'human', does: 'confirms it is done' }],
      },
    ],
  },

  replay: {
    title: 'Here is what the developer sees',
    lead: 'Open Claude Code and the installed plugin announces the new version; one line — /contextops:sync — pulls it down. '
      + 'When the work is done the AI reports it with evidence, and the Roadmap on the right moves at the same moment.',
    glossary: [
      { term: 'Claude Code', means: 'the AI coding tool developers use — it runs inside a terminal (the black window)' },
      { term: 'plugin', means: 'the small ContextOps part you snap into Claude Code — it announces new versions and pulls them in one line' },
      { term: 'Roadmap', means: 'the screen that shows how far the plan got, with the evidence' },
      { term: 'hook', means: 'a small thing the plugin runs automatically as Claude Code opens and closes — it announces new versions and reports work, and never changes your files' },
    ],
    legendTitle: 'What is happening',
    legend: [
      'The developer opens Claude Code and the plugin speaks up — the version applied here is v0.9.0, the team’s official one is v1.0.0, 8 files.',
      'One line, /contextops:sync, pulls it in — 8 files become v1.0.0, the originals go to a backup, and the server is told “applied”.',
      'The AI finishes its task and reports through /contextops:progress — which milestone, which criterion, and which file and line is the evidence.',
      'The Roadmap’s “evidence 0 / 3” becomes “1 / 3”. A person confirms completion — the AI never declares itself done.',
    ],
    source: 'Not invented dialogue — this is the output of actually running the plugin we ship. '
      + 'The work in between is cut, and only the typing and the gaps between lines are stretched enough to read. (raw recording: fixtures/replay/sync.json)',
    milestone: {
      id: 'PL-M1',
      title: 'Clean up retries and timeouts',
      //  🔴 아래 세 줄은 **한국어 그대로다** — 데모 DB 에 심긴 문장이라(`lib/demo/seed.ts`)
      //     영어로 적으면 랜딩과 실제 Roadmap 화면이 다른 문장을 말한다. `EN_KEEPS_KOREAN` 참고.
      done_when: [
        'PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다',
        '모든 외부 호출에 타임아웃이 걸려 있다',
        '재시도 횟수와 간격이 설정값으로 빠져 있다',
      ],
    },
  },

  trust: {
    title: 'The server never sees your code',
    knows: {
      head: 'What the server receives',
      rows: [
        'Team and project names and IDs',
        'Sorted items (titles, rules, milestones)',
        'Document text the lead registered themselves',
        'File paths, line numbers, commit hashes',
        'Versions and checksums',
      ],
      plain: [
        'The team name and the project name',
        'The rule sentences, once sorted',
        'Only what the lead pasted in by hand',
        'Just the position — “which line”',
        'Which version, and whether the contents match',
      ],
    },
    unknown: {
      head: 'What it never receives',
      rows: [
        'The source code in your repository',
        'Environment variables and secrets',
        'Personal config files (CLAUDE.local.md)',
        'Claude’s personal memory (Auto Memory)',
        'Your conversations with Claude',
      ],
      plain: [
        'The source code itself',
        'Passwords, API keys, any credentials',
        'Notes an individual keeps on the side',
        'Memory the AI built up on its own',
        'Everything said to and from the AI',
      ],
    },
    foot: 'Only items that pass a fixed shape (a schema) go to the server. Source code, secrets, personal memory and conversations never leave your machine under any circumstance, and the hook that runs automatically on the developer’s side never changes a file.',
  },

  install: {
    title: 'Two commands to install, then it lives inside Claude Code',
    requires: 'Node 22 or newer is required (node -v) — the hooks and the CLI run on Node.',
    who: 'Developers only. There is nothing for the team lead to install — the browser is enough.',
    lines: [
      { where: 'Terminal', cmd: `claude plugin marketplace add ${SUBMISSION_IDENTITY.marketplaceRef}`, note: 'registers the plugin repository' },
      { where: 'Terminal', cmd: 'claude plugin install contextops', note: 'installs the hooks that run automatically, the commands inside Claude Code (Skills), and the CLI together' },
      { where: 'In Claude Code', cmd: '/contextops:setup <the arguments the Sync screen gave you>', note: 'Inside Claude Code. The web app’s Sync → [Add device] hands you this whole line — the token stays outside your repository' },
      { where: 'In Claude Code', cmd: '/contextops:init', note: 'Once, inside Claude Code. It scans the repository and submits the first items' },
    ],
    foot: 'After that the lead approves in the browser, and developers pull it with /contextops:sync.',
  },

  foot: {
    brand: 'ContextOps',
    navLabel: 'Jump to a section',
    event: 'Built for the Wanted AI Championship 2026',
    //  ⚠ 팀 이름은 고유명사라 그대로다 (`EN_KEEPS_KOREAN`).
    team: { label: 'Team', name: SUBMISSION_IDENTITY.team },
    github: { label: 'GitHub', href: SUBMISSION_IDENTITY.repoUrl },
    limits: { label: 'Known limitations', href: `${SUBMISSION_IDENTITY.repoUrl}/blob/main/${SUBMISSION_IDENTITY.limitsPath}` },
    health: { label: 'Server status', href: '/api/v1/health' },
    privacy: { label: 'Privacy policy', href: '/privacy' },
  },

  nav: {
    'landing-why': 'Why not git',
    'landing-how': 'How it works',
    'landing-ai': 'AI use',
    'landing-install': 'Install',
  },
}
