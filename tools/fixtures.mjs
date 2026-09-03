// =====================================================================
//  tools/fixtures.mjs — paylab 픽스처가 「관통의 재료」를 갖췄는지 센다
//
//    node tools/fixtures.mjs
//
//  ★ 왜 있나 — docs/PLAN.md P0 마지막 행의 완료 기준은 「SPEC §10.1 의 기대 결과
//    (충돌 3 · open_question 4 · M1~M3)를 낼 재료가 다 있음」이다. 재료가 있는지는
//    눈으로 세면 다음 바퀴에 조용히 빠진다. 픽스처는 뒤 Phase(P3 서버 AI · P4 데모)가
//    통째로 올라타는 바닥이라, 한 줄이 빠지면 그 Phase 전체가 재현되지 않는다.
//
//  ★ 왜 fixtures/ 안이 아니라 여기 있나 — **이 파일이 답안지다.**
//    「어긋남 3곳이 어디에 심겼나」를 fixtures/README.md 에 적으면 픽스처를 읽는
//    사람도, 나중에 픽스처를 입력으로 받는 서버 AI 도 답을 먼저 본다. 픽스처는
//    답을 모르는 채로 읽혀야 시험이 된다. 그래서 답은 게이트 쪽에만 산다.
//
//  ★ 확장은 「표에 한 줄」이다 — 아래 CHECKS 배열에 한 줄을 더하면 검사가 는다.
//    새 픽스처 요구가 생기면 ①SPEC §10.1 에 적고 ②여기 한 줄을 더한다. 그게 전부다.
//
//  종료 코드: 0 전부 통과 · 1 하나라도 빠짐
// =====================================================================

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const API = 'fixtures/paylab-api';
const DOCS = 'fixtures/paylab-docs';

// ── 읽기 도우미 ──────────────────────────────────────────────────
const abs = (rel) => join(root, rel.split('/').join('/'));
const has = (rel) => existsSync(abs(rel));
const read = (rel) => (has(rel) ? readFileSync(abs(rel), 'utf8') : '');

function walk(rel) {
  const dir = abs(rel);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(`${rel}/${name}`));
    else out.push(`${rel}/${name}`);
  }
  return out;
}

