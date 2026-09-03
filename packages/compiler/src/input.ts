import { z } from 'zod'
import { ContextItem } from '@contextops/schema'
import { TEMPLATE_VERSION } from '../templates'
import { CompileError, type CompileIssue } from './errors'

// =====================================================================
//  컴파일러의 입력 계약 — 정본은 docs/SPEC.md §4 의 `compile(input)` 서명.
//
//  ★ 왜 `packages/schema` 가 아니라 여기인가 — 이건 **서버가 받는 payload 가 아니다.**
//    DB 에서 읽은 것을 컴파일러에 넘기는 내부 경계이고, 소비자가 컴파일러 하나뿐이다.
//    사용자가 하나뿐인 추상은 만들지 않는다 (CLAUDE.md). 둘째 소비자가 생기면
//    그때 `packages/schema` 로 올린다.
//  ⚠ 그래도 **파싱은 한다.** 「DB 에서 왔으니 믿는다」로 두면 형식이 갈렸을 때
//    Pack 이 조용히 이상해진다 — 컴파일은 실패해야지 이상해지면 안 된다.
// =====================================================================

const SnapshotShape = z.object({
  team_id: z.uuid(),
  project_id: z.uuid(),
  /** semver (`1.3.0`). 화면·Pack 머리말이 앞에 `v` 를 붙인다 (SPEC §6). */
  context_version: z.string().min(1).max(40),
  /**
   * 발행 시각. **컴파일러가 만들지 않고 받는다** — 컴파일러가 현재 시각을 읽는 순간
   * 같은 snapshot 이 매번 다른 Manifest 를 내고 P4 가 거짓이 된다.
   */
  generated_at: z.iso.datetime(),
  items: z.array(z.unknown()).max(500),
}).strict()

const CompileInputShape = z.object({
  snapshot: SnapshotShape,
  project: z.object({ name: z.string().min(1).max(120) }).strict(),
  templateVersion: z.literal(TEMPLATE_VERSION),
  compilerVersion: z.string().min(1).max(40),
}).strict()

export type Snapshot = Omit<z.infer<typeof SnapshotShape>, 'items'> & { items: ContextItem[] }

export type CompileInput = Omit<z.infer<typeof CompileInputShape>, 'snapshot'> & { snapshot: Snapshot }

function toIssues(error: z.ZodError): CompileIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}

function idOf(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const id = (raw as { id?: unknown }).id
  return typeof id === 'string' ? id : undefined
}

/**
 * 1단계 — 모든 항목을 `ContextItem` 으로 **재검증**한다 (SPEC §4.1 1단계).
 * 실패하면 어느 항목이 왜 막았는지를 실어 던진다. 발행 트랜잭션이 그걸 그대로 보여 준다.
 */
export function parseCompileInput(input: unknown): CompileInput {
  const shape = CompileInputShape.safeParse(input)
  if (!shape.success) {
    throw new CompileError('INVALID_INPUT', '컴파일 입력이 계약과 다르다', { issues: toIssues(shape.error) })
  }

  const items: ContextItem[] = []
  const seen = new Set<string>()
  for (const raw of shape.data.snapshot.items) {
    const parsed = ContextItem.safeParse(raw)
    if (!parsed.success) {
      throw new CompileError('INVALID_ITEM', '항목이 계약(ContextItem)과 다르다', {
        item_id: idOf(raw),
        issues: toIssues(parsed.error),
      })
    }
    const item = parsed.data as ContextItem
    // ⚠ ID 가 겹치면 역추적이 두 항목을 가리킨다 — P7 이 뚫리는 자리라 여기서 막는다.
    if (seen.has(item.id)) {
      throw new CompileError('INVALID_ITEM', `항목 ID 가 중복이다: ${item.id}`, { item_id: item.id })
    }
    seen.add(item.id)
    items.push(item)
  }

  return { ...shape.data, snapshot: { ...shape.data.snapshot, items } }
}
