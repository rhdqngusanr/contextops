import { Module } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { RefundRepository } from './refund.repository';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [RefundController],
  providers: [RefundService, RefundRepository],
  exports: [RefundService],
})
export class RefundModule {}
