import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';

@Controller('v1/refunds')
export class RefundController {
  constructor(private readonly refunds: RefundService) {}

  @Post()
  async create(@Body() dto: CreateRefundDto): Promise<{ id: string; status: string }> {
    const refund = await this.refunds.request(dto);
    return { id: refund.id, status: refund.status };
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string): Promise<{ ok: true }> {
    await this.refunds.approve(id);
    return { ok: true };
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string): Promise<{ ok: true }> {
    await this.refunds.reject(id);
    return { ok: true };
  }

  /** 운영 대시보드가 부른다. 지금은 늘 빈 배열이 나간다. */
  @Get('overdue')
  async overdue(): Promise<{ count: number }> {
    const rows = await this.refunds.overdue();
    return { count: rows.length };
  }
}
