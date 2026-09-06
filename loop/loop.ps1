# =====================================================================
#  loop/loop.ps1 — 자율 개발 루프 본체
#
#  한 바퀴마다 **새 헤드리스 세션**을 연다. 대화를 이어 붙이지 않는다.
#  이게 핵심이다 — 기억은 대화가 아니라 docs/ 의 파일에 산다.
#
#  실행:  powershell -ExecutionPolicy Bypass -File loop\loop.ps1
#         powershell -ExecutionPolicy Bypass -File loop\loop.ps1 -DryRun -Cycles 2
#
#  멈추기: loop\STOP 파일을 만들면 현재 바퀴를 마치고 멈춘다.
#  ⚠ 켜고 끄는 건 loop\ctl.ps1 로 한다. 직접 실행하면 이 창에 묶이고,
#    창을 닫으면 같이 죽는다.
# =====================================================================

param(
    # 아무것도 안 고치고 "다음에 뭘 할지" 만 보고하게 한다.
    # 턴 수·시간·비용을 재는 용도 — 다른 세션이 작업 중이어도 안전하다.
    [switch] $DryRun,

    # 이번 실행만 바퀴 수를 덮어쓴다 (시험 주행용)
    [int] $Cycles = 0
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "env.ps1")
. (Join-Path $PSScriptRoot "common.ps1")

if ($Cycles -gt 0) { $LOOP.MaxCycles = $Cycles }

$stopFile = Join-Path $PSScriptRoot "STOP"
$logDir   = Join-Path $root "logs"
$cycleDir = Join-Path $logDir "cycles"
New-Item -ItemType Directory -Force -Path $cycleDir | Out-Null

$today   = Get-Date -Format "yyyy-MM-dd"
$mainLog = Join-Path $logDir ("loop_{0}.log" -f $today)

function Log([string] $msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
    Write-Host $line
    try { Add-Content -Path $mainLog -Value $line -Encoding UTF8 } catch { }
}

# ── 부트스트랩 프롬프트 ───────────────────────────────────────────
#  ⚠ 일부러 영어다. 한글을 Start-Process 인자로 넘기면 인코딩이 깨진다.
#    진짜 지시는 전부 loop/PROMPT.md 안에 한글로 있고, 그건 Read 도구가
#    UTF-8 로 제대로 읽는다.
#  ⚠ 큰따옴표를 넣지 마라 — 아래 명령행 조립에서 깨진다.
$BOOT_WORK = "Read loop/PROMPT.md and follow it exactly. That file is the entire task for this cycle."
$BOOT_DRY  = "Read loop/PROMPT.md and docs/STATUS.md. This is a DRY RUN: do NOT create, modify, or delete any file, and do NOT run any git command that changes state. Report in at most 5 lines: what the next task would be, and which files you would touch."

# ── 사전 점검 ─────────────────────────────────────────────────────
if (-not (Test-Path $LOOP.ClaudeExe)) {
    Log "claude.exe 를 못 찾는다: $($LOOP.ClaudeExe)"
    Log "loop\env.ps1 의 ClaudeExe 를 고쳐라. 스케줄러는 PATH 를 안 물려받는다."
    exit 1
}

# 바퀴를 돌기 전에 도구를 **직접 불러 본다.** 있다고 믿지 않는다.
function Test-Preflight {
    foreach ($c in $LOOP.PreflightCmds) {
        try {
            $null = & cmd.exe /c "$c" 2>&1
            if ($LASTEXITCODE -ne 0) { return $c }
        } catch { return $c }
    }
    return $null
}

