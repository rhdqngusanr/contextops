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
#  count_json / count_log : **이 단계가 검사 몇 개를 돌았나**를 어디서 읽나
#       count_json — `$true` 면 `.ci/walkthrough-<단계이름>.json` 의 `checks` 길이
#            (publish · payload · sync). 🔴 **파일 이름을 여기에 적지 마라** —
#            그 이름을 짓는 곳은 `tools/walkthrough-stage.ts` 의 `openStage()` 하나다.
#            예전엔 스크립트와 이 표 **두 곳**에 손으로 적혀 있었다 (FINDINGS 96).
#       count_log  — 그 단계 로그에서 정규식의 **첫 캡처 그룹** (fixture · vitest · scan)
#
#    🔴 왜 이 칸이 생겼나 — 예전엔 단계가 내는 것이 `note = "3초"` 뿐이었다.
#       그래서 이 루프가 세 바퀴 동안 그 **초를 검사 개수로 읽어** STATUS 에
#       「관통 검사 72 → 73 → 75개」라고 적었다. 그때 실제 검사는 20개 안팎이었다
#       (FINDINGS 95). 숫자가 커서 그럴듯하게 읽히는 종류의 거짓말이다.
#    ★ **초와 개수를 같은 칸에 담지 마라.** 아래 결과는 `sec` 과 `checks` 를 따로 낸다.
#    ★ 검사 수의 정본은 **각 단계의 산출물**이다. 여기에 수를 적지 마라 — 관통은
#       읽기만 한다. 두 곳에 적으면 한쪽만 고쳐지고 그 순간 이 칸이 다시 거짓말을 한다.
#    ⚠ 새 단계를 더하면 이 칸도 채워라. **안 채우면 그 단계는 FAIL 한다** —
#       셀 줄 모르는 단계를 조용히 0 으로 두면 이 고장이 그대로 돌아온다.
$stages = @(
    @{ name = "fixture"
       what = "paylab 픽스처가 관통 재료를 갖췄다 — 충돌 3 · 질문 4 · M1~M3 (SPEC §10.1)"
       prereq = "fixtures\paylab-docs"
       cmd = "node tools/fixtures.mjs"
       #  fixtures.mjs 가 마지막에 찍는 "fixtures: OK 20 · FAIL 0"
       count_log = 'fixtures: OK (\d+)' },

    @{ name = "compile"
       what = "픽스처 snapshot → Pack 이 결정론적으로 나온다 (P4)"
       prereq = "packages\compiler\src"
       cmd = "pnpm --filter @contextops/compiler test"
       #  vitest 요약 줄 "Tests  142 passed (142)"
       count_log = 'Tests\s+(\d+)\s+passed' },

    @{ name = "api"
       what = "라우트 핸들러가 SPEC §5 형식으로 답한다"
       prereq = "apps\web\src\app\api\v1"
       cmd = "pnpm --filter web test"
       count_log = 'Tests\s+(\d+)\s+passed' },

    @{ name = "publish"
       what = "픽스처 문서 → 항목 → 발행 → Pack 파일 (SPEC §2.1)"
       prereq = "apps\web\scripts\walkthrough-publish.ts"
       cmd = "pnpm --filter web exec tsx scripts/walkthrough-publish.ts"
       count_json = $true },

    @{ name = "scan"
       what = "배포되는 번들이 레포를 훑고 산출물에 코드 본문 0건 (SPEC §8.3 · P1)"
       prereq = "plugin\contextops\bin\contextops-cli.mjs"
       cmd = "pnpm --filter @contextops/plugin exec tsx scripts/walkthrough-scan.ts"
       #  ⚠ 이 단계의 산출물(walkthrough-scan.json)은 CLI 가 쓰는 ScanResult 라 `checks` 가 없다.
       #    그래서 스크립트가 찍는 줄에서 읽는다 — 그 수도 손으로 적은 것이 아니라 센 것이다.
       count_log = '검사 (\d+)개' },

    @{ name = "payload"
       what = "업로드 payload 에 코드 본문 0건 (P1 · 심사 첫 질문)"
       prereq = "apps\web\scripts\walkthrough-payload.ts"
       cmd = "pnpm --filter web exec tsx scripts/walkthrough-payload.ts"
       count_json = $true },

    @{ name = "sync"
       what = "플러그인이 Pack 을 받아 적용하고 applied 로 보고한다 · hash 불일치에서 멈춘다 (SPEC §8.5 · P6)"
       #  ⚠ prereq 는 **그 단계가 진짜로 필요로 하는 파일**이어야 한다. 예전엔
       #    bin/contextops-cli.mjs 였는데, 그 파일은 P2 **첫** 행(setup·scan·validate)에서
       #    생기고 sync 는 **둘째** 행이다. 그대로 두면 첫 행이 끝나는 순간 관통이
       #    없는 명령을 불러 빨개진다 — 그건 고장이 아니라 아직 안 만든 것이다.
       #  ⚠ 이 저장소 자체에 `sync` 를 걸지 마라 (`sync --check` 였다). 여기는
       #    ContextOps 에 이어진 저장소가 아니라서 「설정이 없다」로 끝난다 — 그건
       #    관통이 아니라 preflight 다. 스크립트가 **임시 저장소와 진짜 소켓**으로 잰다.
       prereq = "plugin\contextops\scripts\walkthrough-sync.ts"
       cmd = "pnpm --filter @contextops/plugin exec tsx scripts/walkthrough-sync.ts"
       count_json = $true },

    @{ name = "shots"
       what = "화면 캡처 + GATE 3 — 진짜 브라우저로 찍고, 빈 창에서 링크만으로 3분을 밟는다 (.ci/shots/ · .ci/gate3.json)"
       prereq = "apps\web\e2e"
       cmd = "pnpm --filter web test:e2e"
       #  103바퀴에 켰다. 하네스는 playwright 가 아니라 **CDP 로 몬 헤드리스 Chrome**
       #  이다 (`apps/web/e2e/shots.ts` · 의존성 0). 그 스크립트가 끝에 찍는 줄이
       #    e2e: 25 passed, 0 failed — 캡처는 .ci/shots/
       #  ⚠ 그 줄의 모양을 바꾸면 여기도 같이 고쳐라. 안 맞으면 관통이
       #    「검사 수를 못 셌다」로 **FAIL** 한다 — 조용히 0 으로 떨어지지 않는다.
       count_log = '(\d+) passed' },

    @{ name = "shotcopy"
       what = "방금 찍은 캡처를 랜딩이 읽는 자리로 옮긴다 (apps/web/public/shots/ · FINDINGS 131)"
       #  ⚠ `.ci/shots/` 는 관통 첫머리에 **통째로 지워진다.** 랜딩이 거기서 읽으면
       #    배포된 그림이 사라지거나 낡은 채로 남는다. 그래서 옮기는 단계가 따로 있고,
       #    「방금 찍은 것이 없으면」 이 단계가 **FAIL** 한다 — 건너뛰지 않는다.
       prereq = "apps\web\e2e\publish-shots.ts"
       cmd = "pnpm --filter web exec tsx e2e/publish-shots.ts"
       count_log = '검사 (\d+)개' }
)

