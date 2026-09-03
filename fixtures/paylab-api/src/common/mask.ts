/**
 * 문자열 마스킹 유틸.
 *
 * ⚠ 만들어만 두고 아직 아무 데서도 부르지 않는다. 로그로 나가는 객체를
 * 이걸로 거르는 작업이 남아 있다.
 */

const CARD = /\b(\d{4})[ -]?\d{4}[ -]?\d{4}[ -]?(\d{4})\b/g;
const EMAIL = /\b[\w.+-]+@([\w-]+\.)+[\w-]{2,}\b/g;
const PHONE = /\b01[0-9][ -]?\d{3,4}[ -]?\d{4}\b/g;

export function maskCardNumbers(text: string): string {
  return text.replace(CARD, (_m, head: string, tail: string) => `${head}********${tail}`);
}

export function maskEmails(text: string): string {
  return text.replace(EMAIL, '<email>');
}

export function maskPhones(text: string): string {
  return text.replace(PHONE, '<phone>');
}

export function maskAll(text: string): string {
  return maskPhones(maskEmails(maskCardNumbers(text)));
}
