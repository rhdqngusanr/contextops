import { Injectable } from '@nestjs/common';
import { ok } from '../common/result';
import type { Result } from '../common/result';
import type { PaylabError } from '../common/errors';
import type {
  AuthorizeRequest,
  AuthorizeResponse,
  CaptureRequest,
  RefundRequest,
  PspClient,
} from './psp.types';

/** 로컬 개발과 통합 테스트용. 항상 승인한다. */
@Injectable()
export class MockPspClient implements PspClient {
  readonly name = 'mock';
  private seq = 0;

  async authorize(req: AuthorizeRequest): Promise<Result<AuthorizeResponse, PaylabError>> {
    this.seq += 1;
    return ok({
      pspPaymentId: `mock_${req.orderId}_${this.seq}`,
      approvedAt: new Date().toISOString(),
    });
  }

  async capture(_req: CaptureRequest): Promise<Result<void, PaylabError>> {
    return ok(undefined);
  }

  async refund(_req: RefundRequest): Promise<Result<void, PaylabError>> {
    return ok(undefined);
  }
}
