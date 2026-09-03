import Anthropic from '@anthropic-ai/sdk'

import type { AiCall } from './budget'
import { currentModel } from './model'

// =====================================================================
//  apps/web/src/lib/ai/client.ts — Anthropic 을 부르는 **유일한 자리** (SPEC §7 · P2 · P3)
//
//  🔴 P2 — 이건 **우리 API 키**다 (`ANTHROPIC_API_KEY`). 사용자의 Claude 구독을
//     대신 부르는 것이 아니다. 사용자의 기계에서 도는 코드(`plugin/`)는 이 파일을
//     import 하지 않는다 — 방향이 한쪽이다 (`schema ← compiler ← web/plugin`).
//
//  🔴 P3 — `tools/principles.ps1` 은 `messages.create` 를 부르는 파일을 세고,
//     그 파일에 `withBudget` 이 없으면 FAIL 한다. **이 파일만 예외다.**
//     그래서 여기에는 예산 판단이 없다 — 부르는 쪽이 `withBudget()` 을 거쳐서 온다.
//     ⚠ 여기서 export 하는 것을 라우트가 **직접** 부르면 예산 가드를 우회한다.
//        새 기능은 `withBudget('<기능>', ctx, () => callClaude(...))` 로 부른다.
//
//  ⚠ SPEC §11 — 프롬프트·응답 본문을 로그에 남기지 않는다. 이 파일은 아무것도 로그하지
//    않는다. 부르는 쪽도 남기지 마라 (`request_id`·route·status·latency 만).
// =====================================================================

let cached: Anthropic | undefined

function client(): Anthropic {
  if (cached) return cached
  const apiKey = process.env.ANTHROPIC_API_KEY
  //  🔴 조용히 undefined 로 돌지 않게 여기서 죽인다 (.env.example ③).
  //     ⚠ 키가 없는 배포는 **고장이 아니다** — SPEC §7.5 의 「픽스처 결과로 떨어지는」
  //        갈래가 그 경우를 받는다. 부르는 쪽이 이 오류를 잡아 픽스처로 내려간다.
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 가 없다 — apps/web/.env.example 을 보고 .env.local 을 만들어라')
  cached = new Anthropic({ apiKey })
  return cached
}

/** 시험 전용 문. `db/client.ts` 의 `setDbForTest` 와 같은 이유로 있다. */
export function setAiClientForTest(c: Anthropic | undefined): void {
  cached = c
}

/** 도구(tool use)로 구조화 출력을 받는 한 번의 호출 (SPEC §7 공통 규약). */
export interface ToolCallRequest {
  /** 공통 금지가 들어간 시스템 프롬프트. */
  readonly system: string
  /** 사용자 턴. 문서·항목 본문은 `<untrusted>` 로 감싸서 온다 (SPEC §11 인젝션). */
  readonly user: string
  /** 도구 이름 — 응답에서 이 이름의 `tool_use` 블록을 찾는다. */
  readonly toolName: string
  readonly toolDescription: string
  /** 해당 Zod 계약의 JSON Schema (SPEC §7 「input_schema = 해당 Zod 의 JSON Schema」). */
  readonly inputSchema: Record<string, unknown>
  readonly maxTokens: number
}

/**
 * Anthropic 을 한 번 부르고 **도구 입력(구조화된 객체)** 과 실제 토큰 사용량을 낸다.
 *
 * ⚠ 반환값은 검증되지 않은 `unknown` 이다. 부르는 쪽이 **해당 Zod 로 다시 판다** —
 *   그게 SPEC §7 의 「출력은 Zod 로 재검증」이고, 그 자리가 P1 의 방어선이다.
 */
export async function callClaude(req: ToolCallRequest): Promise<AiCall<unknown>> {
  const model = currentModel()
  const message = await client().messages.create({
    model,
    max_tokens: req.maxTokens,
    system: req.system,
    tools: [{
      name: req.toolName,
      description: req.toolDescription,
      input_schema: req.inputSchema as Anthropic.Tool['input_schema'],
    }],
    tool_choice: { type: 'tool', name: req.toolName },
    messages: [{ role: 'user', content: req.user }],
  })

  const block = message.content.find((b) => b.type === 'tool_use' && b.name === req.toolName)
  return {
    //  ⚠ 블록이 없으면 `undefined` 다. **여기서 던지지 않는다** — 부르는 쪽의 Zod 가
    //    「계약과 다르다」로 잡고 SPEC §7 의 1회 재시도를 돌리는 것이 정본 흐름이다.
    //    여기서 던지면 그 재시도가 토큰 사용량을 잃는다 (장부가 0으로 남는다).
    value: block && block.type === 'tool_use' ? block.input : undefined,
    model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }
}
