import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SETUP_STEPS, SETUP_TEXT, SetupSteps, projectWhere } from '../src/components/setup-guide'
import { TEAM_HOME_TEXT, TeamHome, type TeamHomeHandlers } from '../src/components/team-home'

// =====================================================================
//  🔴 처음 세팅 안내 — 팀·프로젝트 만들기 두 화면 (FINDINGS 176 · 177 · DESIGN_BRIEF §4 화면 2)
//
//  ★ 2026-09-15 사용자: 「로그인 → 팀 프로젝트 만들 때 전부 가이드가 없으니 뭘 넣어야 할지 감이 안 잡힌다」.
//    시안 셋 중 A(칸마다 설명)를 골랐고, 같은 날 「설명문처럼 길다」는 말에 모양을 번호 걸음 + 접는 설명으로 바꿨다. 여기서 재는 것:
//    ① 걸음 줄이 차례대로 서고 지금 걸음만 굵다 · 두 화면이 제 걸음을 그린다
//    ② 두 화면이 문장을 **표에서 읽는다** — 같은 문장을 화면에 다시 적으면 한쪽만 낡는다
//    🔴 ③ 안내의 **사실 문장**이 코드와 같다 — 못 바꾼다 · 「내 팀」에서 초대하고 설명이 보인다 · 만들면 가져오기
//       (문이 생기거나 이동할 곳이 바뀌면 여기가 먼저 빨개진다 — 그때 문장을 고친다)
//    ④ 칸은 번호 걸음이고 걸음 제목이 이름표다 · 제목은 할 일, 접힌 줄은 질문 · 잠긴 버튼의 이유는 안 접는다
//       (모양 자체는 `web-guide.test.ts` 가 잰다)
// =====================================================================

const webSrc = fileURLToPath(new URL('../src', import.meta.url))
const read = (...parts: string[]): string => readFileSync(join(webSrc, ...parts), 'utf8')
const teamPage = read('app', 't', 'new', 'page.tsx')
const projectPage = read('app', 't', '[team]', 'p', 'new', 'page.tsx')
const plain = (html: string): string => html.replace(/<[^>]+>/g, '')

const NOOP: TeamHomeHandlers = { onOpenInvite: () => {}, onInviteChange: () => {}, onInviteSubmit: () => {}, onCloseRefused: () => {} }

describe('① 걸음 줄', () => {
  it('세 걸음이 차례대로 서고, 지금 걸음 하나만 굵다', () => {
    const html = renderToStaticMarkup(createElement(SetupSteps, { current: 1 }))
    expect(plain(html)).toBe('1 팀 → 2 프로젝트 → 3 첫 문서')
    expect(html.match(/<b/g)).toHaveLength(1)
    expect(html).toContain('>2 프로젝트</b>')
    expect(SETUP_STEPS).toEqual(['팀', '프로젝트', '첫 문서'])
  })

  it('팀 화면은 첫 걸음, 프로젝트 화면은 둘째 걸음을 그린다', () => {
    expect(teamPage).toContain('<SetupSteps current={0} />')
    expect(projectPage).toContain('<SetupSteps current={1} />')
  })
})

describe('② 두 화면이 문장을 표에서 읽는다', () => {
  it('표의 문장이 화면 코드에 글자로 다시 적혀 있지 않다', () => {
    const sentences = [
      ...Object.values(SETUP_TEXT.team),
      ...Object.values(SETUP_TEXT.project),
      SETUP_TEXT.slugTitle, SETUP_TEXT.slugWhy, SETUP_TEXT.slugHelp, SETUP_TEXT.noSlug,
      ...SETUP_TEXT.projectNameExamples,
    ]
    for (const s of sentences) {
      expect(teamPage, s).not.toContain(s)
      expect(projectPage, s).not.toContain(s)
    }
    expect(teamPage).toContain('SETUP_TEXT.team.')
    expect(projectPage).toContain('SETUP_TEXT.project.')
  })

  it('프로젝트 화면의 첫 문장은 팀 이름을 낫표로 싼다 — 「결제팀 팀에」가 되지 않는다', () => {
    expect(projectWhere('결제팀')).toBe('「결제팀」에 만듭니다.')
    expect(projectPage).toContain('projectWhere(team.name)')
    expect(projectPage).not.toContain('팀에 만듭니다')
  })

  it('한글 이름이면 두 화면 다 주소용 이름을 직접 적으라고 말한다 — 잠긴 버튼만 두지 않는다', () => {
    expect(teamPage).toContain('SETUP_TEXT.noSlug')
    expect(projectPage).toContain('SETUP_TEXT.noSlug')
  })
})

