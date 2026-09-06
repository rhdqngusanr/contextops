// =====================================================================
//  scripts/ai-smoke.ts — 진짜 Gemini 에 진짜 계약(`AiStructureOutput`)을 한 번 보내 본다.
//  `pnpm --filter web ai:smoke`
//
//  ★ 왜 있나 (79바퀴 · 2026-09-06 INBOX) — 시험은 전부 스텁이라 「키가 도나 · 스키마를 받나 ·
//    응답이 Zod 를 지나나」는 시험이 말하지 못한다. 공급자를 바꾼 뒤 이 셋을 잰 자리가 이것이다.
//    실측 기록: `docs/evidence/2026-09-06-gemini/probe.txt`.
//  ⚠ 돈이 든다(한 번 · 토큰 수백) — CI 는 부르지 않는다. 키는 `.env.local` 에서 process 로만
//    올라가고, 출력에는 키·프롬프트·응답 본문을 찍지 않는다 (모양과 수만 · SPEC §11).
//  ⚠ `withBudget()` 을 거치지 않는다 — 장부(`ai_usage`)에 남기지 않는 **개발용 문**이다.
//    제품 코드는 이 파일을 import 하지 않는다 (`tools/principles.ps1` 은 `src/` 만 센다).
// =====================================================================
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { AiStructureOutput, toJsonSchemaOf } from '@contextops/schema'

import { callModel } from '../src/lib/ai/client'
import { currentModel } from '../src/lib/ai/model'

const envLocal = resolve(process.cwd(), '.env.local')
if (existsSync(envLocal)) process.loadEnvFile(envLocal)

const schema = toJsonSchemaOf(AiStructureOutput)
const doc = [
  '# 결제 정책',
  '환불은 접수 후 24시간 안에 종결한다.',
  'PSP 호출이 실패하면 최대 5회까지 재시도한다.',
].join('\n')

const t0 = Date.now()
const call = await callModel({
  system: '입력에 없는 사실·수치·기한을 만들지 않는다. 원문 인용은 span.quote 에 원문 글자 그대로만. 문서에서 팀 컨텍스트 항목을 추출한다.',
  user: `<untrusted>\n${doc}\n</untrusted>`,
  inputSchema: schema,
  maxTokens: 4000,
})
const ms = Date.now() - t0
const parsed = AiStructureOutput.safeParse(call.value)
const v = call.value as { items?: { type?: unknown }[]; open_questions?: unknown[] } | undefined
console.log(JSON.stringify({
  model: currentModel(),
  schemaKeys: Object.keys(schema),
  latencyMs: ms,
  inputTokens: call.inputTokens,
  outputTokens: call.outputTokens,
  valueType: v === undefined ? 'undefined' : typeof v,
  items: v?.items?.length,
  itemTypes: v?.items?.map((i) => i.type),
  openQuestions: v?.open_questions?.length,
  zodOk: parsed.success,
  zodIssues: parsed.success ? 0 : parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`),
}))
if (!parsed.success) process.exit(1)
