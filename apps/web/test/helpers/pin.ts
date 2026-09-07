import type { PGlite } from '@electric-sql/pglite'

// =====================================================================
//  🔴 **씨앗을 재현 가능하게 만드는 자 — DB 의 기본값을 결정론으로 바꾼다**
//     (FINDINGS 161 의 남은 절반 · ⓐ 고정 시계 + ⓑ 결정론적 id)
//
//  ★ 무엇이 문제였나 — 관통이 찍는 캡처 두 장(`screen-context` · `screen-packs`)이
//    **매 바퀴 달라졌다.** 108바퀴가 픽셀로 재서 원인을 확정했다: 인코더가 아니라
//    **데모가 매 관통마다 다시 심겨서**다. 달라진 픽셀은 딱 두 가지 글자였다 —
//    `manifest_hash` 와 **발행 시각**. 둘 다 **DB 가 만든 값**이다:
//      · 문서 버전 id 가 `gen_random_uuid()` 라 심을 때마다 새로 나고, 그 uuid 가
//        Pack 의 **모든 줄 태그**(`src:doc:<uuid>#260-311`)에 실려 본문 바이트를 바꾼다
//      · `published_at` 이 `now()` 라 심은 시각이 그대로 표에 찍힌다
//
//  ★ 왜 **여기**(하네스)인가 — 씨앗은 **라우트로** 만든다는 것이 `lib/demo/seed.ts` 의
//    원칙이다. id 를 고정하려고 `POST /documents` 에 「id 를 받는 문」을 여는 것은
//    **데모 사정으로 제품 계약을 넓히는 것**이라 하지 않는다 (FINDINGS 161 의 ⚠).
//    id 와 시각을 만드는 것은 **DB** 이므로, 결정론도 **하네스가 소유한 DB** 에 둔다.
//    제품 코드는 한 줄도 안 바뀐다 — 라우트는 평소대로 기본값을 받는다.
//
//  ⚠ **켜는 곳에서만 켠다** (`freshDb()` 는 그대로다). 시험 대부분은 「id 가 서로 다르다」·
//    「방금 만들었다」에 기대므로 전부에 걸면 그쪽이 갈린다.
//
//  ⚠ 시각을 **한 값으로 얼리지 않는다** — 얼리면 `created_at` 이 전부 같아져서
//    `order by created_at desc` 가 **순서를 잃는다.** 그건 churn 을 없애는 게 아니라
//    다른 자리로 옮기는 것이다. 그래서 **1ms 씩 올라가는 계수 시계**를 쓴다:
//    같은 씨앗이면 같은 값이고, 넣은 순서도 그대로 산다.
// =====================================================================

/**
 * 고정 씨앗의 기준 시각. **여기 하나가 정본**이다 — 캡처에 찍히는 발행 시각·갱신 날짜가
 * 전부 이 값에서 나온다.
 *
 * ⚠ 이 값을 바꾸면 `manifest_hash` 는 안 바뀌지만 **캡처 두 장은 바뀐다** (표의 글자가
 *   바뀐다). 바꿀 이유가 없으면 두어라.
 * ⚠ 기기 보고의 「N시간 전」은 이 시계를 **안 쓴다** — 씨앗이 `hoursAgo(new Date(), h)` 로
 *   직접 넣고, 브라우저는 진짜 시계로 읽는다. 그래서 그 라벨은 지금도 안 흔들린다.
 *   여기까지 얼리려면 브라우저 시계도 같이 얼려야 하는데, 그러면 「3시간 전」이
 *   「N개월 전」이 되고 화면 8 의 「3주 이상 보고 없음」이 켜진다 — 데모가 망가진다.
 */
export const PINNED_EPOCH = '2026-09-01T00:00:00Z'

/** 결정론 기본값이 걸리는 기본값의 모양. 표에 한 줄 = 새로 고정하는 값 하나. */
const PINNED_DEFAULTS: { from: string; to: string }[] = [
  { from: 'gen_random_uuid()', to: 'pin_uuid()' },
  { from: 'now()', to: 'pin_now()' },
]

