# ContextOps — 상세 구현 명세서 v2.0 (해커톤용)

> 대상: Claude Code(구현) · 사용 방법: 이 문서를 저장소 루트의 `docs/SPEC.md`로 두고, CLAUDE.md에 "구현 전 docs/SPEC.md의 해당 섹션을 읽고, 완료 기준을 만족한 뒤 다음 Phase로 간다"를 명시한다. 각 Phase는 독립적으로 검증 가능하다.
> 대회: Wanted AI Championship 2026 · 제출 마감 2026-09-20 · 심사 2026-09-21~10-05 · 개발 1인 + Claude Code · 기간 18일

---

## 0. 제품 정의와 절대 원칙

**한 줄:** 팀의 목표·로드맵·기술 결정을 하나의 승인된 AI Context로 만들어 모든 팀원의 Claude Code에 같은 버전으로 배포하고, 로드맵이 실제로 진행되는지를 근거와 함께 보여준다.

**슬로건:** 팀의 지식과 Claude의 기억을 같은 방향으로.

### 0.1 절대 원칙 (코드 리뷰 시 위반 여부를 검사한다)

| # | 원칙 | 검사 방법 |
|---|---|---|
| P1 | 서버는 저장소 코드 본문·secret·개인 Memory·대화 transcript를 절대 받지 않는다. 업로드 payload는 allowlist 스키마로만 통과한다. | `packages/schema`의 upload 스키마에 `content`류 필드가 없음. 통합 테스트 `security/payload.test.ts` |
| P2 | 우리 코드는 사용자의 Claude를 절대 대신 호출하지 않는다. `claude -p`, Agent SDK, 구독 OAuth 재사용 금지. Claude는 사용자가 Skill을 직접 실행할 때만 동작한다. | grep `claude -p`, `@anthropic-ai/claude-agent-sdk` → plugin·cli에 0건 |
| P3 | 서버측 LLM은 API 키(종량제)로만, 4개 기능에 한정, 일일 예산·rate limit·입력 크기 상한이 있다. | `apps/web/src/lib/ai/budget.ts` 존재, 모든 AI 호출이 `withBudget()` 경유 |
| P4 | 승인 이후 파이프라인(컴파일·해시·배포)에는 LLM이 없다. 같은 snapshot → byte-identical Pack. | `packages/compiler` golden test |
| P5 | 진행 상태는 마일스톤 단위로만 표시한다. 개인별 생산성 점수·순위를 만들지 않는다. | Roadmap 화면에 사람 이름이 기본 행으로 나오지 않음 |
| P6 | Hook은 파일을 변경하지 않는다. 변경은 사용자가 `/contextops:sync`를 실행할 때만. | `session-start.mjs`에 fs write 없음 |
| P7 | 모든 Pack 줄은 항목 ID → 원문(문서 offset 또는 코드 path:line)으로 역추적된다. | source map 테스트 |

### 0.2 용어

