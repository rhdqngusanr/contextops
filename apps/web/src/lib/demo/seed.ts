import { and, eq, inArray } from 'drizzle-orm'
import { AI_JOB_STATUSES } from '@contextops/schema'

import { AI_JOB_STATUS_RULES, aiJobs, contextItems } from '../../db/schema'
import { POST as createTeam } from '../../app/api/v1/teams/route'
import { POST as createProject } from '../../app/api/v1/teams/[id]/projects/route'
import { POST as createRepo } from '../../app/api/v1/projects/[id]/repos/route'
import { POST as createDocument } from '../../app/api/v1/projects/[id]/documents/route'
import { POST as batchDraft } from '../../app/api/v1/projects/[id]/context-items/batch-draft/route'
import { PATCH as updateItem } from '../../app/api/v1/projects/[id]/context-items/[itemId]/route'
import { GET as listQuestions, POST as answerQuestions } from '../../app/api/v1/projects/[id]/questions/route'
import { getDb } from '../../db/client'
import { SEED_QUESTIONS } from '../api/seed-questions'
import { signSessionJwt } from '../api/session'
import { fixtureDir, fixtureText } from './fixtures'
import { dataOf, params, req } from './inproc'

// =====================================================================
//  🔴 **paylab 씨앗의 정본 하나** (SPEC §10.1)
//
//  ★ 왜 파일로 뺐나 — 이 서사를 쓰는 곳이 둘이 됐다: 관통(`walkthrough-publish.ts`)과
//    화면을 눈으로 보는 개발용 서버(`dev-server.ts`). 각자 적으면 **픽스처 서사가
//    갈린다** — 이 저장소에서 실제로 한 번 일어났던 고장이다
//    (docs/feedback/INBOX.md 「픽스처 서사는 결정 대기가 아니다」).
//    갈리면 관통이 보는 데이터와 사람이 화면에서 보는 데이터가 달라지고,
//    그러면 **화면 눈 판정이 관통을 증명하지 못한다.**
//
//  ★ 왜 `scripts/` 가 아니라 제품 코드(`src/lib/demo`)에 있나 — 게스트 데모 테넌트는
//    이 씨앗 위에 얹히고(`seed-demo.ts`), 그 데모를 배포 DB 에 매일 심는 문이
//    `GET /cron/demo-reset` 이다 (SPEC §9 · PLAN P5 둘째 행). 라우트가 `scripts/` 를
//    import 할 수는 없다 — 그 폴더는 배포에 안 실린다. 그래서 씨앗이 올라왔고, 관통·개발용
//    서버·시험은 **여기 것을 그대로** 쓴다 (정본은 여전히 하나다).
//    ⚠ 그래서 이 파일은 `app/` 의 라우트를 import 한다 — 시드는 화면·플러그인과 같은
//      **라우트의 클라이언트**다 (`inproc.ts` 의 주석). `lib/api/*` 가 이 파일을 import
//      하는 날 순환이 되니, 부르는 쪽은 라우트(`cron/demo-reset`)와 도구뿐이어야 한다.
//
//  ★ 여기는 **채우기만** 한다. 「제대로 들어갔나」를 재는 것은 부르는 쪽의 일이다 —
//    관통은 그걸 check 로 세고, 개발용 서버는 그냥 쓴다. 채우는 코드에 판정을 섞으면
//    개발용 서버가 관통의 합격 기준을 짊어지게 된다.
//
//  ⚠ 라우트가 `getDb()` 로 집어 갈 DB 가 있어야 한다 — 시험·도구는 `freshDb()` 로 꽂고,
//    배포에서는 `DATABASE_URL` 이다. `SUPABASE_JWT_SECRET` 도 있어야 한다 (세션을 서명한다).
//  ⚠ 서버가 문장을 지어내지 않는다 — 구조화는 §7.1(P3)의 일이다. 여기 있는 항목은
//    **사람이 화면에서 적는 것과 같은 자리**에 손으로 넣는다. 그게 지금 진짜로 도는 길이다.
// =====================================================================

/**
 * 시드가 만드는 사람의 이메일. **픽스처에도 코드에도 사람 이메일을 적지 않는다** (P1 과
 * 같은 결). `.invalid` 는 예약된 최상위 도메인이라 진짜 주소와 절대 겹치지 않는다.
 */
export function seedEmail(sub: string): string {
  return `${sub}@demo.invalid`
}

/**
 * 시드가 라우트를 부를 때 쓰는 세션의 수명(초). 심는 데 몇 초면 충분하고, 이 토큰은
 * 프로세스 밖으로 안 나간다 — 길 이유가 없다.
 */
export const SEED_SESSION_TTL_SEC = 10 * 60

/**
 * 시드가 쓰는 세션 JWT — **진짜 인증 경로**(`verifySessionJwt`)를 그대로 지난다.
 * ★ 왜 우회 문이 아닌가 — 시험·시드용 인증 문을 따로 만들면 그 문이 배포에도 남는다.
 *   서명만 우리가 하고 검사는 라우트가 평소대로 한다.
 */
export function seedSession(sub: string, name: string = sub, now: Date = new Date()): string {
  return signSessionJwt({ sub, email: seedEmail(sub), name }, now, SEED_SESSION_TTL_SEC).token
}

/**
 * 픽스처 문서 하나 — **올라간 버전의 uuid 와 원문을 같이** 든다.
 *
 * ★ 왜 원문까지 들고 다니나 — 근거의 `start_char` 를 **문서에서 재려고** 그런다.
 *   손으로 적으면 문서가 한 줄만 바뀌어도 조용히 딴 데를 가리키고, 아무도 안 센다.
 *   실제로 일곱 항목이 전부 `0-400` 을 가리켰고 그중 여섯은 그 범위 안에 그 항목이
 *   주장하는 문장이 없었다 (docs/feedback/FINDINGS.md **90**).
 */
export type FixtureDoc = {
  /** `fixtures/` 아래 상대 경로 (`paylab-docs/goals.md`). 어긋났을 때 사람이 읽는 이름이다 */
  file: string
  /** 올린 뒤 서버가 준 문서 버전 uuid — 근거가 **어느 문서**를 가리키나 */
  versionId: string
  /** 올린 것과 **같은** 본문. 문장 위치를 여기서 잰다 */
  text: string
}

/**
 * 「이 항목의 근거를 따라가면 원문의 이 문장이 나와야 한다」 — P7 의 기대값.
 *
 * ★ 왜 픽스처 밖으로 내나 — 관통이 「Pack 태그를 따라가면 그 문장이 있나」를 세려면
 *   기대값이 필요한데, 그걸 검사 쪽에 **다시 적으면** 픽스처와 갈라진다.
 *   여기 한 곳에서 나온 것을 검사는 **읽기만** 한다.
 */
export type EvidenceExpectation = {
  itemId: string
  /** `fixtures/` 아래 상대 경로 — 따라가는 쪽이 **이 파일을** 잘라 본다 */
  file: string
  /** 근거 범위 안에 **반드시** 있어야 하는 원문 문장 */
  quote: string
  /**
   * 🔴 근거 범위 안에 **글자 그대로** 있어야 하는 `data` 칸의 값들 (FINDINGS 101).
   *
   * ★ 왜 `quote` 만으로 부족한가 — `quote` 는 「이 항목이 **어디서** 왔나」다.
   *   종이에 실제로 찍히는 것은 `data` 의 칸들이고(`지표: …` · `- 용어:` · `- 완료 기준:`),
   *   범위가 맞아도 **옮겨 적은 낱말이 다르면** 태그를 따라간 심사자는 자기가 읽은
   *   문장과 종이의 문장이 다른 것을 본다. 실제로 `지표:` 가 그랬다 —
   *   원문은 「PSP 장애 구간을 포함한 주간 성공률」인데 종이는 「주간 승인 성공률」이었고,
   *   그 낱말은 픽스처 문서 어디에도 없었다.
   * ⚠ 어느 칸이 여기 실리는지는 `QUOTED_DATA` 표가 정한다 — 여기서 고르지 마라.
   */
  cells: string[]
} & (
  //  ⚠ 갈래 이름은 `SourceRefKind` 와 **같은 낱말**이다. 따라가는 쪽은 태그 조각에서
  //    `srcKindOf()` 로 종류를 얻어 이 갈래를 고른다 — 이름이 갈리면 못 고른다.
  | { kind: 'source_document'; documentVersionId: string }
  | { kind: 'repository_path'; repo: string; path: string }
)

/**
 * 씨앗 초안 하나 + 그 근거들의 기대값.
 * ⚠ 근거는 **여럿일 수 있다** (`withRepo`). 하나로 두면 둘째 근거는 아무도 안 따라간다.
 */
