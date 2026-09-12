#Requires -Version 5.1
<#
=====================================================================
  tools/burn-captions.ps1 — 클립 **아래에 띠를 붙이고** 자막을 굽는다 (2026-09-12)

  ★ 왜 자막을 화면 위에 안 얹나 — 이 클립의 주인공은 **제품 화면**이다. 그 위에 자막을
    올리면 보여 주려던 것을 자막이 가린다. 아래에 띠를 붙이면 아무것도 안 가린다.

  🔴 **왜 .srt 를 .ass 로 바꿔서 굽나** (이게 이 스크립트가 존재하는 이유다)
     libass 는 자막 파일에 해상도 정보가 없으면 기준을 **288** 로 잡고 거기 맞춰 글자를
     늘린다. 그래서 `force_style` 에 `FontSize=23` 이라고 적어도 956px 짜리 영상에서는
     **약 3.3배(≈76px)** 로 그려져 띠 밖으로 삐져나온다 (2026-09-12 에 두 번 그랬다.
     `subtitles` 필터의 `original_size` 로도 안 잡혔다).
     ASS 헤더에 `PlayResX/PlayResY` 를 영상 크기 그대로 박으면 **1 단위 = 1 픽셀**이 된다.

  ★ 정본은 `.srt` 다 — 사람이 고치고, 유튜브에 자막 트랙으로 그대로 올린다.
    `.ass` 는 여기서 **만들어 쓰고 버리는** 중간물이다 (두 곳에 문장을 두지 않는다).

  실행:
    powershell -ExecutionPolicy Bypass -File tools/burn-captions.ps1 `
      -Video .ci/video/demo-ko-<stamp>.mp4 -Srt docs/evidence/2026-09-12-video/ko.srt
=====================================================================
#>
param(
  [Parameter(Mandatory = $true)] [string] $Video,
  [Parameter(Mandatory = $true)] [string] $Srt,
  [string] $Out = '',
  # 띠의 높이(px). 두 줄 자막이 들어갈 만큼.
  [int] $Bar = 96,
  [int] $FontSize = 23,
  # 한글이 있는 글꼴이어야 한다. 영어 전용이면 'Segoe UI' 도 된다.
  [string] $Font = 'Malgun Gothic',
  # 음악을 같이 넣을 파일 (없으면 무음 그대로)
  [string] $Music = '',
  # 음악 크기 (0~1). 0.25 면 25% — 배경음은 작아야 한다
  [double] $MusicVolume = 0.25
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path $Video)) { throw "영상이 없다: $Video" }
if (-not (Test-Path $Srt)) { throw "자막이 없다: $Srt" }
$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue)
if ($null -eq $ffmpeg) { throw 'ffmpeg 을 못 찾았다 — winget install Gyan.FFmpeg' }

if ($Out -eq '') {
  $dir = Split-Path -Parent $Video
  $base = [IO.Path]::GetFileNameWithoutExtension($Video)
  $Out = Join-Path $dir "$base-sub.mp4"
}

#  원본 크기를 재서 띠를 더한 것이 최종 크기다 — ASS 헤더에 그 값을 박는다.
$dims = (& ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 $Video)
$w = [int]($dims -split ',')[0]
$h0 = [int]($dims -split ',')[1]
$h = $h0 + $Bar
Write-Output "  $Video — ${w}x${h0} + 띠 ${Bar} = ${w}x${h}"

# --- .srt → .ass (해상도를 박아서 1단위 = 1픽셀로) ---------------------
$ass = Join-Path $env:TEMP ("caption-" + [Guid]::NewGuid().ToString('N') + '.ass')
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('[Script Info]')
$lines.Add('ScriptType: v4.00+')
$lines.Add('WrapStyle: 0')
$lines.Add('ScaledBorderAndShadow: yes')
$lines.Add("PlayResX: $w")
$lines.Add("PlayResY: $h")
$lines.Add('')
$lines.Add('[V4+ Styles]')
$lines.Add('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding')
#  Alignment 2 = 아래 가운데 · BorderStyle 1 + Outline 0 = 띠가 이미 어두우니 외곽선이 필요 없다
$lines.Add("Style: Cap,$Font,$FontSize,&H00F4F4F5,&H00F4F4F5,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,60,60,20,1")
$lines.Add('')
$lines.Add('[Events]')
$lines.Add('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')

#  SRT 를 블록 단위로 읽는다: 번호 / 시각 / 본문 여러 줄 / 빈 줄
$srtText = [IO.File]::ReadAllText((Resolve-Path $Srt), [Text.Encoding]::UTF8)
foreach ($block in ($srtText -split "`r?`n`r?`n")) {
  $rows = @($block -split "`r?`n" | Where-Object { $_.Trim() -ne '' })
  if ($rows.Count -lt 2) { continue }
  $timing = $rows | Where-Object { $_ -match '-->' } | Select-Object -First 1
  if ($null -eq $timing) { continue }
  $parts = $timing -split '\s*-->\s*'
  #  SRT 는 `00:00:02,200` · ASS 는 `0:00:02.20` (1/100초)
  function ToAss([string] $t) {
    if ($t -notmatch '(\d+):(\d+):(\d+)[,.](\d+)') { throw "시각을 못 읽었다: $t" }
    $cs = [int]([double]("0." + $matches[4]) * 100)
    return ('{0}:{1:D2}:{2:D2}.{3:D2}' -f [int]$matches[1], [int]$matches[2], [int]$matches[3], $cs)
  }
  $start = ToAss $parts[0]
  $end = ToAss $parts[1]
  $bodyRows = @($rows | Where-Object { $_ -ne $timing -and $_ -notmatch '^\d+$' })
  $text = ($bodyRows -join '\N')
  $lines.Add("Dialogue: 0,$start,$end,Cap,,0,0,0,,$text")
}
[IO.File]::WriteAllLines($ass, $lines, (New-Object Text.UTF8Encoding($false)))

# --- 굽는다 ------------------------------------------------------------
#  ⚠ Windows 경로를 필터 문자열에 그대로 넣으면 `C:` 의 콜론을 필터 구분자로 읽는다. 이스케이프한다.
$assForFilter = ($ass -replace '\\', '/') -replace ':', '\:'
$vf = "pad=iw:ih+${Bar}:0:0:color=0x0B0B0D,subtitles='$assForFilter'"

if ($Music -eq '') {
  & $ffmpeg -v error -y -i $Video -vf $vf -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -movflags +faststart $Out
} else {
  if (-not (Test-Path $Music)) { throw "음악 파일이 없다: $Music" }
  #  ⚠ 음악은 **영상보다 길어야** 한다 — 짧으면 `-shortest` 가 영상을 잘라 버린다.
  #    그래서 음악을 반복(`aloop`)시키고 영상 길이에 맞춰 끊는다.
  #  ⚠ 끝 2초는 **페이드 아웃**이다. 뚝 끊기는 소리는 「덜 만든 것」으로 들린다.
  $dur = [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $Video)
  $fadeStart = [Math]::Max(0, $dur - 2)
  #  ⚠ `${...}` 로 감싸야 한다 — PowerShell 은 `$fadeStart:` 를 `$env:PATH` 처럼
  #    **이름공간 문법**으로 읽어서 `st==2` 같은 걸 만든다 (2026-09-12 에 여기서 죽었다).
  $af = "volume=${MusicVolume},afade=t=in:st=0:d=1,afade=t=out:st=${fadeStart}:d=2"
  & $ffmpeg -v error -y -i $Video -stream_loop -1 -i $Music `
    -filter_complex "[0:v]$vf[v];[1:a]$af[a]" -map '[v]' -map '[a]' `
    -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p `
    -c:a aac -b:a 128k -shortest -movflags +faststart $Out
}

Remove-Item $ass -Force -ErrorAction SilentlyContinue
if (-not (Test-Path $Out)) { throw '자막 구운 파일이 안 생겼다' }
$size = [Math]::Round((Get-Item $Out).Length / 1MB, 2)
Write-Output "  됐다 — $Out ($size MB)"
