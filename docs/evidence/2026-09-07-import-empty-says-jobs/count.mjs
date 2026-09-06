// 그 칸이 「없다」고 말할 때 **문서는 몇 건이고 job 은 몇 개인지**를 진짜 HTTP 로 센다
// (게스트 세션 쿠키를 그대로 쓰기 때문에 브라우저 안에서 부른다 · FINDINGS 159)
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const waiters = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id) }
})
const send = (method, params = {}) => {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((res) => waiters.set(mid, res))
}
const r = await send('Runtime.evaluate', {
  awaitPromise: true,
  returnByValue: true,
  expression: `
  (async () => {
    try {
      //  화면과 같은 세션을 쓴다 - lib/web/session.ts 의 contextops.session (localStorage)
      const tok = JSON.parse(localStorage.getItem('contextops.session') ?? 'null')?.access_token
      const j = async (u) => {
        const res = await fetch(u, { headers: tok ? { authorization: 'Bearer ' + tok } : {} })
        const text = await res.text()
        try { return JSON.parse(text) } catch { return { status: res.status, body: text.slice(0, 200), url: u } }
      }
      const teams = await j('/api/v1/teams')
      const team = (teams.data?.teams ?? []).find((t) => t.slug === 'demo') ?? teams.data?.teams?.[0]
      const p = (team?.projects ?? []).find((x) => x.slug === 'paylab-api')
      if (!p) return { raw: JSON.stringify(teams).slice(0, 800), path: location.pathname }
      const docs = await j('/api/v1/projects/' + p.id + '/documents')
      const jobs = await j('/api/v1/projects/' + p.id + '/jobs?feature=structure&limit=50')
      return {
        team: team.slug,
        project: p.slug,
        documents: (docs.data?.documents ?? []).length,
        document_titles: (docs.data?.documents ?? []).map((d) => d.title),
        structure_jobs: (jobs.data?.jobs ?? []).length,
        raw_docs: JSON.stringify(docs).slice(0, 400),
      }
    } catch (e) {
      return { error: String(e) }
    }
  })()
  `,
})
console.log(JSON.stringify(r.result?.result?.value ?? r.result, null, 2))
ws.close()