- **Context Item(항목):** 팀 공식 지식의 최소 단위. 10개 타입 중 하나. DB에 저장되는 정본.
- **Team Context / Wiki:** 프로젝트의 active 항목 집합. "Wiki 폴더"는 존재하지 않으며 컴파일 산출물이 폴더처럼 보일 뿐이다.
- **Pack:** 특정 버전의 컴파일 산출물(CLAUDE.md, .claude/rules/*.md, AGENTS.md, .cursor/rules/*.mdc, .contextops/manifest.json).
- **Proposal:** 항목 추가·수정·폐기 제안. 승인되어야 다음 버전에 포함.
- **Progress 이벤트:** 로드맵 마일스톤에 대한 진행 근거 보고. 자동 전송. 코드 본문 없음.
- **Conflict 카드:** AI가 찾은 상충·오래됨·병합 후보. 사람이 클릭으로 결정.

---

## 1. 아키텍처

```
┌──────────────── 사용자 로컬 ────────────────┐   HTTPS   ┌──────────── ContextOps Cloud ───────────┐
│ Claude Code (사용자 구독)                    │           │ Next.js (apps/web)                       │
│  ├─ Plugin: skills/ hooks/ bin/cli.mjs       │ ──JSON──▶ │  ├─ Route Handlers /api/v1/*             │
│  ├─ 저장소 파일 (서버로 안 감)               │           │  ├─ 서버 컴포넌트 화면 9개               │
│  ├─ CLAUDE.md, .claude/rules (Pack 산출물)   │ ◀─Pack──  │  └─ lib/ai (Claude API, 예산 가드)       │
│  └─ ~/.contextops/credentials.json (0600)    │           │ Supabase: Postgres · Auth · Realtime     │
└──────────────────────────────────────────────┘           │ Vercel 배포 · Cron 헬스핑                │
                                                           └──────────────────────────────────────────┘
올라가는 것: Context Item 초안 JSON · Proposal · Progress 이벤트 · sync 보고(버전·hash)
내려오는 것: manifest · Pack 파일
```

### 1.1 저장소 구조 (pnpm workspace, Turborepo 없음)

```
contextops/
├── package.json                 # workspaces: apps/*, packages/*, plugin
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .github/workflows/ci.yml     # lint · test · plugin validate
├── apps/
│   └── web/                     # Next.js 15 App Router (프론트 + API)
│       ├── src/app/(marketing)/page.tsx          # 랜딩
│       ├── src/app/(app)/t/[team]/p/[project]/…  # 앱 화면
│       ├── src/app/api/v1/…                      # Route Handlers
│       ├── src/db/schema.ts                      # Drizzle
│       ├── src/db/migrations/
│       ├── src/lib/ai/{client,budget,prompts}/   # 서버측 AI
│       ├── src/lib/auth.ts                       # Supabase Auth · 토큰 검증
│       └── src/lib/compiler-runner.ts            # packages/compiler 호출 + 저장
├── packages/
│   ├── schema/                  # Zod 계약 (모든 곳이 import)
│   │   └── src/{context-item,proposal,progress,manifest,pack,api}.ts
│   └── compiler/                # 결정론 컴파일러
│       ├── src/{index,partition,sort,render,sourcemap,hash}.ts
│       ├── templates/*.md.hbs   # 버전 고정 템플릿
│       └── test/golden/{case-1,case-2,case-3}/{snapshot.json,expected/*}
├── plugin/contextops/           # 공식 Claude Code plugin 레이아웃
│   ├── .claude-plugin/plugin.json
│   ├── skills/{init,sync,propose}/SKILL.md
│   ├── hooks/hooks.json
│   ├── scripts/{session-start,stop}.mjs
│   ├── bin/contextops-cli.mjs   # esbuild 단일 번들 (src → bin)
│   ├── src/cli/{setup,init-scan,sync,propose,progress,common}.ts
│   └── schemas/*.json           # packages/schema에서 export한 JSON Schema (로컬 검증용)
├── fixtures/
│   ├── paylab-api/              # 샘플 레포 (TS, ~40파일)
│   ├── paylab-docs/             # 팀장 문서 150줄 + 오래된 문서 1개
│   └── seed/                    # 데모 테넌트 시드 JSON
├── docs/
│   ├── SPEC.md                  # 이 문서
│   ├── DESIGN_BRIEF.md          # Claude Design용
│   └── KNOWN_LIMITATIONS.md
└── CLAUDE.md                    # 저장소 자체의 개발 규칙 (아래 §15)
```

### 1.2 기술 스택 (버전 고정)

| 레이어 | 선택 | 비고 |
|---|---|---|
| 언어 | TypeScript 5.x, Node 20 LTS | 전 구성요소 단일 언어 |
| 웹+API | Next.js 15 (App Router, Route Handlers) | 별도 백엔드 없음 |
| UI | Tailwind CSS 4 + shadcn/ui, TanStack Query 5 | Claude Design 산출물을 그대로 컴포넌트화 |
| DB | Supabase Postgres, Drizzle ORM + drizzle-kit | RLS 미사용, 서버 service role + 앱 레벨 권한 검사 |
| Auth | Supabase Auth (GitHub OAuth + Email magic link) | 플러그인은 프로젝트 토큰(opaque, sha256 저장) |
| 실시간 | Supabase Realtime (progress_events, context_versions 구독) | Roadmap·Sync 즉시 갱신 |
| 서버 AI | `@anthropic-ai/sdk`, 모델 `claude-sonnet-4-5` (환경변수로 교체 가능), tool use로 구조화 출력 | 예산 가드 필수 |
| 플러그인 CLI | esbuild → 단일 ESM 번들, 런타임 의존 0 | `node ${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs` |
| 테스트 | vitest (schema·compiler·api), Playwright 1 시나리오 | |
| 배포 | Vercel (web), Supabase cloud | Vercel Cron `0 */6 * * *` → `/api/health` (Supabase pause 방지) |

---

## 2. 데이터 모델 (Drizzle · Postgres)

모든 테이블: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, 갱신 있는 테이블은 `updated_at`. 삭제는 `deleted_at` soft delete. 아래 컬럼은 필수만 적는다.

```ts
// apps/web/src/db/schema.ts (요약)
users            { id, auth_subject text unique, email, name, avatar_url }
teams            { id, slug text unique, name, settings jsonb /* {auto_apply:boolean, auto_submit:boolean} */ }
team_members     { team_id, user_id, role enum('owner','member'), status enum('active','invited'), pk(team_id,user_id) }
projects         { id, team_id, slug, name, description, official_version_id uuid null, unique(team_id,slug) }
repos            { id, project_id, name, remote_url null, default_branch, path_prefix null /* 모노레포용 */ }
source_documents { id, project_id, title, kind enum('goal','policy','roadmap','adr','notes','wiki'), current_version_id }
source_document_versions { id, document_id, revision int, content text, content_hash, created_by, unique(document_id,revision) }
context_items    { id, project_id, type enum(10종), status enum('draft','review','active','deprecated'),
                   current_revision int, scope jsonb, priority int default 50, owner_id null, unique(id) }
context_item_revisions { item_id, revision, data jsonb /* type별 필드 */, source_refs jsonb[], confidence enum('high','medium','low'),
                   created_by, origin enum('doc','code','manual','proposal'), unique(item_id,revision) }
conflicts        { id, project_id, kind enum('contradiction','stale','duplicate','doc_vs_code','open_question'),
                   a_ref jsonb, b_ref jsonb null, question text, status enum('open','resolved','dismissed'),
                   resolution jsonb null, resolved_by, resolved_at }
proposals        { id, project_id, author_id, status enum('draft','submitted','approved','rejected','published'),
                   title, summary, base_version_id, items jsonb /* ProposalItem[] */, relates_to text[] /* milestone ids */,
                   client_request_id unique, decided_by, decided_at, decision_note }
context_versions { id, project_id, semver text, snapshot_hash text, snapshot jsonb, manifest jsonb, published_by, published_at,
                   change_summary text, unique(project_id,semver), unique(project_id,snapshot_hash) }
pack_files       { version_id, path, content text, sha256, source_map jsonb, target enum('claude','agents','cursor'), unique(version_id,path) }
devices          { id, user_id, project_id, name, token_hash text unique, last_seen_at, revoked_at }
sync_reports     { id, device_id, project_id, version_id, status enum('applied','outdated','modified','failed','manual'), manifest_hash, reported_at }
progress_events  { id, project_id, device_id, milestone_id text, criterion text null, status enum('in_progress','criterion_done','done_candidate','none'),
                   evidence jsonb /* [{path,start_line,end_line,commit_sha}] */, summary text, context_version text, source enum('agent','hook','manual'),
                   confirmed_by null, confirmed_at null }
```

인덱스: `context_items(project_id,status)`, `proposals(project_id,status,created_at desc)`, `progress_events(project_id,milestone_id,created_at desc)`, `sync_reports(project_id,device_id,reported_at desc)`, `conflicts(project_id,status)`.

### 2.1 발행 트랜잭션 (Drizzle `db.transaction`)

1. `projects` row 조회, `official_version_id` 확인 (base와 다르면 409 `STALE_BASE`)
2. 승인된 Proposal(`approved`) 적용 → `context_items`/`revisions` 갱신 (add/update/deprecate)
3. active 항목 + revision을 ID 순으로 정렬해 `snapshot` 구성 → `snapshot_hash = sha256(canonical JSON)`
4. `context_versions` INSERT (semver는 요청값, 추천값은 §6.5)
5. `compiler.compile(snapshot, {templateVersion, compilerVersion})` → `pack_files` INSERT
6. `projects.official_version_id = version.id`
7. Proposal status → `published`
8. 실패 시 전체 rollback, 실패 항목 ID를 에러 details로 반환

---

## 3. Context Schema v1 (`packages/schema`)

```ts
export const ItemType = z.enum(['mission','goal','roadmap','architecture','domain','policy','adr','workflow','constraint','open_question']);

export const SourceRef = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('source_document'), document_version_id: z.string().uuid(), start_char: z.number().int(), end_char: z.number().int(), heading_path: z.array(z.string()).default([]) }),
  z.object({ kind: z.literal('repository_path'), repo: z.string(), path: z.string().regex(/^(?!\/)(?!.*\.\.)[^\0]+$/), start_line: z.number().int().optional(), end_line: z.number().int().optional(), commit_sha: z.string().length(40).optional() }),
  z.object({ kind: z.literal('proposal'), proposal_id: z.string().uuid() }),
  z.object({ kind: z.literal('manual'), note: z.string().max(200) }),
]);

