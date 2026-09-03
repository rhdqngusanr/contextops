# =====================================================================
#  tools/walkthrough.ps1 — 관통 시나리오: import → publish → sync
#
#    powershell -ExecutionPolicy Bypass -File tools/walkthrough.ps1
#
#  ★ 왜 있나 — 목록에서만 일을 고르면 **목록에 없는 고장은 영원히 안 보인다.**
#    단위 테스트가 전부 초록인데 제품이 안 도는 상태가 실제로 생긴다.
#    그래서 한 바퀴는 **관통으로 시작한다. 목록은 관통이 만든다.**
#
#  ★ 이 파일은 **관통의 계약**이기도 하다. 아래 단계 표가 「무엇이 있어야
#    관통이 된다」의 정본이다. 아직 없는 단계는 SKIP 으로 뜨고, 그 단계의
#    prereq 파일을 만드는 순간 **저절로 켜진다.**
#    ⚠ SKIP 을 없애려고 단계를 지우지 마라 — 그건 눈을 가리는 것이다.
#
#  종료 코드: 0 지난 단계 전부 통과 · 1 어느 단계가 실패 · 2 아직 관통할 게 없다
# =====================================================================

$ErrorActionPreference = "Stop"
$root   = Split-Path -Parent $PSScriptRoot
$ciDir  = Join-Path $root ".ci"
$logDir = Join-Path $ciDir "logs\walkthrough"
$shots  = Join-Path $ciDir "shots"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# ⚠ 캡처 폴더는 매 관통마다 **통째로 지운다.** 근거로 쓸 캡처는
#   FINDINGS.md 에 적기 **전에** 이 폴더 밖으로 복사해라 —
#   고치는 바퀴와 지우는 바퀴가 같은 바퀴다.
if (Test-Path $shots) { Remove-Item $shots -Recurse -Force }
New-Item -ItemType Directory -Force -Path $shots | Out-Null

# ── 관통 단계 (순서가 곧 제품의 흐름이다) ─────────────────────────
#  prereq : 이 파일/폴더가 있어야 이 단계가 켜진다
#  cmd    : 그때 돌릴 명령. 없으면 만들어라 — 관통은 이 순서로 돈다
$stages = @(
    @{ name = "fixture"
       what = "paylab 픽스처가 관통 재료를 갖췄다 — 충돌 3 · 질문 4 · M1~M3 (SPEC §10.1)"
       prereq = "fixtures\paylab-docs"
       cmd = "node tools/fixtures.mjs" },

    @{ name = "compile"
       what = "픽스처 snapshot → Pack 이 결정론적으로 나온다 (P4)"
       prereq = "packages\compiler\src"
       cmd = "pnpm --filter @contextops/compiler test" },

    @{ name = "api"
       what = "라우트 핸들러가 SPEC §5 형식으로 답한다"
       prereq = "apps\web\src\app\api\v1"
       cmd = "pnpm --filter web test" },

    @{ name = "publish"
       what = "픽스처 문서 → 항목 → 발행 → Pack 파일 (SPEC §2.1)"
       prereq = "apps\web\scripts\walkthrough-publish.ts"
       cmd = "pnpm --filter web exec tsx scripts/walkthrough-publish.ts" },

    @{ name = "payload"
       what = "업로드 payload 에 코드 본문 0건 (P1 · 심사 첫 질문)"
       prereq = "apps\web\scripts\walkthrough-payload.ts"
       cmd = "pnpm --filter web exec tsx scripts/walkthrough-payload.ts" },

    @{ name = "sync"
       what = "플러그인이 Pack 을 받아 applied 로 보고한다 (SPEC §8.5)"
       prereq = "plugin\contextops\bin\contextops-cli.mjs"
       cmd = "node plugin/contextops/bin/contextops-cli.mjs sync --check" },

    @{ name = "shots"
       what = "화면 캡처 — 눈 판정 재료 (.ci/shots/)"
       prereq = "apps\web\e2e"
       cmd = "pnpm --filter web test:e2e" }
)

$results = New-Object System.Collections.ArrayList
$ran = 0; $failed = 0; $stoppedAt = ""

Write-Host ""
Write-Host "=== 관통 시나리오 (import -> publish -> sync) ===" -ForegroundColor Cyan

foreach ($s in $stages) {
    $prereqPath = Join-Path $root $s.prereq

    if (-not (Test-Path $prereqPath)) {
        $null = $results.Add([pscustomobject]@{ name = $s.name; state = "SKIP"; note = "$($s.prereq) 없음"; what = $s.what })
        Write-Host ("  {0,-10} SKIP  {1}" -f $s.name, $s.prereq) -ForegroundColor DarkGray
        continue
    }

    #  앞 단계가 깨졌으면 뒤를 돌리지 않는다. 관통은 **이어져야** 관통이다.
    if ($failed -gt 0) {
        $null = $results.Add([pscustomobject]@{ name = $s.name; state = "SKIP"; note = "앞 단계에서 막혔다"; what = $s.what })
        Write-Host ("  {0,-10} SKIP  앞 단계에서 막혔다" -f $s.name) -ForegroundColor DarkGray
        continue
    }

    $log = Join-Path $logDir "$($s.name).txt"
    $t0  = Get-Date
    & cmd.exe /c "$($s.cmd) > `"$log`" 2>&1"
    $code = $LASTEXITCODE
    $sec  = [int]((Get-Date) - $t0).TotalSeconds
    $ran++

    if ($code -eq 0) {
        $null = $results.Add([pscustomobject]@{ name = $s.name; state = "OK"; note = "$($sec)초"; what = $s.what })
        Write-Host ("  {0,-10} OK    {1}초 — {2}" -f $s.name, $sec, $s.what) -ForegroundColor Green
    } else {
        $tail = ""
        if (Test-Path $log) { $tail = ((Get-Content $log -Tail 3) -join " / ") -replace "\s+", " " }
        $null = $results.Add([pscustomobject]@{ name = $s.name; state = "FAIL"; note = $tail; what = $s.what })
        Write-Host ("  {0,-10} FAIL  {1}" -f $s.name, $tail) -ForegroundColor Red
        Write-Host ("             로그: .ci/logs/walkthrough/{0}.txt" -f $s.name) -ForegroundColor DarkGray
        $failed++
        $stoppedAt = $s.name
    }
}

# ── 요약 ──────────────────────────────────────────────────────────
$summary = [pscustomobject]@{
    at         = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    ran        = $ran
    failed     = $failed
    stopped_at = $stoppedAt
    stages     = $results
}
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $ciDir "walkthrough.json") -Encoding UTF8

Write-Host ""
if ($ran -eq 0) {
    #  P0 단계에서는 정상이다. 이때 이번 바퀴의 일은 docs/PLAN.md 의 다음 행이다.
    Write-Host "아직 관통할 게 없다 — 단계가 하나도 안 켜졌다. docs/PLAN.md 의 다음 행을 해라." -ForegroundColor Yellow
    Write-Host ""
    exit 2
}
if ($failed -gt 0) {
    Write-Host "관통이 [$stoppedAt] 에서 막혔다. 이게 이번 바퀴의 일이다." -ForegroundColor Red
    Write-Host "docs/feedback/FINDINGS.md 에 [고장] 으로 적어라." -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}
Write-Host "관통 통과 — $ran 단계." -ForegroundColor Green
Write-Host "⚠ 통과는 [안 막혔다] 지 [좋다] 가 아니다. 산출물을 눈으로 읽어라 (loop/PROMPT.md ④2)." -ForegroundColor DarkGray
Write-Host ""
exit 0
