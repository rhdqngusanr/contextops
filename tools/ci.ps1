# =====================================================================
#  tools/ci.ps1 — 전 층 검사. 한 줄로 전부 돈다.
#
#    powershell -ExecutionPolicy Bypass -File tools/ci.ps1
#    powershell -ExecutionPolicy Bypass -File tools/ci.ps1 -Fast    # build·관통 건너뜀
#
#  결과: .ci/result 한 줄  +  층별 로그 .ci/logs/<층>.txt
#
#  ★ 층 순서는 **비용 순서**다. 앞 층이 빨간데 뒤 층을 돌리지 않는다 —
#    타입이 안 맞는 코드로 빌드를 30초 기다릴 이유가 없다.
#    (`principles` 만은 예외로 항상 먼저다. 제품의 주장이 걸린 층이라 타협이 없다.)
#
#  ★ 아직 없는 층은 SKIP 이다. P0 단계에서는 대부분 SKIP 인 게 정상이고,
#    대상이 생기면 저절로 풀린다. **안 풀리면 그게 고장이다.**
#
#  ⚠ 네이티브 exe 는 cmd.exe 를 거쳐 부른다. PowerShell 5.1 에서 `2>&1` 로
#    네이티브 stderr 를 받으면 각 줄이 ErrorRecord 로 감싸지고 **exit 0 인데도
#    `$?` 가 `$false` 가 된다** — 멀쩡한 명령이 실패한 것처럼 보인다.
# =====================================================================

param(
    # 느린 층(build · walkthrough)을 건너뛴다. 바퀴 중간의 빠른 확인용.
    [switch] $Fast
)

$ErrorActionPreference = "Stop"
$root   = Split-Path -Parent $PSScriptRoot
$ciDir  = Join-Path $root ".ci"
$logDir = Join-Path $ciDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$layers = New-Object System.Collections.ArrayList
$red    = 0

function Add-Layer([string] $name, [string] $state, [string] $note) {
    $null = $layers.Add([pscustomobject]@{ name = $name; state = $state; note = $note })
    $c = "DarkGray"
    if ($state -eq "OK")   { $c = "Green" }
    if ($state -eq "FAIL") { $c = "Red"; $script:red++ }
    Write-Host ("  {0,-12} {1,-5} {2}" -f $name, $state, $note) -ForegroundColor $c
}