export const Scope = z.object({ kind: z.enum(['project','domain','path']), value: z.string().optional() }); // path는 repo 상대 glob

const Base = z.object({
  id: z.string().regex(/^item_[a-z0-9_]{3,40}$/), project_id: z.string().uuid(), type: ItemType,
  title: z.string().min(2).max(120), body: z.string().max(2000),
  status: z.enum(['draft','review','active','deprecated']), scope: Scope, priority: z.number().int().min(0).max(100).default(50),
  source_refs: z.array(SourceRef).min(1), tags: z.array(z.string()).default([]),
  owner_id: z.string().uuid().optional(), valid_from: z.string().date().optional(), valid_until: z.string().date().optional(),
  confidence: z.enum(['high','medium','low']).default('medium'), revision: z.number().int().min(1),
});

// type별 data
export const RoadmapData = z.object({ milestone_id: z.string().regex(/^[A-Z]{1,4}-M\d{1,2}$|^M\d{1,2}$/), due: z.string().date().optional(),
  paths: z.array(z.string()).default([]), done_when: z.array(z.string().min(3)).min(1).max(6), dependencies: z.array(z.string()).default([]) });
export const GoalData = z.object({ outcome: z.string(), metric: z.string().optional(), deadline: z.string().date().optional() });
export const PolicyData = z.object({ rule: z.string(), severity: z.enum(['must','should','may']), enforcement: z.enum(['hook','review','permission','none']).default('review') });
export const AdrData = z.object({ decision: z.string(), context: z.string(), consequences: z.string(), adr_status: z.enum(['proposed','accepted','superseded']) });
export const ArchitectureData = z.object({ component: z.string(), responsibility: z.string(), paths: z.array(z.string()).default([]) });
export const DomainData = z.object({ name: z.string(), glossary: z.array(z.object({ term: z.string(), meaning: z.string() })).default([]), invariants: z.array(z.string()).default([]) });
export const WorkflowData = z.object({ trigger: z.string(), steps: z.array(z.string()).min(1), done_when: z.array(z.string()).default([]) });
export const ConstraintData = z.object({ statement: z.string(), expiry: z.string().date().optional() });
export const MissionData = z.object({ statement: z.string(), rationale: z.string().optional() });
export const OpenQuestionData = z.object({ question: z.string(), owner_id: z.string().uuid().optional(), due: z.string().date().optional() });

export const ContextItem = Base.and(z.discriminatedUnion('type', [/* type → data 매핑 */]));
```

**Proposal**
```ts
export const ProposalItem = z.object({ operation: z.enum(['add','update','deprecate']), target_item_id: z.string().optional(),
  draft: ContextItemDraft.optional(), evidence: z.array(SourceRef).min(1), reason: z.string().max(500) });
export const Proposal = z.object({ title: z.string(), summary: z.string(), base_version_id: z.string().uuid(),
  items: z.array(ProposalItem).min(1).max(20), relates_to: z.array(z.string()).default([]), client_request_id: z.string().uuid() });
```

**Progress 이벤트** (업로드 allowlist — 여기 없는 필드는 서버가 400)
```ts
export const ProgressEvent = z.object({ milestone_id: z.string(), status: z.enum(['in_progress','criterion_done','done_candidate','none']),
  criterion: z.string().max(200).optional(), evidence: z.array(z.object({ path: z.string(), start_line: z.number().int().optional(), end_line: z.number().int().optional(), commit_sha: z.string().optional() })).max(20),
  summary: z.string().max(300), context_version: z.string(), source: z.enum(['agent','hook','manual']), client_event_id: z.string().uuid() });
```

**Manifest**
```ts
export const Manifest = z.object({ schema_version: z.literal('1.0'), compiler_version: z.string(), template_version: z.string(),
  team_id: z.string(), project_id: z.string(), context_version: z.string(), generated_at: z.string().datetime(), snapshot_hash: z.string(),
  files: z.array(z.object({ path: z.string(), sha256: z.string(), size: z.number(), target: z.enum(['claude','agents','cursor']), source_item_ids: z.array(z.string()) })),
  milestones: z.array(z.object({ id: z.string(), paths: z.array(z.string()), done_when: z.array(z.string()) })),
  excluded: z.array(z.object({ item_id: z.string(), reason: z.string() })), manifest_hash: z.string() });
```

`manifest_hash = sha256(files를 path 순 정렬 후 "path\nsha256\n" 연결)`.

### 3.1 업로드 payload allowlist (P1)

`POST /context-items/batch-draft`, `POST /proposals`, `POST /progress`, `POST /sync-reports`의 body는 위 스키마 `.strict()`로 파싱. `content`, `body`가 2000자를 넘거나, `source_refs`에 `repository_path`가 있는데 `snippet`류 키가 있으면 400. 서버 로그에 body를 남기지 않는다(`request_id`, route, status만).

---

## 4. 컴파일러 (`packages/compiler`)

```ts
export function compile(input: { snapshot: Snapshot; project: { slug, name }; templateVersion: '1.0'; compilerVersion: string }): CompileResult
// CompileResult = { files: PackFile[]; manifest: Manifest; excluded: {item_id, reason}[] }
```

### 4.1 파이프라인 (LLM 없음)

1. **validate** — 모든 항목을 `ContextItem`으로 재검증. 실패 시 throw `{ item_id, issues }`.
2. **partition** — 타입·scope로 파일 배치:

| 항목 | 파일 |
|---|---|
| mission, goal, roadmap, policy(scope=project), constraint(scope=project), quick map(자동 생성) | `CLAUDE.md` |
| architecture, adr 요약 | `.claude/rules/architecture.md` |
| domain (하나당 파일) | `.claude/rules/domain-{slug}.md` |
| workflow + 진행 보고 규칙(고정 텍스트) | `.claude/rules/workflow.md` |
| adr 전체 | `.claude/rules/decisions.md` |
| policy/constraint(scope=path) | `.claude/rules/scoped-{slug}.md` (frontmatter `paths:`) |
| open_question | Pack 제외 → `excluded` (웹에만 표시) |
| 동일 내용 | `AGENTS.md` (CLAUDE.md 본문 + rules 인라인 요약), `.cursor/rules/contextops.mdc` |

3. **sort** — 섹션 순서 고정(mission→goal→roadmap→policy→constraint→quickmap) → priority desc → scope(project<domain<path) → title(ko/en locale-independent, codepoint) → id.
4. **render** — 템플릿 문자열 치환만. Markdown escape: `|`, 선행 `#`, `<!--`. 항목마다 역추적 태그 한 줄:
   `<!-- ctx:item_bs_m2 rev:6 src:doc:sdv_…#1840-1961,repo:parking-api:src/billing/fee.ts:14 -->`
