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
#
#  🔴 **경로는 반드시 -LiteralPath 로 넘긴다.**
#    ★ 왜 — Next App Router 의 동적 구간은 폴더 이름이 `[id]` 다. PowerShell 은 대괄호를
#      **와일드카드**로 읽어서, `Get-Content <...>/[id]/route.ts` 는 아무것도 못 찾는다.
#      -ErrorAction SilentlyContinue 와 만나면 **조용히 0줄을 읽고 통과**한다 —
#      즉 그 라우트들만 P1·P2 검사를 안 받는다. 게이트가 눈을 가리는 최악의 모양이다.
#      (`-Raw` 는 FileSystem 공급자의 동적 매개변수라 경로 해석이 실패하면
#       「Raw 라는 매개변수가 없다」는 엉뚱한 오류로 죽는다 — 이건 그나마 시끄러워서 낫다)
function Find-Banned($files, [string[]] $patterns) {
    $hits = New-Object System.Collections.ArrayList
    foreach ($f in $files) {
        $n = 0
        foreach ($line in (Get-Content -LiteralPath $f.FullName -ErrorAction SilentlyContinue)) {
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
    $strict = $schemaFiles | Where-Object { (Get-Content -LiteralPath $_.FullName -Raw) -match "\.strict\(\)" }
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
        $raw = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
        #  ⚠ `generateContent` 는 Gemini 의 문이다 (2026-09-06 · INBOX). 공급자를 바꾸면
        #    **여기 패턴을 같이 바꿔라** — 안 바꾸면 「LLM 호출 없음」SKIP 으로 P3 가 눈을 감는다.
        if ($raw -match "messages\.create|messages\.stream|generateContent") { $callers += $f }
    }
    if ($callers.Count -eq 0) {
        Add-Row "P3" "모든 LLM 호출이 withBudget() 경유" "SKIP" "아직 LLM 호출 없음"
    } else {
        $bad = @()
        foreach ($f in $callers) {
            $rel = $f.FullName.Substring($root.Length + 1)
            $raw = Get-Content -LiteralPath $f.FullName -Raw
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
#  P6 — Hook 은 **사용자의 파일**을 변경하지 않는다
# =====================================================================
#  ★ 사용자 저장소를 몰래 고치는 도구가 되면 아무도 안 깐다. 관리 파일의 변경은
#    사용자가 /contextops:sync 를 **직접 실행할 때만**.
#  ⚠ 검사 대상을 파일 이름으로 박지 마라 — 훅이 둘째(Stop)가 되는 순간 그 파일만
#    검사를 안 받는다. **hooks.json 이 가리키는 것 전부**를 센다.
#
#  🔴 훅이 파일을 쓸 수 있는 경우는 **선언했을 때뿐이다** (SPEC §0.1 P6):
#    ① hooks.json 의 `_writes` 표에 그 훅 이름이 있어야 하고
#    ② 거기 적힌 경로가 전부 `.contextops/` 의 ignore 목록 안이어야 한다
#       (정본은 src/cli/paths.ts 의 IGNORED_LOCAL_PATHS — git 이 그 변화를 못 본다).
#    ★ 왜 「쓰기 0건」이 아니라 이 모양인가 — Stop 훅은 「무엇이 바뀌었나」를
#      세션이 끝나는 순간에만 알 수 있고, 다음 세션에 전하려면 어딘가 남겨야 한다.
#      「예외를 코드에 숨기기」와 「경계를 표로 선언하고 기계가 재기」는 다르다.
#    ⚠ 이름 검사는 여기까지다. 「선언 밖의 경로에 실제로 썼는가」는 훅을 돌려 보는
#      test/hooks.test.ts 가 잰다 — 이름만 세면 새 쓰기 API 에 그대로 뚫린다.
$hooksJson = Join-Path $root "plugin\contextops\hooks\hooks.json"
$pathsTs   = Join-Path $root "plugin\contextops\src\cli\paths.ts"
if (-not (Test-Path $hooksJson)) {
    Add-Row "P6" "훅이 선언한 자리만 씀" "SKIP" "plugin/contextops/hooks/hooks.json 없음"
} else {
    #  🔴 UTF-8 로 **명시해서** 읽는다. `Get-Content -Raw` 는 PS 5.1 에서 ANSI 로 읽어
    #     한글 주석이 깨지고, 그러면 ConvertFrom-Json 이 「잘못된 배열」로 죽는다 —
    #     증상은 「_writes 선언이 없다」라서 원인이 하나도 안 보인다.
    $raw = [System.IO.File]::ReadAllText($hooksJson, [System.Text.Encoding]::UTF8)
    $names = [regex]::Matches($raw, 'scripts/([A-Za-z0-9._-]+\.mjs)') | ForEach-Object { $_.Groups[1].Value }
    $names = @($names | Sort-Object -Unique)

    #  선언표(`_writes`)를 읽는다. 훅 이름 → 경로 목록.
    $declared = @{}
    try {
        $hooksObj = $raw | ConvertFrom-Json
        if ($hooksObj._writes) {
            foreach ($prop in $hooksObj._writes.PSObject.Properties) {
                $declared[$prop.Name] = @($prop.Value)
            }
        }
    } catch {
        $declared = @{}
    }

    #  ignore 목록의 정본을 코드에서 뽑는다 — 여기 다시 적으면 갈라진다.
    $ignored = @()
    if (Test-Path $pathsTs) {
        $pathsRaw = [System.IO.File]::ReadAllText($pathsTs, [System.Text.Encoding]::UTF8)
        $m = [regex]::Match($pathsRaw, "IGNORED_LOCAL_PATHS\s*=\s*\[([^\]]*)\]")
        if ($m.Success) {
            $ignored = @([regex]::Matches($m.Groups[1].Value, "'([^']+)'") | ForEach-Object { $_.Groups[1].Value })
        }
    }

    if ($names.Count -eq 0) {
        Add-Row "P6" "훅이 선언한 자리만 씀" "FAIL" "hooks.json 이 어떤 스크립트도 가리키지 않는다"
    } elseif ($ignored.Count -eq 0) {
        Add-Row "P6" "훅이 선언한 자리만 씀" "FAIL" "IGNORED_LOCAL_PATHS 를 읽지 못했다 — 경계를 잴 수 없다"
    } else {
        $p6Banned = @(
            "writeFile", "appendFile", "createWriteStream", "mkdirSync", "rmSync",
            "unlinkSync", "renameSync", "copyFileSync", "chmodSync"
        )
        $problems = New-Object System.Collections.ArrayList
        $wrote = New-Object System.Collections.ArrayList

        foreach ($n in $names) {
            $f = Join-Path $root "plugin\contextops\scripts\$n"
            if (-not (Test-Path $f)) {
                #  없는 스크립트를 가리키면 사용자는 매 세션 오류를 본다 — 그건 고장이다.
                $null = $problems.Add("hooks.json 이 없는 파일을 가리킨다: $n")
                continue
            }
            $hits = Find-Banned @(Get-Item $f) $p6Banned
            if ($hits.Count -eq 0) { continue }

            if (-not $declared.ContainsKey($n)) {
                $null = $problems.Add("$n 이 파일을 쓰는데 _writes 에 선언이 없다 (" + ($hits -join " · ") + ")")
                continue
            }
            $null = $wrote.Add($n)
        }

        #  선언된 경로가 전부 ignore 안인가. **선언만 하고 밖을 가리키면 더 나쁘다** —
        #  「선언했으니 괜찮다」로 읽히기 때문이다.
        foreach ($n in $declared.Keys) {
            foreach ($path in $declared[$n]) {
                $rel = $path -replace '^\.contextops/', ''
                $inside = $false
                foreach ($ig in $ignored) {
                    if ($rel -eq $ig -or $rel.StartsWith($ig)) { $inside = $true }
                }
                if (-not ($path.StartsWith(".contextops/") -and $inside)) {
                    $null = $problems.Add("$n 의 선언이 ignore 밖이다: $path")
                }
            }
        }

        if ($problems.Count -gt 0) {
            Add-Row "P6" "훅이 선언한 자리만 씀" "FAIL" ($problems -join " · ")
        } else {
            $detail = "$($names.Count)개 훅: " + ($names -join " · ")
            if ($wrote.Count -gt 0) { $detail += " · 쓰기 선언: " + ($wrote -join " · ") }
            Add-Row "P6" "훅이 선언한 자리만 씀" "OK" $detail
        }
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
    $withTag = $tplFiles | Where-Object { (Get-Content -LiteralPath $_.FullName -Raw) -match "ctx:" }
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