#  단계가 돈 검사 수를 **그 단계의 산출물에서 읽는다.** 여기서 세지 않는다.
#  ★ 못 읽으면 `$null` 을 돌려준다 — 부르는 쪽이 그걸 **FAIL** 로 만든다.
#    0 을 돌려주면 「검사가 0개였다」와 「셀 줄 몰랐다」가 같아 보인다. 그건 이 항목의
#    고장(초를 개수로 읽었다)과 같은 종류의 침묵이다.
function Get-StageArtifact($stage) {
    #  단계 이름이 곧 파일 이름이다 — `tools/walkthrough-stage.ts` 의 openStage() 와 같은 규칙.
    return Join-Path $ciDir "walkthrough-$($stage.name).json"
}

function Measure-Checks($stage, [string] $log) {
    if ($stage.count_json) {
        $art = Get-StageArtifact $stage
        if (-not (Test-Path $art)) { return $null }
        try { $j = (Get-Content $art -Raw -Encoding UTF8) | ConvertFrom-Json } catch { return $null }
        #  🔴 도장을 본다 — 산출물이 **이 단계의 것**이라고 스스로 말해야 한다.
        #     손으로 만든 산출물은 이 칸이 없어서 여기서 걸린다. 그게 정본
        #     (`tools/walkthrough-stage.ts`)을 지키는 게이트다 (FINDINGS 96).
        if ($j.stage -ne $stage.name) { return $null }
        if ($null -eq $j.checks) { return $null }
        return @($j.checks).Count
    }
    if ($stage.count_log) {
        if (-not (Test-Path $log)) { return $null }
        #  ⚠ -Encoding UTF8 을 빼지 마라. cmd 리다이렉트로 받은 로그는 BOM 없는 UTF-8 이고
        #    PS 5.1 은 BOM 이 없으면 ANSI(949)로 읽는다 — 한글 정규식이 조용히 안 맞는다.
        $text = Get-Content $log -Raw -Encoding UTF8
        if ($null -eq $text) { return $null }
        #  요약 줄은 **끝**에 있다. 여러 번 맞으면 마지막 것이 그 단계의 합계다.
        $m = [regex]::Matches($text, $stage.count_log)
        if ($m.Count -eq 0) { return $null }
        return [int] $m[$m.Count - 1].Groups[1].Value
    }
    return $null
}

$results = New-Object System.Collections.ArrayList
$ran = 0; $failed = 0; $stoppedAt = ""; $checksTotal = 0

