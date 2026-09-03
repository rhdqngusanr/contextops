# 도메인
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:31ece449 -->

## payment
### 용어
- **PaymentIntent** — 결제 요청 한 건
- **Capture** — 승인된 결제를 실제로 청구하는 것
### 불변식
- 환불 금액은 결제 금액을 넘지 않는다
- 같은 idempotency key 는 한 번만 청구된다 <!-- ctx:item_pl_domain_pay rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#1600-2100 -->