# ── 중복 실행 방지 ────────────────────────────────────────────────
#  ★ 두 루프가 같은 저장소에서 동시에 돌면 **두 AI 세션이 같은 파일을 고치고
#    같은 브랜치에 커밋한다.** 한쪽이 남의 반쯤 된 작업을 같이 커밋하거나
#    둘이 서로를 덮어쓴다. 무인이라 아무도 못 본다.
#
#  ⚠ DRY RUN 은 잠그지 않는다. 파일을 하나도 안 고치므로 옆에서 도는 진짜 루프와
#    부딪히지 않고, 그게 dryrun 의 존재 이유다 ("작업 중이어도 안전하다").
#    대신 로그 파일 이름을 갈라 놔서 진짜 바퀴의 기록을 덮지 않는다.
$lockScope = ""
$lock = $null
if (-not $DryRun) {
    $lock = Enter-LoopLock $root ([ref] $lockScope)
    if (-not $lock) {
        $who = Read-LoopLockInfo $root
        Log "이미 루프가 돌고 있다 — 켜지 않는다."
        if ($who) { Log ("  주인: PID {0} @ {1} · {2} 부터 (바퀴 {3})" -f $who.pid, $who.host, $who.started, $who.cycle) }
        Log "  세우려면: loop\ctl.ps1 stop"
        #  ⚠ exit 0 이다. 0 이 아니면 스케줄러가 [비정상 종료] 로 보고 3번 다시 켠다 —
        #    그때마다 같은 벽에 부딪히며 로그만 더럽힌다.
        exit 0
    }

    #  잠금을 잡았다 = 앞 주인이 죽었다. 그 자식 claude 가 살아 있으면 **고아**다.
    #  놔두면 새 루프 옆에서 같은 저장소를 계속 고친다 — 뮤텍스를 우회한 중복이다.
    $orphan = Stop-LoopOrphan $root
    if ($orphan) { Log "앞 판이 남긴 고아 세션(PID $orphan)을 정리했다." }

    Write-LoopLockInfo $root @{ cycle = 0 }
}

$branchNow = Get-LoopBranch $root
$dryTag = ""
if ($DryRun) { $dryTag = " · DRY RUN" }

Log "=========================================================="

#  ★ 첫 줄은 **무엇을 만드는 루프인가**다. logs/ 는 프로젝트마다 똑같이 생겨서,
#    나중에 로그를 열었을 때 이 줄이 없으면 어느 저장소 기록인지 모른다.
#    값은 loop/env.ps1 한 곳에 산다 (Project · ProjectLine).
Log ("■ {0} — {1}" -f $LOOP.Project, $LOOP.ProjectLine)
Log ("  저장소: {0}" -f $root)