Write-Host ""
Write-Host "=== 관통 시나리오 (import -> publish -> sync) ===" -ForegroundColor Cyan

foreach ($s in $stages) {
    $prereqPath = Join-Path $root $s.prereq

    if (-not (Test-Path $prereqPath)) {
        $null = $results.Add([pscustomobject]@{ name = $s.name; state = "SKIP"; sec = $null; checks = $null; note = "$($s.prereq) 없음"; what = $s.what })
        Write-Host ("  {0,-10} SKIP  {1}" -f $s.name, $s.prereq) -ForegroundColor DarkGray
        continue
    }

    #  앞 단계가 깨졌으면 뒤를 돌리지 않는다. 관통은 **이어져야** 관통이다.
    if ($failed -gt 0) {
        $null = $results.Add([pscustomobject]@{ name = $s.name; state = "SKIP"; sec = $null; checks = $null; note = "앞 단계에서 막혔다"; what = $s.what })
        Write-Host ("  {0,-10} SKIP  앞 단계에서 막혔다" -f $s.name) -ForegroundColor DarkGray
        continue
    }

    $log = Join-Path $logDir "$($s.name).txt"
    #  ⚠ **이번 관통이 낸 것만 센다.** 지난 바퀴의 산출물이 남아 있으면 막힌 단계가
    #    옛 검사 수를 자기 것처럼 보고한다 — 이 항목이 고치는 거짓말과 같은 모양이다.
    #    (로그는 리다이렉트가 매번 덮어쓴다)
    if ($s.count_json) {
        $art = Get-StageArtifact $s
        if (Test-Path $art) { Remove-Item $art -Force }
    }
    $t0  = Get-Date
    & cmd.exe /c "$($s.cmd) > `"$log`" 2>&1"
    $code = $LASTEXITCODE
    $sec  = [int]((Get-Date) - $t0).TotalSeconds
    $ran++

    if ($code -eq 0) {
        $n = Measure-Checks $s $log
        if ($null -eq $n) {
            #  🔴 게이트 — 단계가 지났는데 **몇 개를 쟀는지 말을 못 한다.**
            #     초록으로 넘기면 그 단계는 「검사 0개로 통과」가 되고 아무도 모른다.
            $why = "검사 수를 못 셌다 — 이 단계의 count_json/count_log 를 표에 적고, " + "산출물은 tools/walkthrough-stage.ts 의 openStage() 로 써라 (FINDINGS 95 · 96)"
            $null = $results.Add([pscustomobject]@{ name = $s.name; state = "FAIL"; sec = $sec; checks = $null; note = $why; what = $s.what })
            Write-Host ("  {0,-10} FAIL  {1}" -f $s.name, $why) -ForegroundColor Red
            $failed++
            $stoppedAt = $s.name
            continue
        }
        $checksTotal += $n
        $null = $results.Add([pscustomobject]@{ name = $s.name; state = "OK"; sec = $sec; checks = $n; note = ""; what = $s.what })
        Write-Host ("  {0,-10} OK    검사 {1,4}개 · {2}초 — {3}" -f $s.name, $n, $sec, $s.what) -ForegroundColor Green
    } else {
        $tail = ""
        if (Test-Path $log) { $tail = ((Get-Content $log -Tail 3) -join " / ") -replace "\s+", " " }
        $null = $results.Add([pscustomobject]@{ name = $s.name; state = "FAIL"; sec = $sec; checks = $null; note = $tail; what = $s.what })
        Write-Host ("  {0,-10} FAIL  {1}" -f $s.name, $tail) -ForegroundColor Red
        Write-Host ("             로그: .ci/logs/walkthrough/{0}.txt" -f $s.name) -ForegroundColor DarkGray
        $failed++
        $stoppedAt = $s.name
    }
}

# ── 요약 ──────────────────────────────────────────────────────────
#  ⚠ `checks` 는 **개수**이고 `stages[].sec` 은 **초**다. 한 칸에 담지 마라 —
#    담았더니 세 바퀴가 초를 개수로 읽었다 (FINDINGS 95).
$summary = [pscustomobject]@{
    at         = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    ran        = $ran
    failed     = $failed
    checks     = $checksTotal
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
#  ⚠ `$checksTotal개` 로 쓰지 마라 — 한글은 PS 변수 이름에 들어가서 `$checksTotal개` 라는
#    없는 변수를 읽고 **빈 칸**이 찍힌다 (직접 봤다: 「검사 .개」).
Write-Host "관통 통과 — $ran 단계 · 검사 $($checksTotal)개." -ForegroundColor Green
Write-Host "⚠ 통과는 [안 막혔다] 지 [좋다] 가 아니다. 산출물을 눈으로 읽어라 (loop/PROMPT.md ④2)." -ForegroundColor DarkGray
Write-Host ""
exit 0
