import { existsSync, readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { PROGRESS_STATUSES, ProgressEvent, ProgressMarkerFile } from '@contextops/schema'
import { PROGRESS_REPORT } from '@contextops/compiler'

import { runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { progressMarkerFile } from '../src/cli/paths'
import { PROGRESS_FLAGS } from '../src/cli/progress'
import { fakeCli, failEnvelope, okEnvelope } from './helpers/cli'
import { writeLocalManifest } from './helpers/pack'
import { connect, world } from './helpers/world'

// =====================================================================
//  `progress` — 부르는 것은 사람이 아니라 **agent** 다 (docs/SPEC.md §8.3 · §4.3)
//
//  🔴 이 시험의 첫 줄은 「Pack 이 가르치는 명령이 실제로 도는가」다. 고정 문단
//     (`PROGRESS_REPORT`)이 정본이고, 거기 적힌 플래그가 CLI 에 없으면 **팀 전체의
//     진행 보고가 조용히 멈춘다** — 아무도 실패를 못 본다 (훅도 사람도 안 본다).
//
//  🔴 P1 — 나가는 근거는 경로와 줄 번호뿐이다. 그 줄의 내용은 담을 자리가 없다.
// =====================================================================

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

const PACK = { 'CLAUDE.md': '# 팀 규칙\n<!-- ctx:item_abc:1 -->\n' }

/** 보고가 도착한 것처럼. 서버는 202 로 답한다 (SPEC §5). */
const accepted = (): ReturnType<typeof okEnvelope> => okEnvelope({ id: 'e1', status: 'in_progress' })

describe('contextops progress', () => {
  it('마일스톤·근거·요약을 계약대로 보낸다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    const cli = fakeCli({ cwd: repo, home, responses: [accepted()] })

    const code = await runCommand(cli, [
      'progress', '--milestone', 'M1', '--criterion', '환불 정책이 Pack 에 들어간다',
      '--evidence', 'src/refund.ts:10-42', '--evidence', 'docs/policy.md',
      '--summary', '환불 창을 7일로 좁혔다',
    ])

    expect(code).toBe(EXIT.OK)
    expect(cli.requests[0]).toContain('/progress')
    const body = ProgressEvent.parse(JSON.parse(cli.sent[0]?.body ?? '{}'))
    expect(body.milestone_id).toBe('M1')
    //  `--criterion` 을 줬으면 「기준 하나를 마쳤다」다 — 표가 그렇게 정한다.
    expect(body.status).toBe('criterion_done')
    expect(body.evidence).toEqual([
      { path: 'src/refund.ts', start_line: 10, end_line: 42 },
      { path: 'docs/policy.md' },
    ])
    //  적용된 Pack 의 버전을 실어 보낸다 — 어느 규칙 기준의 보고인지 화면이 안다.
    expect(body.context_version).toBe('1.0.0')
    expect(body.source).toBe('agent')
  })

  it('🔴 근거를 여러 번 줘도 하나도 사라지지 않는다 (P7)', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [accepted()] })

    await runCommand(cli, [
      'progress', '--milestone', 'none', '--summary', '보고',
      '--evidence', 'a.ts', '--evidence', 'b.ts', '--evidence', 'c.ts',
    ])

    expect(ProgressEvent.parse(JSON.parse(cli.sent[0]?.body ?? '{}')).evidence).toHaveLength(3)
  })

  it('🔴 P1 — 근거에 파일 내용이 실릴 자리가 없다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [accepted()] })

    await runCommand(cli, ['progress', '--milestone', 'none', '--summary', '보고', '--evidence', 'src/a.ts:3'])
    const evidence = ProgressEvent.parse(JSON.parse(cli.sent[0]?.body ?? '{}')).evidence[0]

    expect(Object.keys(evidence ?? {}).sort()).toEqual(['path', 'start_line'])
  })

  it('--milestone none 은 status 도 none 이다 — 「해당 없음」이 지어낸 진행이 되지 않게', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [accepted()] })

    await runCommand(cli, ['progress', '--milestone', 'none', '--summary', '리팩터링만 했다'])

    expect(ProgressEvent.parse(JSON.parse(cli.sent[0]?.body ?? '{}')).status).toBe('none')
  })

  it('criterion 이 없으면 in_progress 다 — done_candidate 는 기본이 될 수 없다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [accepted()] })

    await runCommand(cli, ['progress', '--milestone', 'M2', '--summary', '작업 중'])

    expect(ProgressEvent.parse(JSON.parse(cli.sent[0]?.body ?? '{}')).status).toBe('in_progress')
  })

  it('아직 sync 안 한 저장소는 context_version 을 지어내지 않는다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [accepted()] })

    await runCommand(cli, ['progress', '--milestone', 'none', '--summary', '보고'])

    expect(ProgressEvent.parse(JSON.parse(cli.sent[0]?.body ?? '{}')).context_version).toBe('unknown')
  })

  it('필수 인자가 없으면 64 이고 요청이 안 나간다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['progress', '--summary', '마일스톤을 안 줬다'])).toBe(EXIT.USAGE)
    expect(cli.requests).toHaveLength(0)
  })

  it('마일스톤 id 가 계약과 다르면 보내기 전에 막는다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['progress', '--milestone', '마일스톤1', '--summary', '보고'])).toBe(EXIT.INVALID)
    expect(cli.requests).toHaveLength(0)
  })

  it('세션 id 를 주면 「이번 세션은 보고했다」 표시를 남긴다 — Stop 훅이 겹쳐 보고하지 않게', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [accepted()] })

    await runCommand(cli, ['progress', '--milestone', 'M1', '--summary', '보고', '--session', 'sess-42'])

    const marker = progressMarkerFile(repo, 'sess-42')
    expect(existsSync(marker)).toBe(true)
    expect(ProgressMarkerFile.parse(JSON.parse(readFileSync(marker, 'utf8'))).session_id).toBe('sess-42')
  })

  it('세션 id 를 모르면 표시를 남기지 않는다 — 남의 세션 표시를 읽게 하지 않는다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [accepted()] })

    await runCommand(cli, ['progress', '--milestone', 'M1', '--summary', '보고'])

    expect(existsSync(progressMarkerFile(repo, 'unknown'))).toBe(false)
  })

  it('보내지 못하면 표시도 안 남긴다 — 안 간 보고를 「갔다」고 기억하면 영원히 안 간다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [{ throws: 'ECONNREFUSED' }] })

    expect(await runCommand(cli, ['progress', '--milestone', 'M1', '--summary', '보고', '--session', 's1']))
      .toBe(EXIT.NETWORK)
    expect(existsSync(progressMarkerFile(repo, 's1'))).toBe(false)
  })

  it('서버가 계약 위반이라고 하면 2 다 — 재시도가 아니라 수정할 일이다', async () => {
    const { repo, home } = world(dirs)
    connect(repo, home)
    const cli = fakeCli({ cwd: repo, home, responses: [failEnvelope(400, 'VALIDATION_FAILED', '이미 쓰인 client_event_id 다')] })

    expect(await runCommand(cli, ['progress', '--milestone', 'M1', '--summary', '보고'])).toBe(EXIT.INVALID)
  })
})

describe('🔴 Pack 이 가르치는 명령과 CLI 가 같다 (SPEC §4.3)', () => {
  //  ★ 왜 이 시험인가 — 이 문단은 **Claude 가 그대로 친다.** 여기서 갈리면
  //    진행 보고가 조용히 멈추고, 실패를 보는 사람이 아무도 없다.
  const text = PROGRESS_REPORT.join('\n')

  it.each(['--milestone', '--criterion', '--evidence', '--summary'])(
    '고정 문단이 가르치는 %s 를 progress 가 받는다',
    (flag) => {
      expect(text).toContain(flag)
      //  ⚠ 표를 직접 센다 — 도움말 문자열을 grep 하면 문구만 바꿔도 초록이 된다.
      //    플래그 표에 있어야 파서가 받는다 (없으면 「모르는 플래그다」로 죽는다).
      expect(Object.keys(PROGRESS_FLAGS)).toContain(flag.slice(2))
    },
  )

  it('고정 문단의 「해당 없음」이 계약의 상태값과 같다', () => {
    expect(text).toContain('--milestone none')
    expect(PROGRESS_STATUSES).toContain('none')
  })
})
