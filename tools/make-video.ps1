#Requires -Version 5.1
<#
=====================================================================
  tools/make-video.ps1 — 컷 스틸을 **유튜브 쇼츠**로 (2026-09-13)

  🔴 왜 이 길로 왔나 (두 번 고쳤다)
     ① 첫 판은 **화면 녹화**였다 — 480px 에서 제품 글자를 한 자도 못 읽었다. 전체 페이지를
        한 번에 담으니 정작 중요한 「5회 vs 3회」가 화면의 1% 였다.
     ② 둘째 판은 고해상 스틸 + 가로 16:9 였다 — 나아졌지만 가로로 긴 컷(버튼 줄·표)은
        1920 캔버스에서 **오히려 축소**돼 여전히 안 읽혔다.
     ③ 지금은 **세로 1080×1920 쇼츠**다. 세로가 오히려 쉽다: 좁게 잡은 컷이 화면 폭을
        꽉 채우고, 쇼츠는 전체화면으로만 보므로 같은 그림이 훨씬 크게 보인다.

  ★ 고퀄의 핵심은 툴이 아니라 하나다: **한 컷에 한 생각, 그리고 읽히게 확대.**
    그래서 컷은 `demo:stills` 가 **요소 하나만** 2배로 찍고, 여기서는 그것을 세로 화면에
    크게 얹고 자막으로 이름을 붙인다.

  ★ 영상 하나를 정의하는 것은 `docs/evidence/2026-09-12-video/shots.json` **한 파일**이다 —
    캔버스·컷·초·자막이 거기 같이 있다. 초를 두 곳에 두면 자막이 컷과 갈라진다.

  ⚠ 컷 사이는 검정으로 살짝 내렸다 올린다(fade). 배경이 이미 검정이라 자연스럽고,
    xfade 로 열 개를 엮는 것보다 고칠 자리가 적다.

  실행:
    powershell -ExecutionPolicy Bypass -File tools/make-video.ps1
    powershell -ExecutionPolicy Bypass -File tools/make-video.ps1 -Locale en
    powershell -ExecutionPolicy Bypass -File tools/make-video.ps1 -Music track.mp3
=====================================================================
#>
param(
  [ValidateSet('ko', 'en')] [string] $Locale = 'ko',
  [string] $Stills = '',
  [string] $Table = '',
  [string] $Out = '',
  [string] $Music = '',
  [double] $MusicVolume = 0.22,
  # 한글이 있는 글꼴. 영어판은 'Segoe UI' 가 낫다
  [string] $Font = ''
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue)
if ($null -eq $ffmpeg) { throw 'ffmpeg 을 못 찾았다 — winget install Gyan.FFmpeg' }

if ($Stills -eq '') { $Stills = Join-Path $repo ".ci\video\stills-$Locale" }
if ($Table -eq '') { $Table = Join-Path $repo 'docs\evidence\2026-09-12-video\shots.json' }
if ($Font -eq '') { $Font = if ($Locale -eq 'en') { 'Segoe UI' } else { 'Malgun Gothic' } }
if (-not (Test-Path $Stills)) { throw "컷 그림이 없다: $Stills — 먼저 pnpm --filter web demo:stills 를 돌려라" }
if (-not (Test-Path $Table)) { throw "컷 표가 없다: $Table" }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = Join-Path $repo '.ci\video'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
if ($Out -eq '') { $Out = Join-Path $outDir "shorts-$Locale-$stamp.mp4" }

#  🔴 이름을 `$table` 로 두지 마라 — PowerShell 은 변수 이름의 대소문자를 안 가리고,
#     `param([string] $Table)` 의 타입 제약이 그 변수에 그대로 남는다. 파싱한 객체를
#     같은 이름에 넣으면 **문자열로 되바뀌어** `.shots.Count` 가 0 이 된다 (조용한 종류다).
$spec = Get-Content $Table -Raw -Encoding UTF8 | ConvertFrom-Json
$W = [int]$spec.canvas.width
$H = [int]$spec.canvas.height
$BG = [string]$spec.canvas.background
$FPS = [int]$spec.canvas.fps

