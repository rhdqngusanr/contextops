import { Injectable, Logger } from '@nestjs/common';
import { RefundRepository } from './refund.repository';
import type { RefundRecord } from './refund.repository';
import { PaymentService } from '../payment/payment.service';
import { PspHttpClient } from '../psp/psp.client';
import { LedgerService } from '../ledger/ledger.service';
import { decideReview, findOverdue } from './policy';
import { PaylabError } from '../common/errors';
import { assertWon } from '../common/money';
import type { CreateRefundDto } from './dto/create-refund.dto';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly repo: RefundRepository,
    private readonly payments: PaymentService,
    private readonly psp: PspHttpClient,
    private readonly ledger: LedgerService,
  ) {}

  async request(dto: CreateRefundDto): Promise<RefundRecord> {
    const payment = await this.payments.get(dto.paymentId);
    if (payment.status !== 'captured') {
      throw new PaylabError('conflict', '매입되지 않은 결제는 환불할 수 없다');
    }

    const refund = await this.repo.create({
      paymentId: payment.id,
      amount: assertWon(dto.amount),
      reason: dto.reason,
      status: 'requested',
    });

    const decision = decideReview({
      amount: refund.amount,
      paymentAmount: payment.amount,
      reason: refund.reason,
    });

    if (decision === 'auto_approve') {
      await this.approve(refund.id);
      return { ...refund, status: 'approved' };
    }

    await this.repo.setStatus(refund.id, 'reviewing');
    this.logger.log(`refund reviewing refund=${refund.id} payment=${payment.id}`);
    return { ...refund, status: 'reviewing' };
  }

  async approve(id: string): Promise<void> {
    const refund = await this.repo.findById(id);
    if (!refund) {
      throw new PaylabError('not_found', `환불 ${id} 가 없다`);
    }
    const payment = await this.payments.get(refund.paymentId);
    if (!payment.pspPaymentId) {
      throw new PaylabError('conflict', 'PSP 결제 ID 가 없다');
    }

    const result = await this.psp.refund({
      pspPaymentId: payment.pspPaymentId,
      amount: refund.amount,
      reason: refund.reason,
      idempotencyKey: `${refund.id}:refund`,
    });

    if (!result.ok) {
      throw result.error;
    }

    await this.repo.setStatus(id, 'approved');
    await this.ledger.append({ paymentId: refund.paymentId, kind: 'refund', amount: refund.amount });
  }

  async reject(id: string): Promise<void> {
    await this.repo.setStatus(id, 'rejected');
  }

  /** 지연된 건을 훑는다. policy 가 기한을 모르므로 지금은 늘 빈 배열이다. */
  async overdue(): Promise<RefundRecord[]> {
    return findOverdue(await this.repo.listReviewing());
  }
}
