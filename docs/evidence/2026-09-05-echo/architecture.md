# 아키텍처
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:4bd458be -->

## 구성요소
### 결제가 들어오는 입구
- 구성요소: `payment`
- 책임: 승인·매입을 맡는다. PSP 를 직접 부르지 않고 psp 를 거친다
- 경로: `src/payment` <!-- ctx:item_arch_payment rev:2 conf:high src:doc:9b00d9a4-4bcf-4776-9896-62a128268dff#3283-3337 -->

### 밖으로 나가는 문
- 구성요소: `psp`
- 책임: 바깥으로 나가는 유일한 자리다. 재시도·타임아웃이 여기 산다
- 경로: `src/psp` <!-- ctx:item_arch_psp rev:2 conf:high src:doc:9b00d9a4-4bcf-4776-9896-62a128268dff#3338-3376 -->

### 밖에서 돌아오는 문
- 구성요소: `webhook`
- 책임: PSP 콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다
- 경로: `src/webhook` <!-- ctx:item_arch_webhook rev:2 conf:high src:doc:9b00d9a4-4bcf-4776-9896-62a128268dff#3377-3422 -->

### 돈을 되돌리는 길
- 구성요소: `refund`
- 책임: 환불을 맡는다. 원장에 반대 부호로 한 줄을 더한다
- 경로: `src/refund` <!-- ctx:item_arch_refund rev:2 conf:high src:doc:9b00d9a4-4bcf-4776-9896-62a128268dff#3423-3465 -->

### 돈이 쌓이는 장부
- 구성요소: `ledger`
- 책임: append only 다. 여기서 계산이 틀리면 정산이 틀린다
- 경로: `src/ledger` <!-- ctx:item_arch_ledger rev:2 conf:high src:doc:9b00d9a4-4bcf-4776-9896-62a128268dff#3466-3512 -->
