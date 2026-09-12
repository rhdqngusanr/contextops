import type { Locale } from '../i18n/locale'
import { localized } from '../i18n/localized'
import { SITE } from './site'

// =====================================================================
//  개인정보 처리방침 + AI 전송 고지의 **정본** (INBOX H4 · 2026-09-10)
//
//  ★ 왜 코드에 있나 — 같은 문장을 세 자리가 쓴다: `/privacy` 화면 · 가져오기의 붙여넣기 칸 바로 밑
//    (사람이 문서를 넣기 **전**에 읽어야 하는 문장) · KNOWN_LIMITATIONS 의 「AI 처리 데이터의 행방」.
//    화면 둘은 여기서 읽고, 문서는 `test/web-privacy.test.ts` 가 대조한다.
//  ★ 무엇을 받는지는 **새로 적지 않는다** — 랜딩의 신뢰 경계 표(`TRUST_BOUNDARY`)가 정본이고 여기서 가리킨다.
//
//  🔴 **티어가 문장을 정한다.** Gemini 무료 티어의 약관은 입력을 Google 의 제품 개선에 쓸 수 있다고 적고
//     (ai.google.dev/gemini-api/docs/pricing 「Used to improve our products: Yes」 · 2026-09-10 읽음),
//     유료 티어(Tier 1 이상)는 쓰지 않는다. 지금 키는 무료 티어다 — 🙋 AI Studio 에 빌링을 연결하고 키를 바꾸면
//     `GEMINI_DATA_TIER` 를 `'paid'` 로 고친다. 그 한 줄이 화면 둘의 문장을 같이 바꾼다.
//  ⚠ 어느 티어든 「비밀·개인정보를 붙여넣지 마라」는 남는다 — 이 제품이 받는 문서는 팀장이 손수 붙여 넣은
//     팀 문서이지 사람의 개인정보가 아니다 (P1 은 코드·secret·대화를 막지만 붙여넣기 칸은 사람의 판단이다).
// =====================================================================

export type GeminiDataTier = 'free' | 'paid'

/** 🙋 Tier 1 로 바꾸는 날 `'paid'` 로. 값을 바꾸면 아래 문장이 갈린다 — 시험이 둘 다 참인지 본다. */
export const GEMINI_DATA_TIER: GeminiDataTier = 'free'

/**
 * 붙여넣기 칸 밑과 처리방침에 나가는 **한 문장** — 사람이 문서를 넣기 전에 읽는다.
 * ⚠ 「국외」와 「Gemini」는 어느 티어에서도 참이다. 학습 사용 여부만 티어가 가른다.
 */
export const AI_TRANSFER_NOTICE: Record<GeminiDataTier, string> = {
  //  「구조화」「API」「티어」는 개발자 낱말이다 — 붙여넣는 사람은 팀장이다 (2026-09-11).
  free: '붙여넣은 문서는 AI 로 정리하기 위해 Google 의 AI(Gemini · 국외 서버)로 보냅니다. 지금은 무료 요금제라 Google 이 그 내용을 제품 개선에 쓸 수 있습니다. 비밀·개인정보는 붙여넣지 마세요.',
  paid: '붙여넣은 문서는 AI 로 정리하기 위해 Google 의 AI(Gemini · 국외 서버)로 보냅니다. 유료 요금제라 Google 은 그 내용을 제품 개선에 쓰지 않습니다. 그래도 비밀·개인정보는 붙여넣지 마세요.',
}

/** 지금 배포가 사람에게 하는 말 — 티어 표를 읽는 자리는 여기 하나다. */
export const AI_TRANSFER_NOTICE_NOW = AI_TRANSFER_NOTICE[GEMINI_DATA_TIER]

export const PRIVACY_PATH = '/privacy'
export const PRIVACY_LABEL = '개인정보 처리방침'

export type PrivacySection = { readonly heading: string; readonly lines: readonly string[] }

