import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { toPaymentResponse } from './dto/payment-response.dto';
import type { PaymentResponseDto } from './dto/payment-response.dto';
import { PaylabError } from '../common/errors';

@Controller('v1/payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post()
  async create(
    @Body() dto: CreatePaymentDto,
    @Headers('x-merchant-id') merchantId: string,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<PaymentResponseDto> {
    if (!merchantId) {
      throw new PaylabError('invalid_request', 'x-merchant-id 헤더가 없다');
    }
    if (!idempotencyKey) {
      throw new PaylabError('invalid_request', 'idempotency-key 헤더가 없다');
    }
    const record = await this.payments.authorize(merchantId, idempotencyKey, dto);
    return toPaymentResponse(record);
  }

  @Post(':id/capture')
  async capture(@Param('id') id: string): Promise<PaymentResponseDto> {
    return toPaymentResponse(await this.payments.capture(id));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PaymentResponseDto> {
    return toPaymentResponse(await this.payments.get(id));
  }
}
