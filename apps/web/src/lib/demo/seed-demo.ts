import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  PROGRESS_SOURCES, PROGRESS_STATUSES, REPORTABLE_SYNC_STATUSES, SourceRef, TEAM_ROLES, type Manifest,
} from '@contextops/schema'

import { GET as listItems } from '../../app/api/v1/projects/[id]/context-items/route'
import { GET as getManifest } from '../../app/api/v1/projects/[id]/packs/[semver]/manifest/route'
import { POST as createProposal } from '../../app/api/v1/projects/[id]/proposals/route'
import { POST as postProgress } from '../../app/api/v1/projects/[id]/progress/route'
import { POST as postSyncReport } from '../../app/api/v1/projects/[id]/sync-reports/route'
import { POST as createToken } from '../../app/api/v1/projects/[id]/tokens/route'
import { POST as publishVersion } from '../../app/api/v1/projects/[id]/versions/publish/route'
import { POST as approveProposal } from '../../app/api/v1/proposals/[id]/approve/route'
import { POST as rejectProposal } from '../../app/api/v1/proposals/[id]/reject/route'
import { POST as submitProposal } from '../../app/api/v1/proposals/[id]/submit/route'
import { getDb } from '../../db/client'
import { contextVersions, progressEvents, syncReports, teamMembers, users } from '../../db/schema'
import { fixtureJson } from './fixtures'
import { dataOf, params, req } from './inproc'
import { MILESTONES, seedEmail, seedPaylab, seedSession, type SeedResult } from './seed'
import { DEMO_GUEST_SUBJECT, DEMO_TENANT } from './tenant'

// =====================================================================
//  🔴 **게스트 데모 테넌트를 심는 자리 하나** (SPEC §9 「게스트 데모」 · §10.3)
//
//    부르는 자리 셋 — 전부 이 함수 하나다:
//      · `GET /cron/demo-reset` (배포 · Vercel Cron 이 매일) — `reset.ts` 가 지우고 다시 심는다
//      · `pnpm --filter web demo:db` (개발용 씨앗 서버 · `scripts/demo-server.ts`)
//      · `test/demo-guest.test.ts` · `scripts/dump-demo.tsx`
//
//  ★ 무엇을 만드나 — paylab 씨앗(`seed.ts`) 위에 **데모에만 있는 것** 넷을 얹는다:
//    ① 팀원 5명과 그들의 소속 ② 발행 두 번(v1.0.0 → v1.1.0) ③ 기기 14대와 마지막 보고(`SYNC_STATUSES` 5종을 전부 한 번씩)
//    ④ 진행 보고 6건. 항목·문서는 한 줄도 여기서 안 만든다 — 정본은 `seed.ts` 하나다.
//
//  🔴 **읽는 값은 `fixtures/seed/demo.json` 이고 여기서 Zod 로 판다.** 픽스처도 외부
//     입력이다 — 손으로 캐스트하면 오타 하나가 「기기 11대짜리 데모」로 조용히 통과한다.
//
//  ⚠ **팀 소속(`team_members`)만 DB 에 직접 넣는다.** 사람을 팀에 넣는 라우트가 아직
//    없어서다 (SPEC §5 에 초대 API 가 없다). 라우트가 생기면 여기를 그 라우트로 바꿔라 —
//    직접 넣는 자리가 늘어나면 「권한이 어떻게 생기나」가 코드 두 곳으로 갈린다.
//  ⚠ 보고 시각(`reported_at`·`created_at`)도 직접 고친다. 라우트는 「지금」으로만 적는데,
//    데모 화면이 말해야 하는 것은 **「4일 전」** 이다 (DESIGN_BRIEF §4 화면 9).
//    ⚠ 그래서 시각은 **보고를 라우트로 만든 다음** 그 행 하나만 옮긴다 — 보고 자체를
//      손으로 넣으면 계약을 안 지나고, 계약이 넓어질 때 데모만 조용히 낡는다.
//
//  ⚠ 여기는 **심기만** 한다. 이미 심어진 데모를 지우는 것은 `teardown.ts`, 둘을 잇는 것은
//    `reset.ts` 다 — 심는 코드에 지우는 코드를 섞으면 시험·개발용 서버가 빈 DB 에서도
//    지우기부터 돌게 된다.
// =====================================================================

// ---------------------------------------------------------------------
//  ① 픽스처 계약 — `fixtures/seed/demo.json`
// ---------------------------------------------------------------------

/** 발행한 버전을 **이름으로** 가리킨다. 픽스처에 semver 를 적지 않는 이유는 그 파일의 주석에. */
const VersionRef = z.enum(['official', 'previous'])
type VersionRef = z.infer<typeof VersionRef>