/**
 * `/privacy` 의 본문. 문단이 아니라 **줄**로 적는다 — 심사위원이 30초 안에 훑는다.
 * ⚠ 여기 적은 것은 전부 코드가 실제로 하는 일이다. 바뀌면 문장을 먼저 고치지 말고 코드부터 봐라 —
 *   `test/web-privacy.test.ts` 가 몇 줄은 코드와 직접 대조한다 (로그 필드 · 게스트 수명 · 리셋 주기).
 */
export const PRIVACY: { readonly title: string; readonly updated: string; readonly sections: readonly PrivacySection[] } = {
  title: `${SITE.name} ${PRIVACY_LABEL}`,
  updated: '2026-09-10',
  sections: [
    {
      heading: '무엇을 받나',
      lines: [
        '팀·프로젝트 이름, 팀장이 직접 붙여 넣은 문서 원문, 그 문서에서 정리된 항목(제목·규칙·마일스톤), 경로·줄 번호·커밋 해시, 버전과 확인표(manifest) 해시.',
        '저장소의 코드 본문, 환경변수·secret, 개인 CLAUDE.local.md, Auto Memory, Claude 와의 대화는 받을 수 없습니다 — 받는 항목의 목록이 정해져 있고(allowlist) 거기 없는 것은 문 앞에서 거절됩니다 (랜딩의 「서버가 아는 것 / 모르는 것」 표).',
        '로그인은 GitHub OAuth(Supabase Auth)입니다. 우리가 보관하는 것은 계정 식별자와 이메일뿐이고 비밀번호는 받지 않습니다.',
      ],
    },
    {
      heading: 'AI 가 처리하는 것',
      lines: [
        AI_TRANSFER_NOTICE_NOW,
        'Gemini 로 가는 것은 팀장이 붙여 넣은 문서와 이미 정리된 항목 문장뿐입니다. 팀원의 저장소 코드는 서버에 없으므로 갈 수 없습니다.',
        '승인 이후의 문서 만들기·배포에는 AI 가 없습니다. 팀원의 Claude Code 는 팀원 본인의 계정으로, 팀원의 기계에서만 돕니다 — 우리 서버가 대신 부르지 않습니다.',
      ],
    },
    {
      heading: '로그와 보관',
      lines: [
        '요청 기록에는 요청 번호(request_id) · 주소 · 결과 · 걸린 시간 · 팀/프로젝트/사용자 번호만 남습니다. 본문 · 토큰 · 문서 내용은 남기지 않습니다.',
        'AI 사용 장부(예산 계산용)에는 기능 이름 · 토큰 수 · 비용 · 요청한 사람의 식별자를 암호화한 값(sha256)만 남습니다. 프롬프트도 응답도 저장하지 않습니다.',
        '샘플 팀(/demo)은 매일 03:00(KST)에 지우고 다시 심습니다. 게스트 세션은 하루 뒤 만료됩니다. 게스트가 남길 수 있는 것은 없습니다 — 읽기 전용입니다.',
        '팀 데이터의 삭제 요청은 아래 연락처로 보내 주세요. 대회 기간의 배포는 심사 종료 뒤 정리합니다.',
      ],
    },
    {
      heading: '연락처',
      lines: [
        '공개 저장소의 Issues 로 연락해 주세요. 이 문서와 코드는 같은 저장소에 있고, 문장이 코드와 다르면 그것이 버그입니다.',
      ],
    },
  ],
}

// =====================================================================
//  🔴 **언어별 한 벌** (2026-09-12 · 영어 모드)
//
//  ⚠ 이 절은 **법적 고지**다. 번역이 원문보다 약하거나 강하면 안 된다 — 「받을 수 없습니다」는
//    `cannot`(못 한다)이지 `do not`(안 한다)이다. 그 차이가 이 문서의 주장 전부다.
//  ⚠ 티어 문장(`AI_TRANSFER_NOTICE`)도 같이 언어를 탄다 — 붙여넣기 칸 밑에 뜨는 그 줄이다.
// =====================================================================

