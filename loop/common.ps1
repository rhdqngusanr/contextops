# =====================================================================
#  loop/common.ps1 — loop.ps1 · ctl.ps1 · relay.ps1 이 같이 쓰는 것. 여기가 정본이다.
#
#  ★ 왜 파일이 따로 있나 — 같은 것을 두 곳에 적으면 반드시 갈라진다.
#    브랜치를 읽는 방법이나 잠그는 방법이 파일마다 달라지면, 한쪽은 멀쩡한데
#    다른 쪽만 조용히 틀린 것을 본다.
# =====================================================================

# ─────────────────────────────────────────────────────────────────────
#  git
# ─────────────────────────────────────────────────────────────────────

# 현재 브랜치 이름. **커밋이 하나도 없는 저장소에서도** 조용히 동작한다.
#
#  ⚠ `git rev-parse --abbrev-ref HEAD` 를 쓰지 마라. 커밋이 없으면
#    "fatal: ambiguous argument 'HEAD'" 를 stderr 로 토하고 문자열 "HEAD" 를 준다.
#    갓 클론한 사람이 `ctl.ps1 status` 로 처음 보는 화면이 그 에러다.
#    `symbolic-ref --short -q` 는 커밋이 없어도 브랜치 이름을 조용히 준다.
function Get-LoopBranch([string] $repo) {
    $b = & git -C $repo symbolic-ref --short -q HEAD
    if ($b) { return $b.Trim() }

    # detached HEAD — 짧은 sha 로 답한다
    $s = & git -C $repo rev-parse --short -q --verify HEAD
    if ($s) { return "(detached " + $s.Trim() + ")" }

    return "(커밋 없음)"
}

# HEAD 의 커밋 sha. 커밋이 없으면 빈 문자열.
#  ⚠ `--verify` 없이 부르면 위와 같은 이유로 요란하게 죽는다.
function Get-LoopHead([string] $repo) {
    $s = & git -C $repo rev-parse -q --verify HEAD
    if ($s) { return $s.Trim() }
    return ""
}

# ─────────────────────────────────────────────────────────────────────
#  중복 실행 방지
#
#  ★ 왜 필요한가 — 두 루프가 같은 저장소에서 동시에 돌면 **두 AI 세션이 같은
#    파일을 고치고 같은 브랜치에 커밋한다.** 한쪽이 남의 반쯤 된 작업을 같이
#    커밋하거나, 둘이 서로의 변경을 덮어쓴다. 무인이라 아무도 못 본다.
#    스케줄러의 `-MultipleInstances IgnoreNew` 는 **작업(task) 중복만** 막는다 —
#    사람이 loop.ps1 을 손으로 돌리거나 relay 가 겹치면 그대로 뚫린다.
#
#  ★ 왜 잠금 파일이 아니라 **뮤텍스**인가 — 잠금 파일은 프로세스가 강제 종료되면
#    **그대로 남는다.** 그리고 이 루프는 강제 종료되는 일이 실제로 있다
#    (`Stop-ScheduledTask` · 재부팅 · 바퀴 시간 초과 정리). 그러면 다음 날 아침
#    루프가 "이미 돌고 있다"며 안 켜지고, 사람은 유령 파일을 손으로 지워야 한다.
#    OS 뮤텍스는 **프로세스가 죽으면 OS 가 놓아준다.** 지울 것이 없다.
#
#  ⚠ 잠금은 **저장소마다** 다르다. 같은 루프를 다른 프로젝트에서 동시에 돌리는 것은
#    막지 않는다 — 그건 충돌이 아니다. 그래서 이름에 저장소 경로 해시가 들어간다.
# ─────────────────────────────────────────────────────────────────────

# 저장소 경로 → 12자 해시. 같은 저장소면 항상 같은 값.
function Get-LoopLockKey([string] $repo) {
    $p = $repo
    try { $p = (Resolve-Path $repo -ErrorAction Stop).Path } catch { }
    $p = $p.TrimEnd("\").ToLowerInvariant()

    $sha = [System.Security.Cryptography.SHA1]::Create()
    try {
        $bytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($p))
    } finally { $sha.Dispose() }

    $hex = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
    return $hex.Substring(0, 12)
}

