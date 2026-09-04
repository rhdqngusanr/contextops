# 역추적을 따라가 봤다 — 여덟 줄 전부 원문에 있다 (P7)

_잰 날: 2026-09-04 · 루프 39바퀴 · FINDINGS 90 · 근거는 `.ci/` 밖이다_

관통이 낸 Pack 네 파일에서 태그를 전부 뽑아 `doc:<uuid>#start-end` 를
`fixtures/paylab-docs/goals.md` 에 대고 잘라 본 것이다. **아래 상자 안이 그 범위의 원문**이고,
그 안에 그 항목이 주장하는 문장이 있어야 한다.

전 바퀴에는 일곱 줄이 전부 `#0-400` 이었고 그중 여섯은 그 범위 안에 그 문장이 없었다
(`docs/evidence/2026-09-04-fixture-offsets/offsets.md`). 지금은 여덟 줄이 여덟 자리를 가리킨다.

### item_mission_paylab — goals.md#260-311  (.ci/walkthrough-pack/CLAUDE.md)
```
가맹점이 우리를 쓰는 이유는
하나다 — **PSP 가 흔들려도 결제가 흔들리지 않는 것.**
```

### item_constraint_card — goals.md#384-413  (.ci/walkthrough-pack/CLAUDE.md)
```
우리는 카드 정보를 저장하지 않는다. 토큰만 받는다.
```

### item_goal_success_rate — goals.md#499-560  (.ci/walkthrough-pack/CLAUDE.md)
```
| G1 | 결제 승인 성공률 99.5% | PSP 장애 구간을 포함한 주간 성공률 | 2026-06-30 |
```

### item_goal_settlement — goals.md#649-697  (.ci/walkthrough-pack/v1.1.0/CLAUDE.md)
```
| G3 | 정산 오차 0원 | 일 배치 후 원장 대사 차액 | 2026-06-30 |
```

### item_policy_retry — goals.md#841-964  (.ci/walkthrough-pack/CLAUDE.md)
```
PSP 호출이 실패하면 **최대 5회까지 재시도**한다. 재시도 간격은 **지수 백오프**로
1초 → 2초 → 4초 → 8초 → 16초로 늘리고, 각 간격에 ±20% 지터를 더한다.

**고정 간격 재시도는 금지한다.**
```

### item_policy_refund — goals.md#1140-1169  (.ci/walkthrough-pack/.claude/rules/domain-refund.md)
```
환불 요청은 **접수 후 24시간 안에 종결**한다.
```

### item_policy_pii_log — goals.md#1431-1497  (.ci/walkthrough-pack/CLAUDE.md)
```
다음은 **어떤 로그에도** 남기지 않는다. 애플리케이션 로그·접근 로그·에러 리포트·
웹훅 수신 덤프 전부 해당한다.
```

### item_road_m1 — goals.md#1880-2056  (.ci/walkthrough-pack/CLAUDE.md)
```
### M1 — 재시도·타임아웃 정리 (2026-04-30)

- 경로: `src/payment/`, `src/psp/`
- 완료 기준:
  - PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다
  - 모든 외부 호출에 타임아웃이 걸려 있다
  - 재시도 횟수와 간격이 설정값으로 빠져 있다 (배포 없이 바꾼다)
```

