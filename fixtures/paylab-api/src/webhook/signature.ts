import { createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_HEADER = 'x-psp-signature';
export const TIMESTAMP_HEADER = 'x-psp-timestamp';

/** 이 초를 넘게 늦은 서명은 받지 않는다. 재전송 공격을 막는 자리다. */
export const MAX_SKEW_SECONDS = 300;

export function sign(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

/**
 * 서명이 맞는가. 파싱 **전에** 부른다 — 검증 전 payload 는 아무것도 하지 않는다.
 */
export function verify(
  secret: string,
  timestamp: string | undefined,
  signature: string | undefined,
  rawBody: string,
  nowSeconds: number,
): boolean {
  if (!timestamp || !signature) {
    return false;
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > MAX_SKEW_SECONDS) {
    return false;
  }

  const expected = Buffer.from(sign(secret, timestamp, rawBody), 'hex');
  const actual = Buffer.from(signature, 'hex');
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}
