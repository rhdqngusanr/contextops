# =====================================================================
#  loop/ctl.ps1 — 루프를 켜고 / 끄고 / 들여다본다
#
#    powershell -ExecutionPolicy Bypass -File loop\ctl.ps1 install
#    powershell -ExecutionPolicy Bypass -File loop\ctl.ps1 dryrun     # 두 바퀴 시험 (안전)
#    powershell -ExecutionPolicy Bypass -File loop\ctl.ps1 start
#    powershell -ExecutionPolicy Bypass -File loop\ctl.ps1 status
#    powershell -ExecutionPolicy Bypass -File loop\ctl.ps1 stop
#    powershell -ExecutionPolicy Bypass -File loop\ctl.ps1 uninstall
#
#  ⚠ loop.ps1 을 직접 실행하지 마라. 무한 루프라 그 창과 세션이 거기 묶이고,
#    창을 닫으면 같이 죽는다. 작업 스케줄러로 돌려야 로그아웃·재부팅을 넘긴다.
# =====================================================================

param(
    [Parameter(Position = 0)]
    [ValidateSet("install", "uninstall", "start", "stop", "status", "dryrun")]
    [string] $Action = "status"
)

$ErrorActionPreference = "Stop"

$root     = Split-Path -Parent $PSScriptRoot
$loopPs1  = Join-Path $PSScriptRoot "loop.ps1"
$stopFile = Join-Path $PSScriptRoot "STOP"
$taskName = "contextops-loop"

. (Join-Path $PSScriptRoot "env.ps1")
. (Join-Path $PSScriptRoot "common.ps1")

function Say([string] $m, [string] $c = "Gray") { Write-Host $m -ForegroundColor $c }

# 지금 누가 잠금을 들고 있나. 없으면 $null.
#  ⚠ 이건 그 **순간의 사실**이다. 확인과 시작 사이에 남이 잡을 수 있다.
#    진짜 배타는 loop.ps1 이 잠금을 **들고 있는 것**으로만 된다 — 여기는 안내일 뿐이다.
function Get-LockHolder {
    if (-not (Test-LoopLockHeld $root)) { return $null }
    $who = Read-LoopLockInfo $root
    if ($who) { return ("PID {0} @ {1} · {2} 부터 (바퀴 {3})" -f $who.pid, $who.host, $who.started, $who.cycle) }
    return "(누구인지 모름 — loop\.lock 이 없다)"
}

# claude.exe 를 찾는다. env 값이 맞으면 그걸 쓰고, 아니면 PATH 에서 되짚는다.
function Find-ClaudeExe {
    if (Test-Path $LOOP.ClaudeExe) { return $LOOP.ClaudeExe }
    $cmd = Get-Command claude -ErrorAction SilentlyContinue
    if ($cmd) {
        # claude.cmd 옆에 실제 exe 가 사는 자리들
        $guesses = @(
            (Join-Path (Split-Path $cmd.Source) "node_modules\@anthropic-ai\claude-code\bin\claude.exe"),
            (Join-Path (Split-Path $cmd.Source) "claude.exe")
        )
        foreach ($g in $guesses) { if (Test-Path $g) { return $g } }
    }
    return $null
}

