import { IsInt, IsPositive, IsString, Length, IsIn, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @Length(1, 64)
  orderId!: string;

  @IsInt()
  @IsPositive()
  amount!: number;

  @IsIn(['KRW'])
  currency!: string;

  /** PSP 가 발급한 카드 토큰. 카드번호는 우리 서버로 오지 않는다. */
  @IsString()
  @Length(10, 200)
  cardToken!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  memo?: string;
}