const DemoSeedFile = z.object({
  members: z.array(z.object({
    sub: z.string().min(1),
    name: z.string().min(1),
    role: z.enum(TEAM_ROLES),
  }).strict()).min(1),
  devices: z.array(z.object({
    member: z.string().min(1),
    name: z.string().min(1),
    //  ⚠ `null` 이 「한 번도 보고 안 했다」다 — 빼먹은 것과 구별되게 **명시**를 요구한다.
    report: z.object({
      status: z.enum(REPORTABLE_SYNC_STATUSES),
      version: VersionRef,
      hours_ago: z.number().min(0).max(24 * 365),
    }).strict().nullable(),
  }).strict()).min(1),
  progress: z.array(z.object({
    device: z.string().min(1),
    milestone_id: z.string().min(1),
    status: z.enum(PROGRESS_STATUSES),
    criterion: z.string().min(1).optional(),
    summary: z.string().min(1),
    evidence: z.array(z.object({
      path: z.string().min(1),
      start_line: z.int().min(1).optional(),
      end_line: z.int().min(1).optional(),
    }).strict()).default([]),
    source: z.enum(PROGRESS_SOURCES),
    hours_ago: z.number().min(0).max(24 * 365),
  }).strict()).default([]),
//  ⚠ `strict()` 가 아니다 — 픽스처의 `_`·`_members` 같은 주석 칸을 허용한다.
//    (JSON 에는 주석을 못 쓰는데, 이 파일은 **왜 이렇게 생겼는지**를 같이 들어야 한다.)
})
export type DemoSeedFile = z.infer<typeof DemoSeedFile>

/** `fixtures/` 아래 상대 경로 — 지우는 쪽(`teardown.ts`)도 같은 파일에서 사람 목록을 읽는다. */
export const DEMO_SEED_FILE = 'seed/demo.json'

export function readDemoSeedFile(): DemoSeedFile {
  return DemoSeedFile.parse(fixtureJson(DEMO_SEED_FILE))
}

/**
 * 🔴 **데모가 만드는 사람의 `sub` 전부** — 팀장 · 픽스처의 팀원 · 게스트.
 * ★ 왜 한 함수인가 — 지우는 쪽이 이 목록을 따로 들면 픽스처에 팀원을 한 명 더한 날
 *   그 사람의 `users` 행이 리셋마다 남는다. 심는 쪽과 지우는 쪽이 **같은 목록**을 읽어야 한다.
 */
export function demoSubjects(file: DemoSeedFile = readDemoSeedFile()): string[] {
  return [DEMO_TENANT.ownerSubject, ...file.members.map((m) => m.sub), DEMO_GUEST_SUBJECT]
}

// ---------------------------------------------------------------------
//  ② 제안 — 대상 항목 id 가 코드에만 있어서 픽스처가 아니라 여기 산다
// ---------------------------------------------------------------------

/**
 * 씨앗이 **실제로 심는** 마일스톤 id (`PL-M1`·`PL-M2`·`PL-M3`). 표를 직접 읽으므로
 * `MILESTONES` 에 한 줄이 늘면 여기도 저절로 는다 — 손으로 베낀 목록을 두지 않는다.
 */
type DemoMilestoneId = (typeof MILESTONES)[number][1]

/**
 * 데모의 제안 셋. **화면 6 이 세 갈래를 다 그리게** 하는 것이 목적이다:
 * 승인되어 v1.1.0 에 실린 것 · 사유와 함께 거절된 것 · 아직 결정을 기다리는 것.
 *
 * ⚠ `target` 은 `src/lib/demo/seed.ts` 가 만드는 항목의 id 다. 없는 id 를 적으면 발행이
 *   그 제안에서 롤백되므로 **심는 도중에 터진다** — 조용히 넘어가지 않는다.
 * ★ 한 줄 더하는 절차: ①이 표에 한 줄 ②`decision` 이 `approved` 면 그 항목이 v1.1.0 의
 *   Pack 본문에서 바뀐다 — 바뀐 문장을 눈으로 확인해라.
 */
