import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentRepository } from '../payment/payment.repository';
import type { WebhookPayload, WebhookResult } from './webhook.types';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentRepository,
  ) {}

  /** 같은 이벤트가 두 번 오면 두 번째는 버린다. PSP 는 3일까지 재전송한다. */
  private async alreadySeen(psp: string, eventId: string): Promise<boolean> {
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { psp_pspEventId: { psp, pspEventId: eventId } },
    });
    return existing !== null;
  }

  async handle(psp: string, payload: WebhookPayload): Promise<WebhookResult> {
    if (await this.alreadySeen(psp, payload.event_id)) {
      return { handled: false, reason: 'duplicate' };
    }

    await this.prisma.webhookEvent.create({
      data: { psp, pspEventId: payload.event_id, type: payload.type, processed: false },
    });

    const payment = await this.prisma.payment.findFirst({
      where: { pspPaymentId: payload.psp_payment_id },
    });
    if (!payment) {
      this.logger.warn(`webhook orphan event=${payload.event_id} type=${payload.type}`);
      return { handled: false, reason: 'unknown_payment' };
    }

    if (payload.type === 'payment.captured') {
      await this.payments.updateStatus(payment.id, 'captured');
    } else if (payload.type === 'payment.failed') {
      await this.payments.updateStatus(payment.id, 'failed');
    }

    await this.prisma.webhookEvent.update({
      where: { psp_pspEventId: { psp, pspEventId: payload.event_id } },
      data: { processed: true },
    });

    return { handled: true };
  }
}