# 잠금을 잡는다. 잡으면 Mutex 를, 남이 들고 있으면 $null 을 준다. **기다리지 않는다.**
#  $scope 에 "Global\" 또는 "Local\" 이 담긴다 (진단용).
function Enter-LoopLock([string] $repo, [ref] $scope) {
    $key = Get-LoopLockKey $repo

    #  Global 을 먼저 시도한다. 스케줄러가 띄운 루프와 사람이 띄운 루프는
    #  **다른 세션**에 있을 수 있어서, Local 로는 서로를 못 본다.
    #  ⚠ Global 뮤텍스 생성에는 SeCreateGlobalPrivilege 가 필요하다. 대화형 로그온
    #    사용자에겐 있지만, 없는 환경도 있어서 Local 로 물러선다 —
    #    그때는 **세션을 넘는 중복은 못 잡는다** (진단 문구로 알린다).
    foreach ($pfx in @("Global\", "Local\")) {
        $name = $pfx + "contextops-loop-" + $key
        try {
            $createdNew = $false
            $m = New-Object System.Threading.Mutex($true, $name, [ref] $createdNew)

            if ($createdNew) { $scope.Value = $pfx; return $m }

            # 이미 있다 — 잡아 보되 **0초만** 기다린다.
            $got = $false
            try {
                $got = $m.WaitOne(0)
            } catch [System.Threading.AbandonedMutexException] {
                #  ★ 이게 잠금 파일 대비 진짜 이득이다. 앞 주인이 **강제 종료**돼서
                #    놓지 못하고 죽으면 여기로 온다. 예외가 나지만 소유권은 우리 것이다.
                #    잠금 파일이었다면 여기서 영원히 막혔을 자리다.
                $got = $true
            }

            if ($got) { $scope.Value = $pfx; return $m }

            $m.Dispose()
            return $null        # 살아 있는 남이 들고 있다. Local 로 내려가지 않는다
        } catch [System.UnauthorizedAccessException] {
            continue            # Global 을 못 만든다 — Local 로
        } catch {
            continue
        }
    }
    return $null
}

# 잠금을 놓는다. 안 잡은 것을 놓아도 조용히 넘어간다.
function Exit-LoopLock($mutex) {
    if (-not $mutex) { return }
    try { $mutex.ReleaseMutex() } catch { }
    try { $mutex.Dispose() }     catch { }
}

# 남이 들고 있나? (잡아 봤다가 바로 놓는다 — 확인 전용)
#  ⚠ 이건 **그 순간의 사실**이다. 확인한 다음 순간에 남이 잡을 수 있다.
#    진짜 배타는 Enter-LoopLock 을 잡고 **들고 있는 것**으로만 된다.
function Test-LoopLockHeld([string] $repo) {
    $scope = ""
    $m = Enter-LoopLock $repo ([ref] $scope)
    if ($m) { Exit-LoopLock $m; return $false }
    return $true
}

# ── 잠금 정보 파일 (진단 전용) ────────────────────────────────────
#  ⚠ 이 파일은 **잠금이 아니다.** 배타는 위의 뮤텍스가 하고, 이 파일은
#    "누가 언제부터 들고 있나" 를 사람에게 보여주기 위한 것이다.
#    그래서 남아 있어도 아무것도 막지 않는다 — 유령 파일이 사고를 못 낸다.
function Get-LoopLockPath([string] $repo) { return (Join-Path $repo "loop\.lock") }

function Write-LoopLockInfo([string] $repo, [hashtable] $extra) {
    $info = @{
        pid     = $PID
        host    = $env:COMPUTERNAME
        started = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }
    if ($extra) { foreach ($k in $extra.Keys) { $info[$k] = $extra[$k] } }
    try {
        $json = $info | ConvertTo-Json -Compress
        Set-Content -Path (Get-LoopLockPath $repo) -Value $json -Encoding UTF8
    } catch { }
}

function Read-LoopLockInfo([string] $repo) {
    $p = Get-LoopLockPath $repo
    if (-not (Test-Path $p)) { return $null }
    try { return (Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { return $null }
}

function Clear-LoopLockInfo([string] $repo) {
    $p = Get-LoopLockPath $repo
    if (Test-Path $p) { try { Remove-Item $p -Force } catch { } }
}

# ── 앞 판이 남긴 고아 세션 정리 ───────────────────────────────────
#  ★ 왜 필요한가 — loop.ps1 이 강제 종료되면 **자식 claude 는 살아남는다.**
#    뮤텍스는 loop.ps1 이 죽으면서 풀리니 새 루프가 켜지는데, 그 옆에서
#    고아 claude 가 같은 저장소를 계속 고친다. **두 세션이 같은 파일에 붙는
#    바로 그 사고**를 뮤텍스를 우회해서 만든다.
#
#  ⚠ 우리가 잠금을 **잡은 뒤에만** 부른다. 잠금을 잡았다는 것은 앞 주인이
#    이미 죽었다는 뜻이고, 그러면 그 자식은 정의상 고아다.
function Stop-LoopOrphan([string] $repo) {
    $info = Read-LoopLockInfo $repo
    if (-not $info) { return $null }
    if (-not $info.child_pid) { return $null }

    $child = Get-Process -Id ([int] $info.child_pid) -ErrorAction SilentlyContinue
    if (-not $child) { return $null }

    #  이름을 확인한다. PID 는 재사용된다 — 엉뚱한 프로그램을 죽이면 안 된다.
    if ($child.ProcessName -notmatch "^claude") { return $null }

    try {
        & taskkill.exe /PID $child.Id /T /F 2>&1 | Out-Null
        return $child.Id
    } catch { return $null }
}