type DemoProposal = {
  author: string
  title: string
  summary: string
  /** `src/lib/demo/seed.ts` 가 만드는 항목의 id. 없으면 심는 도중에 던진다. */
  target: string
  /** 바뀔 `data`. **지금 항목에서 읽어 온 초안 위에 덮는다** (`draftFor()`) — 그래서
   *  화면 6 의 before/after Diff 가 **진짜 지금 문장**과 견준다. */
  data: Record<string, unknown>
  reason: string
  /**
   * 문서·코드 근거만으로 부족한 행에 **사람이 직접 적는 근거 한 줄** (`{kind:'manual'}`).
   * 🔴 제안의 근거는 기본으로 **대상 항목의 `source_refs`** 다 (`draftFor()` 가 같이 돌려준다) — 실제로 심어진
   *    문서판·코드 경로를 가리켜야 P7 이 성립한다. 예전엔 `reason` 을 그대로 근거에 복사해 같은 문장이
   *    「근거」와 「이유」에 두 번 섰다 (2026-09-11).
   * ⚠ `reason` 과 **다른 문장**이어야 한다 — 근거는 「무엇을 봤나」이고 이유는 「왜 바꾸나」다.
   */
  evidenceNote?: string
  /**
   * 🔴 이 제안이 **어느 마일스톤을 움직이나** (`relates_to` · FINDINGS 164).
   *    화면 6(제안)과 화면 8(로드맵)을 잇는 **유일한 줄**이다. 씨앗이 한 줄도 안 쓰면
   *    「관련 마일스톤」 칸이 전부 「—」로 서서, 두 화면이 이어진 적 없는 제품처럼 보인다.
   * ⚠ 값은 **씨앗이 실제로 심는 id** 여야 한다 — 그래서 타입이 `MILESTONES` 를 직접 읽는다.
   *   없는 id 는 화면에 뜻 없는 칩을 세우는데, 여기서 타입이 먼저 빨개진다.
   * ⚠ **비워 두는 줄도 하나 남겨라** — 「관련 마일스톤이 없는 제안」의 「—」도 화면의 한 갈래다.
   */
  relatesTo?: readonly DemoMilestoneId[]
  /**
   * 🔴 화면 6 이 그려야 하는 **다섯 갈래** (`PROPOSAL_STATUSES` · `PROPOSAL_STATUS_CHIP`):
   * `published`(승인 → v1.1.0 에 실렸다) · `approved`(승인됐고 **다음 발행을 기다린다**) ·
   * `rejected`(사유와 함께) · `pending`(제출됐고 아직 결정 전 = `submitted`) ·
   * `draft`(**아직 제출도 안 했다** — `contextops propose` 가 만들어 놓기만 한 것).
   * ⚠ `approved` 와 `published` 를 둘 다 두는 이유 — 승인은 발행이 아니다. 하나만 두면
   *   화면에서 그 둘을 구별하는 칩이 데모에 한 번도 안 선다.
   * ⚠ `draft` 도 같은 이유다 (FINDINGS 163) — 화면 6 의 거르개는 `PROPOSAL_STATUSES` 를
   *   그대로 읽어 칩 **다섯**을 그리는데, 씨앗이 넷만 만들면 「초안」 칩은 늘 빈 목록이다.
   *
   * ★ 갈래를 하나 더하려면: ① 이 union 에 값 ② 아래 `DEMO_PROPOSALS` 에 한 줄
   *   ③ 심는 반복문(`③ 심기`)에서 그 값이 어디까지 가는지 한 줄. 수를 세는 자리는
   *   `demo-guest.test.ts` 화면 6 시험 하나뿐이고, 그것은 **표를 돌며** 센다.
   */
  decision: 'published' | 'approved' | 'rejected' | 'pending' | 'draft'
  note?: string
}

