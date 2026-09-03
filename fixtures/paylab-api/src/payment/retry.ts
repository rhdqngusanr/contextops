import { isRetryable } from '../common/errors';
import type { PaylabError } from '../common/errors';
import type { Result } from '../common/result';

/**
 * PSP 호출 재시도.
 *
 * 트래픽이 아직 작아서 고정 간격으로 충분하다고 보고 이렇게 뒀다.
 * (2025 하반기 로드맵의 「3회 · 0.5초 고정」 규칙 그대로다)
 */
export const MAX_RETRY = 3;

/** 재시도 간격(ms). 고정이다 — 늘리지 않는다. */
export const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOutcome<T> {
  result: Result<T, PaylabError>;
  attempts: number;
}

/**
 * fn 을 최대 MAX_RETRY 번 부른다. 실패 사이 간격은 항상 RETRY_DELAY_MS 다.
 * 재시도해도 소용없는 실패(4xx 계열)면 즉시 멈춘다.
 */
export async function withRetry<T>(
  fn: () => Promise<Result<T, PaylabError>>,
): Promise<RetryOutcome<T>> {
  let last: Result<T, PaylabError> | undefined;

  for (let attempt = 1; attempt <= MAX_RETRY; attempt += 1) {
    last = await fn();
    if (last.ok) {
      return { result: last, attempts: attempt };
    }
    if (!isRetryable(last.error.kind)) {
      return { result: last, attempts: attempt };
    }
    if (attempt < MAX_RETRY) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  return { result: last as Result<T, PaylabError>, attempts: MAX_RETRY };
}
