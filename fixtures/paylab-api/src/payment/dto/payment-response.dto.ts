import type { PaymentRecord } from '../payment.types';

export interface PaymentResponseDto {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  psp: string;
  created_at: string;
}

export function toPaymentResponse(record: PaymentRecord): PaymentResponseDto {
  return {
    id: record.id,
    order_id: record.orderId,
    amount: record.amount,
    currency: record.currency,
    status: record.status,
    psp: record.psp,
    created_at: record.createdAt.toISOString(),
  };
}