export type PaylabDraft = {
  /** `batch-draft` 에 그대로 싣는 몸 (스키마가 `.strict()` 라 여분의 키를 못 싣는다) */
  draft: Record<string, unknown>
  evidence: EvidenceExpectation[]
}

/**
 * 코드 픽스처 하나 — **repo 이름·상대 경로·본문**을 같이 든다.
 * 🔴 본문을 드는 이유는 **줄 번호를 재려고**다 (`withRepo`). 본문이 서버로 가지는
 *    않는다 — `repository_path` 근거에 실리는 것은 repo·경로·줄 번호뿐이다 (P1 · §3.1).
 */
export type FixtureCode = {
  /** 서버에 등록한 repo 이름. `fixtures/` 아래 폴더 이름과 같다 */
  repo: string
  /** repo 상대 경로. 태그(`repo:{repo}:{path}:{줄}`)에 그대로 실린다 */
  path: string
  /** `fixtures/{repo}/{path}` 의 본문. 줄 번호를 여기서 잰다 */
  text: string
}

function fixtureCode(repo: string, path: string): FixtureCode {
  return { repo, path, text: fixtureText(`${repo}/${path}`) }
}

/**
 * `index` 가 속한 마크다운 제목 사슬 (`['# 머리', '## 절', '### 항']` 의 글자만).
 *
 * ★ 왜 계산하나 — 손으로 적으면 문서가 바뀔 때 조용히 거짓이 된다. 실제로 일곱 항목의
 *   `heading_path` 가 전부 `['paylab 결제 서비스']` 였고, 그중 하나는 그런 제목이
 *   아예 없는 문서를 가리켰다 (FINDINGS 90).
 */
function headingPathAt(text: string, index: number): string[] {
  const path: (string | undefined)[] = []
  let at = 0
  for (const line of text.split('\n')) {
    if (at > index) break
    const m = /^(#{1,6})\s+(.+)$/.exec(line)
    if (m?.[1] !== undefined && m[2] !== undefined) {
      const depth = m[1].length
      path.length = Math.min(path.length, depth - 1)
      path[depth - 1] = m[2].trim().slice(0, 200)
    }
    at += line.length + 1
  }
  //  `##` 없이 `###` 가 나오면 가운데가 빈다 — 빈 칸을 글자로 그리지 않는다.
  return path.filter((h): h is string => h !== undefined)
}

/**
 * 🔴 **원문에서 옮겨 온 `data` 칸** — 타입별로 어느 칸이 「인용」인가 (FINDINGS 101).
 *
 * ★ 왜 표인가 — `data` 의 칸은 두 갈래다.
 *   **인용 칸**은 문서에 있던 값을 옮긴 것이고(목표 표의 세 칸 · 용어 표 · 완료 기준 목록),
 *   **진술 칸**은 팀이 그 문단을 읽고 스스로 적은 문장이다(`rule`·`statement`·
 *   `responsibility`·`invariants`) — 원문과 글자가 달라도 옳다.
 *   ⚠ 이 둘을 안 가르면 검사가 둘 중 하나를 못 한다: 전부 인용이라고 하면 정상적인
 *     진술이 빨개지고(늘 빨간 게이트는 다음 사람이 끈다), 아무것도 안 재면
 *     「지표: 주간 승인 성공률」처럼 **문서에 없는 낱말**이 종이에 그대로 선다.
 *
 * ★ 새 ItemType 을 씨앗에 넣는 절차: **이 표에 한 줄.** 인용 칸이 없으면 `[]` 라고
 *   적어라 — `fromDoc()` 이 줄 없는 타입을 만나면 **던진다.** 「아직 안 정했다」로
 *   비워 두면 그 타입만 조용히 안 재진다.
 * ⚠ 값은 문자열·문자열 배열·`{term,meaning}` 같은 객체 배열 다 된다 — 안의 문자열을
 *   전부 훑는다. 칸이 `data` 에 아예 없으면 던진다 (표의 오타를 여기서 잡는다).
 * ⚠ **이 값이 「인용」이라는 주장은 관통이 판정한다** — `walkthrough-publish.ts` 의
 *   `followEvidence` 가 Pack 태그의 범위를 원문에서 잘라 이 칸들을 찾는다.
 */
const QUOTED_DATA: Record<string, readonly string[]> = {
  //  §2 목표 표의 한 줄이 그대로 세 칸이 된다 — `| G1 | 목표 | 어떻게 재나 | 기한 |`.
  goal: ['outcome', 'metric', 'deadline'],
  //  §6 용어 표의 다섯 줄 — `term` 과 `meaning` 둘 다 표 안에 있다.
  domain: ['glossary'],
  //  §4 마일스톤의 「경로」와 「완료 기준」 목록 · 제목 괄호의 기한. `milestone_id`(PL-M1)는
  //  **우리가 붙인 이름**이라 원문에 없다 — 인용 칸이 아니다.
  roadmap: ['due', 'paths', 'done_when'],
  //  §7 그림의 대괄호 이름. `responsibility` 는 그 줄을 읽고 적은 진술이고,
  //  `paths` 는 픽스처 레포에서 잰 것(`fixtureDir`)이라 문서에 없다.
  architecture: ['component'],
  //  아래 셋은 인용 칸이 없다 — 전부 팀이 스스로 적는 진술이고, `severity`·`enforcement`
  //  는 스키마의 enum 이라 문서에 그 낱말이 있을 이유가 없다.
  mission: [],
  policy: [],
  constraint: [],
  //  §5 「아직 정하지 못한 것」 — `question` 은 그 불릿을 **물음으로 다시 적은 것**이라
  //  진술이다 (원문은 「…못 정했다」이지 물음표가 아니다). Pack 에는 안 나간다 (partition).
  open_question: [],
}

/**
 * `QUOTED_DATA` 가 인용이라고 말한 칸들의 문자열을 전부 모은다. 줄이 없으면 **던진다.**
 */
function quotedCells(id: string, type: string, extra: Record<string, unknown>): string[] {
  const keys = QUOTED_DATA[type]
  if (keys === undefined) {
    throw new Error(`[seed] ${id}: QUOTED_DATA 표에 '${type}' 줄이 없다 — 인용 칸이 없으면 [] 라고 적어라`)
  }
  const data = (extra.data ?? {}) as Record<string, unknown>
  return keys.flatMap((key) => {
    if (!(key in data)) {
      throw new Error(`[seed] ${id}: QUOTED_DATA 가 '${key}' 를 인용 칸이라 하는데 data 에 그 칸이 없다`)
    }
    return flatStrings(data[key])
  })
}

/** 문자열·배열·객체 안의 문자열을 전부 편다 (`glossary` 의 `{term,meaning}` 까지). */
function flatStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flatStrings)
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(flatStrings)
  return []
}

/**
 * 문서에서 온 항목 초안. **근거가 문서의 문자 범위**라 P7 이 원문까지 이어진다.
 *
 * 🔴 `quote` 는 **원문에 그대로 있는 문장**이다. 범위는 그 문장을 문서에서 찾아 잰다 —
 *    적는 게 아니라 재는 것이라 문서가 바뀌면 따라 움직이거나, 못 찾고 **던진다.**
 * ⚠ 못 찾을 때 조용히 `0` 으로 떨어지면 FINDINGS 90 과 똑같은 상태가 된다 —
 *   태그는 멀쩡히 붙어 있고 따라가면 딴 문장이 나온다. 그래서 던진다.
 * ⚠ 두 번 이상 나오는 문장도 던진다 — 어느 쪽을 가리키는지 우리가 모르면
 *   심사자가 따라갔을 때 우리가 뜻한 자리가 아닐 수 있다.
 */
export function fromDoc(
  id: string, type: string, doc: FixtureDoc, quote: string, extra: Record<string, unknown>,
): PaylabDraft {
  const start = locate(id, doc.file, doc.text, quote)
  return {
    draft: {
      id,
      type,
      scope: { kind: 'project' },
      priority: 60,
      confidence: 'high',
      tags: ['paylab'],
      source_refs: [{
        kind: 'source_document',
        document_version_id: doc.versionId,
        start_char: start,
        end_char: start + quote.length,
        heading_path: headingPathAt(doc.text, start),
      }],
      ...extra,
    },
    evidence: [{
      kind: 'source_document', itemId: id, file: doc.file, documentVersionId: doc.versionId, quote,
      //  🔴 「이 칸들도 근거 범위 안에 글자 그대로 있어야 한다」 (FINDINGS 101).
      cells: quotedCells(id, type, extra),
    }],
  }
}

/**
 * 원문에서 문장의 시작 위치를 **잰다**. 못 찾거나 두 번 이상 나오면 **던진다.**
 *
 * ★ 왜 문 하나인가 — 문서(`fromDoc`)와 코드(`withRepo`)가 **같은 규칙**을 지켜야 한다.
 *   한쪽만 「없으면 0」으로 두면 그쪽 근거가 조용히 딴 데를 가리킨다 (FINDINGS 90).
 */
