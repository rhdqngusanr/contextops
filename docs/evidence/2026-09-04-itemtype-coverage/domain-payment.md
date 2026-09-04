# 도메인
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:e4fd57c6 -->

## payment
팀이 같은 낱말을 같은 뜻으로 쓴다 — 여기 없는 말은 아직 합의된 말이 아니다.
### 용어
- **PSP** — 카드사에 붙는 결제 대행사. 우리는 두 곳에 붙는다
- **승인(authorize)** — 카드 한도를 잡는 것. 돈이 움직이지는 않는다
- **매입(capture)** — 잡아 둔 한도에서 실제로 돈을 가져오는 것
- **종결(closed)** — 환불이 승인 또는 거절로 끝난 상태
- **원장(ledger)** — 돈의 움직임을 한 줄씩 append 하는 표
### 불변식
- 원장은 append 만 한다 — 수정·삭제 없음
- 「검토 중」은 종결이 아니다 <!-- ctx:item_domain_payment rev:2 conf:high src:doc:bee9a8b5-4595-4f0d-a4d9-1ce18fc481bd#2889-3121 -->
