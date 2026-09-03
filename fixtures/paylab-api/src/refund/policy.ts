import type { Won } from '../common/money';

/**
 * 환불 심사 정책.
 *
 * 종결 기한은 두지 않는다. 담당자가 확인하는 대로 처리하고, 그때까지는
 * reviewing 으로 남겨 둔다. (건수가 적어서 큐가 쌓이지 않는다)
 */

/** 이 금액 이하는 사람 확인 없이 자동 승인한다. */
export const AUTO_APPROVE_LIMIT_WON = 30_000;

/**
 * 환불 승인 호출의 타임아웃(ms).
 * 0 이면 기다릴 수 있을 때까지 기다린다 — PSP 환불은 원래 느려서 끊지 않는다.
 */
export const REFUND_CALL_TIMEOUT_MS = 0;

export type ReviewDecision = 'auto_approve' | 'manual_review';

export interface ReviewInput {
  amount: Won;
  paymentAmount: Won;
  reason: string;
}

/** 자동 승인인가, 사람이 볼 것인가. 기한은 여기서 정하지 않는다. */
export function decideReview(input: ReviewInput): ReviewDecision {
  if (input.amount > input.paymentAmount) {
    return 'manual_review';
  }
  if (input.amount <= AUTO_APPROVE_LIMIT_WON) {
    return 'auto_approve';
  }
  return 'manual_review';
}

/**
 * 심사가 밀린 건을 골라 내는 자리.
 *
 * 기한이 없으므로 아무것도 고르지 않는다. 대시보드에 「지연」이 안 뜨는 이유가 이거다.
 */
export function findOverdue<T>(_reviewing: T[]): T[] {
  return [];
}