5. **budget** — CLAUDE.md 12,000자 초과 시 policy/constraint를 `.claude/rules/policies.md`로 이동(경고 기록), rules 파일 30,000자 초과 시 domain 분할.
6. **sourcemap** — 파일별 `[ {start_line, end_line, item_id, revision} ]`.
7. **hash** — LF 정규화, 끝 개행 1개, UTF-8, `sha256`. manifest 생성.

### 4.2 CLAUDE.md 템플릿 (v1.0, 발췌)

```md
# {{project.name}} — Team Context v{{version}}
<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. manifest:{{manifest_hash_short}} -->

## Mission
{{#each mission}}{{body}} {{tag}}{{/each}}

## Goals
{{#each goal}}- **{{title}}** — {{data.outcome}}{{#if data.metric}} · 지표: {{data.metric}}{{/if}}{{#if data.deadline}} · 기한: {{data.deadline}}{{/if}} {{tag}}
{{/each}}

## Roadmap
<!-- ctx:roadmap -->
{{#each roadmap}}- **{{data.milestone_id}} {{title}}**{{#if data.due}} `due: {{data.due}}`{{/if}} `paths: {{join data.paths ", "}}`
  done_when: {{join data.done_when " · "}} {{tag}}
{{/each}}

## Policies (must follow)
{{#each policy}}- [{{data.severity}}] {{data.rule}} {{tag}}
{{/each}}

## Constraints
{{#each constraint}}- {{data.statement}} {{tag}}
{{/each}}

## Quick Map
{{#each architecture}}- {{data.component}}: {{data.responsibility}}{{#if data.paths}} (`{{join data.paths "`, `"}}`){{/if}}
{{/each}}
> 상세 규칙은 .claude/rules/ 를 따른다.
```

### 4.3 workflow.md에 항상 포함되는 고정 텍스트 (진행 보고 규칙)

```md
## ContextOps 진행 보고 (필수)
작업을 마칠 때 이번 변경이 Roadmap의 어느 마일스톤 done_when에 해당하는지 판단하고 아래를 실행한다. 코드 본문은 전송되지 않는다.
- 해당 있음: `node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" progress --milestone <ID> --criterion "<done_when 문장>" --evidence <path:start-end> [--evidence ...] --summary "<한 줄>"`
- 해당 없음: `... progress --milestone none --summary "<한 줄>"`
- 팀 정책·아키텍처·용어에 영향을 주는 변경이면 사용자에게 `/contextops:propose` 실행을 권한다. 직접 실행하지 않는다.
```

### 4.4 테스트

- golden 3종: (1) 항목 12개 소형, (2) domain 3개 + scoped policy, (3) 12k 초과로 분할 발생. `expected/` 파일과 byte 비교, manifest_hash 고정값 비교.
- 속성 테스트: 항목 순서를 셔플해도 출력 동일.
- escape 테스트: 제목에 `|`, `#`, `<!--` 포함.

---

## 5. API (`apps/web/src/app/api/v1`)

공통: 응답 `{ data, meta:{ request_id } }` / `{ error:{ code, message, details?, request_id } }`. 인증은 (a) 웹 세션(Supabase JWT) 또는 (b) `Authorization: Bearer ctx_<token>`(devices.token_hash 대조). 권한: owner/member 2단계. 목록은 `?limit=50&offset=`.

⚠ **동사형 경로는 콜론이 아니라 경로 구간이다** (`/versions/publish` · `/proposals/{id}/submit`).
App Router 의 경로는 **폴더 이름**이고 Windows 는 파일 이름에 `:` 를 못 쓴다 — 콜론으로 적으면
그 라우트는 **만들 수가 없다.** 예전 표기(`versions:publish`)를 되살리지 마라 (FINDINGS 20).

| Method · Path | 권한 | 요청 → 응답 |
|---|---|---|
| GET /teams | 로그인 | → teams[{id, slug, name, role, projects[]}] — 화면의 주소는 slug 인데(§9) 라우트는 uuid 를 받는다. 이 문이 없으면 브라우저가 slug→uuid 를 못 바꾼다 |
| POST /teams | 로그인 | {name, slug} → team |
| POST /teams/{id}/projects | owner | {name, slug, description} → project |
| POST /projects/{id}/repos | owner | {name, remote_url?, path_prefix?} → repo |
| POST /projects/{id}/tokens | member | {device_name} → {token(1회 표시), device_id} |
| DELETE /devices/{id} | 본인·owner | → 204 |
| POST /projects/{id}/documents | member | multipart(zip) 또는 {title, kind, content} → document + 구조화 job 시작 (§7.1) |
| GET /projects/{id}/context-items | member | ?type&status&scope → items[] |
| POST /projects/{id}/context-items/batch-draft | member/device | {items: ContextItemDraft[], repo, scan_summary} → {accepted, rejected[{index, issues}]} · 충돌 탐지 job 시작 (§7.2) |
| PATCH /context-items/{id} | owner | {revision(현재), patch} → item · revision 불일치 409 |
| GET /projects/{id}/conflicts | member | ?status → conflicts[] |
| POST /conflicts/{id}/resolve | owner | {choice:'a'|'b'|'both'|'dismiss', note?} → 항목 상태 갱신 |
| POST /projects/{id}/questions | member | 질문 카드 목록 조회 GET / 답변 POST {answers:[{question_id, answer}]} → 항목 생성 |
| POST /projects/{id}/proposals | member/device | Proposal → proposal |
| POST /proposals/{id}/submit / /approve / /reject | 작성자 / owner | {note?} → proposal |
| POST /projects/{id}/versions/publish | owner | {semver, base_version_id, change_summary} → version (§2.1) |
| GET /projects/{id}/versions | member | → versions[] |
| GET /projects/{id}/packs/latest/manifest | device/member | ETag=manifest_hash, If-None-Match → 304 |
| GET /projects/{id}/packs/{semver}/manifest | device/member | immutable, `Cache-Control: max-age=31536000` |
| GET /projects/{id}/packs/{semver}/files/{path} | device/member | text/plain, ETag=sha256 |
| GET /projects/{id}/packs/{semver}/zip | member | application/zip (동기 생성, 파일 ≤ 20개) |
| POST /projects/{id}/sync-reports | device | {version, manifest_hash, status, files:[{path,sha256}]} → 202 |
| GET /projects/{id}/sync-status | member | → [{device, user, version, status, reported_at}] |
| POST /projects/{id}/progress | device | ProgressEvent → 202 (client_event_id 중복은 200 idempotent) |
| GET /projects/{id}/roadmap | member | → [{milestone, done_when:[{text, evidence_count, last_event}], conflicts, last_report_at, status}] |
| POST /progress/{id}/confirm | owner | → done 확정 |
| POST /projects/{id}/ask | member | {question} → {answer, cited_item_ids[]} (§7.3, 예산 가드) |
| POST /demo/ai-once | 게스트 | {fixture:'paylab'|'bookstack'} → 충돌 카드 결과 (§7.4) |
| GET /health | 공개 | {ok, db, version} |

