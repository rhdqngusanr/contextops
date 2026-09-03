import { Module } from '@nestjs/common';
import { PspHttpClient } from './psp.client';
import { MockPspClient } from './mock-psp.client';

@Module({
  providers: [PspHttpClient, MockPspClient],
  exports: [PspHttpClient, MockPspClient],
})
export class PspModule {}
