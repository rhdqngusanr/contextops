#Requires -Version 5.1
<#
=====================================================================
  tools/record-demo.ps1 — 데모 클립을 **끝까지 자동으로** 만든다 (2026-09-12)

  ★ 무엇을 하나 — ① 데모 운전 스크립트를 띄우고(`apps/web/scripts/demo-drive.ts`)
    ② 그 창이 뜨면 ffmpeg 으로 **그 창 영역만** 녹화하고 ③ 정해진 초가 지나면 스스로 멈춘다.
    사람이 누를 버튼이 없다. 망친 판은 다시 돌리면 그만이다.

  ★ 왜 ffmpeg 인가 (Game Bar 가 아니라) — Game Bar 는 사람이 Win+G 를 눌러야 하고 멈추는
    시각도 사람 손이라 판마다 길이가 다르다. 자막을 **시각으로** 얹으려면 길이가 판마다
    같아야 한다 (`docs/PITCH.md` §6). `-t` 로 끊으면 초가 늘 같다.
  ⚠ Game Bar 로 찍고 싶으면 `pnpm --filter web demo:drive` 만 돌리고 Win+G 를 눌러라 —
    그 길도 열려 있다 (운전 스크립트가 카운트다운을 준다).

  ⚠ 소리는 안 담는다. 이 클립은 **무음 + 나중에 자막**이 전제다.

  실행:
    powershell -ExecutionPolicy Bypass -File tools/record-demo.ps1
    powershell -ExecutionPolicy Bypass -File tools/record-demo.ps1 -Locale en
    powershell -ExecutionPolicy Bypass -File tools/record-demo.ps1 -Hold 2 -Seconds 60
=====================================================================
#>
param(
  # 화면 언어 — 대회용은 ko, 레딧용은 en
  [ValidateSet('ko', 'en')] [string] $Locale = 'ko',
  # 모든 멈춤을 이만큼 곱한다. 내레이션을 얹을 거면 2 쯤
  [double] $Hold = 1,
  # 녹화 길이(초). 0 이면 컷 표 합에서 계산한다
  [int] $Seconds = 0,
  [string] $Origin = 'https://contextops-rosy.vercel.app',
  [string] $Out = ''
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot

#  🔴 **잰 값이다** (2026-09-12 · `demo:drive` 가 찍은 초).
#     컷 표의 `hold` 합은 27초인데 **실제로는 34초**가 걸린다 — 그 위에 클릭·도착·그려짐을
#     기다리는 시간이 약 7초 더 붙기 때문이다. 합만 보고 33초로 찍었다가 **마지막 Sync 컷이
#     통째로 잘렸다.** 그래서 고정 몫(7초)과 `Hold` 가 곱해지는 몫(27초)을 갈라 센다.
#  ⚠ 컷 표를 고치면 `pnpm --filter web demo:drive` 를 한 번 돌려 초를 다시 재라 — 그 출력이 이 숫자의 근거다.
$beatsHold = 27; $fixedOverhead = 7; $preroll = 2; $tail = 2
if ($Seconds -le 0) { $Seconds = [int][Math]::Ceiling($beatsHold * $Hold) + $fixedOverhead + $preroll + $tail }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if ($Out -eq '') {
  $dir = Join-Path $repo '.ci\video'
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $Out = Join-Path $dir "demo-$Locale-$stamp.mp4"
}

$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue)
if ($null -eq $ffmpeg) { throw 'ffmpeg 을 못 찾았다 — winget install Gyan.FFmpeg' }

Write-Output ''
Write-Output "  녹화: $Locale · ${Seconds}초 · $Out"
Write-Output ''