/** `## N. 제목` 또는 `### 제목` 절 하나를 다음 같은 깊이 제목 전까지 잘라 온다. */
function section(text, headingRe, level) {
  const lines = text.split(/\r\n?|\n/);
  const start = lines.findIndex((l) => headingRe.test(l));
  if (start < 0) return '';
  const stop = new RegExp(`^#{1,${level}} `);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => stop.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

/** 최상위 목록 항목(`- ` 로 시작하고 들여쓰기 없음) 수 */
function bullets(text) {
  return text.split(/\r\n?|\n/).filter((l) => /^- \S/.test(l)).length;
}

const goals = read(`${DOCS}/goals.md`);
const oldRoadmap = read(`${DOCS}/old-roadmap.md`);
const tsFiles = walk(API).filter((p) => p.endsWith('.ts'));

/** `- 마지막 갱신: YYYY-MM-DD` */
function updatedAt(text) {
  const m = text.match(/마지막 갱신:\s*(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

// ── 어긋남 3곳 (충돌 카드 3장의 재료) ────────────────────────────
//  한 줄이 카드 한 장이다. 문서 쪽 주장과 코드 쪽 사실이 **둘 다** 있어야
//  detectConflicts(SPEC §7.2)의 doc_vs_code 가 만들어질 수 있다.
//  ⚠ 한쪽만 있으면 충돌이 아니라 그냥 규칙이거나 그냥 코드다.
const DIVERGENCES = [
  {
    name: '재시도 5회+백오프 vs 3회 고정 500ms',
    doc: [/최대 \*\*5회까지 재시도\*\*|최대 5회까지 재시도/, /지수 백오프/, /고정 간격 재시도는 금지/],
    codePath: `${API}/src/payment/retry.ts`,
    code: [/MAX_RETRY\s*=\s*3\b/, /RETRY_DELAY_MS\s*=\s*500\b/],
  },
  {
    name: '환불 SLA 24시간 vs 기한 없음',
    doc: [/24시간 안에 종결/, /기한 없이 .*금지/],
    codePath: `${API}/src/refund/policy.ts`,
    code: [/종결 기한은 두지 않는다/, /REFUND_CALL_TIMEOUT_MS\s*=\s*0\b/],
  },
  {
    name: 'PII 로그 금지 vs 웹훅이 원본을 남김',
    doc: [/로그에 PII 를 남기지 않는다/, /이메일/, /원본 payload 통째로/],
    codePath: `${API}/src/webhook/webhook.controller.ts`,
    code: [/payer\.email/, /payer\.birth_date/, /raw=\$\{raw\}/],
  },
];

// ── 검사표 ───────────────────────────────────────────────────────
//  ★ 새 요구를 더하는 절차: SPEC §10.1 에 적고 → 여기 한 줄 더한다.
//  fn 은 { ok, detail } 을 낸다.
const CHECKS = [];

// ① SPEC §10.1 이 **이름으로 지목한** 파일이 다 있나.
//    지도에 있는데 없으면 뒤 Phase 가 없는 것 위에 짓는다.
for (const p of [
  `${API}/src/payment/retry.ts`,
  `${API}/src/refund/policy.ts`,
  `${API}/prisma/schema.prisma`,
  `${API}/docker-compose.yml`,
  `${API}/.github/workflows/deploy.yml`,
  `${API}/.env.example`,
  `${DOCS}/goals.md`,
  `${DOCS}/old-roadmap.md`,
]) {
  CHECKS.push({ id: '파일', what: p, fn: () => ({ ok: has(p), detail: has(p) ? '' : '없다' }) });
}

CHECKS.push({
  id: '파일',
  what: `${API}/src/webhook/`,
  fn: () => {
    const n = walk(`${API}/src/webhook`).length;
    return { ok: n > 0, detail: `${n}개 파일` };
  },
});

// ② 분량 — SPEC §10.1 은 「TS 40파일」·「150줄 문서」라고 적는다.
//    적으면 구조화가 한 청크에 끝나서 chunk 경계 버그가 안 잡힌다.
CHECKS.push({
  id: '분량',
  what: 'paylab-api TS 파일 40개 이상',
  fn: () => ({ ok: tsFiles.length >= 40, detail: `${tsFiles.length}개` }),
});
CHECKS.push({
  id: '분량',
  what: 'goals.md 150줄 이상',
  fn: () => {
    const n = goals.split(/\r\n?|\n/).length;
    return { ok: n >= 150, detail: `${n}줄` };
  },
});

// ③ P1 — .env.example 은 **키 이름만**이다. 값이 하나라도 있으면 픽스처가
//    secret 을 저장소에 들인 것이고, 심사 첫 질문에서 그대로 터진다.
CHECKS.push({
  id: 'P1',
  what: '.env.example 에 값이 0건 (키 이름만)',
  fn: () => {
    const bad = read(`${API}/.env.example`)
      .split(/\r\n?|\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .filter((l) => !/^[A-Z0-9_]+=$/.test(l.trim()));
    return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : '값 0건' };
  },
});

// ④ 충돌 카드 3장의 재료 — 문서 쪽과 코드 쪽이 **둘 다** 있어야 한 장이다.
for (const d of DIVERGENCES) {
  CHECKS.push({
    id: '충돌',
    what: d.name,
    fn: () => {
      const src = read(d.codePath);
      const missDoc = d.doc.filter((re) => !re.test(goals));
      const missCode = d.code.filter((re) => !re.test(src));
      const detail = [
        missDoc.length ? `문서 쪽 ${missDoc.length}개 없음` : '문서 ○',
        missCode.length ? `코드 쪽 ${missCode.length}개 없음` : '코드 ○',
      ].join(' · ');
      return { ok: missDoc.length === 0 && missCode.length === 0, detail };
    },
  });
}

// ⑤ open_question 4개의 재료 — 「아직 정하지 못한 것」 절의 항목 수.
//    ⚠ 「정하지 못한 것」이 문서에 없으면 AI 는 없는 질문을 지어내야 한다.
//      그게 정확히 P3 시스템 프롬프트가 금지하는 것이다 (SPEC §7).
CHECKS.push({
  id: '질문',
  what: 'goals.md 「아직 정하지 못한 것」 4개',
  fn: () => {
    const s = section(goals, /^## \d+\.\s*아직 정하지 못한 것/, 2);
    const n = bullets(s);
    return { ok: n === 4, detail: `${n}개` };
  },
});

// ⑥ 로드맵 M1~M3 — 경로와 완료 기준이 있어야 RoadmapData(SPEC §3)가 만들어진다.
//    done_when 은 스키마가 min(1) max(6) 이다.
for (const id of ['M1', 'M2', 'M3']) {
  CHECKS.push({
    id: '로드맵',
    what: `goals.md ${id} — 경로 · 완료 기준 1~6개`,
    fn: () => {
      const s = section(goals, new RegExp(`^### ${id} `), 3);
      if (!s) return { ok: false, detail: '절이 없다' };
      const hasPaths = /경로:/.test(s);
      const doneWhen = section(s, /^ *- 완료 기준:/, 9)
        .split(/\r\n?|\n/)
        .filter((l) => /^ {2,}- \S/.test(l)).length;
      const ok = hasPaths && doneWhen >= 1 && doneWhen <= 6;
      return { ok, detail: `경로 ${hasPaths ? '○' : '✗'} · 완료 기준 ${doneWhen}개` };
    },
  });
}

// ⑦ stale 탐지 재료 — 폐기 로드맵이 goals.md 보다 **오래돼야** 한다.
//    같거나 최신이면 「무엇이 무효인가」를 판정할 근거가 없다 (SPEC §7.2 kind=stale).
CHECKS.push({
  id: 'stale',
  what: 'old-roadmap.md 가 goals.md 보다 오래됐다',
  fn: () => {
    const a = updatedAt(oldRoadmap);
    const b = updatedAt(goals);
    return { ok: Boolean(a && b && a < b), detail: `${a || '?'} < ${b || '?'}` };
  },
});

// ── 출력 ─────────────────────────────────────────────────────────
let failed = 0;
const rows = CHECKS.map((c) => {
  const { ok, detail } = c.fn();
  if (!ok) failed += 1;
  return { id: c.id, what: c.what, ok, detail };
});

console.log('');
console.log('=== paylab 픽스처 재료 검사 (docs/SPEC.md §10.1) ===');
for (const r of rows) {
  console.log(`  ${r.ok ? 'OK  ' : 'FAIL'} ${r.id.padEnd(6)} ${r.what}${r.detail ? `  — ${r.detail}` : ''}`);
}
console.log('');
console.log(`fixtures: OK ${rows.length - failed} · FAIL ${failed}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
