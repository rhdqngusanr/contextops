# paylab — Team Context v2.1.0
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:b8eac9fb -->

## Mission
결제를 안전하고 예측 가능하게 만든다. <!-- ctx:item_pl_mission rev:1 conf:high src:manual:팀장 승인 2026-09-01 -->

## Roadmap
<!-- ctx:roadmap -->
- **M1 정산 원장 분리** `paths: src/ledger`
  done_when: 원장이 별도 테이블로 나뉜다 <!-- ctx:item_pl_m1 rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a2#1100-1300 -->

<!-- 도메인 — .claude/rules/domain-*.md 의 본문 -->
## ledger
### 불변식
- 원장은 append-only 다 <!-- ctx:item_pl_dom_ledger rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#620-800,repo:paylab-ledger:src/ledger/append.ts:8 -->

## payment
결제 요청부터 청구까지를 한 도메인으로 본다.
### 용어
- **PaymentIntent** — 결제 요청 한 건
### 불변식
- 환불 금액은 결제 금액을 넘지 않는다 <!-- ctx:item_pl_dom_payment rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#100-400 -->

## refund
### 용어
- **Chargeback** — 카드사가 강제로 되돌리는 환불
### 불변식
- 환불은 원 결제와 같은 통화로만 한다 <!-- ctx:item_pl_dom_refund rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#400-620 -->

## 도메인·경로 규칙
<!-- 각 줄 끝의 「도메인:」·「경로:」가 그 규칙의 범위다 -->
- [must] 원장 테이블에 UPDATE 를 쓰지 않는다 · 강제: Hook 이 막는다 · 도메인: ledger <!-- ctx:item_pl_policy_ledger_ro rev:1 conf:high src:repo:paylab-api:src/ledger/append.ts:1-40 -->
- [should] infra 아래를 고치면 배포 채널에 미리 알린다 · 강제: 강제 수단 없음 — 사람이 지킨다 · 경로: infra/** <!-- ctx:item_pl_policy_infra rev:1 conf:low src:manual:운영 합의 -->
- [must] migrations 아래 변경은 owner 리뷰를 받는다 · 강제: 권한 설정으로 막는다 · 경로: migrations/** <!-- ctx:item_pl_policy_migration rev:1 conf:medium src:manual:2026-06-02 사고 후 합의 -->
- 모든 마이그레이션은 down 을 함께 쓴다 (2027-01-01 까지) · 경로: migrations/** <!-- ctx:item_pl_constraint_migration rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a2#900-1000 -->

> 정본은 CLAUDE.md 와 .claude/rules/ 다 — 이 파일은 같은 내용을 한 장으로 옮긴 것이다. 진행 보고는 Claude Code 플러그인이 한다.
