import { AI_MODELS, DEFAULT_AI_MODEL } from './features'

// =====================================================================
//  apps/web/src/lib/ai/model.ts — 「어느 모델로 부르나」의 답 하나 (SPEC §1.2 · §7)
//
//  ★ 왜 파일이 따로인가 — `budget.ts`(값을 세는 쪽)와 `client.ts`(부르는 쪽)가 **둘 다**
//    이 답을 알아야 한다. 한쪽에 두고 다른 쪽이 import 하면 순환이 생기고, 각자
//    `process.env` 를 읽으면 **예산은 A 모델 값으로 세고 호출은 B 모델로 나간다.**
// =====================================================================

/**
 * `ANTHROPIC_MODEL` 또는 기본값. **`AI_MODELS` 표에 없는 이름이면 죽는다.**
 * ★ 왜 죽나 — 표에 없으면 정가를 모르고, 정가를 모르면 하루 예산이 조용히 무한이 된다.
 */
export function currentModel(): string {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_AI_MODEL
  if (!AI_MODELS[model]) {
    throw new Error(
      `ANTHROPIC_MODEL 이 AI_MODELS 표에 없다: ${model} — ` +
      `쓸 수 있는 값: ${Object.keys(AI_MODELS).join(', ')} (src/lib/ai/features.ts)`,
    )
  }
  return model
}