#  (1) 운전 스크립트를 띄운다. 창이 뜨기를 기다려야 해서 카운트다운을 넉넉히 준다.
#  ⚠ `pnpm` 은 exe 가 아니라 셸 shim 이라 Start-Process 가 바로 못 열어서 cmd.exe 를 거친다.
#  ⚠ 초를 세지 않는다 — 운전이 **신호 파일**을 남기면 그때 찍기 시작한다 (`demo-drive.ts` 의 같은 주석).
$signal = Join-Path $env:TEMP "contextops-demo-$stamp.signal"
if (Test-Path $signal) { Remove-Item $signal -Force }
$driverArgs = "/c pnpm --filter web demo:drive -- --locale $Locale --hold $Hold --origin $Origin --signal ""$signal"""
$driver = Start-Process -FilePath 'cmd.exe' -ArgumentList $driverArgs `
  -WorkingDirectory $repo -PassThru -WindowStyle Minimized

#  (2) 데모 창이 뜨기를 기다리고 **창의 좌표**를 구한다.
#  🔴 왜 제목(`title=`)으로 안 찍고 좌표로 찍나 (2026-09-12 실측) — gdigrab 의 창 캡처는
#     GPU 로 합성된 Chrome 창을 못 떠서 `Failed to capture image (error 8)` 로 죽는다.
#     데스크톱은 합성된 결과라 그대로 찍힌다 — Chrome 의 GPU 를 끄지 않아도 된다
#     (끄면 스크롤이 끊겨 보이고 그게 그대로 영상에 남는다).
#  ⚠ 대신 **그 영역을 다른 창이 가리면 가린 것이 찍힌다.** 녹화 동안 다른 창을 올리지 마라.
Add-Type @"
using System;
using System.Runtime.InteropServices;
public struct RECT { public int Left, Top, Right, Bottom; }
public struct POINT { public int X, Y; }
public class Win32 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$win = $null
$deadline = (Get-Date).AddSeconds(40)
while ((Get-Date) -lt $deadline -and $null -eq $win) {
  Start-Sleep -Milliseconds 700
  $win = Get-Process -Name 'chrome' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -like '*ContextOps*' } |
    Select-Object -First 1
}
if ($null -eq $win) {
  try { Stop-Process -Id $driver.Id -Force -ErrorAction Stop } catch {}
  throw '데모 창을 못 찾았다 — 운전 스크립트가 떴는지 봐라'
}

#  창을 앞으로 — 데스크톱을 찍으므로 가려 있으면 가린 것이 찍힌다.
[Win32]::ShowWindow($win.MainWindowHandle, 5) | Out-Null
[Win32]::SetForegroundWindow($win.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 800

#  운전이 「이제 시작한다」고 할 때까지 기다린다. 신호 파일 안에 **뷰포트의 화면 좌표**가 들어 있다.
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline -and -not (Test-Path $signal)) { Start-Sleep -Milliseconds 200 }
if (-not (Test-Path $signal)) {
  try { Stop-Process -Id $driver.Id -Force -ErrorAction Stop } catch {}
  throw '운전이 시작 신호를 안 줬다'
}

#  🔴 **창이 아니라 「뷰포트」를 찍는다** — 좌표는 브라우저가 준 값이다.
#     ★ 왜 Win32 로 안 구하나 (2026-09-12 눈으로 봤다) — 창 전체를 찍으면 **제목 표시줄**(창 이름 +
#       최소화·닫기 단추)이 담기고, 영상이 「제품」이 아니라 「누가 브라우저를 켠 화면」으로 읽힌다.
#       그런데 `GetClientRect` 로도 안 걷힌다 — Chrome 앱 창은 제목 줄을 **클라이언트 영역 안에**
#       스스로 그린다. `window.screenX/screenY` + `innerWidth/innerHeight` 가 정확히 제품 화면이다.
$view = Get-Content $signal -Raw | ConvertFrom-Json
if ($null -eq $view) { throw '신호 파일에 뷰포트 좌표가 없다' }
$dpr = [double]$view.dpr
#  ⚠ CSS 픽셀 → 물리 픽셀. 화면 배율이 100% 가 아니면 이 곱이 없으면 엉뚱한 자리를 찍는다.
$x = [int][Math]::Round($view.x * $dpr); $y = [int][Math]::Round($view.y * $dpr)
$w = [int][Math]::Round($view.w * $dpr); $h = [int][Math]::Round($view.h * $dpr)
#  ⚠ 폭·높이는 **짝수**여야 yuv420p 로 담긴다.
$w = $w - ($w % 2); $h = $h - ($h % 2)
if ($w -lt 200 -or $h -lt 200) { throw "뷰포트 크기가 이상하다: ${w}x${h}" }
$rect = New-Object RECT
$rect.Left = $x; $rect.Top = $y
Write-Output "  뷰포트 ${w}x${h} @ ${x},${y} (dpr $dpr) — 녹화 시작"

#  (3) 그 영역만 녹화한다. `-t` 로 스스로 멈춘다.
#  ⚠ `-draw_mouse 0` — 커서를 안 담는다. 운전은 CDP 로 누르므로 OS 커서는 안 움직이고,
#    그대로 담으면 화면 구석에 **가만히 있는 커서**가 찍힌다.
$ffArgs = @(
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'gdigrab', '-framerate', '30', '-draw_mouse', '0',
  '-offset_x', "$($rect.Left)", '-offset_y', "$($rect.Top)", '-video_size', "${w}x${h}",
  '-t', "$Seconds", '-i', 'desktop',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  $Out
)
& $ffmpeg.Source @ffArgs

#  (4) 운전이 아직 돌고 있으면 기다렸다 정리한다.
try { Wait-Process -Id $driver.Id -Timeout 30 -ErrorAction SilentlyContinue } catch {}
try { Stop-Process -Id $driver.Id -Force -ErrorAction SilentlyContinue } catch {}

if (-not (Test-Path $Out)) { throw '녹화 파일이 안 생겼다' }
$size = [Math]::Round((Get-Item $Out).Length / 1MB, 2)
Write-Output ''
Write-Output "  됐다 — $Out ($size MB)"
Write-Output '  다음: docs/PITCH.md §6 의 자막·GIF 명령'
Write-Output ''