function locate(id: string, file: string, text: string, quote: string): number {
  const head = quote.split('\n')[0] ?? quote
  const at = text.indexOf(quote)
  if (at < 0) throw new Error(`[seed] ${id}: 근거 문장을 ${file} 에서 못 찾았다 — "${head}"`)
  if (text.indexOf(quote, at + 1) >= 0) {
    throw new Error(`[seed] ${id}: 근거 문장이 ${file} 에 두 번 이상 있다 — "${head}"`)
  }
  return at
}

/**
 * 🔴 **코드 근거를 한 칸 더 붙인다** (`repository_path` · FINDINGS 93).
 *
 * ★ 왜 필요한가 — 「이 규칙이 코드 어디에 걸려 있나」가 이 제품의 말인데, 데모 Pack 의
 *   태그가 전부 `doc:` 하나뿐이라 그 말이 **심사자가 읽는 종이에 한 번도 안 섰다.**
 * 🔴 줄 번호는 **적지 않고 잰다** — `quote` 를 코드 파일에서 찾아 계산한다. 손으로 적으면
 *    픽스처 코드가 한 줄만 밀려도 조용히 딴 줄을 가리킨다 (FINDINGS 90 과 같은 고장).
 * ⚠ **코드 본문은 서버로 가지 않는다** (P1). 근거에 실리는 것은 repo·경로·줄 번호뿐이고,
 *   `quote` 는 여기(픽스처)에만 남아 관통이 「따라가면 그 줄인가」를 재는 데 쓰인다.
 */
export function withRepo(entry: PaylabDraft, code: FixtureCode, quote: string): PaylabDraft {
  const id = String(entry.draft.id)
  const at = locate(id, `${code.repo}/${code.path}`, code.text, quote)
  const startLine = code.text.slice(0, at).split('\n').length
  const endLine = startLine + quote.split('\n').length - 1
  const refs = entry.draft.source_refs as Record<string, unknown>[]
  return {
    draft: {
      ...entry.draft,
      source_refs: [...refs, {
        kind: 'repository_path', repo: code.repo, path: code.path, start_line: startLine, end_line: endLine,
      }],
    },
    evidence: [...entry.evidence, {
      kind: 'repository_path', itemId: id, file: `${code.repo}/${code.path}`, repo: code.repo, path: code.path, quote,
      //  ⚠ 코드 근거에는 인용 칸이 없다 — `data` 는 문서에서 왔고, 이 근거가 말하는 것은
      //    「그 규칙이 코드 어느 줄에서 깨지고 있나」다. 코드 본문은 서버로 안 간다 (P1).
      cells: [],
    }],
  }
}

/**
 * 항목 초안 (SPEC §10.1 의 기대 결과를 낼 재료).
 *
 * ⚠ **개수를 세는 곳을 만들지 마라** — 부르는 쪽은 `SeedResult.drafted` 를 읽는다.
 *   여기 한 줄을 더하면 관통의 검사가 저절로 따라온다. 숫자를 두 곳에 적으면
 *   픽스처를 늘린 사람이 관통을 빨갛게 만들고, 그 다음엔 검사 쪽 숫자를 고친다.
 *
 * ⚠ **문서에 없는 문장을 여기 적지 마라.** 모든 줄은 `source_refs` 로 원문까지
 *   이어져야 한다 (P7). 데모에 필요한 갈래가 있는데 문서에 근거가 없으면,
 *   지어내지 말고 「그 갈래는 이 픽스처로 못 보여 준다」고 남겨라.
 *
 * 🔴 넷째 인자가 **원문에서 그대로 잘라 온 문장**이다. 근거 범위는 그 문장을 문서에서
 *    찾아 잰다 — 손으로 적는 숫자가 아니다 (FINDINGS 90). 문서를 고쳤는데 여기를
 *    안 고치면 씨앗이 **던져서** 관통이 그 자리에서 멈춘다.
 *
 * ⚠ `old-roadmap.md` 에서 오는 항목은 **하나도 없다.** 그 문서는 「폐기된 로드맵
 *   (stale 탐지용)」이고 (SPEC §10.1), 지금 항목이 주장하는 M1 은 goals.md §4 에서 왔다.
 *   전에는 `item_road_m1` 이 old-roadmap.md 를 가리켰는데 그 문서의 M1 은
 *   「웹훅 수신 v1」이라 **내용이 아예 다른 문서**를 근거라고 적고 있었다.
 */
/**
 * 🔴 **goals.md §7 「아키텍처 한 장」의 다섯 줄** — `architecture` 항목의 재료 표.
 *
 * ★ 왜 표인가 — 다섯이 **글자만 다르고 모양이 같다.** `fromDoc(...)` 를 다섯 번
 *   펼쳐 적으면 여섯째 구성요소가 생겼을 때 한 벌을 통째로 복사하게 되고, 복사하는
 *   사람은 반드시 하나(경로·근거 문장)를 빠뜨린다.
 * ★ 구성요소를 하나 더하는 절차: **이 표에 한 줄.** 경로는 `src/{component}` 로
 *   자동이고, 그 폴더가 픽스처에 없으면 `fixtureDir()` 이 던진다.
 * ⚠ 넷째 칸(`quote`)은 goals.md §7 에서 **그대로 잘라 온 줄**이다. 요약해서 적지 마라 —
 *   `locate()` 가 원문에서 못 찾고 던진다 (P7 이 끊기는 자리를 씨앗에서 막는다).
 *
 * 🔴 **다섯째 칸(`title`)은 「구성요소 — 책임」을 다시 적는 자리가 아니다** (FINDINGS 99).
 *    예전엔 제목을 ``${component} — ${responsibility}`` 로 **만들어** 썼다. 그러면
 *    `architecture` 절이 내는 네 줄(`### {title}` · `- 구성요소:` · `- 책임:`)이
 *    **같은 문장을 글자까지 똑같이 두 번** 적는다 — 종이의 절반이 메아리가 된다.
 *    → 제목은 **사람이 목록에서 읽는 한 줄**(§7 그림에서 이 상자가 맡은 자리)로 둔다.
 *    ⚠ 제목은 근거 원문일 필요가 없다 — P7 은 **줄의 태그**를 요구하지 제목의 출처를
 *      요구하지 않는다. 그래도 §7 그림이 말하는 것 밖으로 나가지 마라 (FINDINGS 101).
 *    ⚠ 제목에 `responsibility` 를 베껴 넣지 마라 — 관통의 「메아리 0」 검사가 잡는다
 *      (`scripts/pack-echo.ts`).
 *
 * 🔴 **줄 순서가 곧 종이의 순서다** (FINDINGS 98). 이 표는 goals.md §7 그림 순서
 *    (payment → psp → webhook → refund → ledger) 그대로이고, 그 순서가 그 문단의 뜻이다
 *    (「`payment` 는 PSP 를 직접 부르지 않고 `psp` 를 거친다」). 다섯이 전부 같은
 *    `priority` 면 컴파일러가 제목 코드포인트 순으로 떨어뜨려 **ledger 가 맨 앞**에 서고,
 *    종이에서는 돈이 흐르는 화살표가 알파벳 목록이 된다.
 *    → 그래서 `priority` 를 **줄 번호에서 뽑는다**(`ARCHITECTURE_TOP - i`). 손으로 칸을
 *      채우면 여섯째 줄을 더한 사람이 그 칸만 빠뜨리고, 그러면 그 줄만 조용히 뒤로 간다.
 *    ⚠ 순서를 컴파일러에서 고치려 하지 마라 — 정렬은 P4 의 심장이고 지금 맞다
 *      (`compiler/src/sort.ts`). 순서를 말하는 자리는 `priority` 하나다.
 */
export const ARCHITECTURE = [
  ['item_arch_payment', 'payment', '승인·매입을 맡는다. PSP 를 직접 부르지 않고 psp 를 거친다',
    '- `payment` 는 승인·매입을 맡는다. PSP 를 직접 부르지 않고 `psp` 를 거친다.',
    '결제가 들어오는 입구'],
  ['item_arch_psp', 'psp', '바깥으로 나가는 유일한 자리다. 재시도·타임아웃이 여기 산다',
    '- `psp` 만이 바깥으로 나간다. 재시도·타임아웃이 사는 자리다.',
    '밖으로 나가는 문'],
  ['item_arch_webhook', 'webhook', 'PSP 콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다',
    '- `webhook` 은 PSP 콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다.',
    '밖에서 돌아오는 문'],
  ['item_arch_refund', 'refund', '환불을 맡는다. 원장에 반대 부호로 한 줄을 더한다',
    '- `refund` 는 환불을 맡는다. 원장에 반대 부호로 한 줄을 더한다.',
    '돈을 되돌리는 길'],
  ['item_arch_ledger', 'ledger', 'append only 다. 여기서 계산이 틀리면 정산이 틀린다',
    '- `ledger` 는 append only. 여기서 계산이 틀리면 정산이 틀린다.',
    '돈이 쌓이는 장부'],
] as const satisfies readonly (readonly [
  id: string, component: string, responsibility: string, quote: string, title: string,
])[]

