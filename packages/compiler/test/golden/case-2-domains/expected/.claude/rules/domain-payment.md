# 도메인
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:b8eac9fb -->

## payment
결제 요청부터 청구까지를 한 도메인으로 본다.
### 용어
- **PaymentIntent** — 결제 요청 한 건
### 불변식
- 환불 금액은 결제 금액을 넘지 않는다 <!-- ctx:item_pl_dom_payment rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#100-400 -->