describe('🔴 ③ 안내의 사실 문장이 코드와 같다', () => {
  it('「만든 뒤에 바꾸는 화면은 없습니다」 — 팀·프로젝트를 고치는 문(PATCH)이 정말 없다', () => {
    expect(SETUP_TEXT.slugHelp).toContain('바꾸는 화면은 없습니다')
    for (const route of [['app', 'api', 'v1', 'teams', '[id]', 'route.ts'], ['app', 'api', 'v1', 'projects', '[id]', 'route.ts']]) {
      const at = join(webSrc, ...route)
      if (existsSync(at)) expect(readFileSync(at, 'utf8'), route.join('/')).not.toMatch(/export const PATCH/)
    }
  })

  it('「「내 팀」에서 이메일로 초대 · 설명이 이름 밑에 보인다」 — 팀 홈이 실제로 그 둘을 그린다', () => {
    expect(SETUP_TEXT.team.invite).toContain(`「${TEAM_HOME_TEXT.title}」`)
    expect(SETUP_TEXT.project.descHelp).toContain(`「${TEAM_HOME_TEXT.title}」`)
    const html = renderToStaticMarkup(createElement(TeamHome, {
      state: {
        teams: [{
          id: 't-1', slug: 'paylab', name: '결제팀', role: 'owner',
          projects: [{ id: 'p-1', slug: 'payments', name: '결제 서비스', description: '가맹점 결제와 환불을 처리합니다', official_version_id: null }],
        }],
        members: { 't-1': [] },
        door: { open: true },
        inviting: null,
        refused: null,
      },
      on: NOOP,
    }))
    expect(plain(html)).toContain('가맹점 결제와 환불을 처리합니다')
    expect(plain(html)).toContain(TEAM_HOME_TEXT.invite)
  })

  it('🔴 「만들면 「가져오기」로 갑니다」 — 프로젝트를 만든 뒤 가는 곳이 정말 가져오기다', () => {
    expect(SETUP_TEXT.project.next).toContain('「가져오기」')
    expect(projectPage).toContain('/p/${project.slug}/import`')
    expect(projectPage).not.toContain('/p/${project.slug}/context`')
  })
})

describe('④ 칸은 번호 걸음이고, 이유는 접는다 (FINDINGS 177)', () => {
  it('두 화면이 칸을 걸음으로 세우고, 걸음 제목이 곧 그 칸의 이름표다', () => {
    const pages = [
      { name: '팀 만들기', src: teamPage, ids: ['team-name', 'team-slug'] },
      { name: '프로젝트 만들기', src: projectPage, ids: ['p-name', 'p-slug', 'p-desc', 'p-repo'] },
    ]
    for (const page of pages) {
      expect(page.src, page.name).toContain('<Steps>')
      for (const id of page.ids) {
        expect(page.src, `${page.name} · ${id}`).toContain(`htmlFor="${id}"`)
        expect(page.src, `${page.name} · ${id}`).toContain(`id="${id}"`)
      }
      //  옛 라벨이 걸음 제목과 나란히 남지 않는다 — 같은 칸 이름을 두 번 적게 된다.
      expect(page.src, page.name).not.toContain('className="label"')
    }
  })

  it('걸음 제목은 할 일(「~니다」)이고, 접힌 줄은 질문(「?」)이다', () => {
    const titles = [SETUP_TEXT.team.nameTitle, SETUP_TEXT.slugTitle, SETUP_TEXT.project.nameTitle, SETUP_TEXT.project.descTitle, SETUP_TEXT.project.repoTitle]
    for (const t of titles) expect(t, t).toMatch(/니다$/)
    const whys = [SETUP_TEXT.team.leadWhy, SETUP_TEXT.team.nameWhy, SETUP_TEXT.slugWhy, SETUP_TEXT.project.leadWhy, SETUP_TEXT.project.descWhy, SETUP_TEXT.project.repoWhy]
    for (const w of whys) expect(w, w).toMatch(/\?$/)
  })

  it('🔴 잠긴 버튼의 이유(한글 이름)는 접지 않는다 — 어느 `<Why>` 안에도 없다', () => {
    for (const src of [teamPage, projectPage]) {
      const at = src.indexOf('SETUP_TEXT.noSlug')
      expect(at).toBeGreaterThan(-1)
      //  가장 가까운 여는 `<Why` 가 그 앞에서 이미 닫혔다.
      expect(src.lastIndexOf('<Why', at)).toBeLessThanOrEqual(src.lastIndexOf('</Why>', at))
    }
  })
})