#  [SHORTS] 세로 틀 — 자막은 **위**, 그림은 그 아래.
#  ⚠ 아랫단 약 300px 은 쇼츠 UI(제목·버튼·채널)가 가린다. 그 자리에 글자를 두지 마라.
$capBottom = [int]$spec.canvas.captionBottom
$capSize = [int]$spec.canvas.captionSize
$imgBottom = [int]$spec.canvas.imageBottom
$fitW = [int]$spec.canvas.imageBox.width
$fitH = [int]$spec.canvas.imageBox.height

$work = Join-Path $env:TEMP "ctxops-video-$stamp"
New-Item -ItemType Directory -Path $work -Force | Out-Null

Write-Output ''
Write-Output "  $Locale · 컷 $($spec.shots.Count)개 · ${W}x${H} (쇼츠) · $Stills"
Write-Output ''

# --- (1) 컷마다 짧은 영상 하나 ----------------------------------------
$clips = New-Object System.Collections.Generic.List[string]
$caps = New-Object System.Collections.Generic.List[object]
$t = 0.0
$i = 0
foreach ($shot in $spec.shots) {
  $png = Join-Path $Stills ("$($shot.still).png")
  if (-not (Test-Path $png)) { throw "컷 그림이 없다: $png" }
  $sec = [double]$shot.sec
  $clip = Join-Path $work ("clip-{0:D2}.mp4" -f $i)

  #  ⚠ 컷마다 비율이 크게 다르다 (한 줄짜리부터 카드까지).
  #    `force_original_aspect_ratio=decrease` 로 칸 안에 **넣고** 남는 데는 배경이다.
  #  아주 옅은 줌 — 살아 있게만. UI 그림에 큰 줌을 넣으면 싸 보인다.
  $zoom = "zoompan=z='min(1+0.022*on/($FPS*$sec),1.022)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=$FPS"
  $fadeOut = [Math]::Max(0, $sec - 0.35)
  #  🔴 그림은 **아래를 기준으로** 농는다 (`imageBottom`) — 캷마다 높이가 달라서
  #     띄 안에서 가운대 정렬하면 얼마 안 되는 컷은 자막과 멀리 떨어져 화면이
  #     황하게 따라 부다 (2026-09-13 에 그랬다). 아래를 맞추면 자막과의 사이가 항상 같다.
  $vf = "scale=${fitW}:${fitH}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(${imgBottom}-ih):color=$BG,$zoom,fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOut}:d=0.35,format=yuv420p"

  & $ffmpeg -v error -y -loop 1 -framerate $FPS -t $sec -i $png -vf $vf `
    -c:v libx264 -preset veryfast -crf 19 -r $FPS $clip
  if (-not (Test-Path $clip)) { throw "$($shot.still): 컷 영상이 안 생겼다" }
  $clips.Add($clip)

  #  자막은 컷이 **뜬 뒤**에 들어오고 **지기 전에** 나간다 (페이드와 겹치지 않게).
  $caps.Add([pscustomobject]@{ Start = $t + 0.4; End = $t + $sec - 0.4; Text = [string]$shot.$Locale })
  Write-Output ("  {0,-14} {1,4:N1}s  {2}" -f $shot.still, $sec, $shot.$Locale)
  $t += $sec
  $i++
}

# --- (2) 이어 붙인다 ---------------------------------------------------
$listFile = Join-Path $work 'list.txt'
$listLines = $clips | ForEach-Object { "file '" + ($_ -replace '\\', '/') + "'" }
[IO.File]::WriteAllLines($listFile, $listLines, (New-Object Text.UTF8Encoding($false)))
$joined = Join-Path $work 'joined.mp4'
& $ffmpeg -v error -y -f concat -safe 0 -i $listFile -c copy $joined
if (-not (Test-Path $joined)) { throw '이어 붙이기가 안 됐다' }

# --- (3) 자막 -----------------------------------------------------------
#  🔴 .srt 로 굽지 않는다 — libass 는 해상도 정보 없는 자막을 **288 기준**으로 늘려서
#     글자가 3배가 된다 (`original_size` 로도 안 잡힌다 · 2026-09-12 에 두 번 밟았다).
#     ASS 헤더에 PlayResX/Y 를 박으면 1 단위 = 1 픽셀이 된다.
$ass = Join-Path $work 'caps.ass'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('[Script Info]')
$lines.Add('ScriptType: v4.00+')
$lines.Add('WrapStyle: 0')
$lines.Add('ScaledBorderAndShadow: yes')
$lines.Add("PlayResX: $W")
$lines.Add("PlayResY: $H")
$lines.Add('')
$lines.Add('[V4+ Styles]')
$lines.Add('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding')
#  🔴 쇼츠 자막은 **크고 굵고 위에** 있다 — 아랫단에 깔린 얇은 자막 띠가 아니다.
#     Alignment 2 = 아래 가운데 · MarginV 는 **밑에서부터** · Bold 1.
#  ⚠ 그림 아래에 둔다 — 그림이 위에 있고 자막이 그 아래라야 눈이 그림 → 이름 순서로 읽는다.
#  ⚠ 여백을 넉넉하게 — 쇼츠는 폰 한 손에 들어서 가장자리 글자는 잘 안 읽힌다.
$lines.Add("Style: Cap,$Font,$capSize,&H00F4F4F5,&H00F4F4F5,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,2,80,80,$capBottom,1")
#  🔴 위에 제품 이름 한 줄 — 장식이 아니다.
#     ★ 왜 — 캷 그림은 자막 위에 붙어 있어서 화면 상단이 붕다. 그 자리가 붕 채로
#       있으면 「덜 만든 것」으로 보이고, 이름이 있으면 **의도된 여백**이 된다.
#     ⚠ 색은 회상이다 — 자막보다 약해야 눈이 자막으로 간다.
$lines.Add("Style: Brand,$Font,34,&H00909099,&H00909099,&H00000000,&H00000000,0,0,0,0,100,100,2,0,1,0,0,8,80,80,150,1")
$lines.Add('')
$lines.Add('[Events]')
$lines.Add('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')
function AssTime([double] $s) {
  $h = [int][Math]::Floor($s / 3600)
  $m = [int][Math]::Floor(($s % 3600) / 60)
  $ss = [int][Math]::Floor($s % 60)
  $cs = [int][Math]::Round(($s - [Math]::Floor($s)) * 100)
  if ($cs -ge 100) { $cs = 99 }
  return ('{0}:{1:D2}:{2:D2}.{3:D2}' -f $h, $m, $ss, $cs)
}
#  제품 이름은 처음부터 끝까지 한 줄로 서 있다.
$lines.Add("Dialogue: 0,$(AssTime 0.4),$(AssTime ($t - 0.3)),Brand,,0,0,0,,ContextOps")
foreach ($c in $caps) {
  #  ⚠ 자막 안의 중괄호는 ASS 의 서식 표시라 그대로 두면 글자가 사라진다. 우리 문구엔 없지만 막아 둔다.
  $text = ($c.Text -replace '\{', '(' -replace '\}', ')')
  $lines.Add("Dialogue: 0,$(AssTime $c.Start),$(AssTime $c.End),Cap,,0,0,0,,$text")
}
[IO.File]::WriteAllLines($ass, $lines, (New-Object Text.UTF8Encoding($false)))

#  ⚠ Windows 경로의 `C:` 콜론을 필터 구분자로 읽는다. 이스케이프한다.
$assForFilter = ($ass -replace '\\', '/') -replace ':', '\:'
$vfSub = "subtitles='$assForFilter'"

if ($Music -eq '') {
  & $ffmpeg -v error -y -i $joined -vf $vfSub -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p -movflags +faststart $Out
} else {
  if (-not (Test-Path $Music)) { throw "음악 파일이 없다: $Music" }
  $dur = [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $joined)
  $fadeStart = [Math]::Max(0, $dur - 2)
  #  ⚠ `${...}` 로 감싼다 — PowerShell 이 `$fadeStart:` 를 `$env:PATH` 같은 이름공간으로 읽는다.
  $af = "volume=${MusicVolume},afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeStart}:d=2"
  & $ffmpeg -v error -y -i $joined -stream_loop -1 -i $Music `
    -filter_complex "[0:v]$vfSub[v];[1:a]$af[a]" -map '[v]' -map '[a]' `
    -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p `
    -c:a aac -b:a 128k -shortest -movflags +faststart $Out
}

Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
if (-not (Test-Path $Out)) { throw '영상이 안 생겼다' }
$size = [Math]::Round((Get-Item $Out).Length / 1MB, 2)
$total = [Math]::Round($t, 1)
Write-Output ''
Write-Output "  됐다 — $Out (${total}초 · $size MB)"
if ($total -gt 60) { Write-Output '  ⚠ 60초를 넘었다 — 쇼츠로 안 올라간다. shots.json 의 sec 를 줄여라.' }
Write-Output ''