/**
 * 표의 **첫 줄**이 받는 `priority`. 아래로 한 줄에 1씩 내려간다.
 *
 * ★ 왜 다른 항목(기본 `60`)보다 높아도 되나 — `priority` 는 **같은 타입 안에서만**
 *   견줘진다: 절(section)은 타입별로 갈려 있고(`compiler/src/partition.ts`),
 *   150개 상한의 절삭도 「type별 priority 상위」다 (SPEC §7.3). 그래서 이 값이
 *   policy·goal 을 제치는 일은 없다 — 다섯 아키텍처 줄끼리의 순서만 정한다.
 * ⚠ 표가 여섯 줄이 되면 여섯째는 `65` 다. 바닥이 아니라 **꼭대기**를 고정한 이유는,
 *   줄을 더했을 때 이미 있는 줄의 값이 안 움직여야 하기 때문이다.
 */
const ARCHITECTURE_TOP_PRIORITY = 70

/**
 * 🔴 **goals.md §2 「올해의 목표」 표의 세 줄** — `goal` 항목의 재료 표 (FINDINGS 119).
 *
 * ★ 왜 표인가 — `ARCHITECTURE` 와 같은 이유다. 셋이 글자만 다르고 모양이 같다.
 *   목표를 하나 더하는 절차: **이 표에 한 줄.** `quote` 는 §2 표의 **한 행 전체**를
 *   그대로 잘라 온 것이고, 세 칸(`outcome`·`metric`·`deadline`)은 그 행의 세 칸을
 *   **글자 그대로** 옮긴다 (`QUOTED_DATA.goal` · FINDINGS 101) — 관통이 그 칸이 범위 안에
 *   있는지 센다. 전에 `metric` 을 「주간 승인 성공률」로 줄여 적었다가 그 낱말이 문서
 *   어디에도 없어서 잡혔다.
 * 🔴 **`body` 는 세 칸이 안 말하는 것만 적는다** (FINDINGS 169) — `metric` 을 말만 바꿔
 *   되풀이하면 종이에 같은 말이 두 줄로 선다. G1 의 `body` 가 「G2 와 서로 당긴다」인 것이
 *   그 모양이다 (§2 의 표 아래 두 줄에서 왔다). 꼬리만 붙인 되풀이(`…성공률` -> `…성공률로
 *   잰다`)는 관통의 메아리 검사가 문다 (`scripts/pack-echo.ts` · `test/pack-echo.test.ts`).
 * ⚠ **제목을 `outcome` 과 같게 적지 마라** (FINDINGS 100). goal 절은
 *   `- **{title}** — {data.outcome}` 를 내므로 둘이 같으면 한 줄에 같은 문장이 두 번 선다.
 *   제목은 **목록에서 읽는 이름**이고 `outcome` 이 **표에서 온 목표 문장**이다.
 * 🔴 줄 순서가 곧 종이의 순서다 (G1 → G2 → G3) — `priority` 를 줄 번호에서 뽑는다
 *    (`GOAL_TOP_PRIORITY - i`). 같은 값이면 컴파일러가 제목 코드포인트 순으로 세운다.
 */
export const GOALS = [
  ['item_goal_success_rate', '장애 구간에도 승인이 선다', 'G2 와 서로 당긴다 — 재시도를 늘리면 승인률은 오르지만 환불이 늦어지고, 둘이 부딪히면 G2 가 우선이다.',
    '| G1 | 결제 승인 성공률 99.5% | PSP 장애 구간을 포함한 주간 성공률 | 2026-06-30 |',
    '결제 승인 성공률 99.5%', 'PSP 장애 구간을 포함한 주간 성공률', '2026-06-30'],
  ['item_goal_refund_sla', '환불이 하루 안에 끝난다', '접수에서 종결까지의 시각 차이 p95 로 잰다.',
    '| G2 | 환불 접수→종결 24시간 이내 95% | `refund.closed_at - refund.created_at` p95 | 2026-06-30 |',
    '환불 접수→종결 24시간 이내 95%', '`refund.closed_at - refund.created_at` p95', '2026-06-30'],
  //  🔴 `body` 가 **비어 있다 — 일부러다** (FINDINGS 170). 원문(`fixtures/paylab-docs/goals.md`)이
  //     G3 에 대해 세 칸(목표·지표·기한) 밖의 말을 하지 않는다. G1·G2 의 당김은 G1 의 body 가
  //     이미 나르고, G2 의 body 는 식(`refund.closed_at - …`)을 사람 말로 푼 것이다.
  //     ⚠ **여기를 지어내서 채우지 마라.** 지표를 말만 바꿔 되풀이하는 줄이 되고, 그것이
  //       169·170 이 지운 바로 그 모양이다. roadmap 셋이 이미 빈 `body` 다.
  ['item_goal_settlement_zero', '정산이 원장과 맞는다', '',
    '| G3 | 정산 오차 0원 | 일 배치 후 원장 대사 차액 | 2026-06-30 |',
    '정산 오차 0원', '일 배치 후 원장 대사 차액', '2026-06-30'],
] as const satisfies readonly (readonly [
  id: string, title: string, body: string, quote: string, outcome: string, metric: string, deadline: string,
])[]

/** `GOALS` 첫 줄의 `priority`. 아래로 1씩 내려간다 — `ARCHITECTURE_TOP_PRIORITY` 와 같은 판단. */
const GOAL_TOP_PRIORITY = 70

/**
 * 🔴 **goals.md §4 「로드맵」의 M1~M3** — `roadmap` 항목의 재료 표 (FINDINGS 119).
 *
 * ★ 왜 표인가 — 셋이 같은 모양(제목 줄 · 경로 · 의존 · 완료 기준 셋)이다. 마일스톤을
 *   하나 더하는 절차: **이 표에 한 줄.** `quote` 는 `### M? — …` 제목 줄부터 완료 기준
 *   마지막 줄까지 **통째로** 잘라 온 것이라, 문서의 그 절이 한 글자만 바뀌어도 `locate()`
 *   가 던진다. `due`·`paths`·`done_when` 은 그 범위 안에 글자 그대로 있다 (`QUOTED_DATA.roadmap`).
 * ⚠ **제목에 `M1` 을 다시 적지 마라** (FINDINGS 100). roadmap 절은
 *   `- **{data.milestone_id} {title}**` 를 내므로 `PL-M1 M1 — …` 이 된다.
 *   마일스톤 번호를 말하는 자리는 `milestone_id` 하나다.
 * ⚠ `milestone_id`(`PL-M1`)는 **우리가 붙인 이름**이라 원문에 없다 — 인용 칸이 아니다.
 *   `dependencies` 도 그 이름으로 적으므로 인용 칸이 아니다 (원문은 「의존: M1」).
 * ★ 근거는 **goals.md §4** 다 — 폐기된 old-roadmap.md 가 아니다. 그 문서의 M1 은
 *   「웹훅 수신 v1」이고 경로도 `src/webhook/` 라 딴 마일스톤이다 (SPEC §10.1 「stale 탐지용」).
 * 🔴 제목 괄호의 날짜가 `due` 다 — 화면 8 의 `due` 칸과 Pack 의 `due:` 가 여기서 온다 (FINDINGS 111).
 * 🔴 줄 순서가 곧 종이의 순서다 (M1 → M2 → M3) — `priority` 를 줄 번호에서 뽑는다.
 */