export const AI_TRANSFER_NOTICE_WORDS = localized<Record<GeminiDataTier, string>>({
  ko: AI_TRANSFER_NOTICE,
  en: {
    free: 'What you paste is sent to Google’s AI (Gemini, on servers outside Korea) so it can be sorted. We are on the free plan right now, which means Google may use that content to improve their products. Do not paste secrets or personal data.',
    paid: 'What you paste is sent to Google’s AI (Gemini, on servers outside Korea) so it can be sorted. We are on a paid plan, so Google does not use that content to improve their products. Even so, do not paste secrets or personal data.',
  },
})

/** 지금 배포가 이 언어로 하는 말. 티어를 읽는 자리는 여전히 하나다. */
export function aiTransferNoticeIn(locale: Locale): string {
  return AI_TRANSFER_NOTICE_WORDS[locale][GEMINI_DATA_TIER]
}

export const PRIVACY_WORDS = localized<typeof PRIVACY & { readonly label: string }>({
  ko: { ...PRIVACY, label: PRIVACY_LABEL },
  en: {
    label: 'Privacy policy',
    title: `${SITE.name} privacy policy`,
    updated: PRIVACY.updated,
    sections: [
      {
        heading: 'What we receive',
        lines: [
          'Team and project names, the document text a team lead pasted in themselves, the items sorted out of it (titles, rules, milestones), file paths, line numbers and commit hashes, and version and manifest checksums.',
          'We cannot receive the source code in your repository, environment variables or secrets, a personal CLAUDE.local.md, Auto Memory, or your conversations with Claude — the list of accepted item shapes is fixed (an allowlist), and anything not on it is refused at the door (see “What the server receives / never receives” on the home page).',
          'Sign-in is GitHub OAuth (Supabase Auth). All we keep is the account identifier and the email address; we never receive a password.',
        ],
      },
      {
        heading: 'What the AI processes',
        lines: [
          AI_TRANSFER_NOTICE_WORDS.en[GEMINI_DATA_TIER],
          'What goes to Gemini is only the documents a team lead pasted and the item sentences already sorted from them. Your teammates’ repository code is not on our server, so it cannot go anywhere.',
          'There is no AI in building or delivering files after approval. A teammate’s Claude Code runs under their own account, on their own machine — our server never calls it on their behalf.',
        ],
      },
      {
        heading: 'Logs and retention',
        lines: [
          'A request record holds only the request id, the route, the result, how long it took, and team/project/user ids. No bodies, no tokens, no document content.',
          'The AI usage ledger (used for budgeting) holds only the feature name, token counts, cost, and a hashed identifier (sha256) of who asked. Neither prompts nor responses are stored.',
          'The sample team (/demo) is wiped and re-seeded every day at 03:00 KST. A guest session expires after a day. A guest cannot leave anything behind — it is read-only.',
          'To have a team’s data deleted, write to the contact below. The deployment for the competition will be cleaned up after judging ends.',
        ],
      },
      {
        heading: 'Contact',
        lines: [
          'Reach us through Issues on the public repository. This document and the code live in the same repository — if the words and the code disagree, that is a bug.',
        ],
      },
    ],
  },
})

/**
 * `/privacy` **화면**이 쓰는 낱말 셋 — 본문이 아니라 머리·발의 글자다.
 * ★ 왜 화면 파일이 아니라 여기인가 — 화면(`app/privacy/page.tsx`)은 `localized()` 표를 갖지 않는 편이
 *   낫다. 표가 화면 안에 있으면 전체 게이트(`test/i18n.test.ts`)의 등록 목록에 **화면 파일**이 줄줄이
 *   들어가고, 그 목록은 「문구의 정본이 어디인가」를 말하는 목록이 아니게 된다.
 */
export const PRIVACY_PAGE_WORDS = localized({
  ko: {
    updated: '마지막 갱신 {on} · 이 문장은 코드와 같은 저장소에 있어 코드가 바뀌면 같이 바뀝니다.',
    toLanding: '랜딩으로',
    contact: 'Issues 로 연락하기',
  },
  en: {
    updated: 'Last updated {on} · these words live in the same repository as the code, so they change when the code does.',
    toLanding: 'Back to home',
    contact: 'Reach us through Issues',
  },
})
