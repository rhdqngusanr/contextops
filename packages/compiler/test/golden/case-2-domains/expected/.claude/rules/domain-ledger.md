# 도메인 — ledger
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:b8eac9fb -->

## ledger
### 불변식
- 원장은 append-only 다 <!-- ctx:item_pl_dom_ledger rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#620-800,repo:paylab-ledger:src/ledger/append.ts:8 -->

## 이 도메인의 규칙
- [must] 원장 테이블에 UPDATE 를 쓰지 않는다 · 강제: Hook 이 막는다 · 도메인: ledger <!-- ctx:item_pl_policy_ledger_ro rev:1 conf:high src:repo:paylab-api:src/ledger/append.ts:1-40 -->