export const MILESTONES = [
  ['item_road_m1', 'PL-M1', '재시도·타임아웃 정리', '2026-04-30', ['src/payment', 'src/psp'], [],
    '### M1 — 재시도·타임아웃 정리 (2026-04-30)\n\n'
    + '- 경로: `src/payment/`, `src/psp/`\n'
    + '- 완료 기준:\n'
    + '  - PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다\n'
    + '  - 모든 외부 호출에 타임아웃이 걸려 있다\n'
    + '  - 재시도 횟수와 간격이 설정값으로 빠져 있다 (배포 없이 바꾼다)',
    [
      'PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다',
      '모든 외부 호출에 타임아웃이 걸려 있다',
      '재시도 횟수와 간격이 설정값으로 빠져 있다',
    ]],
  ['item_road_m2', 'PL-M2', '환불 SLA 계측', '2026-05-29', ['src/refund', 'src/ledger'], ['PL-M1'],
    '### M2 — 환불 SLA 계측 (2026-05-29)\n\n'
    + '- 경로: `src/refund/`, `src/ledger/`\n'
    + '- 의존: M1\n'
    + '- 완료 기준:\n'
    + '  - 환불 건마다 접수·종결 시각이 남는다\n'
    + '  - 24시간을 넘긴 건이 대시보드에 뜬다\n'
    + '  - 넘긴 건이 자동으로 에스컬레이션된다',
    [
      '환불 건마다 접수·종결 시각이 남는다',
      '24시간을 넘긴 건이 대시보드에 뜬다',
      '넘긴 건이 자동으로 에스컬레이션된다',
    ]],
  ['item_road_m3', 'PL-M3', 'PII 마스킹과 감사 로그', '2026-06-30', ['src/common', 'src/webhook'], ['PL-M1'],
    '### M3 — PII 마스킹과 감사 로그 (2026-06-30)\n\n'
    + '- 경로: `src/common/`, `src/webhook/`\n'
    + '- 의존: M1\n'
    + '- 완료 기준:\n'
    + '  - 로그로 나가는 모든 객체가 마스킹 유틸을 거친다\n'
    + '  - 웹훅 원본 payload 가 로그에 남지 않는다\n'
    + '  - 누가 언제 환불을 승인했는지 감사 로그에 남는다',
    [
      '로그로 나가는 모든 객체가 마스킹 유틸을 거친다',
      '웹훅 원본 payload 가 로그에 남지 않는다',
      '누가 언제 환불을 승인했는지 감사 로그에 남는다',
    ]],
] as const satisfies readonly (readonly [
  id: string, milestoneId: string, title: string, due: string, paths: readonly string[],
  dependencies: readonly string[], quote: string, doneWhen: readonly string[],
])[]

/** `MILESTONES` 첫 줄의 `priority`. 아래로 1씩 내려간다. */
const MILESTONE_TOP_PRIORITY = 70

/**
 * 🔴 **goals.md §5 「아직 정하지 못한 것」의 네 불릿** — `open_question` 항목의 재료 표
 *    (FINDINGS 119 · SPEC §10.1 「open_question 4개」).
 *
 * ★ 왜 넣나 — 화면 5 의 항목 목록과 화면 4 의 「열린 질문」 배지가 이 타입을 그리는데,
 *   데모에 한 건도 없었다. §5 는 「여기 있는 것은 결정이 아니다」라고 스스로 말하는 절이라
 *   이 타입의 뜻 그대로다.
 * ⚠ **Pack 에는 안 나간다** — `compiler/src/partition.ts` 가 이 타입을 `exclude` 로 보낸다
 *   (「답이 없는 질문을 규칙처럼 배포하지 않는다」). 그래서 `pack-coverage` 의 ItemType 축은
 *   이걸로 안 움직인다 — 그 표의 주석이 그렇게 적어 두었다. 넣는 이유는 종이가 아니라 화면이다.
 * ⚠ `question` 은 그 불릿을 **물음으로 다시 적은 것**이다 — 원문은 「…못 정했다」다.
 *   진술이라 인용 칸이 아니다 (`QUOTED_DATA.open_question` 은 `[]`). 원문이 말하지 않는
 *   선택지를 물음에 끼워 넣지 마라 (P7).
 * ★ 질문을 하나 더하는 절차: **이 표에 한 줄.** `quote` 는 §5 의 불릿 첫 문장 그대로.
 */
export const OPEN_QUESTIONS = [
  ['item_oq_exhausted_payment', '재시도를 다 쓴 결제의 처리',
    '재시도를 다 쓰고도 실패한 결제를 **자동 취소할지, 수동 확인 큐에 넣을지** 못 정했다.',
    '재시도를 다 쓰고도 실패한 결제를 자동 취소하나, 수동 확인 큐에 넣나?'],
  ['item_oq_partial_refund_sla', '부분 환불의 SLA',
    '**부분 환불도 24시간 SLA 인지** 정하지 않았다.',
    '부분 환불도 24시간 SLA 인가?'],
  ['item_oq_webhook_redelivery', '웹훅 재전송을 받아 주는 기간',
    '웹훅 **재전송을 며칠까지 받아 줄지** 정하지 않았다.',
    '웹훅 재전송을 며칠까지 받아 주나? (멱등 테이블 보관 기간과 같이 정한다)'],
  ['item_oq_rounding_rule', '외화 정산의 반올림 규칙',
    '정산 화폐가 KRW 외로 늘어날 때 **반올림 규칙**을 정하지 않았다.',
    '정산 화폐가 KRW 외로 늘어날 때 반올림 규칙은 무엇인가?'],
] as const satisfies readonly (readonly [id: string, title: string, quote: string, question: string])[]

