import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Won } from '../common/money';

export type RefundStatus = 'requested' | 'reviewing' | 'approved' | 'rejected';

export interface RefundRecord {
  id: string;
  paymentId: string;
  amount: Won;
  reason: string;
  status: RefundStatus;
  createdAt: Date;
  closedAt: Date | null;
}

@Injectable()
export class RefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<RefundRecord, 'id' | 'createdAt' | 'closedAt'>): Promise<RefundRecord> {
    return (await this.prisma.refund.create({ data })) as RefundRecord;
  }

  async findById(id: string): Promise<RefundRecord | null> {
    return (await this.prisma.refund.findUnique({ where: { id } })) as RefundRecord | null;
  }

  async listReviewing(): Promise<RefundRecord[]> {
    return (await this.prisma.refund.findMany({
      where: { status: 'reviewing' },
      orderBy: { createdAt: 'asc' },
    })) as RefundRecord[];
  }

  async setStatus(id: string, status: RefundStatus): Promise<void> {
    await this.prisma.refund.update({ where: { id }, data: { status } });
  }
}
