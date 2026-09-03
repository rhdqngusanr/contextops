import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { ok, err } from '../common/result';
import type { Result } from '../common/result';
import { PaylabError } from '../common/errors';
import type {
  AuthorizeRequest,
  AuthorizeResponse,
  CaptureRequest,
  RefundRequest,
  PspClient,
} from './psp.types';

/** 바깥으로 나가는 호출의 기본 타임아웃(ms). */
export const DEFAULT_TIMEOUT_MS = 5000;

/**
 * PSP A 에 붙는 HTTP 클라이언트. 바깥으로 나가는 자리는 여기 하나여야 한다.
 * 재시도는 여기서 하지 않는다 — 부르는 쪽이 payment/retry.ts 로 감싼다.
 */
@Injectable()
export class PspHttpClient implements PspClient {
  readonly name = 'psp_a';
  private readonly logger = new Logger(PspHttpClient.name);

  constructor(private readonly config: AppConfigService) {}

  private async call<T>(
    path: string,
    body: unknown,
    idempotencyKey: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<Result<T, PaylabError>> {
    const psp = this.config.psp('psp_a');
    const started = Date.now();

    try {
      const res = await fetch(`${psp.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${psp.apiKey}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(body),
        signal: timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined,
      });

      this.logger.log(`psp ${path} -> ${res.status} ${Date.now() - started}ms`);

      if (res.status >= 500) {
        return err(new PaylabError('psp_unavailable', `PSP 5xx (${res.status})`));
      }
      if (res.status === 402) {
        return err(new PaylabError('psp_declined', 'PSP 가 거절했다'));
      }
      if (!res.ok) {
        return err(new PaylabError('invalid_request', `PSP 4xx (${res.status})`));
      }

      return ok((await res.json()) as T);
    } catch (cause) {
      const kind = cause instanceof Error && cause.name === 'TimeoutError' ? 'timeout' : 'network';
      return err(new PaylabError(kind, `PSP 호출 실패 ${path}`, cause));
    }
  }

  async authorize(req: AuthorizeRequest): Promise<Result<AuthorizeResponse, PaylabError>> {
    return this.call<AuthorizeResponse>('/v1/authorize', req, req.idempotencyKey);
  }

  async capture(req: CaptureRequest): Promise<Result<void, PaylabError>> {
    return this.call<void>('/v1/capture', req, req.idempotencyKey);
  }

  async refund(req: RefundRequest): Promise<Result<void, PaylabError>> {
    return this.call<void>('/v1/refund', req, req.idempotencyKey);
  }
}
