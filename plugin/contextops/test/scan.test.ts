import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ScanResult } from '@contextops/schema'

import { runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { scanRepo } from '../src/cli/scan'
import { fakeCli, tempDir } from './helpers/cli'

// =====================================================================
//  `scan` — 결정론이고, **본문을 담지 않는다** (SPEC §8.3 · P1)
//
//  ★ 여기서 재는 것은 셋이다:
//    ① 같은 저장소를 두 번 훑으면 **바이트가 같다**
//    ② secret 파일은 목록에 **없고**, `.env` 는 **키 이름만** 나온다
//    ③ 표(언어·인프라·엔트리포인트)의 항목이 실제로 결과를 바꾼다
// =====================================================================

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

function makeRepo(files: Record<string, string>): string {
  const dir = tempDir('contextops-scan-')
  dirs.push(dir)
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir.path, ...path.split('/'))
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content, 'utf8')
  }
  return dir.path
}

const SECRET_VALUE = 'sk-live-do-not-upload-9f3a'
const CODE_LINE = 'export const chargeCard = (amount: number) => psp.charge(amount)'

describe('scanRepo', () => {
  it('파일 본문도 env 값도 산출물에 없다 (P1)', () => {
    const root = makeRepo({
      'src/main.ts': `${CODE_LINE}\n`,
      '.env': `PSP_API_KEY=${SECRET_VALUE}\n# 주석\nexport DATABASE_URL=postgres://u:p@h/db\n`,
      'deploy.pem': `${SECRET_VALUE}\n`,
      'package.json': JSON.stringify({ main: 'src/main.ts', dependencies: { zod: '^4' } }),
    })

    const text = JSON.stringify(scanRepo(root, 'paylab'))

    expect(text).not.toContain(SECRET_VALUE)
    expect(text).not.toContain(CODE_LINE)
    expect(text).not.toContain('postgres://')
    //  키 **이름**은 올라간다 — 그게 이 스캔의 값이다.
    expect(text).toContain('PSP_API_KEY')
    expect(text).toContain('DATABASE_URL')
  })

  it('secret 후보는 파일 목록에 아예 없다 — 목록이 곧 Skill 이 읽을 후보다', () => {
    const root = makeRepo({
      'src/main.ts': 'export const a = 1\n',
      '.env.local': 'A=1\n',
      'certs/server.key': 'x\n',
      'infra/secrets.yaml': 'a: 1\n',
    })
    const result = scanRepo(root, 'r')
    const paths = result.files.map((f) => f.path)

    expect(paths).toEqual(['src/main.ts'])
    expect(result.summary.excluded.join(' ')).toContain('.env.local')
    expect(result.summary.excluded.join(' ')).toContain('server.key')
    expect(result.summary.excluded.join(' ')).toContain('secrets.yaml')
  })

  it('같은 저장소를 두 번 훑으면 바이트가 같다 (P4 의 습관)', () => {
    const root = makeRepo({
      'b.ts': 'export const b = 1\n',
      'a.ts': 'export const a = 1\n',
      'z/y/x.py': 'x = 1\n',
      'Dockerfile': 'FROM node\n',
    })
    expect(JSON.stringify(scanRepo(root, 'r'))).toBe(JSON.stringify(scanRepo(root, 'r')))
  })

  it('표의 항목이 실제로 결과를 바꾼다 — 언어·인프라·엔트리포인트', () => {
    const root = makeRepo({
      'src/main.ts': 'export const a = 1\n',
      'scripts/tool.py': 'a = 1\n',
      'docker-compose.yml': 'services: {}\n',
      'infra/main.tf': 'resource "a" "b" {}\n',
      'README.md': '# 안녕\n',
      'weird.qqq': 'no language\n',
    })
    const s = scanRepo(root, 'r').summary

    expect(s.languages).toContain('typescript')
    expect(s.languages).toContain('python')
    expect(s.languages).toContain('markdown')
    //  표에 없는 확장자는 언어로 세지 않는다 (목록에는 남는다).
    expect(s.languages).not.toContain('other')
    expect(s.infra_files).toEqual(['docker-compose.yml', 'infra/main.tf'])
    expect(s.entrypoints).toEqual(['src/main.ts'])
  })

  it('제외 폴더는 통째로 건너뛰고 사유를 남긴다', () => {
    const root = makeRepo({
      'src/a.ts': 'a\n',
      'node_modules/pkg/index.js': 'a\n',
      'dist/out.js': 'a\n',
    })
    const result = scanRepo(root, 'r')
    expect(result.files.map((f) => f.path)).toEqual(['src/a.ts'])
    expect(result.summary.excluded).toContain('node_modules/')
    expect(result.summary.excluded).toContain('dist/')
  })

  it('의존성은 이름만이다 — 버전은 담지 않는다', () => {
    const root = makeRepo({
      'package.json': JSON.stringify({ dependencies: { zod: '^4.5.4' }, devDependencies: { vitest: '^4.1.11' } }),
      'requirements.txt': 'httpx==0.27.0\n# 주석\n-r other.txt\n',
    })
    const s = scanRepo(root, 'r').summary
    expect(s.dependencies).toEqual(['httpx', 'vitest', 'zod'])
    expect(JSON.stringify(s.dependencies)).not.toContain('4.5.4')
  })
})

describe('contextops scan', () => {
  it('산출물을 쓰고, 그 파일이 계약과 맞는다', async () => {
    const root = makeRepo({ 'src/main.ts': 'export const a = 1\n' })
    const home = tempDir('contextops-home-')
    dirs.push(home)
    const cli = fakeCli({ cwd: root, home: home.path })

    const code = await runCommand(cli, ['scan'])

    expect(code).toBe(EXIT.OK)
    const { readFileSync } = await import('node:fs')
    const written = readFileSync(join(root, '.contextops', 'cache', 'scan.json'), 'utf8')
    expect(ScanResult.safeParse(JSON.parse(written)).success).toBe(true)
    //  스캔 자신이 만든 폴더가 다음 스캔에 섞이지 않는다.
    expect(written).not.toContain('.contextops/cache/scan.json')
  })

  it('모르는 플래그는 조용히 무시하지 않는다 (오타는 즉시 보여야 한다)', async () => {
    const root = makeRepo({ 'a.ts': 'a\n' })
    const home = tempDir('contextops-home-')
    dirs.push(home)
    const cli = fakeCli({ cwd: root, home: home.path })

    const code = await runCommand(cli, ['scan', '--dirr', root])

    expect(code).toBe(EXIT.USAGE)
    expect(cli.err.join(' ')).toContain('--dirr')
  })
})
