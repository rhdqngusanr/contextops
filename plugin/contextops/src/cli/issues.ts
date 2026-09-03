import type { ZodError } from 'zod'

// =====================================================================
//  계약 위반을 사람이 고칠 수 있는 줄로 바꾸는 자리 하나
//
//  ★ 왜 한 자리인가 — SPEC §8.3 이 `validate` 에 요구하는 것은 「오류 **위치** 출력」이다.
//    명령마다 다른 모양으로 찍으면 Skill 이 그걸 읽고 고칠 수가 없다.
//    형식은 하나다: `items.0.data.rule: 3자 이상이어야 한다`.
//
//  ⚠ 값을 찍지 마라 — 잘못된 값에 secret 이 들어 있을 수 있고, 그 순간
//    터미널 기록과 CI 로그에 남는다 (P1 은 「받지 않는다」이지 「안 쓴다」가 아니다).
// =====================================================================

export function describeIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length === 0 ? '(뿌리)' : issue.path.join('.')
    return `${path}: ${issue.message}`
  })
}
