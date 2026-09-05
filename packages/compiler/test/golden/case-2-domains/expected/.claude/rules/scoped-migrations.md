---
paths:
  - "migrations/**"
---
# 경로 규칙 — migrations/**
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:b8eac9fb -->

- [must] migrations 아래 변경은 owner 리뷰를 받는다 · 강제: 권한 설정으로 막는다 · 경로: migrations/** <!-- ctx:item_pl_policy_migration rev:1 conf:medium src:manual:2026-06-02 사고 후 합의 -->
- 모든 마이그레이션은 down 을 함께 쓴다 (2027-01-01 까지) · 경로: migrations/** <!-- ctx:item_pl_constraint_migration rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a2#900-1000 -->