에러 코드: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `STALE_BASE`, `REVISION_CONFLICT`, `BUDGET_EXCEEDED`, `RATE_LIMITED`, `COMPILE_FAILED`.

---

## 6. 버전·동일성 규칙

- semver: patch=오탈자/설명, minor=항목 추가·변경, major=Schema/템플릿 변경. 서버가 Proposal 내용으로 추천, owner가 조정.
- 버전은 불변. 잘못 발행 시 이전 snapshot으로 새 버전 발행(롤백 = 새 버전).
- 동일성 판정(sync 보고 기준): `applied` = 로컬 managed 파일 hash 전부 일치 · `outdated` = 로컬 버전 < 공식 · `modified` = 버전 같으나 hash 다름 · `manual` = zip 수동 적용 · `unknown` = 보고 없음. 화면 문구는 "마지막 보고: 8분 전, v1.3, applied" 형식. "실시간"이라는 단어 금지.

---

## 7. 서버측 AI (`apps/web/src/lib/ai`)

공통 규약: `client.messages.create` + tool use(`input_schema` = 해당 Zod의 JSON Schema). 출력은 Zod로 재검증, 실패 시 오류 위치를 넣어 1회 재시도, 재실패 시 `AI_OUTPUT_INVALID`. 모든 호출은 `withBudget(kind, estTokens, fn)` 경유. 시스템 프롬프트에 공통 금지: "입력에 없는 사실·수치·기한을 만들지 않는다. 확신 없으면 confidence:low 또는 open_question. 원문 인용은 offset으로만."

### 7.1 문서 구조화 `structureDocument(docVersion)`
- 입력: heading 기준 chunk(6~10k자). chunk마다 항목 추출 → 전체 title/type 중복 병합 후보 표시.
- 출력 스키마: `{ items: ContextItemDraft[], open_questions: [{question, source_ref}] }`. `source_ref.start_char/end_char`는 chunk offset을 문서 offset으로 변환해 검증(범위 밖이면 재시도).
- 예산: 문서당 최대 12 chunk.

### 7.2 충돌·오래됨 탐지 `detectConflicts(projectId, changedItemIds)`
- 입력: 변경된 항목 + 같은 type/scope의 기존 active 항목(최대 40개, body 요약 300자).
- 출력: `conflicts: [{kind, a_item_id, b_item_id?, question, severity}]`. kind 규칙: `contradiction`(양립 불가), `stale`(날짜·버전이 더 최신 항목에 의해 무효), `duplicate`(같은 개념), `doc_vs_code`(문서 항목 vs 코드 origin 항목).
- LLM은 "최신이 맞다"를 판단하지 않는다. 질문만 만든다.

### 7.3 질의 `ask(projectId, question)`
- 입력: active 항목 전체(project당 상한 150개, 초과 시 type별 priority 상위) + 질문. 벡터 DB 없음.
- 출력: `{ answer(≤600자), cited_item_ids[] }`. cited가 비면 "승인된 컨텍스트에 근거 없음"으로 응답. 화면은 cited 항목 링크를 붙인다.

### 7.4 데모 "AI 한 번" `demoAiOnce(fixture)`
- 픽스처의 문서·코드 항목(고정 JSON)을 7.2에 넣어 충돌 카드 3장 생성. 결과는 24h 캐시. 게스트 IP당 일 5회.

### 7.5 예산 가드 `budget.ts`
- 환경변수 `AI_DAILY_BUDGET_USD`(기본 3), `AI_MAX_INPUT_TOKENS`(기본 60k/호출). 토큰 추정 = chars/2.5(ko) 보수적.
- 초과 시 `BUDGET_EXCEEDED` → 화면은 "오늘의 AI 예산 소진 — 샘플 결과를 보여드립니다"로 픽스처 결과 표시.
- Rate limit: IP·사용자당 분당 3회(`/ask`, `/demo`), 문서 구조화는 프로젝트당 시간당 5회. Claude Console 월 한도는 운영자가 $30 설정.

---

## 8. 플러그인 (`plugin/contextops`)

### 8.1 plugin.json / hooks.json
```json
{ "name": "contextops", "version": "0.1.0", "description": "Team context sync for Claude Code", "author": {"name": "..."} }
```
```json
{ "hooks": { "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/session-start.mjs\"", "timeout": 3 }] }],
             "Stop":         [{ "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/stop.mjs\"", "timeout": 5 }] }] } }
```

### 8.2 로컬 파일
```
~/.contextops/credentials.json        {"<api_origin>": {"<project_id>": {"token": "ctx_...", "device_id": "..."}}}  chmod 600
<repo>/.contextops/project.json       {"api_origin","team_id","project_id","repo_id"}  커밋 권장, secret 없음
<repo>/.contextops/manifest.json      현재 적용 버전 manifest                             커밋 선택
<repo>/.contextops/cache/             latest manifest, 다운로드 임시                       ignore
<repo>/.contextops/backups/<ts>-<from>-to-<to>/  최근 5개 보관                              ignore
<repo>/.contextops/pending-proposal.json  Stop 훅이 만든 초안                               ignore
```

