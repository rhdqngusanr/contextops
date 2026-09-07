# 작업 절차와 진행 보고
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:31ece449 -->

## 결제 코드를 고칠 때
- 트리거: src/payment 아래를 고쳤을 때
- 절차:
  1. 결제 통합 테스트를 돌린다
  2. 재시도 횟수를 ADR 과 대조한다
  3. 중복 결제 재현 스크립트를 돌린다
- 완료 조건: CI 가 초록이다 <!-- ctx:item_pl_wf_payment rev:1 conf:medium src:doc:b1a7d9e0-0000-4000-8000-0000000000a1#2400-2700 -->

## ContextOps 진행 보고 (필수)
작업을 마칠 때 이번 변경이 Roadmap 의 어느 마일스톤 done_when 에 해당하는지 판단하고 아래를 실행한다. 코드 본문은 전송되지 않는다.
- 해당 있음: `node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" progress --milestone <ID> --criterion "<done_when 문장>" --evidence <path:start-end> [--evidence ...] --summary "<한 줄>"`
- 해당 없음: `... progress --milestone none --summary "<한 줄>"`
- 팀 정책·아키텍처·용어에 영향을 주는 변경이면 사용자에게 `/contextops:propose` 실행을 권한다. 직접 실행하지 않는다.
