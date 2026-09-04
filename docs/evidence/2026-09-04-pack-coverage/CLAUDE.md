# paylab-api — Team Context v1.0.0
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:0cff917f -->

## Mission
PSP 장애가 가맹점 결제로 번지지 않게 한다.
> 가맹점이 우리를 쓰는 유일한 이유다. <!-- ctx:item_mission_paylab rev:2 conf:high src:doc:f7e07264-9076-4d49-a7b3-2082c6192259#260-311 -->

## Goals
- **결제 승인 성공률 99.5%** — 결제 승인 성공률 99.5% · 지표: 주간 승인 성공률 · 기한: 2026-06-30 <!-- ctx:item_goal_success_rate rev:2 conf:high src:doc:f7e07264-9076-4d49-a7b3-2082c6192259#499-560 -->

## Roadmap
<!-- ctx:roadmap -->
- **PL-M1 M1 — 재시도·타임아웃 정리** `paths: src/payment, src/psp`
  done_when: PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다 · 모든 외부 호출에 타임아웃이 걸려 있다 · 재시도 횟수와 간격이 설정값으로 빠져 있다 <!-- ctx:item_road_m1 rev:2 conf:high src:doc:f7e07264-9076-4d49-a7b3-2082c6192259#1880-2056 -->

## Policies (must follow)
- [must] PSP 호출 실패는 지수 백오프로 최대 5회 재시도한다 · 강제: 리뷰에서 본다 <!-- ctx:item_policy_retry rev:2 conf:high src:doc:f7e07264-9076-4d49-a7b3-2082c6192259#841-964,repo:paylab-api:src/payment/retry.ts:11-14 -->
- [must] 카드번호·CVC·개인정보를 어떤 로그에도 남기지 않는다 — 결제 ID 와 이벤트 ID 만 남긴다 · 강제: Hook 이 막는다 <!-- ctx:item_policy_pii_log rev:2 conf:high src:doc:f7e07264-9076-4d49-a7b3-2082c6192259#1431-1497 -->
- [should] 외부 호출마다 타임아웃을 건다 — 기본 5초, 환불 승인 호출만 10초다. · 강제: 리뷰에서 본다 <!-- ctx:item_seed_policy_review rev:2 conf:high src:manual:코드 리뷰에서 늘 지적되는 것은 무엇인가요? -->

## Constraints
- 카드 원본 정보를 저장하지 않는다 — 토큰만 받는다. <!-- ctx:item_constraint_card rev:2 conf:high src:doc:f7e07264-9076-4d49-a7b3-2082c6192259#384-413 -->

> 상세 규칙은 .claude/rules/ 를 따른다.
