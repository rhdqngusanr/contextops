# =====================================================================
#  tools/principles.ps1 — 절대 원칙 P1~P7 을 기계로 센다 (docs/SPEC.md §0.1)
#
#    powershell -ExecutionPolicy Bypass -File tools/principles.ps1
#
#  ★ 왜 있나 — P1~P7 은 이 제품이 파는 것 그 자체다. "서버는 코드를 안 받는다",
#    "승인 이후엔 LLM이 없다" 는 **주장**이고, 주장은 검사로 잠그지 않으면
#    어느 커밋에선가 조용히 거짓이 된다. 문서에 적는 것으로는 안 지켜진다.
#    **게이트는 문서보다 강하다.**
#
#  ★ 아직 없는 대상은 SKIP 이다. P0 단계에서는 대부분 SKIP 인 게 정상이다.
#    ⚠ 대상이 **생겼는데도** SKIP 이면 그건 「검사가 눈을 가리는」 상태다 —
#      그 원칙은 지금 안 지켜져도 초록이다. 그래서 아래 몇몇 검사는
#      「src 는 있는데 test 가 없다」를 **FAIL** 로 낸다.
#
#  종료 코드: 0 전부 통과(또는 SKIP) · 1 하나라도 위반
# =====================================================================

param([switch] $Quiet)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$results = New-Object System.Collections.ArrayList
$failed  = 0

function Add-Row([string] $id, [string] $what, [string] $state, [string] $detail) {
    $null = $results.Add([pscustomobject]@{ id = $id; what = $what; state = $state; detail = $detail })
    if ($state -eq "FAIL") { $script:failed++ }
}

