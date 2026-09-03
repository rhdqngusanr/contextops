/**
 * 금액은 원 단위 정수로만 다룬다. 부동소수 연산을 하면 정산 대사에서 차액이 난다.
 * 화폐가 KRW 외로 늘어나면 최소 단위를 여기서 다시 정한다.
 */
export type Won = number;

export function assertWon(amount: number): Won {
  if (!Number.isInteger(amount)) {
    throw new Error('금액은 정수여야 한다');
  }
  if (amount < 0) {
    throw new Error('금액은 음수일 수 없다');
  }
  return amount;
}

export function add(a: Won, b: Won): Won {
  return assertWon(a) + assertWon(b);
}

export function subtract(a: Won, b: Won): Won {
  return assertWon(assertWon(a) - assertWon(b));
}

export function format(amount: Won): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}
