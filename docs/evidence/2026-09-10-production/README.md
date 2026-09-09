# 2026-09-10 첫 production 배포 — 잰 것

- URL: <https://contextops-rosy.vercel.app> (Vercel Hobby · 프로젝트 `contextops` · 도메인은 `-rosy` 가 붙었다 — `contextops.vercel.app` 은 남이 쓴다) · Root Directory `apps/web` · 커밋 `51b5b5d`
- Supabase `ummnsrwztpjmuhxcdxgh` — 마이그레이션 0000~0009 적용(pending 0 · rls 18/18 · 표 소유자 전부 `postgres`) · GitHub 공급자 ON · JWKS ES256 · Data API OFF(anon REST 503) · 세션 만료 최대치
- 첫 배포는 `vercel.json` 의 `_comment` 키로 Import 자체가 거부됐다 → 키를 빼고 재시도(`51b5b5d`) · 두 번째 배포는 env 가 `.env.example` 의 빈 값으로 들어가 `health` 가 `db:false·ai:false` → 여덟 키를 다시 넣고 Redeploy
- `GET /api/v1/health` → `{"ok":true,"db":true,"ai":true,"version":"v1"}`
- 첫 데모 리셋 `GET /api/v1/cron/demo-reset`(CRON_SECRET) → 200 · **7.6초** · `{"team_slug":"demo","existed":false,"official_version":"1.1.0","items":30,"members":5,"devices":14,"reports":13,"progress":8,"proposals":5}` (300초 상한의 1/40 — 병렬화 필요 없음)
- `pnpm --filter web verify:prod -- --url https://contextops-rosy.vercel.app` → **44 passed · 0 failed** (`verify.json` · GATE 3 캡처 5장 — 랜딩 accent → 게스트 세션 → Context·제안·Roadmap·Sync 4.6초)
- 링크 미리보기: `og:image` 가 `https://contextops-rosy.vercel.app/og.png`(221KB · 1200×630)로 절대 주소가 됐다 — `metadataBase` 가 Vercel 의 production 호스트를 읽었다 (`NEXT_PUBLIC_SITE_ORIGIN` 없이)
- `/demo` 200 · `/privacy` 200 · `/t` 200 · `/login` 200 · `POST /api/v1/demo/session` 201

아직 안 잰 것(🙋): 실제 GitHub 로그인 → 팀 생성 201(DEPLOY ⑥-b) · GitHub 변수 `PROD_ORIGIN`(watch-prod) · Vercel 함수 로그의 필드.
