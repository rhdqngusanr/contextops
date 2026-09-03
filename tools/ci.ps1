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

#  워크스페이스 멤버를 센다 (루트는 뺀다).
#
#  ★ 왜 이 함수가 있나 — `pnpm -r <script>` 는 매칭되는 패키지가 하나도 없으면
#    "No projects matched the filters" 를 찍고 **exit 0** 이다. 그대로 두면 ci.ps1 이
#    **아무것도 검사하지 않았는데 `typecheck OK · test OK`** 로 보고한다.
#    (직접 재현: 빈 워크스페이스에서 `pnpm -r test` → EXIT=0)
#    가짜 초록보다 SKIP 이 낫다 — SKIP 은 「대상이 생기면 풀린다」를 약속하고
#    OK 는 「검사했다」를 약속한다. 지키지 못할 약속을 하지 마라.
function Get-WorkspaceMembers([string] $dir) {
    $tmp = Join-Path $env:TEMP ("ci-members-{0}.json" -f $PID)
    Push-Location $dir
    & cmd.exe /c "pnpm ls -r --depth -1 --json > `"$tmp`" 2>nul"
    Pop-Location
    if (-not (Test-Path $tmp)) { return @() }
    $raw = Get-Content $tmp -Raw -Encoding UTF8
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
    try { $all = $raw | ConvertFrom-Json } catch { return @() }
    return @($all | Where-Object { $_.path -and ($_.path.TrimEnd('\') -ne $dir.TrimEnd('\')) })
}

#  그 멤버들 중 `test` 스크립트를 실제로 가진 것을 센다.
#  ★ 왜 따로 세나 — 멤버가 있어도 `test` 스크립트가 없으면 `pnpm -r test` 는 그 패키지를
#    **조용히 건너뛰고 exit 0** 이다. 멤버 수만 세면 「패키지는 있는데 아무도 테스트를
#    안 도는」 상태가 다시 가짜 OK 가 된다 (pnpm-workspace.yaml 의 「셋 중 하나라도
#    없으면 검사 없이 초록」과 같은 함정이다).
function Get-TestableMembers($members) {
    return @($members | Where-Object {
        $pj = Join-Path $_.path "package.json"
        $ok = $false
        if (Test-Path $pj) {
            try {
                $j = (Get-Content $pj -Raw -Encoding UTF8) | ConvertFrom-Json
                if ($j.scripts -and $j.scripts.test) { $ok = $true }
            } catch { $ok = $false }
        }
        $ok
    })
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
    #
    #  먼저 **검사 대상이 있는지** 센다. 없는데 OK 를 찍으면 그게 제일 나쁜 고장이다.
    $members  = Get-WorkspaceMembers $root
    $testable = Get-TestableMembers $members

    if ($members.Count -eq 0) {
        Add-Layer "typecheck" "SKIP" "워크스페이스 멤버 0개"
        Add-Layer "test"      "SKIP" "워크스페이스 멤버 0개"
    } else {
        $r = Invoke-Layer "typecheck" "pnpm typecheck"
        if ($r.code -eq 0) { Add-Layer "typecheck" "OK" ("{0}초 · 멤버 {1}개" -f $r.sec, $members.Count) }
        else               { Add-Layer "typecheck" "FAIL" (Get-LastLines $r.log) }

        # ── 3층 · 테스트 ──────────────────────────────────────────
        if ($red -gt 0) {
            Add-Layer "test" "SKIP" "앞 층이 빨갛다"
        } elseif ($testable.Count -eq 0) {
            Add-Layer "test" "SKIP" ("test 스크립트를 가진 멤버 0개 (멤버 {0}개)" -f $members.Count)
        } else {
            $r = Invoke-Layer "test" "pnpm test"
            #  note 에 **몇 개를 돌렸는지** 남긴다 — .ci/result 한 줄만 보고도
            #  「0개를 돌고 초록」인지 사람이 알 수 있어야 한다.
            if ($r.code -eq 0) { Add-Layer "test" "OK" ("{0}초 · 멤버 {1}개" -f $r.sec, $testable.Count) }
            else               { Add-Layer "test" "FAIL" (Get-LastLines $r.log) }
        }
    }
}

# ── 4층 · 빌드 ────────────────────────────────────────────────────
#  ★ 폴더가 있다고 빌드가 있는 것은 아니다. apps/web 은 DB 층(P1 첫 행)이 먼저 생기고
#    Next 앱(P1 넷째 행)은 나중에 붙는다. 그 사이에 `pnpm --filter web build` 를 그냥
#    부르면 「build 스크립트가 없다」로 빨개지는데, 그건 **고장이 아니라 아직 없는 것**이다.
#    2·3층이 멤버를 먼저 세는 것과 같은 이유로 여기서도 **대상을 먼저 센다.**
#    ⚠ 반대쪽 함정도 같이 기억해라 — build 스크립트가 **생겼는데도** SKIP 이 나오면
#      그건 이 검사가 눈을 가린 것이다. note 에 이유를 적어서 한 줄만 보고도 구별되게 한다.
$webPkg = Join-Path $root "apps\web\package.json"
$hasWeb = Test-Path $webPkg
$hasBuildScript = $false
if ($hasWeb) {
    try {
        $wj = (Get-Content $webPkg -Raw -Encoding UTF8) | ConvertFrom-Json
        if ($wj.scripts -and $wj.scripts.build) { $hasBuildScript = $true }
    } catch { $hasBuildScript = $false }
}
if ($Fast)          { Add-Layer "build" "SKIP" "-Fast" }
elseif (-not $hasWeb) { Add-Layer "build" "SKIP" "apps/web 없음" }
elseif (-not $hasBuildScript) { Add-Layer "build" "SKIP" "apps/web 에 build 스크립트 없음 — Next 앱은 아직이다 (PLAN P1 넷째 행)" }
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