export function paylabDrafts(goals: FixtureDoc, retry: FixtureCode): PaylabDraft[] {
  return [
    fromDoc('item_mission_paylab', 'mission', goals,
      '가맹점이 우리를 쓰는 이유는\n하나다 — **PSP 가 흔들려도 결제가 흔들리지 않는 것.**', {
        title: 'PSP 가 흔들려도 결제는 흔들리지 않는다',
        body: '가맹점이 우리를 쓰는 이유는 하나다 — 밖이 실패해도 결제가 선다.',
        data: { statement: 'PSP 장애가 가맹점 결제로 번지지 않게 한다.', rationale: '가맹점이 우리를 쓰는 유일한 이유다.' },
      }),
    //  🔴 §2 목표 표 세 줄 — 재료는 `GOALS` 하나다 (위 주석).
    ...GOALS.map(([id, title, body, quote, outcome, metric, deadline], i) => fromDoc(id, 'goal', goals, quote, {
      title,
      body,
      priority: GOAL_TOP_PRIORITY - i,
      data: { outcome, metric, deadline },
    })),
    //  🔴 근거가 **둘**이다 — 문서(goals.md §3.1)와 **코드**(`src/payment/retry.ts`).
    //  ★ 왜 코드까지 다나 — SPEC §10.1 이 말하는 「의도된 어긋남」의 첫째가 바로 이것이다:
    //    문서는 「5회 · 지수 백오프」인데 코드는 「3회 · 500ms 고정」이다. 규칙만 종이에
    //    실으면 심사자는 **그 규칙이 지금 코드 어디에서 깨지고 있는지**를 못 따라간다.
    //    근거가 둘이면 태그가 `doc:…,repo:…` 로 나오고, 그게 이 제품의 말이다.
    //  ⚠ 코드 본문은 서버로 가지 않는다 (P1) — `withRepo` 가 싣는 것은 줄 번호뿐이다.
    withRepo(fromDoc('item_policy_retry', 'policy', goals,
      'PSP 호출이 실패하면 **최대 5회까지 재시도**한다. 재시도 간격은 **지수 백오프**로\n'
      + '1초 → 2초 → 4초 → 8초 → 16초로 늘리고, 각 간격에 ±20% 지터를 더한다.\n\n'
      + '**고정 간격 재시도는 금지한다.**', {
        title: 'PSP 재시도는 지수 백오프 5회',
        body: '고정 간격 재시도는 금지한다 — 모든 인스턴스가 같은 박자로 다시 때린다.',
        data: { rule: 'PSP 호출 실패는 지수 백오프로 최대 5회 재시도한다', severity: 'must', enforcement: 'review' },
      }), retry,
      'export const MAX_RETRY = 3;\n\n'
      + '/** 재시도 간격(ms). 고정이다 — 늘리지 않는다. */\n'
      + 'export const RETRY_DELAY_MS = 500;'),
    //  🔴 goals.md §3.3 — SPEC §10.1 이 말하는 「의도된 어긋남 3곳」의 셋째다
    //     (재시도 / 환불 SLA / **PII 로그 금지**). 앞의 둘만 항목이었고 이건 없었다.
    //  ★ **`enforcement: 'hook'` 인 이유** — 이 규칙은 사람 눈으로 못 지킨다.
    //    로그 호출은 저장소 전체에 흩어져 있어서 리뷰어가 매번 전부 볼 수 없다.
    //    자동으로 막을 수 있는 것은 hook 뿐이고, 그게 팀이 선언한 수단이다
    //    (M3 「PII 마스킹과 감사 로그」가 그걸 만드는 마일스톤이다).
    //    ⚠ 지금 픽스처 코드에 위반이 1곳 남아 있는 것과 모순이 아니다 — 강제 수단을
    //      선언한 것과 이미 있던 위반을 걷어낸 것은 다른 일이고, 그 차이가 M3 다.
    fromDoc('item_policy_pii_log', 'policy', goals,
      '다음은 **어떤 로그에도** 남기지 않는다. 애플리케이션 로그·접근 로그·에러 리포트·\n'
      + '웹훅 수신 덤프 전부 해당한다.', {
        title: '로그에 PII 를 남기지 않는다',
        body: '애플리케이션 로그·접근 로그·에러 리포트·웹훅 수신 덤프 전부 해당한다.',
        data: {
          rule: '카드번호·CVC·개인정보를 어떤 로그에도 남기지 않는다 — 결제 ID 와 이벤트 ID 만 남긴다',
          severity: 'must',
          enforcement: 'hook',
        },
      }),
    fromDoc('item_constraint_card', 'constraint', goals,
      '우리는 카드 정보를 저장하지 않는다. 토큰만 받는다.', {
        title: '카드 정보를 저장하지 않는다',
        body: '카드 원본이 우리 망에 들어오는 경로 자체를 없앤다 — 결제창은 PSP 가 띄운다.',
        data: { statement: '카드 원본 정보를 저장하지 않는다 — 토큰만 받는다.' },
      }),
    //  🔴 §3.1 의 뒷부분 — 「무엇을 재시도하나」. 앞 항목(`item_policy_retry`)이 「몇 번 · 어떤
    //     간격」이고 이건 「어떤 실패에만」이다. 한 항목에 합치면 규칙 문장이 둘이 되어
    //     리뷰어가 어느 쪽을 어겼는지 못 짚는다 (FINDINGS 119 — goals.md 에 있던 규칙인데
    //     항목이 아니었다).
    fromDoc('item_policy_retry_scope', 'policy', goals,
      '재시도 대상은 네트워크 오류와 5xx 뿐이다. 4xx 는 재시도하지 않는다.\n'
      + '멱등키(`Idempotency-Key`)가 없는 요청은 재시도하지 않는다.', {
        title: '재시도는 네트워크 오류와 5xx 에만',
        body: '멱등키가 없으면 서버가 같은 요청인지 못 알아본다 — 그 재시도는 곧 중복 결제다.',
        data: {
          rule: '네트워크 오류와 5xx 만 재시도한다 — 4xx 와 멱등키 없는 요청은 재시도하지 않는다',
          severity: 'must',
          enforcement: 'review',
        },
      }),
    //  🔴 §3.2 의 둘째 문단 — 「손대지 않은 건은 자동으로 에스컬레이션」. `item_policy_refund`
    //     (24시간 안에 종결)와 같은 도메인(refund)이라 같은 `domain-refund.md` 에 선다 —
    //     그 파일이 한 줄짜리였다 (FINDINGS 119).
    fromDoc('item_policy_refund_escalation', 'policy', goals,
      '24시간이 지나도록 담당자가 손대지 않은 건은 **자동으로 승인 대기 큐에서 빠져\n'
      + '에스컬레이션**된다. 기한 없이 `pending` 으로 쌓아 두는 것은 금지다', {
        title: '손대지 않은 환불은 자동으로 에스컬레이션된다',
        body: '고객이 돈을 언제 받는지 모르는 상태가 CS 비용의 절반이다.',
        scope: { kind: 'domain', value: 'refund' },
        data: {
          rule: '24시간 동안 손대지 않은 환불 건은 자동으로 에스컬레이션한다 — 기한 없는 pending 은 금지다',
          severity: 'must',
          enforcement: 'review',
        },
      }),
    //  🔴 §3.4 — 금액은 정수(원)로만. 픽스처 코드의 `src/common/money.ts` 가 이 규칙을 지키는
    //     자리이지만 코드 근거는 붙이지 않았다 — `withRepo` 의 뜻은 「이 규칙이 코드 어디서
    //     깨지고 있나」이고(위 `item_policy_retry`), 지켜지는 자리를 근거로 달면 그 뜻이 흐려진다.
    fromDoc('item_policy_integer_money', 'policy', goals,
      '`number` 부동소수 연산 금지. 원 단위 정수로만 더하고 뺀다.', {
        title: '금액은 원 단위 정수로만 다룬다',
        body: '화폐 단위가 늘어나면 그때 최소 단위를 다시 정한다.',
        data: {
          rule: '금액은 원 단위 정수로만 더하고 뺀다 — 부동소수 연산 금지',
          severity: 'must',
          enforcement: 'review',
        },
      }),
    //  🔴 §1 의 마지막 줄 — 「정산은 하루 1회 배치」. `item_constraint_card` 와 같은 문단에서
    //     온 둘째 제약이다 (FINDINGS 119).
    //  ⚠ `statement` 에 「실시간」이라는 낱말을 쓰지 않는다 (SPEC §6 · 화면·문서의 같은 규칙).
    //    원문은 그 낱말로 부정하지만, 종이에 서는 것은 진술이고 진술은 「하루 1회 배치」로 충분하다.
    fromDoc('item_constraint_settlement_batch', 'constraint', goals,
      '가맹점 정산은 하루 1회 배치이고 실시간이 아니다.', {
        title: '정산은 하루 1회 배치다',
        body: '원장(`ledger`)은 append only 라, 그날의 정산은 배치가 끝난 뒤에야 확정된다.',
        data: { statement: '가맹점 정산은 하루 1회 배치로만 한다 — 즉시 정산은 없다.' },
      }),
    //  🔴 §4 마일스톤 M1~M3 — 재료는 `MILESTONES` 하나다 (위 주석). `dependencies` 는 우리
    //     이름(`PL-M1`)이라 인용 칸이 아니고, 나머지 셋(`due`·`paths`·`done_when`)은 관통이
    //     범위 안에서 찾는다.
    ...MILESTONES.map(([id, milestoneId, title, due, paths, dependencies, quote, doneWhen], i) =>
      fromDoc(id, 'roadmap', goals, quote, {
        title,
        body: '',
        priority: MILESTONE_TOP_PRIORITY - i,
        data: { milestone_id: milestoneId, due, paths: [...paths], done_when: [...doneWhen], dependencies: [...dependencies] },
      })),
    //  🔴 **`scope.kind = 'path'` 은 이 항목 하나뿐이다** (FINDINGS 93). 없으면
    //     `.claude/rules/scoped-*.md` 라는 **Pack 파일 갈래가 통째로 데모에 안 선다** —
    //     「이 규칙은 이 경로에만 걸린다」가 종이에 한 번도 안 나온다는 뜻이다.
    //  ★ 경로 `src/webhook` 의 근거는 goals.md §7 아키텍처 그림이다 (「`webhook` 은 PSP
    //    콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다.」). 지어낸 경로가 아니다.
    //  ⚠ `enforcement` 는 `review` 다 — 서명 검증을 건너뛴 코드는 리뷰어가 diff 에서
    //    본다. 갈래를 늘리겠다고 hook 이라고 적으면 데모가 거짓말을 한다 (FINDINGS 89).
    fromDoc('item_policy_webhook_sig', 'policy', goals,
      '서명 검증 전에는 payload 를 파싱하지도 저장하지도 않는다. 검증 실패는 401 로 끊고,\n'
      + '재전송은 PSP 가 알아서 한다.', {
        title: '웹훅은 서명 검증 후에만 처리한다',
        body: '검증 실패는 401 로 끊는다 — 재전송은 PSP 가 알아서 한다.',
        scope: { kind: 'path', value: 'src/webhook' },
        data: {
          rule: '웹훅 payload 는 서명 검증 후에만 파싱·저장한다',
          severity: 'must',
          enforcement: 'review',
        },
      }),
    fromDoc('item_policy_refund', 'policy', goals,
      '환불 요청은 **접수 후 24시간 안에 종결**한다.', {
        title: '환불은 24시간 안에 종결한다',
        body: '승인률과 부딪히면 환불 속도가 우선이다.',
        scope: { kind: 'domain', value: 'refund' },
        data: { rule: '환불 접수→종결을 24시간 안에 끝낸다', severity: 'must', enforcement: 'review' },
      }),
    //  🔴 **아키텍처 한 장 = goals.md §7 의 다섯 줄** (FINDINGS 94). 이게 없으면
    //     CLAUDE.md 에 `## Quick Map` 절이 통째로 안 서고 `.claude/rules/architecture.md`
    //     라는 **Pack 파일 갈래 하나가 데모에 아예 없다.** 「이 코드가 어느 구성요소인가」가
    //     심사자가 읽는 종이에 한 줄도 없었다는 뜻이다.
    //  ★ 왜 다섯을 다 넣나 — §7 은 **한 장짜리 그림**이다. 그중 둘만 항목으로 만들면
    //    Quick Map 이 그림의 일부만 그리고, 심사자는 빠진 셋이 없는 건지 안 옮긴 건지 모른다.
    //  ⚠ 다섯 줄 전부 원문 그대로다 (P7). `responsibility` 는 그 줄이 말하는 것을 옮긴 것이고
    //    경로는 §7 그림의 대괄호 이름과 같다 — `item_road_m1`·`item_policy_webhook_sig` 가
    //    쓰는 경로(`src/payment`·`src/psp`·`src/webhook`)와 같은 낱말이라야 서로 이어진다.
    //  ⚠ 제목을 여기서 **만들지** 마라 — 표의 칸을 그대로 읽는다 (FINDINGS 99).
    //    `${component} — ${responsibility}` 로 만들던 때는 `### {title}` 과 `- 책임:` 이
    //    같은 문장을 두 번 적었다. 길이 자르기(`slice`)도 없앴다 — 120자를 넘기면
    //    스키마가 **던지는** 것이 맞다. 조용히 잘리면 종이에 잘린 문장이 남는다.
    ...ARCHITECTURE.map(([id, component, responsibility, quote, title], i) => fromDoc(id, 'architecture', goals, quote, {
      title,
      body: '',
      //  🔴 순서는 표의 줄 번호에서 온다 (FINDINGS 98) — 위 주석을 봐라.
      priority: ARCHITECTURE_TOP_PRIORITY - i,
      data: { component, responsibility, paths: [fixtureDir(retry.repo, `src/${component}`)] },
    })),
    //  🔴 **`domain` 타입은 이 항목 하나뿐이다** (FINDINGS 94).
    //  ⚠ **`scope.kind='domain'` 과 헷갈리지 마라.** `item_policy_refund` 가 만드는
    //    `domain-refund.md` 는 **scope** 축이 만든 파일이고, 이 항목이 만드는
    //    `domain-payment.md` 는 **ItemType** 축이 만든 파일이다. 두 축이 이름만 같다.
    //    (`partition.ts` 주석의 「`domain-payment` 와 `scoped-payment` 는 다른 문서다」)
    //  ★ 근거는 goals.md §6 용어 표 다섯 줄이다. `glossary` 의 `term`·`meaning` 은
    //    **그 표 안에 글자 그대로** 있고, 그래서 `QUOTED_DATA` 의 인용 칸이다.
    //  ⚠ `invariants` 는 인용이 아니라 **진술**이다 (FINDINGS 101 에서 바로잡았다).
    //    「원장은 append 만 한다 — 수정·삭제 없음」은 표의 `돈의 움직임을 한 줄씩
    //    append 하는 표. 수정·삭제 없음` 을 **불변식 문장으로 다시 적은 것**이다.
    //    뜻은 같지만 글자는 다르다 — 전에 이 주석이 「둘 다 글자 그대로」라고 말했다.
    //    그래도 **표가 말하지 않는 불변식을 지어내지 마라** — 그건 P7 이 못 받는다.
    fromDoc('item_domain_payment', 'domain', goals,
      '| PSP | 카드사에 붙는 결제 대행사. 우리는 두 곳에 붙는다 |\n'
      + '| 승인(authorize) | 카드 한도를 잡는 것. 돈이 움직이지는 않는다 |\n'
      + '| 매입(capture) | 잡아 둔 한도에서 실제로 돈을 가져오는 것 |\n'
      + '| 종결(closed) | 환불이 승인 또는 거절로 끝난 상태. 「검토 중」은 종결이 아니다 |\n'
      + '| 원장(ledger) | 돈의 움직임을 한 줄씩 append 하는 표. 수정·삭제 없음 |', {
        title: '결제 도메인 용어',
        body: '팀이 같은 낱말을 같은 뜻으로 쓴다 — 여기 없는 말은 아직 합의된 말이 아니다.',
        data: {
          name: 'payment',
          glossary: [
            { term: 'PSP', meaning: '카드사에 붙는 결제 대행사. 우리는 두 곳에 붙는다' },
            { term: '승인(authorize)', meaning: '카드 한도를 잡는 것. 돈이 움직이지는 않는다' },
            { term: '매입(capture)', meaning: '잡아 둔 한도에서 실제로 돈을 가져오는 것' },
            { term: '종결(closed)', meaning: '환불이 승인 또는 거절로 끝난 상태' },
            { term: '원장(ledger)', meaning: '돈의 움직임을 한 줄씩 append 하는 표' },
          ],
          invariants: [
            '원장은 append 만 한다 — 수정·삭제 없음',
            '「검토 중」은 종결이 아니다',
          ],
        },
      }),
    //  🔴 §5 미결 넷 — 재료는 `OPEN_QUESTIONS` 하나다 (위 주석). Pack 에는 안 나가고 화면에만 선다.
    ...OPEN_QUESTIONS.map(([id, title, quote, question]) => fromDoc(id, 'open_question', goals, quote, {
      title,
      body: '',
      //  ⚠ 미결이라 `confidence` 는 `low` 다 — 「결정이 아니다」를 값으로도 말한다.
      confidence: 'low',
      data: { question },
    })),
  ]
}