const INSTALL_SQL = `
create sequence if not exists pin_uuid_seq;
create sequence if not exists pin_now_seq;

create or replace function pin_uuid() returns uuid language sql volatile as $$
  select ('00000000-0000-4000-8000-' || lpad(to_hex(nextval('pin_uuid_seq')), 12, '0'))::uuid
$$;

create or replace function pin_now() returns timestamptz language sql volatile as $$
  select timestamptz '${PINNED_EPOCH}' + (nextval('pin_now_seq') * interval '1 millisecond')
$$;
`

type DefaultRow = { table_name: string; column_name: string; column_default: string }

/**
 * 마이그레이션을 먹인 **뒤에** 부른다 — `public` 의 모든 칸 기본값 중
 * `gen_random_uuid()` · `now()` 를 결정론 함수로 바꾼다.
 *
 * ★ 왜 `DO` 블록이 아니라 JS 에서 도나 — 바꾼 칸 수를 **돌려줘야** 「걸리긴 했나」를
 *   부르는 쪽이 셀 수 있다. 시험이 그 수를 잠근다 (0이면 조용히 아무것도 안 한 것이다).
 *
 * @returns 기본값을 바꾼 칸의 수
 */
export async function pinDbDefaults(pg: PGlite): Promise<number> {
  await pg.exec(INSTALL_SQL)
  const rows = (await pg.query<DefaultRow>(
    `select table_name, column_name, column_default from information_schema.columns
      where table_schema = 'public' and column_default = any($1)
      order by table_name, column_name`,
    [PINNED_DEFAULTS.map((d) => d.from)],
  )).rows
  for (const row of rows) {
    const rule = PINNED_DEFAULTS.find((d) => d.from === row.column_default)
    if (rule === undefined) continue
    await pg.exec(
      `alter table "${row.table_name}" alter column "${row.column_name}" set default ${rule.to}`,
    )
  }
  return rows.length
}

/**
 * 🔴 **JS 가 적은 절대 시각을 DB 의 계수 시계로 되돌린다** (`pinDbDefaults` 다음에 부른다).
 *
 * ★ 왜 따로 필요한가 — 발행 시각은 DB 기본값이 아니라 **라우트가 준 값**이다
 *   (`lib/api/route.ts` 의 `const now = new Date()` → `publishVersion({ now })`).
 *   기본값을 박아도 이 칸은 계속 진짜 시각이라, 캡처의 「발행 시각」 글자가 매 관통 달라진다.
 *
 * ★ 왜 `created_at` 을 쓰나 — 같은 INSERT 가 DB 기본값으로 적은 값이라 **이미 결정론**이고,
 *   행끼리의 **순서도 그대로**다 (계수 시계라 1ms 씩 올라간다). 새 상수를 하나 더 만들면
 *   기준 시각이 두 곳이 된다.
 *
 * ★ 왜 라우트에 「시각을 받는 문」을 안 만드나 — 데모 사정으로 제품 계약을 넓히는 것이다
 *   (FINDINGS 161 의 ⚠ 와 같은 결). 하네스가 자기 DB 를 고치는 것으로 끝난다.
 *
 * ⚠ **여기 있는 칸은 「캡처가 절대 시각으로 그리는 것」뿐이다** — 잰 것이지 짐작이 아니다
 *   (108바퀴가 픽셀로 달라진 자리를 잘라 읽었다: `manifest_hash` 와 발행 시각 둘뿐).
 *   경과(`sinceText`)로 그리는 칸은 **건드리면 안 된다** — 씨앗이 진짜 시각 기준으로
 *   일부러 뒤로 밀어 넣은 값이고(`hoursAgo`), 여기서 과거로 옮기면 「3시간 전」이
 *   「N일 전」이 되어 오히려 매일 달라진다.
 * ★ 새로 절대 시각을 그리는 칸이 생기면 **이 표에 한 줄.**
 */
const PINNED_CLOCK_COLUMNS: { table: string; column: string }[] = [
  { table: 'context_versions', column: 'published_at' },
]

/** @returns 되돌린 행의 수 (0이면 조용히 아무것도 안 한 것이다) */
export async function pinSeededClocks(pg: PGlite): Promise<number> {
  let rows = 0
  for (const c of PINNED_CLOCK_COLUMNS) {
    const res = await pg.query(`update "${c.table}" set "${c.column}" = "created_at"`)
    rows += res.affectedRows ?? 0
  }
  return rows
}
