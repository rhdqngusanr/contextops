import { existsSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { Proposal } from '@contextops/schema'

import { runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { fakeCli, failEnvelope, okEnvelope } from './helpers/cli'
import { connect, repoPath, world, writeJson } from './helpers/world'

// =====================================================================
//  `propose` — **제안을 짓지 않는다** (docs/SPEC.md §8.3 · §8.4)
//
//  ★ 무엇을 잠그나:
//    ① `base_version_id` 는 **서버가 말한 공식 버전**이다 — 초안 파일에는 그 칸이 없다
//       (모델이 uuid 를 지어내면 남의 버전을 기준 삼은 제안이 승인 화면에 뜬다)
//    ② `client_request_id` 는 기계값이다 — 재시도해도 제안이 하나다
//    ③ `--from-pending` 은 **보낸 뒤에만** 힌트를 치운다
// =====================================================================

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

const OFFICIAL = '22222222-3333-4444-8555-666666666666'

const DRAFT = {
  title: '환불 창을 7일로 좁힌다',
  summary: '고객센터 부담이 줄고 회계 마감이 맞는다.',
  items: [{
    operation: 'update',
    target_item_id: 'item_refund_window',
    evidence: [{ kind: 'repository_path', repo: 'paylab', path: 'src/refund.ts', start_line: 10 }],
    reason: '코드가 이미 7일로 막고 있다',
  }],
  relates_to: ['M1'],
}

/** `GET /versions?limit=1` 의 답. 공식 버전 id 가 여기 있다. */
const versions = (official: string | null): ReturnType<typeof okEnvelope> =>
  okEnvelope({ versions: [], official_version_id: official, limit: 1, offset: 0 })

function seed(repo: string, home: string, draft: unknown = DRAFT): void {
  connect(repo, home)
  writeJson(repoPath(repo, 'proposalDraft'), draft)
}

describe('contextops propose', () => {
  it('공식 버전을 물어보고 그것을 기준으로 올린다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [versions(OFFICIAL), okEnvelope({ id: 'p1' })] })

    expect(await runCommand(cli, ['propose'])).toBe(EXIT.OK)
    expect(cli.requests[0]).toContain('/versions?limit=1')
    expect(cli.requests[1]).toContain('/proposals')

    const body = Proposal.parse(JSON.parse(cli.sent[1]?.body ?? '{}'))
    //  🔴 기준 버전은 **서버가 말한 것**이지 초안이 말한 것이 아니다.
    expect(body.base_version_id).toBe(OFFICIAL)
    expect(body.client_request_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.title).toBe(DRAFT.title)
  })

  it('🔴 초안에 base_version_id 를 적어 두면 계약 위반이다 — 지어낸 기준을 막는다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home, { ...DRAFT, base_version_id: '00000000-0000-4000-8000-000000000000' })
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['propose'])).toBe(EXIT.INVALID)
    expect(cli.requests).toHaveLength(0)
  })

  it('아직 공식 버전이 없으면 무엇이 먼저인지 말한다 — null 을 지어내지 않는다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [versions(null)] })

    expect(await runCommand(cli, ['propose'])).toBe(EXIT.CONFIG)
    expect(cli.err.join('\n')).toContain('첫 버전을 발행')
    //  제안 요청은 **아예 나가지 않았다.**
    expect(cli.requests).toHaveLength(1)
  })

  it('add 인데 draft 가 없으면 보내기 전에 막는다 (계약의 refine)', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home, {
      ...DRAFT,
      items: [{ operation: 'add', evidence: DRAFT.items[0]?.evidence, reason: '새 규칙' }],
    })
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['propose'])).toBe(EXIT.INVALID)
    expect(cli.requests).toHaveLength(0)
  })

  it('--dry-run 은 서버를 하나도 안 부른다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['propose', '--dry-run'])).toBe(EXIT.OK)
    expect(cli.requests).toHaveLength(0)
    expect(cli.out.join('\n')).toContain(DRAFT.title)
  })

  it('--from-pending 은 보낸 뒤에 힌트를 치운다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    writeJson(repoPath(repo, 'pendingProposal'), { changed_paths: ['migrations/001.sql'], hint: '마이그레이션이 바뀌었다' })
    const cli = fakeCli({ cwd: repo, home, responses: [versions(OFFICIAL), okEnvelope({ id: 'p1' })] })

    expect(await runCommand(cli, ['propose', '--from-pending'])).toBe(EXIT.OK)
    expect(existsSync(repoPath(repo, 'pendingProposal'))).toBe(false)
  })

  it('보내지 못하면 힌트를 남겨 둔다 — 치우면 다음 세션이 잊는다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    writeJson(repoPath(repo, 'pendingProposal'), { changed_paths: ['migrations/001.sql'], hint: '마이그레이션' })
    const cli = fakeCli({ cwd: repo, home, responses: [versions(OFFICIAL), { throws: 'ECONNREFUSED' }] })

    expect(await runCommand(cli, ['propose', '--from-pending'])).toBe(EXIT.NETWORK)
    expect(existsSync(repoPath(repo, 'pendingProposal'))).toBe(true)
  })

  it('초안이 없으면 Skill 을 안내한다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['propose'])).toBe(EXIT.CONFIG)
    expect(cli.err.join('\n')).toContain('/contextops:propose')
  })

  it('서버가 기준 버전을 거절하면 2 다 — 다시 보내도 같은 답이다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({
      cwd: repo, home,
      responses: [versions(OFFICIAL), failEnvelope(400, 'VALIDATION_FAILED', '이 프로젝트의 버전이 아니다')],
    })

    expect(await runCommand(cli, ['propose'])).toBe(EXIT.INVALID)
  })
})
