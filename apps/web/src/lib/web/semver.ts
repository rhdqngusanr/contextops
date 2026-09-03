// =====================================================================
//  다음 버전 후보 (SPEC §6 「semver: patch=오탈자/설명, minor=항목 추가·변경,
//  major=Schema/템플릿 변경. 서버가 Proposal 내용으로 추천, owner가 조정」)
//
//  🔴 **여기서 「추천」하지 않는다.** SPEC 은 서버가 Proposal 내용으로 추천한다고
//     적지만 그 계산은 아직 없다 (PLAN P3·P4). 없는 판정을 화면이 지어내면
//     「AI가 판정했습니다」와 같은 종류의 거짓이 된다 (DESIGN_BRIEF §2-4).
//     그래서 화면은 **세 후보와 각각의 기준을 나란히 보여 주고 사람이 고른다.**
//     ⚠ 서버 추천이 생기면 그때 기본 선택만 바꾼다 — 이 표는 그대로 쓴다.
//
//  ★ 새 등급을 더할 일은 없다(semver 는 셋이다). 이 표가 있는 이유는 「무엇을 고르면
//    무슨 뜻인가」를 화면·시험·문서가 **한 곳에서** 읽게 하려는 것이다.
// =====================================================================

export const SEMVER_BUMPS = ['patch', 'minor', 'major'] as const
export type SemverBump = (typeof SEMVER_BUMPS)[number]

export const SEMVER_RULE: Record<SemverBump, { label: string; why: string }> = {
  patch: { label: 'patch', why: '오탈자·설명만 고쳤습니다' },
  minor: { label: 'minor', why: '항목을 더하거나 바꿨습니다' },
  major: { label: 'major', why: 'Schema·템플릿이 바뀌었습니다' },
}

/** `1.2.3` → 등급별 다음 값. 형식이 아니면 `null` 이다 (지어내지 않는다). */
export function nextSemver(current: string | null, bump: SemverBump): string | null {
  //  첫 발행에는 기준이 없다 — SPEC §6 의 시작점은 `1.0.0` 이다.
  if (current === null) return '1.0.0'
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current)
  if (!m) return null
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}
