# =====================================================================
#  loop/relay.ps1 — 1차 루프가 끝나면 2차 루프를 이어 켠다
#
#    powershell -ExecutionPolicy Bypass -File loop\relay.ps1 -WatchPid <pid>
#    powershell -ExecutionPolicy Bypass -File loop\relay.ps1              # 바로 잇는다
#
#  ★ 왜 있나 — loop.ps1 은 MaxCycles/MaxHours 에 닿으면 얌전히 끝난다. 그 뒤를
#    이어 줄 것이 없으면 아침까지 논다. 밤이 제일 아까운 자원이다.
#
#  ★ 인계장을 **여기서** 꽂는 이유 — INBOX.md 는 **루프도 고친다.** 사람이 미리
#    적어 두면 1차 루프의 커밋이 덮어쓴다. 그래서 1차가 **죽은 뒤에**
#    loop/HANDOFF.md 를 INBOX 에 꽂는다 — 덮어쓰기 경쟁이 없다.
#
#  ⚠ 무한히 잇지 않는다. **자율 루프의 최대 실패 모드는 할 일이 떨어졌는데
#    계속 도는 것이다.** MaxRelays 기본값이 1 인 이유다.
# =====================================================================

param(
    # 이 프로세스가 죽을 때까지 기다린다. 0 이면 기다리지 않고 바로 잇는다.
    [int] $WatchPid = 0,

    # 몇 번까지 이어 켤 것인가.
    [int] $MaxRelays = 1,

    #  인계장만 꽂고 끝낸다. 루프를 켜지 않는다.
    #  ★ 왜 있나 — 인계장 삽입은 **잘못되면 엉뚱한 조각이 다음 루프의 지시가 되는**
    #    자리다. 밤에 처음 돌려 보는 것은 너무 늦다. 자기 전에 이걸로 한 번 확인해라.
    [switch] $InsertOnly
)

$ErrorActionPreference = "Stop"

$root     = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "common.ps1")

