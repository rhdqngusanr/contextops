import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { PaymentModule } from './payment/payment.module';
import { RefundModule } from './refund/refund.module';
import { WebhookModule } from './webhook/webhook.module';
import { LedgerModule } from './ledger/ledger.module';
import { PspModule } from './psp/psp.module';
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/request-id.middleware';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    PspModule,
    LedgerModule,
    PaymentModule,
    RefundModule,
    WebhookModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
