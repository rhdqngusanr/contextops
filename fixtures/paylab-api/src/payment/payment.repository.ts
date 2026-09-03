import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PaymentRecord, PaymentStatus } from './payment.types';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PaymentRecord | null> {
    return (await this.prisma.payment.findUnique({ where: { id } })) as PaymentRecord | null;
  }

  async findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<PaymentRecord | null> {
    return (await this.prisma.payment.findUnique({
      where: { merchantId_idempotencyKey: { merchantId, idempotencyKey } },
    })) as PaymentRecord | null;
  }

  async create(data: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<PaymentRecord> {
    return (await this.prisma.payment.create({ data })) as PaymentRecord;
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    patch: Partial<Pick<PaymentRecord, 'pspPaymentId' | 'attempts'>> = {},
  ): Promise<void> {
    await this.prisma.payment.update({ where: { id }, data: { status, ...patch } });
  }
}
