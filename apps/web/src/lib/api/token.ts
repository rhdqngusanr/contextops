import { createHash, randomBytes } from 'node:crypto'
import { TOKEN_PREFIX } from '@contextops/schema'

// =====================================================================
//  프로젝트 토큰 (SPEC §11 「`ctx_` + 32바이트 base64url · DB엔 sha256만 ·
//  응답 1회 표시 · 만료 90일」)
//
//  🔴 **토큰 원문은 이 파일 밖으로 나가면 응답 한 번뿐이다.** DB 에는 sha256 만
//     들어가고, 로그에는 아무것도 안 남는다 (`log.ts` 의 필드 표).
//
//  ★ 숫자는 전부 여기 상수다 — 길이·기한을 라우트에 적으면 발급과 검증이 갈라진다.
// =====================================================================

/**
 * 접두사. 세션 JWT 와 기기 토큰을 **한 헤더에서** 구별하는 근거다 (`auth.ts`).
 * ⚠ 값의 정본은 `packages/schema` 다 — 플러그인도 같은 값으로 토큰 모양을 판다
 *   (`DeviceToken`). 여기서 다시 적으면 한 글자 차이로 조용히 「알 수 없는 토큰」이 된다.
 */
export { TOKEN_PREFIX }
export const TOKEN_BYTES = 32
/** SPEC §11 「만료 90일」의 정본. `devices.expires_at` 을 이 값으로 채운다. */
export const TOKEN_TTL_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/** 원문과 해시를 함께 낸다 — 원문을 다시 만들 수 없으니 이 한 번에 둘 다 받아야 한다. */
export function mintToken(): { token: string; hash: string } {
  const token = TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('base64url')
  return { token, hash: hashToken(token) }
}

export function tokenExpiry(now: Date): Date {
  return new Date(now.getTime() + TOKEN_TTL_DAYS * MS_PER_DAY)
}
