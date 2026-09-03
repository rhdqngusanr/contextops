// =====================================================================
//  요청 로그 (SPEC §11 · 원칙 P1)
//
//  🔴 **남기는 것은 아래 필드뿐이다.** body·토큰·문서 본문·질의 문자열은 남기지 않는다.
//     P1 은 「받지 않는다」이지 「받아서 안 쓴다」가 아니다 — 로그에 남으면 이미 받은 것이다.
//
//  ★ 왜 표를 고정했나 — `console.log(req)` 한 줄이면 헤더의 Authorization 이 통째로
//    로그에 남는다. 찍는 자리를 하나로 두고 **필드를 열거**하면 그 사고가 안 난다.
//    새 필드를 더하려면 여기 한 줄 — 그리고 그게 P1 을 어기지 않는지 그 자리에서 판단하게 된다.
// =====================================================================

export type RequestLog = {
  request_id: string
  route: string
  method: string
  status: number
  latency_ms: number
  /** 식별자만이다. 이름·이메일은 안 남긴다. */
  user_id?: string
  project_id?: string
}

export function logRequest(entry: RequestLog): void {
  //  한 줄 JSON — 배포 환경(Vercel)의 로그 수집이 그대로 읽는다.
  console.log(JSON.stringify({ kind: 'request', ...entry }))
}