### 8.3 CLI 명령 (`bin/contextops-cli.mjs`)
| 명령 | 동작 | exit |
|---|---|---|
| `setup` (npx contextops) | 브라우저 열어 로그인 → 프로젝트 선택 → 토큰 발급·저장 → `claude plugin marketplace add`/`install` 안내 출력(자동 실행은 사용자 확인 후) → `project.json` 작성 → "Claude Code를 열고 /contextops:init 을 실행하세요" | 0/10 로그인 실패/30 config |
| `scan` | 결정론 스캔 → `.contextops/cache/scan.json` (파일 목록·언어·엔트리·인프라 파일·env 키 이름·의존성·제외 목록). 본문 없음 | 0 |
| `validate <json>` | `schemas/*.json`으로 로컬 검증, 오류 위치 출력 | 0/2 |
| `upload-draft <json>` | batch-draft POST, 결과 요약 출력 | 0/20 network |
| `status` | manifest 비교 → applied/outdated/modified 출력 | 0 |
| `sync [--check] [--force]` | §8.5 | 0/1 modified/20 |
| `propose [--from-pending]` | 초안 미리보기 → 확인 → POST | 0 |
| `progress --milestone --criterion --evidence... --summary` | ProgressEvent POST (client_event_id 자동) | 0 |

### 8.4 Skills

