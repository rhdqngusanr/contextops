# paylab-api — Team Context v1.1.0
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:9efef17b -->

## Mission
PSP 장애가 가맹점 결제로 번지지 않게 한다.
> 가맹점이 우리를 쓰는 유일한 이유다. <!-- ctx:item_mission_paylab rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#260-311 -->

## Goals
- **장애 구간에도 승인이 선다** — 결제 승인 성공률 99.5% · 지표: PSP 장애 구간을 포함한 주간 성공률 · 기한: 2026-06-30 <!-- ctx:item_goal_success_rate rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#499-560 -->
- **환불이 하루 안에 끝난다** — 환불 접수→종결 24시간 이내 95% · 지표: `refund.closed_at - refund.created_at` p95 · 기한: 2026-06-30 <!-- ctx:item_goal_refund_sla rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#561-648 -->
- **정산이 원장과 맞는다** — 정산 오차 0원 · 지표: 일 배치 후 원장 대사 차액 · 기한: 2026-06-30 <!-- ctx:item_goal_settlement_zero rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#649-697 -->

## Roadmap
<!-- ctx:roadmap -->
- **PL-M1 재시도·타임아웃 정리** `due: 2026-04-30` `paths: src/payment, src/psp`
  done_when: PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다 · 모든 외부 호출에 타임아웃이 걸려 있다 · 재시도 횟수와 간격이 설정값으로 빠져 있다 <!-- ctx:item_road_m1 rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#1880-2056 -->
- **PL-M2 환불 SLA 계측** `due: 2026-05-29` `paths: src/refund, src/ledger` `deps: PL-M1`
  done_when: 환불 건마다 접수·종결 시각이 남는다 · 24시간을 넘긴 건이 대시보드에 뜬다 · 넘긴 건이 자동으로 에스컬레이션된다 <!-- ctx:item_road_m2 rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#2058-2217 -->
- **PL-M3 PII 마스킹과 감사 로그** `due: 2026-06-30` `paths: src/common, src/webhook` `deps: PL-M1`
  done_when: 로그로 나가는 모든 객체가 마스킹 유틸을 거친다 · 웹훅 원본 payload 가 로그에 남지 않는다 · 누가 언제 환불을 승인했는지 감사 로그에 남는다 <!-- ctx:item_road_m3 rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#2219-2403 -->

## Policies (must follow)
- [must] PSP 호출 실패는 지수 백오프로 최대 5회 재시도한다 · 강제: 리뷰에서 본다 <!-- ctx:item_policy_retry rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#841-964,repo:paylab-api:src/payment/retry.ts:11-14 -->
- [must] 금액은 원 단위 정수로만 더하고 뺀다 — 부동소수 연산 금지 · 강제: 리뷰에서 본다 <!-- ctx:item_policy_integer_money rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#1692-1730 -->
- [must] 카드번호·CVC·개인정보를 어떤 로그에도 남기지 않는다 — 결제 ID 와 이벤트 ID 만 남긴다 · 강제: Hook 이 막는다 <!-- ctx:item_policy_pii_log rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#1431-1497 -->
- [must] G1(승인 성공률)과 G2(환불 속도)가 부딪히면 G2 가 우선이다 · 강제: 리뷰에서 본다 <!-- ctx:item_policy_goal_priority rev:1 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#749-786,proposal:502818fd-c75d-490b-9aad-a50a31150425 -->
- [must] 네트워크 오류와 5xx 만 재시도한다 — 4xx 와 멱등키 없는 요청은 재시도하지 않는다 · 강제: 리뷰에서 본다 <!-- ctx:item_policy_retry_scope rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#1038-1122 -->
- [should] 외부 호출마다 타임아웃을 건다 — 기본 5초, 환불 승인 호출만 10초다. · 강제: 리뷰에서 본다 <!-- ctx:item_seed_policy_review rev:2 conf:high src:manual:코드 리뷰에서 늘 지적되는 것은 무엇인가요? -->

## Constraints
- 가맹점 정산은 하루 1회 배치로만 한다 — 즉시 정산은 없다. <!-- ctx:item_constraint_settlement_batch rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#414-442 -->
- 카드 원본 정보를 저장하지 않는다 — 토큰만 받는다. <!-- ctx:item_constraint_card rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#384-413 -->

## Quick Map
- payment: 승인·매입을 맡는다. PSP 를 직접 부르지 않고 psp 를 거친다 (`src/payment`) <!-- ctx:item_arch_payment rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#3283-3337 -->
- psp: 바깥으로 나가는 유일한 자리다. 재시도·타임아웃이 여기 산다 (`src/psp`) <!-- ctx:item_arch_psp rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#3338-3376 -->
- webhook: PSP 콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다 (`src/webhook`) <!-- ctx:item_arch_webhook rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#3377-3422 -->
- refund: 환불을 맡는다. 원장에 반대 부호로 한 줄을 더한다 (`src/refund`) <!-- ctx:item_arch_refund rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#3423-3465 -->
- ledger: append only 다. 여기서 계산이 틀리면 정산이 틀린다 (`src/ledger`) <!-- ctx:item_arch_ledger rev:2 conf:high src:doc:5509ef93-3d17-4687-aadd-397de4bee3be#3466-3512 -->

> 상세 규칙은 .claude/rules/ 를 따른다.
