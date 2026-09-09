# 작업 절차와 진행 보고
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:605d0720 -->

## ContextOps 진행 보고 (필수)
작업을 마칠 때 이번 변경이 Roadmap 의 어느 마일스톤 done_when 에 해당하는지 판단하고 아래 Skill 을 실행한다. 코드 본문은 전송되지 않는다.
- 해당 있음: `/contextops:progress --milestone <ID> --criterion "<done_when 문장>" --evidence <path:start-end> [--evidence ...] --summary "<한 줄>"`
- 해당 없음: `/contextops:progress --milestone none --summary "<한 줄>"`
- 팀 정책·아키텍처·용어에 영향을 주는 변경이면 사용자에게 `/contextops:propose` 실행을 권한다. 직접 실행하지 않는다.
