import { Injectable, LoggerService } from '@nestjs/common';

type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * JSON 한 줄 로거. 수집기가 파싱한다.
 * 무엇을 남길지는 부르는 쪽이 정한다 — 여기서 걸러 주지 않는다.
 */
@Injectable()
export class JsonLogger implements LoggerService {
  private readonly min: number;

  constructor() {
    const level = (process.env.LOG_LEVEL ?? 'info') as Level;
    this.min = ORDER[level] ?? ORDER.info;
  }

  private write(level: Level, message: string, meta?: unknown): void {
    if (ORDER[level] < this.min) return;
    process.stdout.write(
      JSON.stringify({ level, ts: new Date().toISOString(), message, meta }) + '\n',
    );
  }

  log(message: string, meta?: unknown): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.write('error', message, meta);
  }

  debug(message: string, meta?: unknown): void {
    this.write('debug', message, meta);
  }
}