//  ⚠ 내보내는 이유는 하나다 — 랜딩의 After 답이 **이 표의 published 행**과 같은지
//    `test/web-landing.test.ts` 가 잰다. 게스트가 v1.1.0 에서 보는 문장과 첫 화면의 문장이
//    갈리면 그게 첫 화면의 거짓말이다. **화면은 이 표를 import 하지 않는다** — 하면 데모
//    데이터가 브라우저 번들에 실린다 (`tenant.ts` 머리의 같은 주의). 읽는 것은 시드뿐이다.
export const DEMO_PROPOSALS: DemoProposal[] = [
  {
    author: 'demo-member-junho',
    //  제목은 「~한다」 한 문법으로 (2026-09-11) — 한 표 안에 문장 조각·명사형·평서문이 섞이면 「대충」으로 읽힌다.
    title: '재시도 간격을 점점 늘리는 방식으로 바꾼다',
    summary: '0.5초 고정이면 결제사(PSP)가 밀릴 때 같은 순간에 다시 몰립니다.',
    target: 'item_policy_retry',
    data: {
      rule: 'PSP 호출은 최대 5회까지 재시도한다. 간격은 지수 백오프(0.5s·1s·2s·4s·8s)이고, '
        + '재시도 대상은 타임아웃과 5xx 뿐이다.',
      severity: 'must',
      enforcement: 'review',
    },
    reason: 'goals.md §3.1 이 말하는 「5회 + 백오프」와 코드가 어긋나 있습니다.',
    //  M1 의 완료 기준이 「재시도 횟수와 간격」 그것이다.
    relatesTo: ['PL-M1'],
    decision: 'published',
  },
  {
    author: 'demo-member-seoyeon',
    title: '결제 성공률 목표를 99.9%로 올린다',
    summary: '분기 목표를 한 칸 올리자는 제안입니다.',
    target: 'item_goal_success_rate',
    data: { outcome: '결제 승인 성공률 99.9% 를 유지한다', metric: '승인 성공률(월)' },
    reason: '이번 분기 실측이 99.7% 였습니다.',
    //  목표 문서(§2 표)만으로는 「올리자」의 근거가 안 된다 — 실측을 본 자리를 적는다.
    evidenceNote: '이번 분기 승인 성공률 실측 99.7% (대시보드)',
    //  ⚠ 이 하나는 **일부러 비운다** — 분기 목표는 세 마일스톤 중 어느 것도
    //  안 움직인다. 그래야 화면 6 의 「—」도 한 줄 선다 (FINDINGS 164).
    decision: 'rejected',
    note: '근거가 한 분기치뿐이다. 목표는 반기 실측을 보고 정하자 — 다음 분기에 다시 올려 달라.',
  },
  {
    author: 'demo-member-doyun',
    title: '결제사 알림(웹훅)의 서명 확인을 자동 검사로 강제한다',
    summary: '코드 리뷰에서 두 번 놓쳤습니다. 자동 검사로 막자는 제안입니다.',
    target: 'item_policy_webhook_sig',
    data: {
      rule: '서명 검증 전에는 payload 를 파싱하지도 저장하지도 않는다. 검증 실패는 401 로 끊는다.',
      severity: 'must',
      enforcement: 'hook',
    },
    reason: '리뷰만으로는 두 번 새어 나갔습니다.',
    //  문서(§3.5)는 규칙을 말할 뿐 「새어 나갔다」의 근거가 아니다 — 그것을 잡은 기록을 적는다.
    evidenceNote: '코드 리뷰에서 서명 확인 누락을 두 번 잡은 기록',
    //  M3 의 경로가 `src/webhook/` 이고 완료 기준에 웹훅 payload 줄이 있다.
    relatesTo: ['PL-M3'],
    decision: 'pending',
  },
  {
    author: 'demo-member-haeun',
    title: '환불 처리 기한(SLA)을 24시간으로 못 박는다',
    summary: '문서에는 있는데 항목에는 시간이 적혀 있지 않습니다.',
    target: 'item_policy_refund',
    data: {
      rule: '환불 요청은 접수 후 24시간 안에 처리한다. 외부 호출에는 타임아웃을 건다.',
      severity: 'must',
      enforcement: 'review',
    },
    reason: 'goals.md §3.2 의 「환불 SLA 24h」가 항목에 안 적혀 있습니다.',
    //  둘을 적는 유일한 줄이다 — 이 제안은 M2(환불 SLA 계측)의 재료이면서
    //  문장 뒤의 「외부 호출에는 타임아웃」이 M1 의 완료 기준을 같이 건드린다.
    //  ★ 칩 **둘**이 서는 행이 하나 있어야 화면 6 의 `row wrap` 이 그려진 적이 생긴다.
    relatesTo: ['PL-M2', 'PL-M1'],
    //  ⚠ 이 하나는 v1.1.0 **발행 뒤에** 승인한다 — 그래야 「승인됐지만 아직 안 실린」
    //    상태가 데모에 선다.
    decision: 'approved',
  },
  {
    author: 'demo-member-seoyeon',
    title: '카드 정보 제약에 「토큰 보관 기간」을 적는다',
    summary: '토큰만 받는다고는 적혀 있는데, 그 토큰을 얼마나 오래 들고 있는지는 없습니다.',
    target: 'item_constraint_card',
    data: {
      statement: '카드 원본 정보를 저장하지 않는다 — 토큰만 받는다. '
        + '받은 토큰은 결제 확정 후 90일까지만 보관하고 그 뒤에는 지운다.',
    },
    reason: '보관 기간이 항목에 없어서 리뷰마다 사람마다 다른 숫자를 말합니다.',
    //  M3(PII 마스킹·감사 로그)가 「언제까지 들고 있나」를 말하는 자리다.
    relatesTo: ['PL-M3'],
    //  ⚠ 이 하나는 **제출하지 않는다** — 「올리다 만 초안」이 화면 6 에 한 줄 서야
    //    「초안」 칩이 빈 목록이 아니게 된다 (FINDINGS 163).
    decision: 'draft',
  },
]

// ---------------------------------------------------------------------
//  ③ 심기
// ---------------------------------------------------------------------

export type DemoSeedResult = {
  teamSlug: string
  projectSlug: string
  projectId: string
  /** 공식 버전과 그 앞 버전. 기기 보고가 이 둘을 가리킨다. */
  versions: Record<VersionRef, { semver: string; manifestHash: string }>
  itemCount: number
  memberCount: number
  deviceCount: number
  reportCount: number
  progressCount: number
  proposalCount: number
}

