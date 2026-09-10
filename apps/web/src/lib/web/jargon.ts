// =====================================================================
//  낱말 풀이 — 화면의 글자 안에 있는 개발자 낱말을 사람 말로 (2026-09-10 저녁 · 사용자: 「여전히 비개발자가 봤을 때 하나도 모르겠다」)
//
//  ★ 왜 — 항목의 규칙·설명은 팀이 쓴 문장이라 「PSP」「지수 백오프」「5xx」「멱등키」가 그대로 선다. 문장을 고쳐 쓰면
//    팀의 말이 아니게 되고, 안 고치면 심사위원이 못 읽는다. 그래서 문장은 그대로 두고 **밑에 낱말 풀이 한 줄**을 단다
//    (랜딩의 「낱말 풀이」 띠와 같은 장치).
//  🔴 표는 여기 하나다. `test/web-jargon.test.ts` 가 **모든 항목이 데모 씨앗의 글자에 실제로 나오는지** 센다 —
//    아무 데도 안 나오는 풀이는 「정의만 있고 아무 일도 안 하는 것」이다.
//  ⚠ 판단을 말하지 않는다 — 낱말의 뜻만. 낱말을 더하려면 여기 한 줄 (term · means · match).
// =====================================================================

export type Jargon = { readonly term: string; readonly means: string; readonly match: RegExp }

export const JARGON: readonly Jargon[] = [
  { term: 'PSP', means: '결제사 — 카드 결제를 대신 처리해 주는 회사', match: /PSP/ },
  { term: '지수 백오프', means: '다시 시도할 때마다 기다리는 시간을 두 배씩 늘리는 방식', match: /지수 백오프|백오프/ },
  { term: '타임아웃', means: '정해진 시간 안에 응답이 없는 것', match: /타임아웃/ },
  { term: '5xx', means: '상대 서버 쪽 오류 (응답 번호 500번대)', match: /5xx/ },
  { term: '4xx', means: '우리 쪽 요청이 잘못됐다는 응답 (400번대)', match: /4xx/ },
  { term: '401', means: '「누구인지 확인이 안 됐다」는 거절 응답', match: /(^|[^0-9])401([^0-9]|$)/ },
  { term: '멱등키', means: '같은 요청을 두 번 보내도 한 번만 처리되게 붙이는 표시', match: /멱등키/ },
  { term: '웹훅', means: '결제사가 결과를 우리 서버에 알려 주는 알림', match: /웹훅/ },
  { term: 'payload', means: '알림에 실린 원본 내용', match: /payload/ },
  { term: 'PII', means: '개인정보 — 이름·카드번호처럼 사람을 특정하는 정보', match: /PII/ },
  { term: 'CVC', means: '카드 뒷면의 보안 숫자 세 자리', match: /CVC/ },
  { term: 'SLA', means: '약속한 처리 기한', match: /SLA/ },
  { term: 'p95', means: '100건 중 95건이 그 안에 들어온다는 뜻', match: /p95/ },
  { term: '배치', means: '모아 두었다가 정해진 시간에 한꺼번에 처리하는 것', match: /배치/ },
  { term: '원장', means: '돈의 움직임을 한 줄씩 적는 장부', match: /원장|ledger/ },
  { term: '토큰', means: '카드번호 대신 쓰는 대체 번호', match: /토큰/ },
  { term: '서명 검증', means: '알림이 정말 결제사가 보낸 것인지 확인하는 절차', match: /서명 검증|서명을 확인/ },
  { term: '에스컬레이션', means: '담당자를 넘어 윗선에 올리는 것', match: /에스컬레이션/ },
  { term: '인스턴스', means: '같은 프로그램이 도는 서버 한 대', match: /인스턴스/ },
  { term: '부동소수', means: '소수점 계산 방식 — 돈 계산에 쓰면 오차가 난다', match: /부동소수/ },
]

/** 글자 안에 나오는 낱말만, **나오는 차례로**, 한 번씩. 없으면 빈 목록 — 그때는 화면이 줄을 안 그린다. */
export function explain(text: string): Jargon[] {
  return JARGON
    .map((j) => ({ j, at: text.search(j.match) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.j)
}
