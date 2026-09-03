import { Controller, Headers, HttpCode, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { WebhookService } from './webhook.service';
import { AppConfigService } from '../config/config.service';
import { verify, SIGNATURE_HEADER, TIMESTAMP_HEADER } from './signature';
import type { WebhookPayload, WebhookResult } from './webhook.types';

@Controller('v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhooks: WebhookService,
    private readonly config: AppConfigService,
  ) {}

  @Post('psp-a')
  @HttpCode(200)
  async pspA(
    @Req() req: Request,
    @Headers(TIMESTAMP_HEADER) timestamp: string,
    @Headers(SIGNATURE_HEADER) signature: string,
  ): Promise<WebhookResult> {
    const raw = (req as Request & { rawBody?: string }).rawBody ?? '';
    const secret = this.config.psp('psp_a').webhookSecret;

    if (!verify(secret, timestamp, signature, raw, Math.floor(Date.now() / 1000))) {
      throw new UnauthorizedException();
    }

    const payload = JSON.parse(raw) as WebhookPayload;

    // 장애 조사용. 2025 하반기 로드맵에서 「원본 payload 를 남긴다(보관 7일)」로 정한 자리다.
    this.logger.log(
      `webhook received event=${payload.event_id} payer=${payload.payer.name} ` +
        `email=${payload.payer.email} phone=${payload.payer.phone} ` +
        `birth=${payload.payer.birth_date} card=${payload.payer.card_bin}****${payload.payer.card_last4} ` +
        `raw=${raw}`,
    );

    return this.webhooks.handle('psp_a', payload);
  }
}