export type SeedResult = {
  /** owner 의 세션 JWT. 부르는 쪽이 그대로 `Authorization: Bearer` 로 쓴다. */
  owner: string
  teamId: string
  teamSlug: string
  projectId: string
  projectSlug: string
  /**
   * 올린 픽스처 문서 둘. **uuid 와 원문을 같이** 든다 —
   * 관통이 「Pack 태그의 `#start-end` 를 원문에서 잘라 보면 그 문장이 있나」를 잰다 (P7).
   */
  goals: FixtureDoc
  roadmap: FixtureDoc
  /** `batch-draft` 가 거부한 것들. 관통은 이게 비었는지를 잰다. */
  rejected: { index: number; issues: unknown[] }[]
  accepted: number
  /**
   * 보낸 초안의 수. **부르는 쪽은 개수를 자기가 적지 말고 이걸 읽어라** —
   * `paylabDrafts()` 에 한 줄을 더했을 때 검사가 저절로 따라오게 하려는 칸이다.
   */
  drafted: number
  /**
   * 🔴 **씨앗 질문에 답해서 만들어진 항목의 id 들** (`manual` 근거의 유일한 산지).
   *
   * ★ 왜 세는가 — `drafted` 는 `batch-draft` 로 들어간 것만 센다. 질문 답변으로 들어온
   *   항목까지 더해야 「씨앗이 만든 항목이 전부 active 가 됐나」를 잴 수 있다.
   */
  answered: string[]
  /**
   * 초안마다 「근거를 따라가면 원문의 이 문장이 나와야 한다」.
   * **부르는 쪽은 기대 문장을 자기가 적지 말고 이걸 읽어라** — 두 곳에 적으면 갈라지고,
   * 갈라지면 검사가 픽스처가 아니라 자기 자신을 재게 된다.
   * ⚠ 문서·코드에서 온 근거만 들어온다 — `manual` 근거는 따라갈 원문 파일이 없다
   *   (답변이 곧 원문이고, 그 원문은 충돌 행의 `resolution.note` 에 남는다).
   */
  evidence: EvidenceExpectation[]
  /** active 로 바꾼 항목의 uuid 들. */
  itemUuids: string[]
  /**
   * 항목 id → 타입. **DB 에서 읽는다** — 초안 목록과 질문 답변이 만든 것을 둘 다 덮는다.
   * ⚠ 부르는 쪽은 이 표를 손으로 들지 마라 (`pack-coverage.ts` 의 `PackView.typeOf`).
   */
  typeOf: Map<string, string>
}

/**
 * 🔴 **관통이 답하는 씨앗 질문 하나** (SPEC §10.5 「2:00 정리」 · FINDINGS 93).
 *
 * ★ 왜 필요한가 — 문서에서 온 항목만으로는 근거가 `doc:` 하나뿐이라 **`manual` 근거가
 *   데모 종이에 한 번도 안 선다.** 「문서가 없어도 답만 하면 항목이 된다」가 화면 3 의
 *   약속인데, 그 길이 도는지를 관통이 한 번도 안 밟고 있었다.
 * ⚠ **충돌 정리(`conflicts/{id}/resolve`)로는 이 갈래가 안 선다.** 거기가 붙이는
 *   `manual` 근거는 **진 항목**에 붙고, 진 항목은 `deprecated` 라 Pack 에서 빠진다
 *   (`ITEM_STATUS_EXCLUDE_REASON`). 종이에 서는 길은 질문 답변뿐이다.
 * ⚠ 질문은 **id 로 고른다** — 질문 문장을 여기 베끼면 표와 갈라진다.
 *   답변은 goals.md §3.2 가 말하는 타임아웃 규칙과 같은 말이다 (지어낸 문장이 아니다).
 */
const SEED_ANSWER = {
  questionId: 'policy_review',
  answer: '외부 호출마다 타임아웃을 건다 — 기본 5초, 환불 승인 호출만 10초다.',
} as const

/**
 * 씨앗이 앉을 팀·프로젝트의 이름과 주소.
 * ★ 왜 인자인가 — **게스트 데모 테넌트가 둘째 사용자**다 (`lib/demo/tenant.ts`).
 *   데이터는 같은 paylab 이고 사는 팀만 다르다. 씨앗을 한 벌 더 베끼면 그 순간
 *   「데모에서 본 것」과 「관통이 잰 것」이 갈린다 — 이 파일이 존재하는 이유가 그거다.
 * ⚠ 기본값이 지금까지의 값 그대로다. 관통·개발용 서버는 한 글자도 안 바뀐다.
 */
