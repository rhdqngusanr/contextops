import type { Won } from '../common/money';

export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'cancelled';

export interface PaymentRecord {
  id: string;
  merchantId: string;
  orderId: string;
  amount: Won;
  currency: string;
  status: PaymentStatus;
  psp: string;
  pspPaymentId: string | null;
  idempotencyKey: string;
  attempts: number;
  createdAt: Date;
}

/** 어떤 상태에서 어떤 상태로 갈 수 있나. 표에 없는 전이는 막는다. */
export const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  created: ['authorized', 'failed'],
  authorized: ['captured', 'cancelled', 'failed'],
  captured: [],
  failed: [],
  cancelled: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
