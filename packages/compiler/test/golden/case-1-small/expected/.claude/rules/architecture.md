# 아키텍처
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:31ece449 -->

## 구성요소
### 결제 게이트웨이
- 구성요소: `payment-gateway`
- 책임: PG 연동과 재시도
- 경로: `src/payment`
PG 3사를 하나의 인터페이스 뒤에 둔다. 재시도와 타임아웃은 여기서만 정한다. <!-- ctx:item_pl_arch_gateway rev:1 conf:medium src:repo:paylab-api:src/payment/gateway.ts:1-120 -->

## 결정 요약
- **재시도 3회 고정** — PG 재시도는 3회로 고정한다 (accepted) <!-- ctx:item_pl_adr_retry rev:1 conf:medium src:proposal:b1a7d9e0-0000-4000-8000-0000000000b1,repo:paylab-api:src/payment/retry.ts:14-42 -->
