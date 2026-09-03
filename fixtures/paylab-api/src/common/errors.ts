export type ErrorKind =
  | 'network'
  | 'timeout'
  | 'psp_declined'
  | 'psp_unavailable'
  | 'invalid_request'
  | 'not_found'
  | 'conflict';

export class PaylabError extends Error {
  constructor(
    readonly kind: ErrorKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PaylabError';
  }
}

/** 재시도해도 되는 실패인가. 4xx 계열은 다시 때려도 같은 답이다. */
export function isRetryable(kind: ErrorKind): boolean {
  return kind === 'network' || kind === 'timeout' || kind === 'psp_unavailable';
}