function hoursAgo(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000)
}

/**
 * 🔴 **첫 판(v1.0.0)이 며칠 전에 나왔나** — 발행 뒤 그 행의 `published_at` 을 이만큼 뒤로 民다.
 *
 * ★ 왜 필요한가 — `published_at` 은 `defaultNow()` 다. 씨앗은 두 판을 몇 초 안에 연달아
 *   발행하므로 화면에는 **같은 분**으로 둘 다 찍힌다. 「두 판이 같은 순간에 나왔다」는
 *   버전 목록은 처음 보는 사람에게 **지어낸 데이터**로 읽힌다 (2026-09-11 · 375px 캡처에서 봤다).
 *
 * 🔴 **기기의 가장 오래된 보고보다 앞서야 한다.** 픽스처의 최대 `hours_ago` 는 120(5일)이고,
 *    「5일 전에 v1.0.0 을 받았다」가 성립하려면 v1.0.0 은 그 전에 있어야 한다. 168 = 7일.
 *    ⚠ 픽스처의 `hours_ago` 를 이 값보다 크게 늘리면 「받기 전에 받은 기기」가 생긴다 —
 *      `test/demo-guest.test.ts` 가 그 짝을 잰다.
 */
export const DEMO_FIRST_VERSION_HOURS_AGO = 168

/**
 * 🔴 **팀원의 세션 JWT — 이름과 이메일을 claims 에 실어서** 만든다.
 *
 * ★ 왜 이 함수가 있나 — 덤프를 눈으로 읽다가 잡았다: 화면 9 의 「팀원」 칸과 화면 6 의
 *   「작성자」 칸에 **`demo-member-haeun` 같은 sub 가 그대로** 그려지고 있었다.
 *   원인은 `sessionActor()` 가 로그인할 때마다 `users.name` 을 **claims 로 덮어쓰기**
 *   때문이다 (진짜 OAuth 도 그렇게 돈다 — 그게 이름의 출처다). `seedSession` 의
 *   기본 이름이 sub 라서, 기기 토큰을 발급받는 순간 심어 둔 한글 이름이 사라졌다.
 * ⚠ 그러니 **이름의 정본은 픽스처이고, 그 이름이 claims 를 타고 들어가야 한다.**
 *   `addMember` 에서만 이름을 넣으면 다음 로그인 한 번에 지워진다.
 */
function memberJwt(file: DemoSeedFile, sub: string): string {
  const member = file.members.find((m) => m.sub === sub)
  if (!member) throw new Error(`[demo-seed] 팀원 목록에 ${sub} 가 없다`)
  return seedSession(sub, member.name)
}

/**
 * 팀원 한 명을 팀에 넣는다 — **users + team_members 를 직접** 만든다.
 * ⚠ 초대 라우트가 생기면 이 함수가 그 라우트를 부르게 바꿔라 (파일 머리의 주의).
 */
async function addMember(
  teamId: string,
  member: { sub: string; name: string; role: 'owner' | 'member' },
): Promise<string> {
  const db = getDb()
  const [user] = await db
    .insert(users)
    .values({ authSubject: member.sub, email: seedEmail(member.sub), name: member.name })
    .onConflictDoUpdate({ target: users.authSubject, set: { name: member.name } })
    .returning({ id: users.id })
  if (!user) throw new Error(`[demo-seed] ${member.sub} 의 users 행을 만들지 못했다`)

  await db
    .insert(teamMembers)
    .values({ teamId, userId: user.id, role: member.role, status: 'active' })
    .onConflictDoNothing()
  return user.id
}

/**
 * 🔴 제안의 초안을 **지금 항목에서** 만든다 — `data` 만 갈아 끼운다.
 *
 * ★ 왜 초안을 손으로 안 적나 — 손으로 적으면 `source_refs`·`scope`·`priority` 를 다시
 *   적게 되고, 그러면 승인된 제안이 항목의 **근거를 갈아 치운다**. 근거는 문서에서 왔고
 *   제안이 바꾸는 것은 문장이다 (P7 — 태그가 가리키는 원문이 그대로 남아야 한다).
 * ⚠ 서버가 매기는 셋(`project_id`·`status`·`revision`)과 화면용 한 칸(`updated_at`)은
 *   초안에 없는 필드다 (`DraftBase`). 실으면 계약이 400 으로 막는다.
 * ★ `sourceRefs` 도 같이 돌려준다 — 제안의 **근거**가 대상 항목이 실제로 가리키는 문서판·코드 경로가 되게
 *   (2026-09-11 · 예전엔 `reason` 을 근거에 복사해 같은 문장이 두 번 섰다). 계약(`SourceRef`)으로 판다 —
 *   라우트 응답도 외부 입력이다.
 */
