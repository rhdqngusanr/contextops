import type { Won } from '../common/money';

export type LedgerKind = 'authorize' | 'capture' | 'refund' | 'adjustment';

/** 원장 한 줄. 부호는 kind 가 정한다 — 환불과 조정만 음수다. */
export interface LedgerEntryDraft {
  paymentId: string;
  kind: LedgerKind;
  amount: Won;
  memo?: string;
}

const SIGN: Record<LedgerKind, 1 | -1> = {
  authorize: 1,
  capture: 1,
  refund: -1,
  adjustment: -1,
};

export function signedAmount(kind: LedgerKind, amount: Won): number {
  return SIGN[kind] * amount;
}