# 네이티브 명령을 cmd 로 돌리고 exit code 를 돌려준다. 출력은 로그 파일로.
function Invoke-Layer([string] $name, [string] $command) {
    $log = Join-Path $logDir "$name.txt"
    $t0  = Get-Date
    & cmd.exe /c "$command > `"$log`" 2>&1"
    $code = $LASTEXITCODE
    $sec  = [int]((Get-Date) - $t0).TotalSeconds
    return [pscustomobject]@{ code = $code; sec = $sec; log = $log }
}

#  ⚠ 빈 줄을 걸러낸다. 안 그러면 마지막 줄이 개행이라 **아무 단서 없는 빈 note** 가 나온다 —
#    운영자가 로그 파일을 열기 전까지 무슨 일이 있었는지 모른다.
function Get-LastLines([string] $path, [int] $n = 3) {
    if (-not (Test-Path $path)) { return "" }
    #  ⚠ **-Encoding UTF8 을 빼지 마라.** cmd 리다이렉트로 받은 로그는 **BOM 없는 UTF-8** 인데,
    #    Get-Content 는 BOM 이 없으면 시스템 ANSI(한국어 Windows 는 949)로 읽는다.
    #    그러면 한글 진단이 통째로 깨져서 나오고, 운영자는 로그를 못 읽는다.
    $t = @(Get-Content $path -Encoding UTF8 -ErrorAction SilentlyContinue | Where-Object { $_.Trim() -ne "" })
    if ($t.Count -eq 0) { return "" }
    $take = $t[-([Math]::Min($n, $t.Count))..-1]
    return (($take -join " / ") -replace "\s+", " ").Trim()
}

Write-Host ""
Write-Host "=== ContextOps CI ===" -ForegroundColor Cyan

# ── 1층 · 절대 원칙 ───────────────────────────────────────────────
#  제일 먼저 돌고, 여기가 빨가면 나머지가 초록이어도 실패다.
$r = Invoke-Layer "principles" ("powershell -NoProfile -ExecutionPolicy Bypass -File `"{0}`" -Quiet" -f (Join-Path $PSScriptRoot "principles.ps1"))
$summ = ""
$pf = Join-Path $ciDir "principles.txt"
if (Test-Path $pf) { $summ = (Get-Content $pf -TotalCount 1) }
if ($r.code -eq 0) { Add-Layer "principles" "OK" $summ }
else               { Add-Layer "principles" "FAIL" "$summ — .ci/principles.txt 를 읽어라" }

# ── 2층 · 타입 ────────────────────────────────────────────────────
$hasWorkspace = Test-Path (Join-Path $root "pnpm-workspace.yaml")
$hasModules   = Test-Path (Join-Path $root "node_modules")

if (-not $hasWorkspace) {
    Add-Layer "typecheck" "SKIP" "pnpm-workspace.yaml 없음"
    Add-Layer "test"      "SKIP" "pnpm-workspace.yaml 없음"
} elseif (-not $hasModules) {
    Add-Layer "typecheck" "FAIL" "node_modules 가 없다 — pnpm install 먼저"
    Add-Layer "test"      "SKIP" "설치 안 됨"
} elseif ($red -gt 0) {
    Add-Layer "typecheck" "SKIP" "앞 층이 빨갛다"
    Add-Layer "test"      "SKIP" "앞 층이 빨갛다"
} else {
    #  ⚠ 검사 명령을 여기 적지 마라 — 루트 package.json 의 스크립트가 정본이다.
    #    여기와 .github/workflows/ci.yml 에 각각 적으면 셋이 갈라진다.
    $r = Invoke-Layer "typecheck" "pnpm typecheck"
    if ($r.code -eq 0) { Add-Layer "typecheck" "OK" "$($r.sec)초" }
    else               { Add-Layer "typecheck" "FAIL" (Get-LastLines $r.log) }

    # ── 3층 · 테스트 ──────────────────────────────────────────────
    if ($red -gt 0) {
        Add-Layer "test" "SKIP" "앞 층이 빨갛다"
    } else {
        $r = Invoke-Layer "test" "pnpm test"
        if ($r.code -eq 0) { Add-Layer "test" "OK" "$($r.sec)초" }
        else               { Add-Layer "test" "FAIL" (Get-LastLines $r.log) }
    }
}

# ── 4층 · 빌드 ────────────────────────────────────────────────────
$hasWeb = Test-Path (Join-Path $root "apps\web\package.json")
if ($Fast)          { Add-Layer "build" "SKIP" "-Fast" }
elseif (-not $hasWeb) { Add-Layer "build" "SKIP" "apps/web 없음" }
elseif ($red -gt 0) { Add-Layer "build" "SKIP" "앞 층이 빨갛다" }
else {
    $r = Invoke-Layer "build" "pnpm --filter web build"
    if ($r.code -eq 0) { Add-Layer "build" "OK" "$($r.sec)초" }
    else               { Add-Layer "build" "FAIL" (Get-LastLines $r.log) }
}

# ── 5층 · 관통 시나리오 ───────────────────────────────────────────
#  import → publish → sync 가 실제로 지나는가. 이게 「된다」의 유일한 근거다.
$wt = Join-Path $PSScriptRoot "walkthrough.ps1"
if ($Fast)              { Add-Layer "walkthrough" "SKIP" "-Fast" }
elseif (-not (Test-Path $wt)) { Add-Layer "walkthrough" "SKIP" "tools/walkthrough.ps1 없음" }
elseif ($red -gt 0)     { Add-Layer "walkthrough" "SKIP" "앞 층이 빨갛다" }
else {
    $r = Invoke-Layer "walkthrough" ("powershell -NoProfile -ExecutionPolicy Bypass -File `"{0}`"" -f $wt)
    #  exit 2 = 「아직 관통할 게 없다」. 실패가 아니다 (P0 단계).
    if     ($r.code -eq 0) { Add-Layer "walkthrough" "OK"   "$($r.sec)초" }
    elseif ($r.code -eq 2) { Add-Layer "walkthrough" "SKIP" (Get-LastLines $r.log 1) }
    else                   { Add-Layer "walkthrough" "FAIL" (Get-LastLines $r.log) }
}

# ── 한 줄 결과 ────────────────────────────────────────────────────
$verdict = "GREEN"
if ($red -gt 0) { $verdict = "RED" }

$parts = ($layers | ForEach-Object { "{0} {1}" -f $_.name, $_.state }) -join " | "
$line  = "{0} | {1} => {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm"), $parts, $verdict
Set-Content -Path (Join-Path $ciDir "result") -Value $line -Encoding UTF8

Write-Host ""
if ($verdict -eq "GREEN") { Write-Host "  $verdict" -ForegroundColor Green }
else                      { Write-Host "  $verdict — .ci/logs/ 를 읽어라" -ForegroundColor Red }
Write-Host "  $line" -ForegroundColor DarkGray
Write-Host ""

if ($red -gt 0) { exit 1 }
exit 0
