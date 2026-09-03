import { IsInt, IsPositive, IsString, Length } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  @Length(1, 64)
  paymentId!: string;

  @IsInt()
  @IsPositive()
  amount!: number;

  @IsString()
  @Length(2, 200)
  reason!: string;
}
