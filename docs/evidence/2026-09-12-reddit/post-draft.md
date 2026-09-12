# Reddit post draft (2026-09-12)

> 목적: 레딧에서 **배울 것**을 얻는다 — 자랑이 아니라 **구체적인 질문 셋**.
> 규칙: 링크는 보안 수정이 배포된 뒤에 붙인다 (R1~R3 는 이 날 닫았다).
>
> ⚠ 레딧은 홍보 글에 가차없다. 그래서 이 초안은 ① 문제부터 ② 만든 것 ③ **틀렸을지도
>   모르는 결정 셋** ④ 물어보는 것 — 순서다. 답을 원하는 자리를 명시해야 답이 온다.

---

## 어디에 올리나 (추천 순)

| 서브레딧 | 왜 | 주의 |
|---|---|---|
| r/ExperiencedDevs | 「팀 규모에서 AI 컨텍스트를 어떻게 관리하나」는 이 사람들의 실제 고민이다. 설계 비판이 가장 날카롭다 | 홍보 냄새가 나면 바로 내려간다. 링크는 본문 **맨 아래** 한 번 |
| r/ClaudeAI | 정확히 Claude Code 사용자들 · 플러그인·훅을 아는 사람들 | 자기 홍보 규칙 확인 필요 (대부분 주 1회 허용) |
| r/devops | 「승인된 설정을 여러 기기에 같은 버전으로」는 익숙한 문제다 — 비유가 통한다 | 「그거 그냥 git + CI 아니냐」가 첫 댓글이다. 본문에서 먼저 답해야 한다 |
| r/SideProject · r/webdev | 부담 없이 피드백 | 설계 깊이는 덜 나온다 |

★ 같은 글을 여러 곳에 동시에 올리지 마라 — 하나 올리고 댓글에 이틀 답한 뒤 다음.

---

## 제목 후보

1. `Our team's AI assistants kept giving different answers to the same question. I built the boring fix — looking for holes in the design.`
2. `I made team rules for Claude Code versioned and approved like a release. Three design decisions I'm unsure about.`
3. `"Just commit CLAUDE.md to git" — why that didn't work for us, and what I built instead`

→ **1번 추천.** 문제가 먼저 오고, 마지막 절이 「구멍을 찾아 달라」다.

---

## 본문

**Same team, different answers from every AI — and the three design calls I'm least sure about**

Two people on my team asked their Claude Code the same question: *how many times do we retry a failed
payment provider call?*

One said 5, with exponential backoff. The other said 3, fixed 500ms. Neither was hallucinating — one had
read our goals doc, the other had read the actual code. The two disagreed, and nothing in our setup
noticed.

So I built ContextOps: the team's goals, rules and decisions get pulled together, the lead approves them,
and every teammate's Claude Code receives the same approved bundle at the same version. Progress reports
come back with file-and-line evidence attached.

**"Why not just commit CLAUDE.md to git?"** — the first thing everyone says, so let me get ahead of it:

- Decisions get made outside the repo (docs, meetings). Copying them into `CLAUDE.md` is left to each
  developer, so everyone ends up with a slightly different file.
- One team's rules span several repos. Copy the retry rule into api/webhook/settlement and some day only
  one of them changes.
- A diff says *what* changed, not *who decided it or why*. Without that, neither the AI nor a person has a
  reason to trust a rule.

That said — I genuinely might be wrong about this, which is why I'm posting.

---

**Three decisions I'd like torn apart:**

**1. The server never receives your code — is the boundary in the right place?**

Hard rule: source code bodies, secrets, personal memory files and conversation transcripts never leave the
machine. What *does* go up is structured items (a rule sentence, a milestone), plus **file paths and line
numbers** as evidence.

The part I'm unsure about is that last bit. Paths are not code, but `src/customers/acme/billing.ts` still
leaks something. Options I can see: hash the paths (then the evidence link is useless to a human), keep
them client-side only (then the roadmap can't show evidence), or leave it and document it clearly. Right
now I do the third. What would you do?

**2. Publishing is deliberately AI-free — over-engineering?**

After the lead hits approve, no LLM touches anything. The same approved set always compiles to
byte-identical files, and a checksum proves which machine got what. This costs real flexibility (no
"summarize this for the smaller model" step, no per-repo tailoring).

I did it because I wanted "the AI rewrote a rule between approval and delivery" to be *structurally
impossible* rather than unlikely. Is determinism worth that much rigidity here, or am I solving a problem
nobody actually hits?

**3. Rate limiting: I only counted the expensive things, and that was wrong.**

Confession, since this is the kind of thing this sub catches. Until today, the only thing my server counted
was LLM calls — there's a budget gate with a daily/monthly ceiling, per-feature limits, a reservation
written inside an advisory lock so two concurrent requests can't both slip under the cap. I was proud of
it.

Then I went looking for what a public link would actually expose and found that **every other route was
unlimited**, including the one endpoint that takes no credentials at all (it mints a read-only guest token
for the demo). My own code comment justified it: *"no rate limit needed — it doesn't call an LLM and
doesn't create rows."* That reasoning was just wrong. A `while true; curl` loop doesn't need to touch my
LLM budget to run up serverless invocations and exhaust a connection pool.

Fixed it today: per-IP fixed-window counters in Postgres (serverless means in-process counters reset on
every cold start), atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` so the increment and the read
are one statement, IPs hashed, and the limiter **fails open** if the DB is unreachable — I'd rather fail to
block than take the site down. A default limit applies to routes nobody explicitly configured, so a new
endpoint is born locked rather than born open.

Two things I'd like opinions on: **(a)** fail-open vs fail-closed for a rate limiter on a small service —
I keep going back and forth, and **(b)** is a DB round-trip per request an acceptable price, or is the
usual answer "put Redis in front of it and stop thinking about it"?

---

**Stack, briefly:** Next.js on Vercel, Postgres (Supabase, RLS on every table with zero policies so the
public anon key can't read anything), Gemini server-side for the structuring/conflict-detection steps only,
and a Claude Code plugin (hooks + skills + a small CLI) on the developer side.

It's open source, and it's my entry for a hackathon here in Korea, so the UI is Korean-first — I added an
English toggle in the header today, mostly so this post would be worth clicking.

Happy to go into detail on any of it. Mostly I want to know where this breaks at a team size bigger than
mine.

<LINK — 보안 수정 배포 뒤에 붙인다>

---

## 올리기 전 점검

- [ ] R1~R3 배포 완료 · `verify:prod` 초록
- [ ] 영어 토글이 production 에서 실제로 동작
- [ ] 링크 하나만 · 본문 맨 아래
- [ ] 제목에 제품 이름 없음 (문제가 먼저)
- [ ] 첫 댓글로 「스택 상세」를 직접 달아 둔다 — 본문을 짧게 유지하는 관용 수법
- [ ] 올린 뒤 **48시간 댓글 응답**. 답 안 하면 다음 글은 안 읽힌다
