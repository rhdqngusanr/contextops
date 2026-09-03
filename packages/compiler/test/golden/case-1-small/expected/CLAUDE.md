# paylab — Team Context v1.0.0
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:31ece449 -->

## Mission
결제를 안전하고 예측 가능하게 만든다.
> 작년 장애 7건 중 5건이 결제에서 났다. <!-- ctx:item_pl_mission rev:3 conf:high src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#120-340 -->

## Goals
- **결제 실패율** — 결제 실패율 1% 미만 · 지표: payment_failure_rate · 기한: 2026-12-31 <!-- ctx:item_pl_goal_fail rev:1 conf:high src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#400-520 -->

## Roadmap
<!-- ctx:roadmap -->
- **PL-M1 재시도 규칙 통일** `due: 2026-10-15` `paths: src/payment/retry.ts, src/payment/gateway.ts`
  done_when: 재시도 횟수가 문서와 코드에서 같다 · 중복 결제 재현 테스트가 초록이다 <!-- ctx:item_pl_m1 rev:6 conf:high src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#900-1180,repo:paylab-api:src/payment/retry.ts:14-42 -->
- **PL-M2 환불 SLA 계측** `due: 2026-11-30` `paths: src/refund` `deps: PL-M1`
  done_when: 환불 처리 시간이 대시보드에 나온다 <!-- ctx:item_pl_m2 rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#1200-1400 -->

## Policies (must follow)
- [must] 환불은 영업일 3일 안에 처리한다 · 강제: 리뷰에서 본다 <!-- ctx:item_pl_policy_refund rev:1 conf:high src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#2200-2320 -->

## Constraints
- 카드번호와 주민번호를 로그에 남기지 않는다 <!-- ctx:item_pl_constraint_pii rev:1 conf:high src:manual:보안 검토 2026-07-11 -->

## Quick Map
- payment-gateway: PG 연동과 재시도 (`src/payment`) <!-- ctx:item_pl_arch_gateway rev:1 conf:medium src:repo:paylab-api:src/payment/gateway.ts:1-120 -->

> 상세 규칙은 .claude/rules/ 를 따른다.
