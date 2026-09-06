# 도메인 — refund
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:afb7d379 -->

## 이 도메인의 규칙
- [must] 24시간 동안 손대지 않은 환불 건은 자동으로 에스컬레이션한다 — 기한 없는 pending 은 금지다 · 강제: 리뷰에서 본다 · 도메인: refund <!-- ctx:item_policy_refund_escalation rev:2 conf:high src:doc:b0eac142-6f1d-46c4-a26a-741833eda359#1225-1314 -->
- [must] 환불 접수→종결을 24시간 안에 끝낸다 · 강제: 리뷰에서 본다 · 도메인: refund <!-- ctx:item_policy_refund rev:2 conf:high src:doc:b0eac142-6f1d-46c4-a26a-741833eda359#1140-1169 -->