# 소스 파일만 모은다. 빌드 산출물·의존성은 우리 코드가 아니다.
function Get-SourceFiles([string] $rel, [string[]] $patterns) {
    $dir = Join-Path $root $rel
    if (-not (Test-Path $dir)) { return @() }
    $skip = @("\node_modules\", "\dist\", "\.next\", "\build\", "\coverage\", "\.turbo\")
    Get-ChildItem -Path $dir -Recurse -File -Include $patterns -ErrorAction SilentlyContinue |
        Where-Object {
            $p = $_.FullName
            $hit = $false
            foreach ($s in $skip) { if ($p -like "*$s*") { $hit = $true } }
            -not $hit
        }
}

# 파일들에서 금지 패턴을 찾는다. 찾으면 "경로:줄" 목록을 돌려준다.
function Find-Banned($files, [string[]] $patterns) {
    $hits = New-Object System.Collections.ArrayList
    foreach ($f in $files) {
        $n = 0
        foreach ($line in (Get-Content $f.FullName -ErrorAction SilentlyContinue)) {
            $n++
            foreach ($p in $patterns) {
                if ($line -match $p) {
                    $rel = $f.FullName.Substring($root.Length + 1)
                    $null = $hits.Add("$rel`:$n")
                }
            }
        }
    }
    return $hits
}

# =====================================================================
#  P1 — 서버는 코드 본문·secret·개인 Memory·대화 transcript 를 받지 않는다
# =====================================================================
#  ★ 방어선이 **스키마 하나**에 걸려 있다. 업로드 스키마에 이런 이름의 필드가
#    생기는 순간, 라우트가 아무리 조심해도 통로가 열린 것이다.
#  ⚠ `content` 는 금지어가 아니다 — 팀 **문서** 본문은 의도적으로 올라간다
#    (SPEC §5 POST /documents). 금지하는 것은 **코드·secret·기억·대화**다.
$p1Banned = @(
    "file_content", "\bsnippet\b", "code_body", "\btranscript\b",
    "\bdiff\b", "\bpatch\b", "\bmemory\b", "secret_value", "\bsecrets?\b\s*:",
    "env_value", "token_value", "source_code"
)
$schemaFiles = Get-SourceFiles "packages\schema\src" @("*.ts")
if ($schemaFiles.Count -eq 0) {
    Add-Row "P1" "업로드 스키마에 코드·secret·기억 필드 없음" "SKIP" "packages/schema/src 없음"
} else {
    $hits = Find-Banned $schemaFiles $p1Banned
    if ($hits.Count -gt 0) {
        Add-Row "P1" "업로드 스키마에 코드·secret·기억 필드 없음" "FAIL" ($hits -join " · ")
    } else {
        Add-Row "P1" "업로드 스키마에 코드·secret·기억 필드 없음" "OK" "$($schemaFiles.Count)개 파일"
    }

    # 업로드 스키마는 .strict() 여야 한다. 모르는 필드가 통과하면 allowlist 가 아니다.
    $strict = $schemaFiles | Where-Object { (Get-Content $_.FullName -Raw) -match "\.strict\(\)" }
    if ($strict.Count -eq 0) {
        Add-Row "P1b" "업로드 스키마가 .strict() 로 잠겨 있음" "FAIL" "packages/schema/src 어디에도 .strict() 가 없다"
    } else {
        Add-Row "P1b" "업로드 스키마가 .strict() 로 잠겨 있음" "OK" "$($strict.Count)개 파일"
    }
}

# =====================================================================
#  P2 — 제품 코드는 사용자의 Claude 를 대신 호출하지 않는다
# =====================================================================
#  ⛔ **`loop/` 와 `tools/` 는 세지 않는다.** 그건 우리가 이 저장소를 만드는
#     개발 도구이고 우리 자신의 구독을 쓴다. P2 가 막는 것은 **배포되는 제품**이
#     사용자의 구독을 대신 쓰는 것이다.
#     ⚠ 이 예외를 지우면 다음 바퀴가 loop/loop.ps1 을 「위반」이라며 지운다.
$p2Banned = @(
    "claude\s+-p\b", "claude\s+--print\b", "claude\.exe",
    "@anthropic-ai/claude-agent-sdk", "claude-code/bin",
    "CLAUDE_CODE_OAUTH", "claudeai\s+oauth"
)
$productFiles = @()
foreach ($d in @("plugin", "packages", "apps")) {
    $productFiles += Get-SourceFiles $d @("*.ts", "*.tsx", "*.js", "*.mjs", "*.cjs", "*.json")
}
if ($productFiles.Count -eq 0) {
    Add-Row "P2" "제품 코드가 사용자 Claude 를 대신 호출하지 않음" "SKIP" "plugin/ packages/ apps/ 없음"
} else {
    $hits = Find-Banned $productFiles $p2Banned
    if ($hits.Count -gt 0) {
        Add-Row "P2" "제품 코드가 사용자 Claude 를 대신 호출하지 않음" "FAIL" ($hits -join " · ")
    } else {
        Add-Row "P2" "제품 코드가 사용자 Claude 를 대신 호출하지 않음" "OK" "$($productFiles.Count)개 파일"
    }
}

# =====================================================================
#  P3 — 서버측 LLM 호출은 전부 withBudget() 경유
# =====================================================================
#  ★ 한 곳만 새도 하룻밤에 예산이 탄다. 그리고 새는 자리는 항상
#    「급해서 임시로」 직접 부른 자리다.
$webFiles = Get-SourceFiles "apps\web\src" @("*.ts", "*.tsx")
if ($webFiles.Count -eq 0) {
    Add-Row "P3" "모든 LLM 호출이 withBudget() 경유" "SKIP" "apps/web/src 없음"
} else {
    $callers = @()
    foreach ($f in $webFiles) {
        $raw = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
        if ($raw -match "messages\.create|messages\.stream") { $callers += $f }
    }
    if ($callers.Count -eq 0) {
        Add-Row "P3" "모든 LLM 호출이 withBudget() 경유" "SKIP" "아직 LLM 호출 없음"
    } else {
        $bad = @()
        foreach ($f in $callers) {
            $rel = $f.FullName.Substring($root.Length + 1)
            $raw = Get-Content $f.FullName -Raw
            $isClient = $rel -match "lib[\\/]ai[\\/](client|budget)\.ts$"
            if (-not $isClient -and $raw -notmatch "withBudget") { $bad += $rel }
        }
        if ($bad.Count -gt 0) {
            Add-Row "P3" "모든 LLM 호출이 withBudget() 경유" "FAIL" ($bad -join " · ")
        } else {
            Add-Row "P3" "모든 LLM 호출이 withBudget() 경유" "OK" "$($callers.Count)개 호출부"
        }
        if (-not (Test-Path (Join-Path $root "apps\web\src\lib\ai\budget.ts"))) {
            Add-Row "P3b" "예산 가드 파일 존재" "FAIL" "apps/web/src/lib/ai/budget.ts 가 없다"
        } else {
            Add-Row "P3b" "예산 가드 파일 존재" "OK" ""
        }
    }
}

# =====================================================================
#  P4 — 승인 이후 파이프라인에는 LLM 도 비결정성도 없다
# =====================================================================
#  ★ 「같은 snapshot → byte-identical Pack」이 제품의 주장이다. 시각 하나만
#    섞여도 golden test 가 매일 빨개지고, 재현성 주장이 거짓이 된다.
$compFiles = Get-SourceFiles "packages\compiler\src" @("*.ts")
if ($compFiles.Count -eq 0) {
    Add-Row "P4" "컴파일러가 순수 함수 (시각·난수·네트워크 없음)" "SKIP" "packages/compiler/src 없음"
} else {
    $p4Banned = @(
        "Date\.now\(", "new Date\(\s*\)", "Math\.random\(", "randomUUID",
        "\bfetch\(", "process\.env", "require\(\s*['`"]https?", "@anthropic-ai"
    )
    $hits = Find-Banned $compFiles $p4Banned
    if ($hits.Count -gt 0) {
        Add-Row "P4" "컴파일러가 순수 함수 (시각·난수·네트워크 없음)" "FAIL" ($hits -join " · ")
    } else {
        Add-Row "P4" "컴파일러가 순수 함수 (시각·난수·네트워크 없음)" "OK" "$($compFiles.Count)개 파일"
    }

    #  ⚠ 여기가 「SKIP 이면 안 되는 SKIP」을 막는 자리다.
    #    컴파일러가 있는데 golden 이 없으면 P4 는 사실상 검사되지 않는다.
    $golden = Join-Path $root "packages\compiler\test\golden"
    if (-not (Test-Path $golden)) {
        Add-Row "P4b" "golden test 존재" "FAIL" "컴파일러는 있는데 test/golden 이 없다 — P4 가 검사되지 않는 상태"
    } else {
        $cases = @(Get-ChildItem $golden -Directory -ErrorAction SilentlyContinue)
        if ($cases.Count -lt 3) {
            Add-Row "P4b" "golden test 존재" "FAIL" "golden 케이스가 $($cases.Count)개다 — SPEC §4.4 는 3종"
        } else {
            Add-Row "P4b" "golden test 존재" "OK" "$($cases.Count)개 케이스"
        }
    }
}

