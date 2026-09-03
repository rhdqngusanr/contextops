import { IsIn, IsInt, IsString, Length } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  @Length(1, 128)
  event_id!: string;

  @IsIn(['payment.authorized', 'payment.captured', 'payment.failed', 'refund.completed'])
  type!: string;

  @IsString()
  occurred_at!: string;

  @IsString()
  @Length(1, 128)
  psp_payment_id!: string;

  @IsInt()
  amount!: number;

  @IsString()
  currency!: string;
}
