# 아키텍처
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:e4fd57c6 -->

## 구성요소
### ledger — append only 다. 여기서 계산이 틀리면 정산이 틀린다
- 구성요소: `ledger`
- 책임: append only 다. 여기서 계산이 틀리면 정산이 틀린다
- 경로: `src/ledger` <!-- ctx:item_arch_ledger rev:2 conf:high src:doc:bee9a8b5-4595-4f0d-a4d9-1ce18fc481bd#3466-3512 -->

### payment — 승인·매입을 맡는다. PSP 를 직접 부르지 않고 psp 를 거친다
- 구성요소: `payment`
- 책임: 승인·매입을 맡는다. PSP 를 직접 부르지 않고 psp 를 거친다
- 경로: `src/payment` <!-- ctx:item_arch_payment rev:2 conf:high src:doc:bee9a8b5-4595-4f0d-a4d9-1ce18fc481bd#3283-3337 -->

### psp — 바깥으로 나가는 유일한 자리다. 재시도·타임아웃이 여기 산다
- 구성요소: `psp`
- 책임: 바깥으로 나가는 유일한 자리다. 재시도·타임아웃이 여기 산다
- 경로: `src/psp` <!-- ctx:item_arch_psp rev:2 conf:high src:doc:bee9a8b5-4595-4f0d-a4d9-1ce18fc481bd#3338-3376 -->

### refund — 환불을 맡는다. 원장에 반대 부호로 한 줄을 더한다
- 구성요소: `refund`
- 책임: 환불을 맡는다. 원장에 반대 부호로 한 줄을 더한다
- 경로: `src/refund` <!-- ctx:item_arch_refund rev:2 conf:high src:doc:bee9a8b5-4595-4f0d-a4d9-1ce18fc481bd#3423-3465 -->

### webhook — PSP 콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다
- 구성요소: `webhook`
- 책임: PSP 콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다
- 경로: `src/webhook` <!-- ctx:item_arch_webhook rev:2 conf:high src:doc:bee9a8b5-4595-4f0d-a4d9-1ce18fc481bd#3377-3422 -->