$loopPs1  = Join-Path $PSScriptRoot "loop.ps1"
$stopFile = Join-Path $PSScriptRoot "STOP"
$handoff  = Join-Path $PSScriptRoot "HANDOFF.md"
$inbox    = Join-Path $root "docs\feedback\INBOX.md"
$logFile  = Join-Path $root ("logs\relay_{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))

New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null

function Log([string] $m) {
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $m
    Write-Host $line -ForegroundColor Gray
    try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch { }
}

# ── 인계장을 INBOX 「할 것」 맨 위에 꽂는다 ───────────────────────
#  ⚠ BOM 없이 쓴다. INBOX.md 는 BOM 없는 UTF-8 이고, 여기서 BOM 을 붙이면
#    첫 줄이 마크다운 제목으로 안 읽힌다.
function Insert-Handoff {
    if (-not (Test-Path $handoff)) { Log "인계장이 없다 — 그냥 잇는다: $handoff"; return }
    if (-not (Test-Path $inbox))   { Log "INBOX 가 없다 — 그냥 잇는다: $inbox";   return }

    #  ⚠ 마커는 **HTML 주석**이다. 눈에 보이는 마커(가위표 등)를 쓰면, 그 마커를
    #    **설명하는 문장에도 마커가 들어가서** 구간이 하나 더 생긴다. 여는/닫는
    #    주석을 이름으로 찾아 그 **사이**만 잘라낸다.
    $hf     = [System.IO.File]::ReadAllText($handoff)
    $mOpen  = "<!-- 인계장 시작 -->"
    $mClose = "<!-- 인계장 끝 -->"
    $a = $hf.IndexOf($mOpen)
    $b = $hf.IndexOf($mClose)
    if ($a -lt 0 -or $b -le $a) { Log "인계장에서 마커 구간을 못 찾았다 — 안 꽂는다."; return }

    $block = $hf.Substring($a + $mOpen.Length, $b - $a - $mOpen.Length).Trim()

    #  잘못 잘린 조각을 꽂으면 다음 루프가 그 조각을 지시로 읽는다. 길이로 막는다.
    if ($block.Length -lt 200) { Log "인계장 블록이 $($block.Length)자뿐이다 — 잘못 잘렸다. 안 꽂는다."; return }

    $body = [System.IO.File]::ReadAllText($inbox)
    if ($body.Contains($block.Substring(0, 60))) { Log "인계장이 이미 꽂혀 있다 — 건너뛴다."; return }

    $anchor = "## 할 것"
    $at = $body.IndexOf($anchor)
    if ($at -lt 0) { Log "INBOX 에서 [$anchor] 를 못 찾았다 — 안 꽂는다."; return }

    $cut = $at + $anchor.Length
    $new = $body.Substring(0, $cut) + "`r`n`r`n" + $block + "`r`n" + $body.Substring($cut)
    [System.IO.File]::WriteAllText($inbox, $new, (New-Object System.Text.UTF8Encoding $false))
    Log "인계장을 INBOX 「할 것」 맨 위에 꽂았다."
}

# ── 미리보기 ─────────────────────────────────────────────────────
if ($InsertOnly) {
    Log "인계장만 꽂는다 (-InsertOnly) — 루프는 켜지 않는다."
    Insert-Handoff
    Log "docs/feedback/INBOX.md 를 열어 꽂힌 내용을 눈으로 확인해라."
    exit 0
}

# ── 1차가 죽기를 기다린다 ────────────────────────────────────────
Log "=========================================================="
Log "릴레이 시작 — 지켜보는 PID $WatchPid · 이어 켤 횟수 $MaxRelays"

if ($WatchPid -gt 0) {
    while (Get-Process -Id $WatchPid -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 60 }
    Log "1차 루프(PID $WatchPid)가 끝났다."
}

# ── 이어 켠다 ────────────────────────────────────────────────────
for ($i = 1; $i -le $MaxRelays; $i++) {

    #  사람이 얌전히 세운 것이면 잇지 않는다. STOP 은 「그만」이라는 뜻이지
    #  「한 판 쉬고 다시」가 아니다.
    if (Test-Path $stopFile) { Log "STOP 파일이 있다 — 사람이 세웠다. 잇지 않는다."; break }

    #  ★ 1차가 아직 살아 있으면 잇지 않는다. -WatchPid 로 기다렸어도 여기서 다시 본다 —
    #    PID 를 안 주고 부르는 경우가 있고, 그때 그냥 이으면 **두 루프가 같은 저장소에**
    #    붙는다. loop.ps1 이 스스로 거절하긴 하지만, 거절하고 즉시 끝난 판은
    #    아래 「10분도 못 돌았다」에 걸려 릴레이가 그걸 조용한 실패로 오해한다.
    $waited = 0
    while ((Test-LoopLockHeld $root) -and $waited -lt 60) {
        if ($waited -eq 0) { Log "아직 루프가 돌고 있다 — 끝나기를 기다린다." }
        Start-Sleep -Seconds 60
        $waited++
    }
    if (Test-LoopLockHeld $root) { Log "60분을 기다려도 안 끝난다 — 잇지 않는다."; break }

    Insert-Handoff

    Log "---- 2차 루프 $i/$MaxRelays 시작 ----"
    $t0 = Get-Date
    & powershell -NoProfile -ExecutionPolicy Bypass -File $loopPs1
    $mins = [int]((Get-Date) - $t0).TotalMinutes
    Log "---- 2차 루프 $i 끝 — $mins 분 ----"

    #  ★ 조용한 실패를 잇지 않는다. 한 바퀴도 제대로 못 돌고 끝났다면
    #    (빌드 붕괴 · 도구 없음 · 사용량 한도) 다시 켜 봐야 같은 벽이다.
    if ($mins -lt 10) { Log "10분도 못 돌고 끝났다 — 조용한 실패로 보고 멈춘다."; break }
}

Log "릴레이 종료."
Log "=========================================================="