# =====================================================================
#  P6 — Hook 은 파일을 변경하지 않는다
# =====================================================================
#  ★ 사용자 저장소를 몰래 고치는 도구가 되면 아무도 안 깐다. 변경은 사용자가
#    /contextops:sync 를 **직접 실행할 때만**.
$hook = Join-Path $root "plugin\contextops\scripts\session-start.mjs"
if (-not (Test-Path $hook)) {
    Add-Row "P6" "SessionStart 훅이 파일을 쓰지 않음" "SKIP" "session-start.mjs 없음"
} else {
    $p6Banned = @(
        "writeFile", "appendFile", "createWriteStream", "mkdirSync", "rmSync",
        "unlinkSync", "renameSync", "copyFileSync", "chmodSync"
    )
    $hits = Find-Banned @(Get-Item $hook) $p6Banned
    if ($hits.Count -gt 0) {
        Add-Row "P6" "SessionStart 훅이 파일을 쓰지 않음" "FAIL" ($hits -join " · ")
    } else {
        Add-Row "P6" "SessionStart 훅이 파일을 쓰지 않음" "OK" ""
    }
}

# =====================================================================
#  P7 — 모든 Pack 줄은 항목 ID → 원문으로 역추적된다
# =====================================================================
#  기계가 잴 수 있는 것은 「템플릿에 역추적 태그 자리가 있는가」까지다.
#  「전 줄에 실제로 붙었는가」는 컴파일러 테스트가 잰다.
$tpl = Join-Path $root "packages\compiler\templates"
if (-not (Test-Path $tpl)) {
    Add-Row "P7" "템플릿에 역추적 태그 자리 있음" "SKIP" "packages/compiler/templates 없음"
} else {
    $tplFiles = @(Get-ChildItem $tpl -Recurse -File -ErrorAction SilentlyContinue)
    $withTag = $tplFiles | Where-Object { (Get-Content $_.FullName -Raw) -match "ctx:" }
    if ($tplFiles.Count -eq 0) {
        Add-Row "P7" "템플릿에 역추적 태그 자리 있음" "FAIL" "templates 폴더가 비었다"
    } elseif ($withTag.Count -eq 0) {
        Add-Row "P7" "템플릿에 역추적 태그 자리 있음" "FAIL" "어느 템플릿에도 ctx: 태그가 없다"
    } else {
        Add-Row "P7" "템플릿에 역추적 태그 자리 있음" "OK" "$($withTag.Count)/$($tplFiles.Count) 템플릿"
    }
}