# ── 작업 스케줄러 등록 ────────────────────────────────────────────
function Do-Install {
    # PATH 를 지금 셸에서 통째로 떠서 박아 둔다.
    # 자동 실행은 평소 터미널 환경을 안 물려받는다 — 빠뜨리면 git·node 를
    # 못 찾고 조용히 죽는다. 로그에도 안 남는 게 제일 나쁘다.
    $exe = Find-ClaudeExe
    if (-not $exe) {
        Say "claude.exe 를 못 찾았다. loop\env.ps1 의 ClaudeExe 를 손으로 채워라." "Red"
        return
    }

    $local = Join-Path $PSScriptRoot "env.local.ps1"
    $lines = @(
        "# ctl.ps1 install 이 자동 생성했다. 커밋하지 않는다 (.gitignore).",
        "# 설치 시점의 PATH 를 그대로 박아 둔다 — 스케줄러는 PATH 를 안 물려받는다.",
        ('$env:PATH = ' + "'" + ($env:PATH -replace "'", "''") + "'"),
        ('$LOOP.ClaudeExe = ' + "'" + ($exe -replace "'", "''") + "'")
    )
    [System.IO.File]::WriteAllText($local, ($lines -join "`r`n"), (New-Object System.Text.UTF8Encoding $true))
    Say "PATH 와 claude.exe 경로를 loop\env.local.ps1 에 박았다." "DarkGray"
    Say "  claude.exe: $exe" "DarkGray"

    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument ("-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"{0}`"" -f $loopPs1) `
        -WorkingDirectory $root

    #  ⚠ -User 를 명시해야 한다. 빼면 비관리자 세션에서 "Access is denied" 로 죽는다
    #    (실측 2026-09-03). 스케줄러는 「누구로 등록하는지」가 불명확하면 관리자 권한을 요구한다.
    $me = "{0}\{1}" -f $env:USERDOMAIN, $env:USERNAME

    #  🔴 2026-09-04 **트리거를 없앴다 · 자동 재시작도 없앴다** (사용자 지시:
    #    *"왜 컴터 껏다키면 자동으로 루프가돌까 내가원하는건 수동으로만 켜지는건데"*).
    #
    #    전에는 이랬다:
    #      -AtLogOn 트리거          → 로그온·재부팅 때마다 **저절로 켜졌다**
    #      -RestartCount 3 / 5분    → 죽으면 **5분 뒤 되살아났다**
    #
    #    ★ 둘이 겹쳐서 사람이 세운 줄 알았는데 다시 돌고 있는 상황이 나왔다.
    #      실측 2026-09-04: 바퀴 5가 13:58 에 시작 → 프로세스가 0xC000013A
    #      (STATUS_CONTROL_C_EXIT · 콘솔 종료 신호)로 죽음 → **14:03 에 스케줄러가
    #      통째로 새 판을 켰다.** 로그에 「루프 시작」이 두 번 찍힌 게 그거다.
    #
    #    ★ 이제 트리거가 없다. 작업은 **등록만 돼 있고 저절로 안 뜬다** —
    #      `ctl.ps1 start` 가 Start-ScheduledTask 로 부를 때만 돈다.
    #      (트리거 없는 작업도 요청하면 실행된다. 등록은 「PATH·작업 폴더를 박아 둔
    #       실행 껍데기」 용도로만 남는다.)
    #  ⚠ 무인 야간으로 되돌리고 싶으면 아래 두 줄을 살리고 Register 에 -Trigger 를 다시 넘겨라.
    #      $trigger = New-ScheduledTaskTrigger -AtLogOn -User $me
    #      -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)

    $settings = New-ScheduledTaskSettingsSet `
        -ExecutionTimeLimit (New-TimeSpan -Hours 14) `
        -MultipleInstances IgnoreNew `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    try {
        #  -Trigger 를 안 넘긴다 = 트리거 없는 작업 = **저절로 안 뜬다.**
        Register-ScheduledTask -TaskName $taskName -Action $action `
            -User $me -RunLevel Limited `
            -Settings $settings -Description "ContextOps 자율 개발 루프 (loop/loop.ps1) — 수동 전용" -ErrorAction Stop | Out-Null
    } catch {
        Say "작업 스케줄러 등록에 실패했다: $($_.Exception.Message)" "Red"
        Say "" 
        Say "그래도 루프는 켤 수 있다 — ctl.ps1 start 가 창 없이 띄운다." "Yellow"
        Say "다만 **로그아웃·재부팅을 못 넘는다.** 넘기려면 관리자 PowerShell 에서 install 을 한 번 돌려라." "DarkGray"
        return
    }

    Say "등록했다: 작업 [$taskName] — **수동 전용** (트리거 없음 · 자동 재시작 없음)" "Green"
    Say "아직 안 켰다. 시험 주행부터: ctl.ps1 dryrun" "Yellow"
}

function Do-Uninstall {
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Stop-ScheduledTask  -TaskName $taskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Say "작업 [$taskName] 을 지웠다." "Green"
    } else {
        Say "등록된 작업이 없다." "DarkGray"
    }
}

# ── 두 바퀴 시험 주행 (아무것도 안 고친다) ────────────────────────
function Do-DryRun {
    Say "DRY RUN — 파일을 하나도 안 고친다. 턴 수·시간·비용만 잰다." "Cyan"
    Say "다른 세션이 작업 중이어도 안전하다 — 잠금을 잡지 않는다." "DarkGray"
    Say "로그는 logs\cycles\<날짜>_dryNNN.jsonl 로 따로 남는다.`n" "DarkGray"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $loopPs1 -DryRun -Cycles 2
}

# ── 켜기 ──────────────────────────────────────────────────────────
function Do-Start {
    # ① 브랜치를 갈아탈 때만 워킹트리를 본다.
    #    남이 손대고 있는 중에 브랜치를 바꾸면 그 사람 발밑에서 파일이 갈린다.
    #  ⚠ 이미 목표 브랜치에 서 있으면 갈아탈 일이 없으므로 위험도 없다.
    #    (rift 는 여기를 무조건 검사로 걸었다가, 다른 세션의 임시 파일이 늘 떠 있어서
    #     **영원히 못 켜지는** 상태가 됐다. 검사는 위험이 있는 자리에만 앉힌다.)
    $cur0  = Get-LoopBranch $root
    $dirty = $null
    if ($cur0 -ne $LOOP.Branch) { $dirty = & git -C $root status --porcelain }
    if ($dirty) {
        Say "워킹트리가 깨끗하지 않다 — 켜지 않는다." "Red"
        Say "다른 세션이 작업 중이면 끝날 때까지 기다려라. 아니면 커밋하거나 스태시해라.`n" "Yellow"
        $dirty | Select-Object -First 15 | ForEach-Object { Say "   $_" "DarkGray" }
        $n = ($dirty | Measure-Object).Count
        if ($n -gt 15) { Say "   ... 외 $($n - 15)개" "DarkGray" }
        return
    }

    # ② 브랜치를 맞춘다.
    $cur = Get-LoopBranch $root
    if ($cur -ne $LOOP.Branch) {
        $exists = & git -C $root rev-parse --verify --quiet $LOOP.Branch
        if ($exists) { & git -C $root checkout $LOOP.Branch | Out-Null }
        else         { & git -C $root checkout -b $LOOP.Branch | Out-Null }
        Say "브랜치를 [$($LOOP.Branch)] 로 옮겼다 (전: $cur)." "Green"
    }

    # ③ 루프의 기억이 되는 파일들이 있나. 없으면 첫 바퀴가 아무것도 모르는 채 시작한다.
    foreach ($f in @("loop\PROMPT.md", "docs\STATUS.md", "docs\PLAN.md", "tools\ci.ps1")) {
        if (-not (Test-Path (Join-Path $root $f))) {
            Say "⚠ $f 가 없다 — 루프가 길을 잃는다. 만들고 나서 켜라." "Yellow"
        }
    }

    # ④ 이미 돌고 있으면 켜지 않는다.
    #    스케줄러의 IgnoreNew 는 **작업 중복만** 막는다 — 사람이 loop.ps1 을 손으로
    #    돌렸거나 relay 가 띄운 판은 작업이 아니라서 그대로 뚫린다.
    $holder = Get-LockHolder
    if ($holder) {
        Say "이미 루프가 돌고 있다 — 켜지 않는다." "Red"
        Say "  $holder" "DarkGray"
        Say "  세우려면: ctl.ps1 stop" "Yellow"
        return
    }

    if (Test-Path $stopFile) { Remove-Item $stopFile -Force }

    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Start-ScheduledTask -TaskName $taskName
        Say "켰다. 창을 닫아도, 껐다 켜도 계속 돈다." "Green"
        Say "지켜보기: ctl.ps1 status" "DarkGray"
        return
    }

    #  ★ 작업이 없어도 켤 수 있게 한다. 스케줄러 등록은 환경에 따라 관리자 권한을
    #    요구하는데, 그것 때문에 루프를 아예 못 돌리면 도구가 쓸모없다.
    #  ⚠ 대신 이 판은 **로그아웃·재부팅을 못 넘는다.** 그건 정직하게 말한다.
    #    (중복 실행은 걱정 없다 — loop.ps1 이 뮤텍스로 스스로 막는다.)
    Say "작업이 등록돼 있지 않다 — 창 없이 직접 띄운다." "Yellow"
    $p = Start-Process powershell -PassThru -WindowStyle Hidden `
            -ArgumentList ("-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"{0}`"" -f $loopPs1) `
            -WorkingDirectory $root
    Say "켰다 (PID $($p.Id)). 이 창을 닫아도 계속 돈다." "Green"
    Say "⚠ 다만 로그아웃·재부팅은 못 넘는다 — 넘기려면 관리자 PowerShell 에서 ctl.ps1 install" "DarkGray"
    Say "지켜보기: ctl.ps1 status" "DarkGray"
}

# ── 끄기 ──────────────────────────────────────────────────────────
function Do-Stop {
    # 우선 얌전히 — 현재 바퀴를 마치고 멈춘다. 작업 중인 커밋이 안 날아간다.
    New-Item -ItemType File -Path $stopFile -Force | Out-Null
    Say "STOP 파일을 놨다 — 현재 바퀴를 마치면 멈춘다." "Green"

    $t = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($t -and $t.State -eq "Running") {
        Say "지금 도는 바퀴가 끝날 때까지 최대 $($LOOP.CycleTimeoutMin)분 걸린다." "DarkGray"
        Say "당장 끊으려면: Stop-ScheduledTask -TaskName $taskName" "DarkGray"
        Say "  ⚠ 끊으면 그 바퀴 작업은 커밋된 데까지만 남는다." "DarkGray"
    }
}

# ── 상태 ──────────────────────────────────────────────────────────
function Do-Status {
    Say "`n=== ContextOps 자율 루프 ===" "Cyan"

    $t = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($t) {
        $info = Get-ScheduledTaskInfo -TaskName $taskName
        Say ("작업      : {0}" -f $t.State)
        Say ("마지막 실행: {0}  (결과 {1})" -f $info.LastRunTime, $info.LastTaskResult)
    } else {
        Say "작업      : 등록 안 됨 (ctl.ps1 install)" "Yellow"
    }

    if (Test-Path $stopFile) { Say "STOP      : 있음 — 다음 바퀴에 멈춘다" "Yellow" }
    else                     { Say "STOP      : 없음" }

    $holder = Get-LockHolder
    if ($holder) { Say ("잠금      : 사용 중 — {0}" -f $holder) "Green" }
    else         { Say "잠금      : 비어 있음 (도는 루프 없음)" "DarkGray" }

    Say ("브랜치    : {0}   (루프 브랜치 {1})" -f (Get-LoopBranch $root), $LOOP.Branch)
    Say ("모델      : {0} · 노력 {1} · 바퀴 {2}분" -f $LOOP.Model, $LOOP.Effort, $LOOP.CycleTimeoutMin)

    $ci = Join-Path $root ".ci\result"
    if (Test-Path $ci) { Say ("검사      : {0}" -f (Get-Content $ci -TotalCount 1)) }
    else               { Say "검사      : 아직 안 돌렸다 (tools\ci.ps1)" "DarkGray" }

    $log = Join-Path $root ("logs\loop_{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    if (Test-Path $log) {
        Say "`n--- 오늘 로그 끝 15줄 ---" "DarkGray"
        Get-Content $log -Tail 15 | ForEach-Object { Say "  $_" "DarkGray" }
    } else {
        Say "`n오늘 로그 없음: $log" "DarkGray"
    }

    # 브랜치가 아직 없으면 git 이 요란하게 죽는다 (PS 5.1 은 네이티브 stderr 를
    # ErrorRecord 로 감싸서 $? 까지 뒤집는다). 있는지 먼저 보고 부른다.
    $hasBranch = & git -C $root rev-parse --verify --quiet ("refs/heads/" + $LOOP.Branch)
    if ($hasBranch) {
        Say "`n--- 루프 브랜치 최근 커밋 ---" "DarkGray"
        & git -C $root log --oneline -8 $LOOP.Branch | ForEach-Object { Say "  $_" "DarkGray" }
    } else {
        Say "`n루프 브랜치 [$($LOOP.Branch)] 가 아직 없다 — ctl.ps1 start 가 만든다." "DarkGray"
    }
    Say ""
}

switch ($Action) {
    "install"   { Do-Install }
    "uninstall" { Do-Uninstall }
    "start"     { Do-Start }
    "stop"      { Do-Stop }
    "dryrun"    { Do-DryRun }
    default     { Do-Status }
}
