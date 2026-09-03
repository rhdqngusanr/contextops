import type { Result } from '../common/result';
import type { PaylabError } from '../common/errors';
import type { Won } from '../common/money';

export interface AuthorizeRequest {
  merchantId: string;
  orderId: string;
  amount: Won;
  currency: string;
  cardToken: string;
  idempotencyKey: string;
}

export interface AuthorizeResponse {
  pspPaymentId: string;
  approvedAt: string;
}

export interface CaptureRequest {
  pspPaymentId: string;
  amount: Won;
  idempotencyKey: string;
}

export interface RefundRequest {
  pspPaymentId: string;
  amount: Won;
  reason: string;
  idempotencyKey: string;
}

export interface PspClient {
  readonly name: string;
  authorize(req: AuthorizeRequest): Promise<Result<AuthorizeResponse, PaylabError>>;
  capture(req: CaptureRequest): Promise<Result<void, PaylabError>>;
  refund(req: RefundRequest): Promise<Result<void, PaylabError>>;
}
