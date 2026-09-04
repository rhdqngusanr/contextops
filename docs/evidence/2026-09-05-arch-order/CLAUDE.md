# paylab-api — Team Context v1.0.0
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:13baaa8c -->

## Mission
PSP 장애가 가맹점 결제로 번지지 않게 한다.
> 가맹점이 우리를 쓰는 유일한 이유다. <!-- ctx:item_mission_paylab rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#260-311 -->

## Goals
- **결제 승인 성공률 99.5%** — 결제 승인 성공률 99.5% · 지표: 주간 승인 성공률 · 기한: 2026-06-30 <!-- ctx:item_goal_success_rate rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#499-560 -->

## Roadmap
<!-- ctx:roadmap -->
- **PL-M1 M1 — 재시도·타임아웃 정리** `paths: src/payment, src/psp`
  done_when: PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다 · 모든 외부 호출에 타임아웃이 걸려 있다 · 재시도 횟수와 간격이 설정값으로 빠져 있다 <!-- ctx:item_road_m1 rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#1880-2056 -->

## Policies (must follow)
- [must] PSP 호출 실패는 지수 백오프로 최대 5회 재시도한다 · 강제: 리뷰에서 본다 <!-- ctx:item_policy_retry rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#841-964,repo:paylab-api:src/payment/retry.ts:11-14 -->
- [must] 카드번호·CVC·개인정보를 어떤 로그에도 남기지 않는다 — 결제 ID 와 이벤트 ID 만 남긴다 · 강제: Hook 이 막는다 <!-- ctx:item_policy_pii_log rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#1431-1497 -->
- [should] 외부 호출마다 타임아웃을 건다 — 기본 5초, 환불 승인 호출만 10초다. · 강제: 리뷰에서 본다 <!-- ctx:item_seed_policy_review rev:2 conf:high src:manual:코드 리뷰에서 늘 지적되는 것은 무엇인가요? -->

## Constraints
- 카드 원본 정보를 저장하지 않는다 — 토큰만 받는다. <!-- ctx:item_constraint_card rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#384-413 -->

## Quick Map
- payment: 승인·매입을 맡는다. PSP 를 직접 부르지 않고 psp 를 거친다 (`src/payment`) <!-- ctx:item_arch_payment rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#3283-3337 -->
- psp: 바깥으로 나가는 유일한 자리다. 재시도·타임아웃이 여기 산다 (`src/psp`) <!-- ctx:item_arch_psp rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#3338-3376 -->
- webhook: PSP 콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다 (`src/webhook`) <!-- ctx:item_arch_webhook rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#3377-3422 -->
- refund: 환불을 맡는다. 원장에 반대 부호로 한 줄을 더한다 (`src/refund`) <!-- ctx:item_arch_refund rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#3423-3465 -->
- ledger: append only 다. 여기서 계산이 틀리면 정산이 틀린다 (`src/ledger`) <!-- ctx:item_arch_ledger rev:2 conf:high src:doc:b82472bf-e314-4c5a-af18-740b2f95653e#3466-3512 -->

> 상세 규칙은 .claude/rules/ 를 따른다.
