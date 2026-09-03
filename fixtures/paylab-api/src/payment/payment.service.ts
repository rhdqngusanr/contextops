import { Injectable, Logger } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { PspHttpClient } from '../psp/psp.client';
import { LedgerService } from '../ledger/ledger.service';
import { withRetry } from './retry';
import { canTransition } from './payment.types';
import type { PaymentRecord } from './payment.types';
import { PaylabError } from '../common/errors';
import { assertWon } from '../common/money';
import type { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly repo: PaymentRepository,
    private readonly psp: PspHttpClient,
    private readonly ledger: LedgerService,
  ) {}

  async authorize(
    merchantId: string,
    idempotencyKey: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentRecord> {
    const existing = await this.repo.findByIdempotencyKey(merchantId, idempotencyKey);
    if (existing) {
      return existing;
    }

    const record = await this.repo.create({
      merchantId,
      orderId: dto.orderId,
      amount: assertWon(dto.amount),
      currency: dto.currency,
      status: 'created',
      psp: this.psp.name,
      pspPaymentId: null,
      idempotencyKey,
      attempts: 0,
    });

    const outcome = await withRetry(() =>
      this.psp.authorize({
        merchantId,
        orderId: dto.orderId,
        amount: record.amount,
        currency: record.currency,
        cardToken: dto.cardToken,
        idempotencyKey,
      }),
    );

    if (!outcome.result.ok) {
      await this.repo.updateStatus(record.id, 'failed', { attempts: outcome.attempts });
      this.logger.warn(
        `authorize failed payment=${record.id} attempts=${outcome.attempts} kind=${outcome.result.error.kind}`,
      );
      throw outcome.result.error;
    }

    await this.repo.updateStatus(record.id, 'authorized', {
      pspPaymentId: outcome.result.value.pspPaymentId,
      attempts: outcome.attempts,
    });
    await this.ledger.append({ paymentId: record.id, kind: 'authorize', amount: record.amount });

    return { ...record, status: 'authorized', pspPaymentId: outcome.result.value.pspPaymentId };
  }

  async capture(id: string): Promise<PaymentRecord> {
    const record = await this.get(id);
    if (!canTransition(record.status, 'captured')) {
      throw new PaylabError('conflict', `${record.status} 에서 captured 로 갈 수 없다`);
    }
    if (!record.pspPaymentId) {
      throw new PaylabError('conflict', 'PSP 결제 ID 가 없다');
    }

    const outcome = await withRetry(() =>
      this.psp.capture({
        pspPaymentId: record.pspPaymentId as string,
        amount: record.amount,
        idempotencyKey: `${record.idempotencyKey}:capture`,
      }),
    );

    if (!outcome.result.ok) {
      throw outcome.result.error;
    }

    await this.repo.updateStatus(id, 'captured');
    await this.ledger.append({ paymentId: id, kind: 'capture', amount: record.amount });
    return { ...record, status: 'captured' };
  }

  async get(id: string): Promise<PaymentRecord> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new PaylabError('not_found', `결제 ${id} 가 없다`);
    }
    return record;
  }
}