`skills/init/SKILL.md`
```md
---
name: init
description: Draft team context items from this repository (local analysis; only structured JSON is uploaded).
disable-model-invocation: true
allowed-tools: Bash(node:*), Read, Glob, Grep
---
1. `node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" scan` 실행 → `.contextops/cache/scan.json` 읽기.
2. scan의 entrypoints·infra·data·deps·docs 후보 중 최대 15개 파일을 골라 읽는다. `.env*`, `*secret*`, `*.pem`, `node_modules`, `dist` 금지.
3. `$CLAUDE_PLUGIN_ROOT/schemas/context-item-draft.json` 스키마로 `architecture / domain / constraint / open_question` 항목을 작성해 `.contextops/cache/draft.json`에 저장. 규칙: 코드에서 확인한 사실만, 각 항목에 repository_path source_ref 필수, 이유·계획·정책은 만들지 말고 open_question으로.
4. `... validate .contextops/cache/draft.json` 실행, 실패하면 오류 위치를 고쳐 1회 재시도.
5. 사용자에게 전송될 항목 수·경로 목록·"코드 본문 0건"을 보여주고 명시적 확인을 받는다.
6. 확인 후 `... upload-draft .contextops/cache/draft.json`. 결과와 웹 링크를 출력한다.
```

`skills/sync/SKILL.md`: `sync --check`로 상태 출력 → 변경 파일 diff 요약 → 사용자 확인 → `sync`. modified면 backup 안내 후 `--force` 여부 질문.

`skills/propose/SKILL.md`: `pending-proposal.json`이 있으면 그걸, 없으면 `git diff`(working tree 기본, 사용자가 범위 지정 가능)와 관련 파일을 읽어 Proposal JSON 작성(operation·target_item_id·evidence path:line·relates_to milestone). validate → 사용자 미리보기 → `propose` 실행.

### 8.5 sync 절차 (결정론)
1. preflight: project.json·토큰·디스크 쓰기 가능·manifest 서명(sha256) 확인
2. latest manifest GET(If-None-Match) → 같으면 "최신" 종료
3. 로컬 managed 파일 hash 계산 → manifest와 비교 → modified 파일 목록
4. 변경 파일만 `cache/<semver>/`로 다운로드 → sha256 검증(불일치 시 즉시 중단, exit 20)
5. 기존 managed 파일 → `backups/<ts>-<from>-to-<to>/`
6. 같은 볼륨 temp → `rename` atomic replace (allowlist: `CLAUDE.md`, `AGENTS.md`, `.claude/rules/*.md`, `.cursor/rules/*.mdc`, `.contextops/manifest.json`; 절대경로·`..`·심볼릭 링크 거부)
7. post-verify hash 재계산 → 실패 시 backup에서 전체 복원
8. sync-report POST (실패해도 로컬 receipt 저장, 다음 status에서 재전송)

### 8.6 훅 스크립트
- `session-start.mjs`: project.json 없으면 exit 0 무출력. 5분 내 cache 있으면 재사용. 2초 timeout으로 manifest ETag 조회. 최신이면 무출력. 다르면 stdout에 6줄 이내 안내(현재/공식/변경 요약/`/contextops:sync` 안내/"Hook은 파일을 변경하지 않습니다"). `pending-proposal.json` 있으면 "초안 1건, /contextops:propose" 추가. 오프라인이면 무출력.
- `stop.mjs`: `git diff --name-only HEAD` + untracked → manifest.milestones.paths와 glob 대조 → 해당 마일스톤에 `in_progress` 이벤트(source:hook, evidence는 path만) — 단 이번 세션에 agent progress 보고가 이미 있으면 생략(로컬 `cache/progress-<session>.json`으로 판단). 정책·아키텍처 관련 경로(`migrations/**`, `infra/**`, `*.config.*`, rules에 scoped된 paths)가 바뀌면 `pending-proposal.json`에 {changed_paths, hint} 저장. LLM 호출 없음.

### 8.7 CLI 테스트
temp git repo 픽스처로: 정상 sync, modified 감지, hash 불일치 중단, 부분 실패 rollback, 오프라인 무출력, path traversal 거부, credentials 파일 권한 0600.

---

## 9. 웹 화면 (9개) — 상세는 `docs/DESIGN_BRIEF.md`

| # | 라우트 | 핵심 컴포넌트 | 상태 |
|---|---|---|---|
| 1 | `/` 랜딩 | Before/After 비교, "샘플 팀으로 둘러보기", 2분 영상, 왜 git/DeepWiki가 아닌가 3+1문장, 설치 4줄, 신뢰 경계 표 | 정적 |
| 2 | `/login`, `/t/new`, `/t/[team]/p/new` | OAuth 버튼, 폼 | loading/error |
| 3 | `…/import` 가져오기 | zip 드롭존 · 문서 붙여넣기 · 질문 카드 10장(진행바) | 구조화 진행 표시(polling) |
| 4 | `…/review` 정리 | Conflict 카드(원문 A ↔ B/코드 라인, 선택 버튼 4개) · 병합 카드 · 질문 카드 | empty("충돌 없음") |
| 5 | `…/context` | 항목 테이블(type/status/scope 필터) · 상세 드로어(원문 패널) · 발행 모달(semver 추천·변경 요약·영향 파일 수) · 버전 히스토리 | 409 재로드 안내 |
| 6 | `…/proposals`, `…/proposals/[id]` | 함 목록(status/author 필터) · before/after Diff · 근거 링크 · 항목별 승인/거절 | |
| 7 | `…/packs/[semver]` Pack Explorer | 3열: 파일 트리 / 내용(줄번호, 선택 블록 하이라이트, 이전 버전 diff 토글) / 항목·원문·hash·제외 사유 · "Pack 다운로드" | |
| 8 | `…/roadmap` | 마일스톤 행: done_when별 근거 수·마지막 보고·충돌·"완료 확인" · 로드맵 외 작업 · 근거 클릭 시 path:line·commit | Realtime |
| 9 | `…/sync` | 팀원·기기별 버전/상태/마지막 보고 · 질의창(답변 + 인용 항목 칩) | Realtime |

게스트 데모: `/demo` → 세션 쿠키로 `demo` 팀 read-only + `/demo/ai-once` 호출 가능. 데모 테넌트는 production DB의 별도 team_id, 시드 스크립트로 매일 03:00 리셋(Vercel Cron).

---

## 10. 데모·픽스처

### 10.1 픽스처 A — `paylab`(합성, 공개 안전)
- `fixtures/paylab-api`: TS/NestJS 결제 서비스 40파일. `src/payment/retry.ts`(MAX_RETRY=3, 고정 500ms), `src/refund/policy.ts`(타임아웃 없음), `src/webhook/`, `prisma/schema.prisma`, `docker-compose.yml`, `.github/workflows/deploy.yml`, `.env.example`(키 이름만), 로그에 PII 출력하는 코드 1곳.
- `fixtures/paylab-docs/goals.md`: 150줄 팀장 문서. 의도된 어긋남 3곳(재시도 5회+백오프 / 환불 SLA 24h / PII 로그 금지). `old-roadmap.md`: 폐기된 로드맵(stale 탐지용).
- 기대 결과: 충돌 카드 3장 + open_question 4개 + roadmap M1~M3(paths·done_when 포함).

### 10.2 픽스처 B — `brain`(실데이터, 공개 가능 여부 확인 후)
- 공개 불가 문장은 `scripts/anonymize.ts`로 프로젝트명·인명·URL 치환. 181개 문서 → 5개 프로젝트 분류, "실 API 검증/미검증" 충돌이 카드로 뜨는지 확인.
- 발표는 B, 심사위원 셀프 체험은 A/B 선택 버튼.

### 10.3 시드(`fixtures/seed/demo.json`)
팀 1, 프로젝트 1(+B면 5), 항목 60, 버전 v1.0~v1.2, Proposal 6(approved 4/rejected 1/submitted 1), conflicts 3 resolved + 1 open, devices 12(applied 9/outdated 2/manual 1), progress_events 25(M1 done, M2 2/3, M3 0), 로드맵 외 2.

### 10.4 브라우저 터미널 재생
`fixtures/replay/*.json`: `[{t_ms, text}]` 형식으로 실제 세션 녹화(`script` 명령 또는 수동 작성). 컴포넌트 `<TerminalReplay src>`가 타이핑 재생, 옆 패널에 같은 타임라인으로 Roadmap 갱신 애니메이션. 랜딩과 `/sync` 상단에 배치.

### 10.5 6분 발표 타임라인
0:00 두 Claude 다른 답 → 0:40 왜 git/DeepWiki 아닌가 → 1:10 가져오기·충돌 카드 3장 → 2:00 정리·발행 v1.0 → 2:40 Pack Explorer 역추적 → 3:20 훅 알림·sync·같은 답 → 4:10 자동 progress·propose·v1.1 → 5:10 Roadmap·Sync·네트워크 캡처 → 5:40 마무리 문장.

---

## 11. 보안·운영 가드

- 토큰: `ctx_` + 32바이트 base64url. DB엔 sha256만. 응답 1회 표시. 만료 90일.
- Path allowlist(§8.5) + zip 업로드 경로 검사(`..`, 절대경로, 심볼릭 거부, 파일 2,000개·20MB 상한).
- 로그: request_id·route·status·latency·user/team/project id만. body·token·문서 본문 금지.
- CORS: 웹 origin만. 플러그인은 Bearer만 사용.
- 비용: §7.5. Supabase: Vercel Cron `/api/health` 6시간마다.
- 프롬프트 인젝션: 문서·코드 항목 텍스트는 `<untrusted>` 블록으로 감싸 data로만 취급, 도구 호출 없음.

---

## 12. 테스트 매트릭스 (최소)

| 종류 | 대상 | 시점 |
|---|---|---|
| unit | schema · compiler golden 3 · hash · sort 셔플 불변 | PR |
| api | publish 트랜잭션 · 409 · payload allowlist · 예산 초과 | PR |
| cli | §8.7 | PR |
| e2e | import(paylab) → review → publish → pack explorer → roadmap 확인 (Playwright) | main |
| security | 업로드 payload 캡처에 code/secret 0건 (proxy 로그 검사 스크립트) | 릴리즈 전 |
| manual | 새 PC: `npx contextops setup` → `/contextops:init` → 웹 승인 → `/contextops:sync` → 훅 알림 | 릴리즈 전 |

---

## 13. 18일 WBS (2026-09-02 → 09-20)

각 일자 끝: 관통 시나리오 1회(import → publish → sync). Gate 미통과 시 §14 절삭 순서 적용.

| 일자 | Phase | 작업 | 완료 기준 |
|---|---|---|---|
| 9/2 | P0 | 모노레포·CI·Supabase 프로젝트·Drizzle 초기 마이그레이션·`packages/schema` 전체 | `pnpm test` green, 스키마 JSON export |
| 9/3 | P0 | `packages/compiler` 전체 + golden 3 · paylab 픽스처 코드·문서 작성 | golden 통과, manifest_hash 고정 |
| 9/4 | P1 | API: teams/projects/repos/tokens/documents/context-items/conflicts/questions | vitest api green |
| 9/5 | P1 | API: proposals/versions/publish/packs/sync/progress/roadmap · 발행 트랜잭션 | 손으로 넣은 항목이 Pack으로 나옴 |
| 9/6 | P1 | 웹 화면 2·5·7(로그인·Context·Pack Explorer) | **GATE 1**: 웹에서 항목 → 발행 → Pack Explorer 확인 |
| 9/7 | P2 | 플러그인 레이아웃·`setup`·`scan`·`validate`·credentials·`plugin validate` | 새 레포에서 setup 완료 |
| 9/8 | P2 | `sync`(백업·atomic·post-verify)·`status`·SessionStart 훅 | 훅 알림 → sync → applied 보고 |
| 9/9 | P2 | `init` Skill·`upload-draft`·`propose` Skill·`progress`·Stop 훅 | **GATE 2**: Claude Code에서 init→웹 승인→sync 관통 |
| 9/10 | P3 | 서버 AI 7.1 문서 구조화 · 7.2 충돌 탐지 · 예산 가드 | paylab 문서 → 항목 12 + 충돌 3 |
| 9/11 | P3 | 웹 화면 3·4(가져오기·정리) · 질문 카드 10장 | 문서 없이 질문만으로 v1.0 발행 가능 |
| 9/12 | P4 | 웹 화면 6·8(Proposal·Roadmap) · Realtime | agent progress → Roadmap 즉시 갱신 |
| 9/13 | P4 | 웹 화면 9(Sync·질의창 7.3) · 게스트 데모 테넌트·시드·`/demo/ai-once` · 랜딩 v1 | **GATE 3**: 시크릿 창에서 링크만으로 3분 체험 |
| 9/14 | P5 | AGENTS/cursor 타깃 · Pack zip 다운로드 · 터미널 재생 컴포넌트 · brain 익명화(해당 시) | |
| 9/15 | P5 | Vercel production · Cron · 보안 캡처 증거 · 새 PC fresh install | production으로 발표 시나리오 1회 완주 |
| 9/16 | P6 | 2분 영상 · 발표 슬라이드 · 리허설 1 | |
| 9/17 | P6 | 리허설 2·3 · 제출서 · README · KNOWN_LIMITATIONS | 제출 가능 |
| 9/18 | 버퍼 | 리허설에서 나온 버그 · replay 픽스처 · 커뮤니티 공유 준비 | |
| 9/19 | 제출 | **제출** · 데모 테넌트 리셋 확인 · 예산 한도 확인 | |
| 9/20 | 예비 | 아무 작업도 계획하지 않음 | |

---

## 14. 절삭 순서 (Gate 실패 시)

1. 질의창(7.3) → 2. 터미널 재생 → 3. Roadmap "완료 확인" UI(이벤트 목록만 표시) → 4. AGENTS/cursor 타깃 → 5. Pack zip → 6. brain 픽스처(paylab만) → 7. Stop 훅의 pending-proposal(propose는 수동만) → 8. Realtime(폴링 10초).

절대 자르지 않는 것: 스키마·컴파일러·발행 트랜잭션·setup·sync·SessionStart 훅·init Skill·충돌 카드·게스트 데모 테넌트·랜딩 before/after.

---

## 15. 저장소 CLAUDE.md (개발 규칙, 그대로 사용)

```md
# ContextOps 개발 규칙
- 구현 전 docs/SPEC.md의 해당 §를 읽는다. 완료 기준을 만족하면 다음 Phase로 간다.
- 절대 원칙 P1~P7(SPEC §0.1)을 위반하는 코드는 작성하지 않는다. 특히 `claude -p`, Agent SDK, 사용자 구독 재사용 금지.
- 모든 외부 입력은 packages/schema로 파싱한다. 새 필드는 schema에 먼저 추가한다.
- packages/compiler는 순수 함수만. Date.now, Math.random, 네트워크 금지. golden test를 깨면 템플릿 버전을 올리고 expected를 갱신한 이유를 PR에 쓴다.
- API 응답 형식·에러 코드는 SPEC §5. 새 엔드포인트는 표에 먼저 추가한다.
- 서버 AI 호출은 lib/ai/withBudget 경유 외에 금지.
- 플러그인 훅 스크립트는 파일을 쓰지 않는다(cache/·pending-proposal.json 제외). 3초 안에 끝난다.
- 로그에 body·토큰·문서 본문을 남기지 않는다.
- 커밋 단위: Phase 표의 한 행. 테스트 없는 API·CLI 변경은 머지하지 않는다.
- UI는 docs/DESIGN_BRIEF.md의 토큰·컴포넌트를 따른다. 임의 색·간격 금지.
```

---

## 16. 제출서 초안

**문제:** AI 코딩 도구는 CLAUDE.md 같은 파일로 팀 지식을 받지만, 그 파일은 git을 쓰는 개발자 개인이 각자 관리합니다. 팀장의 목표·정책은 AI에 들어가지 않고, 같은 팀에서도 팀원마다 AI가 다른 답을 하며, 로드맵이 실제로 어디까지 왔는지 아무도 모릅니다. ContextOps는 기존 문서·팀장 답변·코드에서 뽑은 항목을 AI가 정해진 형식으로 구조화하고, 충돌을 찾아 사람이 결정하게 하고, 승인된 것을 모든 팀원의 Claude Code에 같은 버전·같은 해시로 배포하며, 각 팀원의 AI가 작업 끝에 로드맵 진행을 근거와 함께 자동 보고합니다.

**AI 활용:** (1) 문서·답변 → 스키마 항목 구조화(원문 offset 근거), (2) 항목 간 충돌·오래됨·중복 탐지(판정 대신 질문 생성), (3) 사용자 본인의 Claude Code가 로컬에서 코드 근거 추출·변경 제안·진행 보고(코드는 서버로 가지 않음), (4) 승인 항목만 근거로 답하는 질의. 근거 ID는 입력에 존재하는 것만 허용해 환각을 구조적으로 차단하고, 승인 이후 컴파일·해시·배포는 LLM 없이 결정론적으로 수행합니다.

**도구:** Claude Code Plugin(Skills 3·Hooks 2), Claude API(tool use 구조화 출력), Next.js·Supabase·Vercel·TypeScript. 개발 전 과정 Claude Code.

---

## 17. Known Limitations (문서에 명시)

Device code auth 미지원(토큰 붙여넣기) · 권한 2단계 · 실시간 아님(마지막 보고 기준) · Claude 지침 100% 준수 보장 안 함 · Codex/Cursor는 출력 파일만 · 대형 레포(1,000파일+) init 미검증 · 개인 Memory 로컬 충돌 검사 미구현(비공개 모드만) · 단일 OS 설치 검증(개발자 환경 기준).
