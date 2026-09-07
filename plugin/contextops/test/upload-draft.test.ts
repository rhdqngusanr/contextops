import { afterEach, describe, expect, it } from 'vitest'
import { ContextItemsBatchDraftEnvelope, ContextItemsBatchDraftResult } from '@contextops/schema'

import { runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { fakeCli, failEnvelope, okEnvelope, tempDir } from './helpers/cli'
import { PROJECT } from './helpers/pack'
import { ORIGIN, connect, repoPath, world, writeJson } from './helpers/world'

// =====================================================================
//  `upload-draft` — 🔴 **P1 이 걸린 명령이다** (docs/SPEC.md §8.3 · §3.1)
//
//  ★ 무엇을 잠그나 — 셋이다:
//    ① 나가는 body 에 **코드 본문이 없다** (계약이 그 자리를 안 준다)
//    ② `scan_summary`·`repo` 는 **초안 파일이 아니라 scan.json 에서** 온다 —
//       모델이 스캔 결과를 지어낼 수 없다는 주장이 여기서 잠긴다
//    ③ `--dry-run` 은 **요청을 하나도 안 보낸다** (init Skill 5단계의 확인이 진짜이게)
// =====================================================================

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

/** 스캔이 잰 값. **초안에는 이 값이 없다** — 그게 이 시험의 요점이다. */
const SCAN = {
  repo: 'paylab',
  files: [{ path: 'src/main.ts', language: 'TypeScript' }],
  summary: {
    file_count: 42,
    languages: ['TypeScript'],
    entrypoints: ['src/main.ts'],
    infra_files: [],
    env_keys: ['API_KEY'],
    dependencies: ['zod'],
    excluded: ['node_modules/'],
  },
}

const ITEM = {
  id: 'item_refund_window',
  type: 'policy',
  title: '환불은 7일 안에만 된다',
  body: '결제일로부터 7일 이내에만 환불 요청을 받는다.',
  scope: { kind: 'project' },
  source_refs: [{ kind: 'repository_path', repo: 'paylab', path: 'src/refund.ts', start_line: 10 }],
  data: { rule: '결제일 +7일 이후 환불 불가', severity: 'must', enforcement: 'review' },
}

const DRAFT = { items: [ITEM] }

function seed(repo: string, home: string, options: { scan?: unknown; draft?: unknown } = {}): void {
  connect(repo, home)
  if (options.scan !== null) writeJson(repoPath(repo, 'scan'), options.scan ?? SCAN)
  writeJson(repoPath(repo, 'draft'), options.draft ?? DRAFT)
}

/**
 * 🔴 **서버가 실제로 내는 모양이어야 한다** (FINDINGS 44).
 *
 * ★ 왜 계약으로 파싱해 두나 — 예전 픽스처는 `{accepted, rejected}` 뿐이었고 서버는
 *   `job` 을 하나 더 실어 보냈다. 계약이 `.strict()` 라 진짜 응답은 `unrecognized_keys`
 *   로 죽는데, **픽스처가 서버가 안 내는 모양이라 시험만 초록**이었다 —
 *   `upload-draft` 는 성공한 업로드를 「서버 응답이 계약과 맞지 않는다」로 보고했다.
 *   여기서 한 번 파싱하면 계약이 바뀌는 순간 **픽스처가 먼저 빨개진다.**
 */
const ACCEPTED = ContextItemsBatchDraftResult.parse({
  accepted: [{ index: 0, id: ITEM.id }], rejected: [], job_id: 'job-1',
})

describe('contextops upload-draft', () => {
  it('초안과 스캔을 합쳐 batch-draft 로 보낸다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(ACCEPTED)] })

    expect(await runCommand(cli, ['upload-draft'])).toBe(EXIT.OK)
    expect(cli.requests[0]).toContain('/context-items/batch-draft')

    const body = JSON.parse(cli.sent[0]?.body ?? '{}') as Record<string, unknown>
    //  🔴 서버가 실제로 받는 계약으로 판다 — 여기서 통과해야 400 이 안 난다.
    expect(ContextItemsBatchDraftEnvelope.safeParse(body).success).toBe(true)
    expect(body['repo']).toBe('paylab')
    expect(body['scan_summary']).toEqual(SCAN.summary)
  })

  it('찍은 출력에 `/p/` 주소가 없다 — 설정에는 uuid 뿐이고 웹 주소는 slug 다 (FINDINGS 115)', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(ACCEPTED)] })

    expect(await runCommand(cli, ['upload-draft'])).toBe(EXIT.OK)
    const out = cli.out.join('\n')
    //  🔴 uuid 로 지은 주소는 그럴듯하게 찍히고 누르면 404 다.
    expect(out).not.toContain('/p/')
    expect(out).not.toContain(PROJECT)
    //  대신 origin(설정의 진짜 값)과 웹의 탭 이름으로 찾게 한다.
    expect(out).toContain(ORIGIN)
    expect(out).toContain('「Context」')
  })

  it('🔴 P1 — 나가는 payload 에 파일 본문이 하나도 없다', async () => {
    const { repo, home } = world(dirs)
    //  스캔이 「본 것」과 초안이 「말하는 것」을 다 넣어도 본문은 실릴 자리가 없다.
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(ACCEPTED)] })

    await runCommand(cli, ['upload-draft'])
    const sent = cli.sent[0]?.body ?? ''

    //  ① 초안에 없던 칸은 안 나간다 (files 목록은 로컬 전용이다)
    expect(sent).not.toContain('src/main.ts\n')
    expect(JSON.parse(sent)).not.toHaveProperty('files')
    //  ② env 는 **키 이름**만 (값은 스캔 산출물에도 없다)
    expect(sent).toContain('API_KEY')
    //  ③ 계약에 없는 키를 초안에 끼워 넣어도 나가지 못한다 — 아래 시험이 그걸 잰다
  })

  it('🔴 계약에 없는 키가 초안에 있으면 보내기 전에 막는다 (P1 allowlist)', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home, { draft: { items: [{ ...ITEM, file_body: 'export const x = 1' }] } })
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['upload-draft'])).toBe(EXIT.INVALID)
    //  요청이 **아예 나가지 않는다.** 서버의 400 에 기대지 않는다.
    expect(cli.requests).toHaveLength(0)
    expect(cli.err.join('\n')).toContain('계약과 맞지 않는다')
  })

  it('--dry-run 은 요청을 하나도 안 보내고 보낼 것을 보여 준다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['upload-draft', '--dry-run'])).toBe(EXIT.OK)
    expect(cli.requests).toHaveLength(0)
    expect(cli.out.join('\n')).toContain('코드 본문 0건')
    expect(cli.out.join('\n')).toContain(ITEM.id)
  })

  it('스캔이 없으면 scan 을 먼저 하라고 말한다 — 지어내지 않는다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    writeJson(repoPath(repo, 'draft'), DRAFT)
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['upload-draft'])).toBe(EXIT.CONFIG)
    expect(cli.err.join('\n')).toContain('contextops scan')
    expect(cli.requests).toHaveLength(0)
  })

  it('전부 거절당하면 성공이 아니다 — Skill 이 고쳐서 다시 보내야 한다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({
      cwd: repo, home,
      responses: [okEnvelope(ContextItemsBatchDraftResult.parse({ accepted: [], rejected: [{ index: 0, issues: [{ path: 'id', message: '이미 있는 항목 id 다' }] }], job_id: null }))],
    })

    expect(await runCommand(cli, ['upload-draft'])).toBe(EXIT.INVALID)
    expect(cli.err.join('\n')).toContain('이미 있는 항목 id 다')
  })

  it('토큰이 죽었으면 setup 을 안내하고 30 이다 — 재시도해도 안 되는 종류다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [failEnvelope(401, 'UNAUTHORIZED')] })

    expect(await runCommand(cli, ['upload-draft'])).toBe(EXIT.CONFIG)
    expect(cli.err.join('\n')).toContain('setup')
  })

  it('서버에 못 닿으면 20 이다 — 이건 재시도할 만한 종류다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [{ throws: 'ECONNREFUSED' }] })

    expect(await runCommand(cli, ['upload-draft'])).toBe(EXIT.NETWORK)
  })

  it('연결 안 된 저장소는 setup 을 안내한다', async () => {
    const { repo, home } = world(dirs)
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['upload-draft'])).toBe(EXIT.CONFIG)
    expect(cli.err.join('\n')).toContain('setup')
  })

  it('경로로 준 초안도 받는다 — Skill 이 임시 파일을 쓸 수 있어야 한다', async () => {
    const { repo, home } = world(dirs)
    seed(repo, home)
    const other = tempDir('contextops-draft-')
    dirs.push(other)
    writeJson(`${other.path}/mine.json`, DRAFT)
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(ACCEPTED)] })

    expect(await runCommand(cli, ['upload-draft', `${other.path}/mine.json`])).toBe(EXIT.OK)
  })
})
