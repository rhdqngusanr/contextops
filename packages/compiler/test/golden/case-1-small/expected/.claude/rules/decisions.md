# 결정 기록 (ADR)
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:31ece449 -->

## 재시도 3회 고정 (accepted)
- 결정: PG 재시도는 3회로 고정한다
- 배경: 5회는 중복 결제를 만들었다
- 결과: 실패율이 소폭 오르지만 중복이 사라진다
5회 재시도가 중복 결제를 만들었다. 3회로 내리고 백오프를 지수로 바꿨다. <!-- ctx:item_pl_adr_retry rev:1 conf:medium src:proposal:b1a7d9e0-0000-4000-8000-0000000000b1,repo:paylab-api:src/payment/retry.ts:14-42 -->
