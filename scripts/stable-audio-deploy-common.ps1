function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg) { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Fail($msg) {
    Write-Host "`n    错误: $msg" -ForegroundColor Red
    Write-Host "`n按任意键退出..." -ForegroundColor Gray
    try { $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") } catch {}
    exit 1
}

function Refresh-PathFromRegistry {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path = "$machinePath;$userPath"
}

function Add-UserPath($path) {
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path | Out-Null }
    $userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
    $parts = @()
    if ($userPath) { $parts = $userPath -split ';' | Where-Object { $_ } }
    if ($parts -notcontains $path) {
        $newPath = if ($userPath) { "$userPath;$path" } else { $path }
        [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    }
    if (($env:Path -split ';') -notcontains $path) { $env:Path = "$path;$env:Path" }
}

function Write-Utf8PowerShellFile($path, $content) {
    $encoding = [System.Text.UTF8Encoding]::new($true)
    [System.IO.File]::WriteAllText($path, $content, $encoding)
}

$StableAudioRepoFallbackUrls = @(
    "https://gh-proxy.com/https://github.com/Stability-AI/stable-audio-3.git"
)

function Test-StableAudioRepositoryReady($repoDir) {
    return (Test-Path (Join-Path $repoDir ".git")) -or (Test-Path (Join-Path $repoDir "pyproject.toml"))
}

function Remove-PartialStableAudioRepository($repoDir) {
    if ((Test-Path $repoDir) -and -not (Test-StableAudioRepositoryReady $repoDir)) {
        Write-Host "    清理未完成的仓库目录：$repoDir" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $repoDir
    }
}

function Ensure-GitAvailable {
    Write-Step "检测 git"
    Refresh-PathFromRegistry
    foreach ($p in @("$env:ProgramFiles\Git\cmd", "${env:ProgramFiles(x86)}\Git\cmd", "$env:LOCALAPPDATA\Programs\Git\cmd")) {
        if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) { $env:Path = "$p;$env:Path" }
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements
            Refresh-PathFromRegistry
        }
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Fail "git 未安装。请手动安装：https://git-scm.com/download/win"
    }
    Write-OK "git 可用"
}

function Ensure-UvAvailable {
    Write-Step "检测 uv"
    Refresh-PathFromRegistry
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        Write-OK "uv 可用"
        return
    }
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id astral-sh.uv --silent --accept-package-agreements --accept-source-agreements
        Refresh-PathFromRegistry
    }
    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
        Write-Fail "uv 未安装。请手动安装：https://docs.astral.sh/uv/"
    }
    Write-OK "uv 可用"
}

function Ensure-Repository($repoUrl, $repoDir) {
    Write-Step "准备 Stable Audio 3 仓库到 $repoDir"
    $parent = Split-Path -Parent $repoDir
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    if (Test-StableAudioRepositoryReady $repoDir) {
        Write-OK "仓库已存在，跳过克隆"
        return
    }

    $repoUrls = @($repoUrl) + $StableAudioRepoFallbackUrls
    if ($env:STABLE_AUDIO_REPO_URLS) {
        $repoUrls += ($env:STABLE_AUDIO_REPO_URLS -split ';' | Where-Object { $_.Trim() })
    }

    foreach ($candidateRepoUrl in $repoUrls) {
        Remove-PartialStableAudioRepository $repoDir
        Write-Host "    尝试克隆：$candidateRepoUrl"
        & git clone --depth 1 $candidateRepoUrl $repoDir
        if ($LASTEXITCODE -eq 0 -and (Test-StableAudioRepositoryReady $repoDir)) {
            Write-OK "仓库克隆完成"
            return
        }
        Write-Host "    克隆失败，准备尝试下一个源。" -ForegroundColor Yellow
    }

    Write-Fail "克隆 Stable Audio 3 仓库失败。请检查网络或 git 代理；请手动把仓库放到 $repoDir 后重新运行安装脚本。"
}

function Invoke-StableAudioInstall($repoDir) {
    Write-Step "安装 Stable Audio 3 Python 依赖"
    Push-Location $repoDir
    try {
        uv sync --extra ui
        if ($LASTEXITCODE -ne 0) { Write-Fail "uv sync --extra ui 执行失败。" }
    } finally {
        Pop-Location
    }
    Write-OK "Stable Audio 3 依赖安装完成"
}
