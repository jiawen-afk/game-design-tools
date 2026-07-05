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
$StableAudioGitCloneTimeoutSeconds = 180
$StableAudioGitLowSpeedLimit = 16384
$StableAudioGitLowSpeedTime = 45

if ($env:STABLE_AUDIO_GIT_CLONE_TIMEOUT_SECONDS) {
    $configuredTimeout = 0
    if ([int]::TryParse($env:STABLE_AUDIO_GIT_CLONE_TIMEOUT_SECONDS, [ref]$configuredTimeout) -and $configuredTimeout -gt 0) {
        $StableAudioGitCloneTimeoutSeconds = $configuredTimeout
    }
}
if ($env:STABLE_AUDIO_GIT_LOW_SPEED_LIMIT) {
    $configuredLowSpeedLimit = 0
    if ([int]::TryParse($env:STABLE_AUDIO_GIT_LOW_SPEED_LIMIT, [ref]$configuredLowSpeedLimit) -and $configuredLowSpeedLimit -gt 0) {
        $StableAudioGitLowSpeedLimit = $configuredLowSpeedLimit
    }
}
if ($env:STABLE_AUDIO_GIT_LOW_SPEED_TIME) {
    $configuredLowSpeedTime = 0
    if ([int]::TryParse($env:STABLE_AUDIO_GIT_LOW_SPEED_TIME, [ref]$configuredLowSpeedTime) -and $configuredLowSpeedTime -gt 0) {
        $StableAudioGitLowSpeedTime = $configuredLowSpeedTime
    }
}

function ConvertTo-ProcessArgument($value) {
    $text = [string]$value
    if ($text -notmatch '[\s"]') { return $text }
    return '"' + ($text -replace '"', '\"') + '"'
}

function Stop-ProcessTree([int]$processId) {
    try {
        Get-CimInstance Win32_Process -Filter "ParentProcessId = $processId" | ForEach-Object {
            Stop-ProcessTree ([int]$_.ProcessId)
        }
    } catch {}
    try { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue } catch {}
}

function Invoke-GitCloneWithTimeout($repoUrl, $repoDir, $timeoutSeconds) {
    $gitArgs = @(
        "-c", "http.lowSpeedLimit=$StableAudioGitLowSpeedLimit",
        "-c", "http.lowSpeedTime=$StableAudioGitLowSpeedTime",
        "clone", "--depth", "1", "--single-branch", $repoUrl, $repoDir
    )
    $argumentList = ($gitArgs | ForEach-Object { ConvertTo-ProcessArgument $_ }) -join " "
    Write-Host "    克隆保护：单个源最多等待 $timeoutSeconds 秒；低于 $StableAudioGitLowSpeedLimit B/s 持续 $StableAudioGitLowSpeedTime 秒会失败换源。" -ForegroundColor Gray
    $process = Start-Process -FilePath "git" -ArgumentList $argumentList -NoNewWindow -PassThru
    if (-not $process.WaitForExit($timeoutSeconds * 1000)) {
        Write-Host "    克隆超时，正在停止 git 并切换下一个源。" -ForegroundColor Yellow
        Stop-ProcessTree ([int]$process.Id)
        return $false
    }
    return $process.ExitCode -eq 0
}

function Test-StableAudioRepositoryReady($repoDir) {
    if (-not (Test-Path (Join-Path $repoDir "pyproject.toml"))) { return $false }
    if (Test-Path (Join-Path $repoDir ".git")) {
        & git -C $repoDir rev-parse --verify HEAD *> $null
        return $LASTEXITCODE -eq 0
    }
    return $true
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
        $cloneSucceeded = Invoke-GitCloneWithTimeout $candidateRepoUrl $repoDir $StableAudioGitCloneTimeoutSeconds
        if ($cloneSucceeded -and (Test-StableAudioRepositoryReady $repoDir)) {
            Write-OK "仓库克隆完成"
            return
        }
        Write-Host "    克隆失败或超时，准备尝试下一个源。" -ForegroundColor Yellow
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

function Invoke-StableAudioModelDownload($repoDir, $modelVariant, $source) {
    Write-Step "下载 Stable Audio 3 模型 $modelVariant"
    $sourceText = [string]$source
    if ($sourceText -eq "ms") {
        Write-Host "    Stable Audio 3 官方服务读取 HuggingFace 本机缓存；ModelScope 暂不作为该模型的启动缓存。" -ForegroundColor Yellow
        Write-Host "    本次将优先使用 HuggingFace 镜像下载到官方缓存，失败时回退官方端点。" -ForegroundColor Yellow
    } else {
        Write-Host "    优先下载端点：https://hf-mirror.com；失败时回退 https://huggingface.co" -ForegroundColor Gray
    }

    $modelJson = $modelVariant | ConvertTo-Json -Compress
    $sourceJson = $sourceText | ConvertTo-Json -Compress
    $pyCode = @"
from huggingface_hub import hf_hub_download
from stable_audio_3.model_configs import models

model = $modelJson
source = $sourceJson
cfg = models[model]
model_url = f"https://huggingface.co/{cfg.repo_id}"

print(f"准备下载模型：{model} ({cfg.repo_id})")
print(f"访问链接：{model_url}")

endpoint_plan = []
if source in ("auto", "hf", "ms"):
    endpoint_plan.append(("HF 镜像", "https://hf-mirror.com"))
endpoint_plan.append(("HuggingFace 官方", "https://huggingface.co"))

def download_model_from_endpoint(label, endpoint):
    print(f"下载端点：{label} ({endpoint})")
    kwargs = {
        "repo_id": cfg.repo_id,
        "endpoint": endpoint,
        "etag_timeout": 20,
    }
    config_path = hf_hub_download(filename=cfg.config_path, **kwargs)
    ckpt_path = hf_hub_download(filename=cfg.ckpt_path, **kwargs)
    return config_path, ckpt_path

config_path = None
ckpt_path = None
last_error = None
for index, (label, endpoint) in enumerate(endpoint_plan):
    try:
        config_path, ckpt_path = download_model_from_endpoint(label, endpoint)
        break
    except Exception as exc:
        last_error = exc
        print(f"{label} 下载失败：{type(exc).__name__}: {exc}")
        if index + 1 < len(endpoint_plan):
            next_label = endpoint_plan[index + 1][0]
            if next_label == "HuggingFace 官方":
                print("将切换到 HuggingFace 官方端点重试。")
            else:
                print(f"将切换到 {next_label}端点重试。")

if not config_path or not ckpt_path:
    print(f"模型下载失败：所有下载端点均不可用。最后错误：{last_error}")
    print(f"请打开访问链接并确认许可：{model_url}")
    print("登录命令：uv run hf auth login")
    raise SystemExit(1)

print(f"model_config.json: {config_path}")
print(f"model.safetensors: {ckpt_path}")
"@
    $pyFile = Join-Path ([System.IO.Path]::GetTempPath()) ("stable_audio_model_download_" + [System.Guid]::NewGuid().ToString("N") + ".py")
    Set-Content -Path $pyFile -Value $pyCode -Encoding utf8

    Push-Location $repoDir
    try {
        uv run python $pyFile
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "模型 $modelVariant 下载失败。请打开上方 HuggingFace 访问链接确认许可，然后在 $repoDir 运行：uv run hf auth login"
        }
    } finally {
        Pop-Location
        Remove-Item $pyFile -ErrorAction SilentlyContinue
    }
    Write-OK "Stable Audio 3 模型 $modelVariant 已下载到本机缓存"
}
