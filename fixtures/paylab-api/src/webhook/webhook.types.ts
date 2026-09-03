export type WebhookType =
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.failed'
  | 'refund.completed';

/** PSP 가 보내 주는 원본 payload. 구매자 정보가 통째로 들어 있다. */
export interface WebhookPayload {
  event_id: string;
  type: WebhookType;
  occurred_at: string;
  psp_payment_id: string;
  amount: number;
  currency: string;
  payer: {
    name: string;
    email: string;
    phone: string;
    birth_date: string;
    card_bin: string;
    card_last4: string;
  };
}

export interface WebhookResult {
  handled: boolean;
  reason?: string;
}
