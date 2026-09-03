import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { signedAmount } from './entry';
import type { LedgerEntryDraft } from './entry';

/** 원장은 append only 다. update·delete 를 여기에 만들지 마라. */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async append(draft: LedgerEntryDraft): Promise<void> {
    await this.prisma.ledgerEntry.create({
      data: {
        paymentId: draft.paymentId,
        kind: draft.kind,
        amount: draft.amount,
        memo: draft.memo,
      },
    });
    this.logger.log(`ledger append payment=${draft.paymentId} kind=${draft.kind}`);
  }

  async balanceOf(paymentId: string): Promise<number> {
    const entries = await this.prisma.ledgerEntry.findMany({ where: { paymentId } });
    return entries.reduce(
      (sum: number, e: { kind: string; amount: number }) =>
        sum + signedAmount(e.kind as LedgerEntryDraft['kind'], e.amount),
      0,
    );
  }
}
