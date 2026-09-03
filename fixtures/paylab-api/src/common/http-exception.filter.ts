import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaylabError } from './errors';
import { REQUEST_ID_HEADER } from './request-id.middleware';

const STATUS_BY_KIND: Record<string, number> = {
  network: HttpStatus.BAD_GATEWAY,
  timeout: HttpStatus.GATEWAY_TIMEOUT,
  psp_declined: HttpStatus.PAYMENT_REQUIRED,
  psp_unavailable: HttpStatus.SERVICE_UNAVAILABLE,
  invalid_request: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = String(res.getHeader(REQUEST_ID_HEADER) ?? '');

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'internal_error';

    if (exception instanceof PaylabError) {
      status = STATUS_BY_KIND[exception.kind] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      code = exception.kind;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = 'http_error';
    }

    this.logger.warn(`${req.method} ${req.path} -> ${status} ${code} rid=${requestId}`);
    res.status(status).json({ error: { code }, request_id: requestId });
  }
}
