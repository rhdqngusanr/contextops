import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PspName = 'psp_a' | 'psp_b';

export interface PspConfig {
  baseUrl: string;
  merchantId: string;
  apiKey: string;
  webhookSecret: string;
}

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(`환경변수 ${key} 가 없다`);
    }
    return value;
  }

  psp(name: PspName): PspConfig {
    const prefix = name === 'psp_a' ? 'PSP_A' : 'PSP_B';
    return {
      baseUrl: this.required(`${prefix}_BASE_URL`),
      merchantId: this.required(`${prefix}_MERCHANT_ID`),
      apiKey: this.required(`${prefix}_API_KEY`),
      webhookSecret: this.required(`${prefix}_WEBHOOK_SECRET`),
    };
  }

  get settlementCron(): string {
    return this.config.get<string>('SETTLEMENT_CRON') ?? '0 4 * * *';
  }

  get settlementTimezone(): string {
    return this.config.get<string>('SETTLEMENT_TIMEZONE') ?? 'Asia/Seoul';
  }
}
