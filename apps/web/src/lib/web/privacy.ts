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
  free: '붙여넣은 문서는 구조화를 위해 Google Gemini API(국외 서버)로 전송됩니다. 지금은 무료 티어라 Google 이 그 내용을 제품 개선에 쓸 수 있습니다. 비밀·개인정보는 붙여넣지 마세요.',
  paid: '붙여넣은 문서는 구조화를 위해 Google Gemini API(국외 서버)로 전송됩니다. 유료 티어라 Google 은 그 내용을 제품 개선에 쓰지 않습니다. 그래도 비밀·개인정보는 붙여넣지 마세요.',
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
        '팀·프로젝트 이름, 팀장이 직접 붙여 넣은 문서 원문, 그 문서에서 정리된 항목(제목·규칙·마일스톤), 경로·줄 번호·커밋 해시, 버전과 manifest 해시.',
        '저장소의 코드 본문, 환경변수·secret, 개인 CLAUDE.local.md, Auto Memory, Claude 와의 대화는 받을 수 없습니다 — 받는 항목이 allowlist 스키마로 정해져 있고 거기 없는 것은 문 앞에서 거절됩니다 (랜딩의 「서버가 아는 것 / 모르는 것」 표).',
        '로그인은 GitHub OAuth(Supabase Auth)입니다. 우리가 보관하는 것은 계정 식별자와 이메일뿐이고 비밀번호는 받지 않습니다.',
      ],
    },
    {
      heading: 'AI 가 처리하는 것',
      lines: [
        AI_TRANSFER_NOTICE_NOW,
        'Gemini 로 가는 것은 팀장이 붙여 넣은 문서와 이미 정리된 항목 문장뿐입니다. 팀원의 저장소 코드는 서버에 없으므로 갈 수 없습니다.',
        '승인 이후의 컴파일·배포에는 AI 가 없습니다. 팀원의 Claude Code 는 팀원 본인의 계정으로, 팀원의 기계에서만 돕니다 — 우리 서버가 대신 부르지 않습니다.',
      ],
    },
    {
      heading: '로그와 보관',
      lines: [
        '요청 로그에는 request_id · 경로 · 상태 · 처리 시간 · 팀/프로젝트/사용자 id 만 남습니다. 본문 · 토큰 · 문서 내용은 남기지 않습니다.',
        'AI 사용 장부(예산 계산용)에는 기능 이름 · 토큰 수 · 비용 · 요청자의 sha256 만 남습니다. 프롬프트도 응답도 저장하지 않습니다.',
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