# =====================================================================
#  출력
# =====================================================================
#  ⚠ P5(개인 순위 금지)는 기계로 못 잰다. 눈 판정 항목이라
#    loop/PROMPT.md ⑦3층 체크리스트에 있다. 여기서 초록이라고 P5 가 지켜진 게 아니다.
$okN   = @($results | Where-Object { $_.state -eq "OK" }).Count
$skipN = @($results | Where-Object { $_.state -eq "SKIP" }).Count

if (-not $Quiet) {
    Write-Host ""
    Write-Host "=== 절대 원칙 검사 (docs/SPEC.md §0.1) ===" -ForegroundColor Cyan
    foreach ($r in $results) {
        $c = "DarkGray"
        if ($r.state -eq "OK")   { $c = "Green" }
        if ($r.state -eq "FAIL") { $c = "Red" }
        Write-Host ("  {0,-4} {1,-5} {2}" -f $r.id, $r.state, $r.what) -ForegroundColor $c
        if ($r.detail) { Write-Host ("            {0}" -f $r.detail) -ForegroundColor DarkGray }
    }
    Write-Host ""
    Write-Host "  P5(개인 순위 금지)는 기계로 못 잰다 — 눈 판정이다 (loop/PROMPT.md ⑦)" -ForegroundColor DarkGray
}

$summary = "principles: OK $okN · SKIP $skipN · FAIL $failed"
$ciDir = Join-Path $root ".ci"
New-Item -ItemType Directory -Force -Path $ciDir | Out-Null
$lines = @($summary) + ($results | ForEach-Object { "{0}`t{1}`t{2}`t{3}" -f $_.id, $_.state, $_.what, $_.detail })
Set-Content -Path (Join-Path $ciDir "principles.txt") -Value $lines -Encoding UTF8

if (-not $Quiet) {
    if ($failed -gt 0) { Write-Host "  $summary" -ForegroundColor Red }
    else               { Write-Host "  $summary" -ForegroundColor Green }
    Write-Host ""
}

if ($failed -gt 0) { exit 1 }
exit 0