export type SeedTenant = {
  teamName: string
  teamSlug: string
  projectName: string
  projectSlug: string
}

const DEFAULT_TENANT: SeedTenant = {
  teamName: 'Paylab', teamSlug: 'paylab', projectName: 'paylab-api', projectSlug: 'paylab-api',
}

/**
 * **아직 안 끝난 수명** — 수명 표(`AI_JOB_STATUS_RULES`)의 `finished` 축을 읽는다.
 * 상태가 하나 늘어도 여기는 안 고친다 (그 표에 한 줄이면 따라온다).
 */
export const UNFINISHED_JOB_STATUSES = AI_JOB_STATUSES.filter((s) => !AI_JOB_STATUS_RULES[s].finished)

/**
 * 팀 → 프로젝트 → 레포 → 문서 2개 → `paylabDrafts()` 전부 → 전부 `active`.
 * **발행은 하지 않는다** — 발행이 무엇을 하는지가 관통이 재는 것이고,
 * 여기서 미리 해 버리면 그 단계가 씨앗에 묻힌다.
 */
export async function seedPaylab(ownerSub: string, tenant: SeedTenant = DEFAULT_TENANT): Promise<SeedResult> {
  const owner = seedSession(ownerSub)

  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: tenant.teamName, slug: tenant.teamSlug } }), params({}),
  ))
  const teamId = team.id as string

  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${teamId}/projects`, {
      auth: owner, body: { name: tenant.projectName, slug: tenant.projectSlug },
    }),
    params({ id: teamId }),
  ))
  const projectId = project.id as string

  //  ⚠ 레포 이름은 테넌트와 무관하다 — 근거 태그에 그대로 실리는 **픽스처 저장소의 이름**이라
  //    팀에 따라 바뀌면 태그가 없는 레포를 가리킨다 (P7).
  await createRepo(
    req('POST', `/api/v1/projects/${projectId}/repos`, { auth: owner, body: { name: 'paylab-api' } }),
    params({ id: projectId }),
  )

  //  ⚠ 올린 본문을 그대로 들고 있는다 — 근거 범위를 **이 글자들 위에서** 잰다.
  //    문서를 다시 읽어 재면 올린 것과 다른 글자를 잴 위험이 생긴다.
  const goalsText = fixtureText('paylab-docs/goals.md')
  const roadmapText = fixtureText('paylab-docs/old-roadmap.md')

  const goalsDoc = await dataOf(await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
    auth: owner, body: { title: '팀 목표와 규칙', kind: 'goal', content: goalsText },
  }), params({ id: projectId })))
  const roadmapDoc = await dataOf(await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
    auth: owner, body: { title: '지난 분기 로드맵', kind: 'roadmap', content: roadmapText },
  }), params({ id: projectId })))

  const goals: FixtureDoc = {
    file: 'paylab-docs/goals.md', versionId: goalsDoc.current_version_id as string, text: goalsText,
  }
  const roadmap: FixtureDoc = {
    file: 'paylab-docs/old-roadmap.md', versionId: roadmapDoc.current_version_id as string, text: roadmapText,
  }

  //  ⚠ repo 이름은 위 `createRepo` 에 준 것과 **같아야** 한다 — 태그에 그대로 실린다.
  const drafts = paylabDrafts(goals, fixtureCode('paylab-api', 'src/payment/retry.ts'))
  const batch = await dataOf(await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
    auth: owner,
    body: { items: drafts.map((d) => d.draft), repo: 'paylab-api', scan_summary: { file_count: 42, languages: ['ts'] } },
  }), params({ id: projectId })))

  //  🔴 **씨앗 질문 하나에 답한다** — 「문서가 없어도 답만 하면 항목이 된다」(화면 3 ③)가
  //     실제로 도는 유일한 자리이고, `manual` 근거가 종이에 서는 유일한 길이다.
  //     ⚠ 여기서 만들어진 항목도 아래 활성화 고리가 같이 집어 간다 (그래서 먼저 부른다).
  const answered = await answerSeedQuestion(projectId, owner)

  //  ⚠ 초안은 `draft` 로 들어온다. `active` 가 아니면 snapshot 에 안 들어가서
  //    **Pack 에 한 줄도 안 나온다** (SPEC §4.1 · docs/STATUS.md 의 같은 판단).
  const itemRows = await getDb()
    //  ⚠ `type` 도 같이 읽는다 — 「데모가 ItemType 몇 갈래를 보여 주나」를 세는 쪽이
    //    id 로 타입을 되찾아야 하는데, 그 표를 손으로 들면 픽스처가 늘 때 갈라진다.
    .select({ id: contextItems.id, publicId: contextItems.publicId, type: contextItems.type })
    .from(contextItems)
    .where(eq(contextItems.projectId, projectId))
  for (const row of itemRows) {
    await updateItem(req('PATCH', `/api/v1/projects/${projectId}/context-items/${row.publicId}`, {
      auth: owner, body: { revision: 1, changes: { status: 'active' } },
    }), params({ id: projectId, itemId: row.publicId }))
  }

  //  🔴 **씨앗은 「끝난 상태」만 남긴다** (FINDINGS 137). 위 라우트 셋(`POST /documents` 둘 ·
  //     `batch-draft` 하나)은 제품이 하는 그대로 job 행을 만들고 굴린다. 그런데 이 씨앗은
  //     그 job 이 낼 것을 **이미 손으로 심어 놓았고**(항목·근거는 `paylabDrafts()` 가 정본),
  //     키가 없는 개발용·데모 서버에서는 그 러너가 아무것도 못 한다. 그래서 화면 3 에
  //     `차례 기다리는 중 · ⚠ 멈춘 것 같음` 카드가 남고, 시간이 갈수록 「AI 가 안 돈다」로
  //     읽힌다 — 게스트가 **처음 보는 화면**이 그것이다.
  //  ⚠ **끝난 행은 안 지운다** — 키가 있는 자리에서 진짜로 끝난 job 은 결과 카드로 보여야
  //     한다. 「끝났나」는 손으로 세지 않고 수명 표의 `finished` 축을 읽는다.
  //  ⚠ 「멈춘 것 같음」 chip 자체는 그대로다 (FINDINGS 137 의 판단) — 진짜로 멈춘 것을
  //     숨기지 마라. 여기서 없애는 것은 **씨앗이 만든 가짜 대기**뿐이다.
  await getDb()
    .delete(aiJobs)
    .where(and(eq(aiJobs.projectId, projectId), inArray(aiJobs.status, UNFINISHED_JOB_STATUSES)))

  return {
    owner,
    teamId,
    teamSlug: tenant.teamSlug,
    projectId,
    projectSlug: tenant.projectSlug,
    goals,
    roadmap,
    rejected: batch.rejected as { index: number; issues: unknown[] }[],
    accepted: (batch.accepted as unknown[]).length,
    drafted: drafts.length,
    answered,
    evidence: drafts.flatMap((d) => d.evidence),
    itemUuids: itemRows.map((r) => r.id),
    typeOf: new Map(itemRows.map((r) => [r.publicId, r.type])),
  }
}

/**
 * 씨앗 질문 하나를 찾아 답하고, 그 답이 만든 항목 id 를 낸다.
 *
 * ⚠ 열린 질문 목록을 **서버에서 받아** 문장으로 짝짓는다 — 행과 표를 잇는 열쇠가
 *   질문 문장이기 때문이다 (`seed-questions.ts` 의 주의). 우리가 문장을 베끼지 않고
 *   `SEED_QUESTIONS` 에서 꺼내므로, 표를 고치면 여기가 **못 찾아서 던진다.**
 */
async function answerSeedQuestion(projectId: string, owner: string): Promise<string[]> {
  const seed = SEED_QUESTIONS.find((q) => q.id === SEED_ANSWER.questionId)
  if (!seed) throw new Error(`[seed] 씨앗 질문 표에 ${SEED_ANSWER.questionId} 가 없다`)

  const list = await dataOf(await listQuestions(
    req('GET', `/api/v1/projects/${projectId}/questions`, { auth: owner }), params({ id: projectId }),
  ))
  const row = (list.questions as { id: string; question: string }[]).find((q) => q.question === seed.question)
  if (!row) throw new Error(`[seed] 프로젝트에 열린 씨앗 질문이 없다 — "${seed.question}"`)

  const done = await dataOf(await answerQuestions(req('POST', `/api/v1/projects/${projectId}/questions`, {
    auth: owner, body: { answers: [{ question_id: row.id, answer: SEED_ANSWER.answer }] },
  }), params({ id: projectId })))
  return done.created_item_ids as string[]
}
