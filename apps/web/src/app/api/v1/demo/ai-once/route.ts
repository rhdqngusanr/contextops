import { DemoAiOnce } from '@contextops/schema'

import { detectDemoConflicts } from '../../../../../lib/ai/conflict'
import { costMicros } from '../../../../../lib/ai/features'
import { fail } from '../../../../../lib/api/error'
import { clientIp } from '../../../../../lib/api/rate-limit'
import { parseBody, route } from '../../../../../lib/api/route'
import { demoTryItemId, findDemoAiPreset } from '../../../../../lib/demo/ai-presets'
import { findDemoProject } from '../../../../../lib/demo/project'

// =====================================================================
//  `POST /demo/ai-once` — 로그인 없는 사람이 **AI 충돌 탐지를 한 번 직접 돌려 본다** (SPEC §5 · §7.4 · 2026-09-13)
//  → `{preset, conflicts[{kind, severity, question, other}], compared, model, input_tokens, output_tokens, cost_usd, duration_ms}`
//
//  ★ 왜 생겼나 — 게스트가 보는 AI 산출물은 2026-09-07 의 기록 카드뿐이었고, AI 가 **도는** 장면은 GitHub 로그인 뒤에만
//    있었다. 로그인 없는 심사위원이 「AI 활용」을 직접 확인할 문이 없었다 (docs/evidence/2026-09-13-final-audit/ 제안 A).
//  ★ 하는 일: 고른 문장 하나(`lib/demo/ai-presets.ts`)를 「바뀐 항목」으로 삼아, 샘플 팀의 **같은 type 의 적용 중 항목**과
//    §7.2 와 같은 프롬프트·같은 검증으로 견준다(`detectDemoConflicts`). 모델은 판정하지 않고 질문을 낸다 — 제품과 같은 길이다.
//  🔴 **아무것도 저장하지 않는다.** `conflicts` 표에도 항목 표에도 안 쓴다 — 방문자가 누를 때마다 샘플 팀의 정리 화면이 늘어나면
//     다음 사람이 보는 데모가 망가진다. 남는 것은 예산 장부(`ai_usage`) 한 줄과 빈도 표뿐이다.
//  🔴 **돈의 문은 `withBudget('demo')` 하나다** (P3) — 샘플 팀 전체 하루 20회 · 월 $10 천장. 사람(IP)은 라우트 감싸기가 센다
//     (`HTTP_RATE_LIMITS` · 한 IP 에 하루 10회). 게스트 세션도 요구하지 않는다 — `/demo/session` 과 같은 자격증명 없는 문이다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route('POST /demo/ai-once', async (ctx) => {
  //  ⚠ `ctx.actor()` 를 부르지 않는다 — 자격증명 없는 문이다 (그래서 게스트의 쓰기를 막는 `refuseWrite` 에도 안 걸린다).
  const body = await parseBody(ctx.req, DemoAiOnce)
  const preset = findDemoAiPreset(body.preset)
  if (!preset) fail('VALIDATION_FAILED', '고를 수 있는 문장이 아니다', [{ path: 'preset', message: '표에 없는 문장 이름이다' }])

  const { projectId } = await findDemoProject(ctx.db)
  ctx.note({ project_id: projectId })

  const tryId = demoTryItemId(preset.id)
  const started = Date.now()
  const result = await detectDemoConflicts({
    projectId,
    tryItem: { id: tryId, type: 'policy', scope: preset.scope, title: preset.title, body: preset.body },
    //  장부에는 sha256 으로만 남는다 (P1 · SPEC §11).
    actor: clientIp(ctx.req),
    now: ctx.now,
  })
  const titles = new Map(result.candidates.map((c) => [c.id, c.title]))

  return ctx.ok({
    preset: preset.id,
    conflicts: result.conflicts.map((c) => {
      //  체험 문장이 한쪽에 반드시 있다(`convert` 가 잰다) — 짝은 **다른 쪽**이다.
      const otherId = c.a_item_id === tryId ? c.b_item_id : c.a_item_id
      return {
        kind: c.kind,
        severity: c.severity,
        question: c.question,
        other: otherId === undefined ? null : { id: otherId, title: titles.get(otherId) ?? otherId },
      }
    }),
    compared: result.candidates.length,
    model: result.usage.model,
    input_tokens: result.usage.inputTokens,
    output_tokens: result.usage.outputTokens,
    cost_usd: costMicros(result.usage.model, result.usage.inputTokens, result.usage.outputTokens) / 1_000_000,
    duration_ms: Date.now() - started,
  })
})