Log ("루프 시작 — 브랜치 {0} · 모델 {1} · 노력 {2} · 최대 {3}바퀴 / {4}시간{5}" -f `
     $branchNow, $LOOP.Model, $LOOP.Effort, $LOOP.MaxCycles, $LOOP.MaxHours, $dryTag)

# ⚠ 홑따옴표다. PowerShell 이중 따옴표는 백슬래시를 이스케이프하지 않아서
#   "Local\\" 는 백슬래시 **두 개**짜리 문자열이 되고, 이 비교는 영원히 거짓이 된다.
if ($lockScope -eq 'Local\') {
    #  세션을 넘는 중복은 못 잡는다. 조용히 넘어가면 사람이 모른다.
    Log "⚠ Global 뮤텍스를 못 만들어 Local 로 잠갔다 — 다른 로그온 세션의 루프는 못 막는다."
}

if (-not $DryRun -and $branchNow -ne $LOOP.Branch) {
    Log "⚠ 지금 브랜치가 [$branchNow] 다 — 기대한 건 [$($LOOP.Branch)]."
    Log "  ctl.ps1 start 로 켜면 브랜치를 맞춰 준다. 그대로 진행한다."
}

$deadline   = (Get-Date).AddHours($LOOP.MaxHours)
$cycle      = 0
$waitCount  = 0
$backoffMin = $LOOP.BackoffMin
$totalCost  = 0.0
$idleRun    = 0

try {

while ($true) {

    if (Test-Path $stopFile) { Log "STOP 파일을 봤다 — 멈춘다."; break }
    if ($cycle -ge $LOOP.MaxCycles) { Log "최대 바퀴($($LOOP.MaxCycles)) 도달 — 멈춘다."; break }
    if ((Get-Date) -gt $deadline)   { Log "제한 시간($($LOOP.MaxHours)h) 도달 — 멈춘다."; break }
    if ($LOOP.MaxCostUsd -gt 0 -and $totalCost -ge $LOOP.MaxCostUsd) {
        Log ("비용 상한(USD {0}) 도달 — 누적 USD {1:N2}. 멈춘다." -f $LOOP.MaxCostUsd, $totalCost)
        break
    }

    # ── 도구가 살아 있나 ─────────────────────────────────────────
    #  없으면 **일하지 않는다.** git·node 없이 도는 바퀴는 전부 실패하는데
    #  결과 줄은 멀쩡해서 로그만 봐선 모른다.
    if (-not $DryRun) {
        $bad = Test-Preflight
        if ($bad) {
            $waitCount++
            if ($waitCount -gt $LOOP.PreflightWaitMax) {
                Log "사전 점검 [$bad] 이 $($LOOP.PreflightWaitMax)번 기다려도 안 통과한다 — 루프를 끝낸다."
                break
            }
            Log "사전 점검 실패: [$bad] — 일하지 않고 $($LOOP.PreflightWaitSec)초 대기 ($waitCount/$($LOOP.PreflightWaitMax))"
            Start-Sleep -Seconds $LOOP.PreflightWaitSec
            continue
        }
        $waitCount = 0
    }

    $cycle++
    $tag        = "{0}_c{1:d3}" -f $today, $cycle
    if ($DryRun) { $tag = "{0}_dry{1:d3}" -f $today, $cycle }   # 진짜 바퀴 기록을 안 덮는다
    $outFile    = Join-Path $cycleDir "$tag.jsonl"
    $errFile    = Join-Path $cycleDir "$tag.err.txt"
    $started    = Get-Date
    $headBefore = Get-LoopHead $root

    Log "---- 바퀴 $cycle 시작 ----"

    $boot = $BOOT_WORK
    $mode = "bypassPermissions"
    if ($DryRun) { $boot = $BOOT_DRY; $mode = "acceptEdits" }

    #  🔴 **인자를 배열로 넘기면 안 된다.**
    #
    #  ★ Windows PowerShell 의 Start-Process -ArgumentList <배열> 은 원소를
    #    **공백으로 이어 붙이기만 하고 따옴표를 안 씌운다.** 그래서 부트 프롬프트가
    #    단어 단위로 쪼개져 -p 에는 "Read" 한 단어만 들어가고 나머지는 엉뚱한
    #    위치 인자가 된다.
    #
    #  ★ 증상이 고약하다 — **에러가 안 난다.** 세션이 할 일을 못 본 채로 떠서
    #    "무엇을 도와드릴까요?" 라고 답하고 끝난다 (10초 · 1턴). 바퀴는 OK 로
    #    기록되고 코드는 아무것도 안 바뀐다. 조용한 실패의 전형이다.
    #    (아래 「빈 바퀴」 감지가 이걸 두 번째로 잡는 그물이다.)
    #
    #  ★ 그래서 **한 줄짜리 명령행**으로 만들고 프롬프트만 따옴표로 감싼다.
    $argLine = '-p "{0}" --model {1} --permission-mode {2} --output-format stream-json --verbose' -f `
               $boot, $LOOP.Model, $mode
    if ($LOOP.Effort) { $argLine += " --effort $($LOOP.Effort)" }

    $proc = $null
    try {
        $proc = Start-Process -FilePath $LOOP.ClaudeExe -ArgumentList $argLine `
                    -WorkingDirectory $root -NoNewWindow -PassThru `
                    -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    } catch {
        Log "세션을 못 띄웠다: $($_.Exception.Message)"
        Start-Sleep -Seconds $LOOP.SleepBetweenSec
        continue
    }

    #  자식 PID 를 남긴다. 이 루프가 강제 종료되면 다음 루프가 이걸 보고
    #  살아남은 고아 세션을 정리한다.
    if (-not $DryRun) { Write-LoopLockInfo $root @{ child_pid = $proc.Id; cycle = $cycle } }

    $timeoutMs = $LOOP.CycleTimeoutMin * 60 * 1000
    $finished  = $proc.WaitForExit($timeoutMs)
    $timedOut  = $false

    if (-not $finished) {
        $timedOut = $true
        Log "시간 초과($($LOOP.CycleTimeoutMin)분) — 세션을 정리한다."
        & taskkill.exe /PID $proc.Id /T /F 2>&1 | Out-Null
        $proc.WaitForExit(15000) | Out-Null
    }

    $elapsed = [int]((Get-Date) - $started).TotalSeconds

    # ── 결과 한 줄 뽑기 ───────────────────────────────────────────
    #  stream-json 의 마지막 result 줄에 num_turns·비용이 들어 있다.
    #  CLI 에 --max-turns 가 없으므로, 여기 num_turns 가 곧
    #  "우리 한 바퀴가 실제로 몇 턴인가" 의 유일한 근거다.
    $turns = "?"; $cost = "?"; $isErr = $false; $subtype = ""; $resultText = ""
    try {
        $resLine = Get-Content $outFile -Encoding UTF8 -ErrorAction SilentlyContinue |
                   Where-Object { $_ -match '"type"\s*:\s*"result"' } | Select-Object -Last 1
        if ($resLine) {
            $r = $resLine | ConvertFrom-Json
            if ($null -ne $r.num_turns)      { $turns = $r.num_turns }
            if ($null -ne $r.total_cost_usd) {
                $cost = "{0:N2}" -f $r.total_cost_usd
                $totalCost += [double] $r.total_cost_usd
            }
            if ($null -ne $r.is_error)       { $isErr = [bool] $r.is_error }
            if ($null -ne $r.subtype)        { $subtype = [string] $r.subtype }
            if ($null -ne $r.result)         { $resultText = [string] $r.result }
        }
    } catch { }

    $verdict = "OK"
    if ($timedOut)  { $verdict = "TIMEOUT" }
    elseif ($isErr) { $verdict = "ERROR($subtype)" }

    #  🔴 **결과 줄이 없으면 그건 「끝난 것」이 아니라 「잘린 것」이다.**
    #    stream-json 은 정상 종료할 때 반드시 type:result 를 마지막에 낸다.
    #    그게 없다는 건 세션이 **도중에 끊겼다**는 뜻이다 (2026-09-06 실측:
    #    바퀴 1 이 43턴·툴 34번·648KB 를 쓰고 result 없이 130초에 끝났다).
    #  ★ 그때 「?턴 · 비용 ?」만 찍으면 **죽은 건지 그냥 끝난 건지 구분이 안 된다.**
    #    자식의 종료 코드가 그 둘을 가른다 — 0 이 아니면 죽은 것이고,
    #    0xC000013A(-1073741510)면 콘솔 종료 신호를 맞은 것이다.
    if ($turns -eq "?" -and -not $timedOut) {
        $ec = "?"
        try { $ec = $proc.ExitCode } catch { }
        $verdict = "CUT(exit=$ec)"
        Log "  ⚠ 결과 줄이 없다 — 세션이 도중에 잘렸다. 자식 종료 코드 $ec"
        if ($ec -eq -1073741510) {
            Log "  ⚠ 0xC000013A = 콘솔 종료 신호(Ctrl+C 계열). 창이 닫혔거나 밖에서 끊었다."
        }
        Log "  로그: logs\cycles\$tag.jsonl ($([int]((Get-Item $outFile).Length/1KB))KB)"
    }

    # ── 이번 바퀴가 실제로 뭘 남겼나 ──────────────────────────────
    #  "OK" 는 「세션이 안 죽었다」지 「일했다」가 아니다. 커밋으로 잰다.
    $headAfter  = Get-LoopHead $root
    $newCommits = 0
    if ($headBefore -and $headAfter -and $headBefore -ne $headAfter) {
        $newCommits = [int](& git -C $root rev-list --count "$headBefore..$headAfter" 2>$null)
    }

    Log ("바퀴 {0} 끝 — {1} · {2}초 · {3}턴 · 비용 {4} · 커밋 {5}개 (누적 USD {6:N2})" -f `
         $cycle, $verdict, $elapsed, $turns, $cost, $newCommits, $totalCost)

    # ── 공개 저장소로 올린다 ──────────────────────────────────────
    #  ★ 왜 PROMPT 가 아니라 여기냐 — 모델이 기억하길 기대하는 것보다 **기계가 하는 게
    #    확실하다.** 「커밋했으면 push」는 판단이 필요 없는 일이라 여기 있어야 한다.
    #    (같은 이유로 원칙 검사도 문서가 아니라 tools/principles.ps1 에 있다.)
    #
    #  ★ 커밋이 없으면 안 부른다 — 부를 이유가 없고, 로그만 더러워진다.
    #  ⚠ 실패해도 **바퀴를 죽이지 않는다.** 네트워크는 끊길 수 있고, 커밋은 이미
    #    로컬에 있다. 다음 바퀴가 밀린 것까지 같이 올린다.
    #  ⚠ GIT_TERMINAL_PROMPT=0 — 자격증명이 없을 때 **묻지 말고 실패해라.**
    #    없으면 무인 세션이 프롬프트 앞에서 바퀴 시간을 통째로 날린다.
    if (-not $DryRun -and $newCommits -gt 0 -and $LOOP.AutoPush) {
        $env:GIT_TERMINAL_PROMPT = "0"
        $pushOut = & git -C $root push origin $LOOP.Branch 2>&1
        if ($LASTEXITCODE -eq 0) {
            Log "  push 했다 — origin/$($LOOP.Branch)"
        } else {
            $first = ($pushOut | Select-Object -First 1)
            Log "  ⚠ push 실패 (커밋은 로컬에 있다): $first"
        }
    }

    # ── 일시적 실패면 물러선다 ────────────────────────────────────
    #  사용량 한도든 서버 과부하든, 안 물러서면 실패 응답만 받으며 밤을 버린다.
    #
    #  🔴 여기가 rift 에서 **오탐이었다.** stream-json 전체를 훑어 rate.?limit 를
    #    찾았는데, 그 문자열은 사용량 메타데이터의 **필드 이름**(rate_limit)으로
    #    늘 들어 있다. 그래서 **성공한 바퀴 뒤에도** 20분을 물러섰다.
    #  ★ 그래서 **결과 줄의 에러 문구만** 본다. 성공한 바퀴는 아예 후보가 안 된다.
    #
    #  🔴 2026-09-03 여기가 **놓치는 쪽으로도** 틀렸다 (실측). 밤 10시대에 세 바퀴가
    #    연달아 "API Error: 500 Internal server error" · "API Error: 529 Overloaded" 로
    #    끝났다 — 사용량 한도가 아니라 **Anthropic API 자체의 일시 과부하**다.
    #    옛 정규식이 이걸 안 잡아서 **물러서지 않고 그대로 재시도**했고, 세 바퀴가
    #    거의 빈손(0~1턴)으로 끝나며 아래 「빈 바퀴 감지」를 태워 루프가 멈췄다.
    #    ★ 첫 바퀴(58턴·677초)는 **실제로 일을 했는데** 커밋 직전에 500 을 맞아
    #      끊겼다 — 그 결과가 워킹트리에 그대로 남는다(다음 바퀴가 이어받는다).
    $limitHit = $false
    #  🔴 2026-09-06 **`session limit` 을 놓쳤다** (실측). 바퀴 11·12 가
    #    "You've hit your session limit · resets 8:30am" 로 **4초 만에** 끝났는데
    #    옛 정규식이 `usage limit`·`rate limit` 만 봐서 안 걸렸다 — 물러서지 않고
    #    바퀴 둘을 그냥 태웠고 MaxCycles 를 채워 판이 끝났다.
    #  ★ 한도 문구는 제품이 바꾼다. **`limit` 이 들어간 문구는 넓게 잡아라** —
    #    오탐(20분 손해)보다 미탐(밤을 통째로 버림)이 훨씬 비싸다.
    if ($isErr -and $resultText -match "usage limit|rate limit|session limit|quota exceeded|too many requests|429|API Error:\s*5\d\d|Overloaded|Internal server error") {
        $limitHit = $true
    }

    if ($limitHit) {
        Log "일시적 실패로 보인다(사용량 한도 또는 서버 과부하) — $backoffMin 분 물러선다."
        Start-Sleep -Seconds ($backoffMin * 60)
        $backoffMin = [Math]::Min($backoffMin * 2, $LOOP.BackoffMaxMin)
        $cycle--            # 이걸로 못 한 바퀴는 바퀴로도, 빈 바퀴로도 세지 않는다
        continue
    }
    $backoffMin = $LOOP.BackoffMin

    # ── 빈 바퀴가 이어지면 멈춘다 ─────────────────────────────────
    #  ⚠ 타임아웃은 세지 않는다 — 일은 했는데 커밋 전에 잘렸을 수 있다.
    if (-not $DryRun -and -not $timedOut -and $newCommits -eq 0) {
        $idleRun++
        Log "커밋이 없는 바퀴다 ($idleRun/$($LOOP.IdleCyclesMax) 연속)."
        if ($idleRun -ge $LOOP.IdleCyclesMax) {
            Log "연속 $idleRun 바퀴가 아무것도 안 남겼다 — 벽에 부딪힌 것으로 보고 멈춘다."
            Log "logs\cycles\$tag.jsonl 을 열어 세션이 무엇을 했는지 봐라."
            break
        }
    } else { $idleRun = 0 }

    if (Test-Path $stopFile) { Log "STOP 파일을 봤다 — 멈춘다."; break }
    Start-Sleep -Seconds $LOOP.SleepBetweenSec
}

} finally {
    #  ★ finally 여야 한다. 도중에 예외로 튀어나가도 잠금은 놓아야 다음 판이 켜진다.
    #    (강제 종료로 여기까지 못 와도 OS 가 뮤텍스를 놓아준다 — 그래서 뮤텍스다.)
    if (-not $DryRun) {
        Clear-LoopLockInfo $root
        Exit-LoopLock $lock
    }
}

Log ("루프 종료 — 총 {0}바퀴 · 누적 비용 USD {1:N2}. 로그: {2}" -f $cycle, $totalCost, $mainLog)
Log "=========================================================="