async function draftFor(
  seed: SeedResult, owner: string, p: DemoProposal,
): Promise<{ draft: Record<string, unknown>; sourceRefs: SourceRef[] }> {
  const list = await dataOf(await listItems(
    req('GET', `/api/v1/projects/${seed.projectId}/context-items?limit=100`, { auth: owner }),
    params({ id: seed.projectId }),
  ))
  const items = list.items as Record<string, unknown>[]
  const current = items.find((i) => i.id === p.target)
  if (!current) throw new Error(`[demo-seed] 제안의 대상 항목 ${p.target} 이 씨앗에 없다`)

  //  🔴 **화면용 칸을 떼고 초안으로 만든다.** `ContextItemDraft` 는 `.strict()` 라
  //     여분의 키가 하나만 있어도 제안 만들기가 400 이다.
  //  ⚠ 뗄 것이 늘어나는 자리다 — `ContextItemView` 에 「화면만 읽는 칸」을 더하면
  //    여기도 한 줄이다 (`owner` 가 그 첫 예다 · FINDINGS 168). 안 떼면 씨앗이 통째로 죽는다.
  const {
    project_id: _p, status: _s, revision: _r, updated_at: _u,
    owner: _o,
    ...draft
  } = current
  return { draft: { ...draft, data: p.data }, sourceRefs: z.array(SourceRef).parse(draft.source_refs) }
}

/** 발행된 버전의 Manifest 를 **라우트로** 읽는다 (화면·플러그인이 받는 것과 같은 것). */
async function manifestOf(seed: SeedResult, owner: string, semver: string): Promise<Manifest> {
  const res = await getManifest(
    req('GET', `/api/v1/projects/${seed.projectId}/packs/${semver}/manifest`, { auth: owner }),
    params({ id: seed.projectId, semver }),
  )
  const data = await dataOf(res)
  return data as unknown as Manifest
}

async function publish(seed: SeedResult, owner: string, semver: string, base: string | null, summary: string): Promise<{
  id: string
  semver: string
  manifestHash: string
}> {
  const data = await dataOf(await publishVersion(
    req('POST', `/api/v1/projects/${seed.projectId}/versions/publish`, {
      auth: owner, body: { semver, base_version_id: base, change_summary: summary },
    }),
    params({ id: seed.projectId }),
  ))
  return { id: data.id as string, semver: data.semver as string, manifestHash: data.manifest_hash as string }
}

/**
 * @param into 팀 slug 를 바꿔 심는다 — 리셋이 **옆자리**에 먼저 심고 성공하면 자리를 바꾸기 위해서다
 *   (`reset.ts` · INBOX H6). 안 주면 정본 slug 다 (`demo:db`·시험이 그렇게 부른다).
 */
export async function seedDemo(now: Date = new Date(), into: { teamSlug?: string } = {}): Promise<DemoSeedResult> {
  const file = readDemoSeedFile()

  //  ── 항목·문서는 paylab 씨앗 그대로다 (정본 하나) ──────────────────────
  const seed = await seedPaylab(DEMO_TENANT.ownerSubject, {
    teamName: DEMO_TENANT.teamName,
    teamSlug: into.teamSlug ?? DEMO_TENANT.teamSlug,
    projectName: DEMO_TENANT.projectName,
    projectSlug: DEMO_TENANT.projectSlug,
  })

  //  🔴 팀장의 **이름**을 claims 에 실어서 다시 만든다. `seedPaylab` 안에서 만든 토큰은
  //     이름이 sub 라, 이 토큰으로 한 번 더 부르는 순간 `users.name` 이 sub 로 덮인다
  //     (`memberJwt` 의 주석과 같은 고장 · 덤프에서 눈으로 잡았다).
  const owner = seedSession(DEMO_TENANT.ownerSubject, DEMO_TENANT.ownerName)

  //  ── 팀원 + 게스트 ────────────────────────────────────────────────────
  const memberIds = new Map<string, string>()
  for (const member of file.members) {
    memberIds.set(member.sub, await addMember(seed.teamId, member))
  }
  //  🔴 게스트도 **팀의 member 다.** 등급이 아니라 주체 종류로 읽기 전용이 된다
  //     (`lib/api/auth.ts` 의 `ACTOR_RULES`). 여기서 owner 를 주면 그 판단이 무너진다.
  await addMember(seed.teamId, { sub: DEMO_GUEST_SUBJECT, name: '게스트 (심사위원)', role: 'member' })

  //  ── 발행 ①: v1.0.0 ──────────────────────────────────────────────────
  const v1 = await publish(seed, owner, '1.0.0', null, '첫 정본 — 목표·규칙·로드맵을 팀 공식으로')

  //  ── 제안 다섯 (실림 · 승인 대기 · 거절 · 결정 전 · 초안) ────────────
  //  ⚠ 다섯 다 v1.0.0 을 기준으로 **먼저 올린다.** 결정만 발행 앞뒤로 갈린다 —
  //    그래야 「승인은 했는데 아직 안 실렸다」가 실제 상태로 선다.
  const decideLater: { id: string; owner: string }[] = []
  for (const p of DEMO_PROPOSALS) {
    const author = memberJwt(file, p.author)
    const { draft, sourceRefs } = await draftFor(seed, owner, p)
    const created = await dataOf(await createProposal(
      req('POST', `/api/v1/projects/${seed.projectId}/proposals`, {
        auth: author,
        body: {
          title: p.title,
          summary: p.summary,
          base_version_id: v1.id,
          //  🔴 화면 6 의 「관련 마일스톤」 칸 (FINDINGS 164) — 안 적은 줄은 빈 배열이고
          //     화면이 그 자리에 「—」를 그린다. 계약의 기본값과 같다 (`upload.ts`).
          relates_to: p.relatesTo ?? [],
          items: [{
            operation: 'update',
            target_item_id: p.target,
            draft,
            //  🔴 P7 — 근거는 대상 항목이 실제로 가리키는 문서판·코드 경로다. 그것만으로 부족한 행은
            //     `evidenceNote` 한 줄을 **덧붙인다** (`reason` 을 복사하지 않는다 · 2026-09-11).
            evidence: [
              ...sourceRefs,
              ...(p.evidenceNote === undefined ? [] : [{ kind: 'manual' as const, note: p.evidenceNote }]),
            ],
            reason: p.reason,
          }],
          client_request_id: randomUUID(),
        },
      }),
      params({ id: seed.projectId }),
    ))
    const id = created.id as string
    //  🔴 `draft` 는 여기서 멈춘다 — 라우트가 만들 때 매기는 상태가 `draft` 이고
    //     제출해야 `submitted` 로 간다. 결정은 그 뒤의 이야기라 아래도 전부 건너뛴다.
    if (p.decision === 'draft') continue
    await submitProposal(req('POST', `/api/v1/proposals/${id}/submit`, { auth: author, body: {} }), params({ id }))
    if (p.decision === 'published') {
      await approveProposal(req('POST', `/api/v1/proposals/${id}/approve`, { auth: owner, body: {} }), params({ id }))
    }
    if (p.decision === 'approved') decideLater.push({ id, owner })
    if (p.decision === 'rejected') {
      //  ⚠ 거절은 **사유가 필수**다 (`PROPOSAL_DECISIONS.noteRequired`). 없으면 400 이다.
      await rejectProposal(
        req('POST', `/api/v1/proposals/${id}/reject`, { auth: owner, body: { note: p.note } }),
        params({ id }),
      )
    }
  }

  //  ── 발행 ②: v1.1.0 (승인된 제안이 여기서 항목이 된다 — SPEC §2.1 2단계) ──
  const v11 = await publish(seed, owner, '1.1.0', v1.id, '승인된 제안 1건 반영 — 재시도 정책')

  //  🔴 **v1.0.0 의 발행 시각을 뒤로 民다** (2026-09-11). `versions.published_at` 은 `defaultNow()` 라
  //    씨앗이 두 판을 몇 초 안에 연달아 발행하면 화면에 **같은 분**(예: 12:50)으로 둘 다 찍힌다.
  //    그러면 버전 목록이 「두 판이 같은 순간에 나왔다」고 말하는 셈이라, 처음 보는 사람 눈에는
  //    버전 이야기 전체가 지어낸 것으로 읽힌다 — 실제로 375px 캡처에서 그렇게 보였다.
  //  ★ 왜 3일인가 — 기기 보고의 「며칠 전」(`hours_ago`)과 같은 시간축에 있고, 가장 오래된
  //    보고보다 앞서야 「옛 버전을 쓰는 기기」가 말이 된다. 값은 `now` 하나에서 온다.
  await getDb().update(contextVersions)
    .set({ publishedAt: hoursAgo(now, DEMO_FIRST_VERSION_HOURS_AGO) })
    .where(eq(contextVersions.id, v1.id))

  //  발행 **뒤에** 승인한 것 — 「다음 발행을 기다리는 제안」이 화면에 하나 선다.
  for (const later of decideLater) {
    await approveProposal(
      req('POST', `/api/v1/proposals/${later.id}/approve`, { auth: later.owner, body: {} }),
      params({ id: later.id }),
    )
  }
  const versions: DemoSeedResult['versions'] = {
    previous: { semver: v1.semver, manifestHash: v1.manifestHash },
    official: { semver: v11.semver, manifestHash: v11.manifestHash },
  }

  //  ── 기기와 마지막 보고 ───────────────────────────────────────────────
  const deviceTokens = new Map<string, string>()
  let reportCount = 0
  for (const device of file.devices) {
    if (!memberIds.has(device.member)) {
      throw new Error(`[demo-seed] 기기 ${device.name} 의 주인 ${device.member} 가 팀원 목록에 없다`)
    }
    const owner = memberJwt(file, device.member)
    const minted = await dataOf(await createToken(
      req('POST', `/api/v1/projects/${seed.projectId}/tokens`, {
        auth: owner, body: { device_name: device.name },
      }),
      params({ id: seed.projectId }),
    ))
    const token = minted.token as string
    deviceTokens.set(device.name, token)

    if (!device.report) continue
    const version = versions[device.report.version]
    const reported = await dataOf(await postSyncReport(
      req('POST', `/api/v1/projects/${seed.projectId}/sync-reports`, {
        auth: token,
        body: {
          version: version.semver,
          //  ⚠ 해시를 지어내지 않는다 — 그 버전의 Manifest 가 실제로 낸 값이다.
          //    지어내면 화면은 `applied` 라고 그리는데 그 기기의 파일은 공식본이 아니다.
          manifest_hash: version.manifestHash,
          status: device.report.status,
          files: [],
        },
      }),
      params({ id: seed.projectId }),
    ))
    //  라우트는 「지금」으로 적는다 — 데모가 말해야 하는 것은 「4일 전」이라 그 행만 옮긴다.
    await getDb()
      .update(syncReports)
      .set({ reportedAt: hoursAgo(now, device.report.hours_ago) })
      .where(eq(syncReports.id, reported.id as string))
    reportCount += 1
  }

  //  ── 진행 보고 ───────────────────────────────────────────────────────
  //  🔴 마일스톤이 **공식 Manifest 에 실제로 있는지** 먼저 잰다. 없는 마일스톤에 붙은
  //     보고는 화면에서 「로드맵 외」로 조용히 새고, 그러면 이 데모는 거짓말을 한다.
  const manifest = await manifestOf(seed, owner, v11.semver)
  const milestones = new Map(manifest.milestones.map((m) => [m.id, m]))
  let progressCount = 0
  for (const event of file.progress) {
    if (event.milestone_id !== 'none') {
      const milestone = milestones.get(event.milestone_id)
      if (!milestone) {
        throw new Error(`[demo-seed] Manifest 에 마일스톤 ${event.milestone_id} 이 없다 — 픽스처를 봐라`)
      }
      //  ⚠ 완료 기준도 **글자 그대로** 있어야 한다. 비슷한 문장을 적으면 화면의
      //    「3개 중 2개」가 아무 기준에도 안 붙는다 (P7).
      if (event.criterion !== undefined && !milestone.done_when.includes(event.criterion)) {
        throw new Error(`[demo-seed] ${event.milestone_id} 의 done_when 에 없는 기준이다: ${event.criterion}`)
      }
    }
    const token = deviceTokens.get(event.device)
    if (!token) throw new Error(`[demo-seed] 진행 보고의 기기 ${event.device} 가 목록에 없다`)

    const saved = await dataOf(await postProgress(
      req('POST', `/api/v1/projects/${seed.projectId}/progress`, {
        auth: token,
        body: {
          milestone_id: event.milestone_id,
          status: event.status,
          ...(event.criterion === undefined ? {} : { criterion: event.criterion }),
          evidence: event.evidence,
          summary: event.summary,
          context_version: v11.semver,
          source: event.source,
          client_event_id: randomUUID(),
        },
      }),
      params({ id: seed.projectId }),
    ))
    await getDb()
      .update(progressEvents)
      .set({ createdAt: hoursAgo(now, event.hours_ago) })
      .where(eq(progressEvents.id, saved.id as string))
    progressCount += 1
  }

  return {
    teamSlug: seed.teamSlug,
    projectSlug: seed.projectSlug,
    projectId: seed.projectId,
    versions,
    itemCount: seed.itemUuids.length,
    memberCount: file.members.length,
    deviceCount: file.devices.length,
    reportCount,
    progressCount,
    proposalCount: DEMO_PROPOSALS.length,
  }
}

/** 게스트 행이 실제로 팀의 member 로 앉았나 — 세션 라우트가 재는 것과 같은 조건이다. */
export async function demoGuestMembership(): Promise<{ userId: string; role: string } | undefined> {
  const db = getDb()
  const [row] = await db
    .select({ userId: users.id, role: teamMembers.role })
    .from(users)
    .innerJoin(teamMembers, and(eq(teamMembers.userId, users.id), eq(teamMembers.status, 'active')))
    .where(eq(users.authSubject, DEMO_GUEST_SUBJECT))
    .limit(1)
  return row
}
