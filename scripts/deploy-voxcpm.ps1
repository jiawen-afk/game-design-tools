# VoxCPM Gradio one-click setup script (Windows PowerShell)
# Local usage: .\deploy-voxcpm.ps1 'D:\models\VoxCPM2' 'VoxCPM2' 'auto'

param(
    [string]$ModelPath = "D:\models\VoxCPM2",
    [string]$ModelVariant = "VoxCPM2",
    [ValidateSet("auto","hf","ms")][string]$Source = "auto"
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    chcp 65001 > $null
} catch {}

$ErrorActionPreference = "Stop"
$Port = 8808
$PipMirror = "https://mirrors.aliyun.com/pypi/simple/"
$HfMirror = "https://hf-mirror.com"
$TorchCudaIndex = "https://download.pytorch.org/whl/cu128"

$HfMap = @{
    "VoxCPM2"     = "openbmb/VoxCPM2"
    "VoxCPM1.5"   = "openbmb/VoxCPM1.5"
    "VoxCPM-0.5B" = "openbmb/VoxCPM-0.5B"
}
$MsMap = @{
    "VoxCPM2"     = "OpenBMB/VoxCPM2"
    "VoxCPM1.5"   = "OpenBMB/VoxCPM1.5"
    "VoxCPM-0.5B" = "OpenBMB/VoxCPM-0.5B"
}
if (-not $HfMap[$ModelVariant]) { $ModelVariant = "VoxCPM2" }
$HfId = $HfMap[$ModelVariant]

$PythonCommand = $null
$PythonArgs = @()

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
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

function Measure-Latency($url) {
    $best = [double]::MaxValue
    for ($i = 0; $i -lt 3; $i++) {
        try {
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 5 -UseBasicParsing | Out-Null
            $sw.Stop()
            if ($sw.Elapsed.TotalMilliseconds -lt $best) { $best = $sw.Elapsed.TotalMilliseconds }
        } catch {}
    }
    return $best
}

function Resolve-PythonCandidate {
    $candidates = @(
        @{ Command = "py"; Args = @("-3.12"); Display = "py -3.12" },
        @{ Command = "python3.12"; Args = @(); Display = "python3.12" },
        @{ Command = "python"; Args = @(); Display = "python" }
    )

    foreach ($candidate in $candidates) {
        $cmd = Get-Command $candidate.Command -ErrorAction SilentlyContinue
        if (-not $cmd) { continue }
        try {
            $ver = & $cmd.Source @($candidate.Args) --version 2>&1
            if ($LASTEXITCODE -eq 0 -and "$ver" -match "3\.12\.") {
                return @{
                    Command = $cmd.Source
                    Args = @($candidate.Args)
                    Display = $candidate.Display
                    Version = "$ver"
                }
            }
        } catch {}
    }
    return $null
}

function Resolve-PythonExecutablePath($command, $args) {
    $probeArgs = @($args) + @("-c", "import sys; print(sys.executable)")
    $output = & $command @probeArgs 2>&1
    if ($LASTEXITCODE -ne 0) { return $null }
    $path = ($output | Select-Object -Last 1).ToString().Trim()
    if ($path -and (Test-Path $path)) { return $path }
    return $null
}

function Ensure-PythonAvailable {
    Write-Step "检测 Python 版本"
    $candidate = Resolve-PythonCandidate
    if (-not $candidate) {
        Write-Host "    未找到兼容的 Python 3.12，正在自动安装 Python 3.12..." -ForegroundColor Yellow
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        } else {
            $installer = "$env:TEMP\python-3.12-amd64.exe"
            $mirrorUrl = "https://mirrors.aliyun.com/python/3.12.10/python-3.12.10-amd64.exe"
            Invoke-WebRequest -Uri $mirrorUrl -OutFile $installer -UseBasicParsing
            Start-Process -FilePath $installer -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1" -Wait
            Remove-Item $installer -ErrorAction SilentlyContinue
        }
        Refresh-PathFromRegistry
        $candidate = Resolve-PythonCandidate
    }

    if (-not $candidate) { Write-Fail "Python 3.12 安装失败，请手动安装 Python 3.12 后重试。" }
    $realCommand = Resolve-PythonExecutablePath $candidate.Command @($candidate.Args)
    if (-not $realCommand) { Write-Fail "无法解析 Python 解释器路径，请手动检查 Python 安装。" }
    $candidate.RealCommand = $realCommand
    $script:PythonCommand = $candidate.RealCommand
    $script:PythonArgs = @()
    Write-OK "$($candidate.Version)（使用：$($candidate.Display)）"
}

function Invoke-Python($arguments, $failureMessage) {
    $allArgs = @($script:PythonArgs) + @($arguments)
    $process = Start-Process -FilePath $script:PythonCommand -ArgumentList $allArgs -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) { Write-Fail $failureMessage }
}

function Invoke-PythonOutput($arguments) {
    $allArgs = @($script:PythonArgs) + @($arguments)
    $output = & $script:PythonCommand @allArgs 2>&1
    return @{ Output = @($output); ExitCode = $LASTEXITCODE }
}

function Resolve-ModelDriveName($path) {
    $fullPath = [System.IO.Path]::GetFullPath($path)
    $root = [System.IO.Path]::GetPathRoot($fullPath)
    return $root.TrimEnd('\', ':')
}

function Test-DiskSpace($path) {
    Write-Step "检测模型目录所在磁盘空间"
    $driveName = Resolve-ModelDriveName $path
    $free = (Get-PSDrive $driveName).Free / 1GB
    $freeStr = $free.ToString("F1")
    if ($free -lt 30) { Write-Fail "${driveName}: 盘可用空间不足（${freeStr}GB），至少需要 30GB。" }
    Write-OK "${driveName}: 盘 ${freeStr}GB 可用"
}

function Test-NvidiaAvailable {
    Write-Step "检测 NVIDIA 驱动"
    $smiCommand = Get-Command nvidia-smi -ErrorAction SilentlyContinue
    if (-not $smiCommand) {
        Write-Host "    警告: 未检测到 nvidia-smi，将使用 CPU 模式（速度较慢）" -ForegroundColor Yellow
        return $false
    }

    & $smiCommand.Source 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-OK "GPU 驱动正常"
        return $true
    }
    Write-Host "    警告: nvidia-smi 执行失败，将使用 CPU 模式（速度较慢）" -ForegroundColor Yellow
    return $false
}

function Test-GitAvailable {
    Refresh-PathFromRegistry
    foreach ($p in @("$env:ProgramFiles\Git\cmd", "${env:ProgramFiles(x86)}\Git\cmd", "$env:LOCALAPPDATA\Programs\Git\cmd")) {
        if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) { $env:Path = "$p;$env:Path" }
    }
    return [bool](Get-Command git -ErrorAction SilentlyContinue)
}

function Ensure-GitAvailable {
    Write-Step "检测 git"
    if (-not (Test-GitAvailable)) {
        Write-Host "    未找到 git，正在自动安装..." -ForegroundColor Yellow
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements
        } else {
            Write-Fail "git 未安装且 winget 不可用，请手动安装：https://git-scm.com/download/win"
        }
        if (-not (Test-GitAvailable)) { Write-Fail "git 安装后仍未找到，请重开 PowerShell 再运行本脚本。" }
    }
    Write-OK "git 可用"
}

function Ensure-FfmpegAvailable {
    Write-Step "检测 ffmpeg 音频解码器"
    if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
        Write-OK "ffmpeg 可用"
        return
    }

    Write-Host "    未找到 ffmpeg，浏览器麦克风录制的 m4a 参考音频会无法读取，正在自动安装..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Gyan.FFmpeg --silent --accept-package-agreements --accept-source-agreements
        Refresh-PathFromRegistry
        foreach ($p in @("$env:LOCALAPPDATA\Microsoft\WinGet\Links", "$env:ProgramFiles\ffmpeg\bin", "$env:ProgramFiles\Gyan\FFmpeg\bin")) {
            if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) { $env:Path = "$p;$env:Path" }
        }
        if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
            Write-OK "ffmpeg 安装完成"
            return
        }
    }
    Write-Fail "ffmpeg 未安装。请手动安装 FFmpeg 并重开 PowerShell 后重试，否则 m4a 参考音频无法用于克隆。"
}

function Ensure-Torch($hasNvidia) {
    if (-not $hasNvidia) { return }

    Write-Step "检测 PyTorch 版本（目标：GPU/cu128）"
    $probeCode = @'
try:
    import torch
    cuda = torch.version.cuda or ""
    capability = ""
    if torch.cuda.is_available():
        major, minor = torch.cuda.get_device_capability(0)
        capability = f"sm_{major}{minor}"
    print(cuda)
    print(capability)
except Exception as exc:
    print(f"ERROR:{exc}")
    raise
'@
    $probe = Invoke-PythonOutput @("-c", $probeCode)
    $needsInstall = $true
    if ($probe.ExitCode -eq 0) {
        $cudaVersion = "$($probe.Output[0])"
        $capability = "$($probe.Output[1])"
        if ($capability -eq "sm_120" -and $cudaVersion -notmatch "^12\.8") {
            Write-Host "    检测到 RTX 50 / sm_120，需要 cu128 版 PyTorch。" -ForegroundColor Yellow
        } elseif ($cudaVersion -match "^12\.") {
            $needsInstall = $false
        }
    }

    if ($needsInstall) {
        Write-Step "安装 GPU 版 PyTorch（cu128，约 2.5GB，请耐心等待）"
        Invoke-Python @("-m", "pip", "uninstall", "-y", "torch", "torchaudio") "PyTorch 卸载失败"
        Invoke-Python @("-m", "pip", "install", "torch", "torchaudio", "--index-url", $TorchCudaIndex) "GPU 版 PyTorch 安装失败"
    } else {
        Write-OK "已安装 CUDA 版 PyTorch"
    }
}

function Verify-Torch($hasNvidia) {
    if (-not $hasNvidia) { return }
    Write-Step "校验 PyTorch GPU 支持"
    $check = Invoke-PythonOutput @("-c", "import torch; print(torch.cuda.is_available())")
    if (($check.Output -join "`n") -match "True") {
        Write-OK "PyTorch 已启用 GPU (CUDA)"
        return
    }

    Write-Host "    PyTorch 不可用 GPU，重装 cu128 版..." -ForegroundColor Yellow
    Invoke-Python @("-m", "pip", "uninstall", "-y", "torch", "torchaudio") "PyTorch 卸载失败"
    Invoke-Python @("-m", "pip", "install", "torch", "torchaudio", "--index-url", $TorchCudaIndex) "GPU 版 PyTorch 安装失败"
    $check2 = Invoke-PythonOutput @("-c", "import torch; print(torch.cuda.is_available())")
    if (($check2.Output -join "`n") -match "True") { Write-OK "GPU 版 PyTorch 安装完成，已启用 CUDA" }
    else { Write-Host "    警告: 仍未检测到 CUDA，将以 CPU 模式运行（请检查显卡驱动）" -ForegroundColor Yellow }
}

function Install-ServiceCommands($repoDir, $launchId, $modelPath, $modelVariant, $source) {
    Write-Step "安装 VoxCPM 服务管理命令"
    $cmdDir = Join-Path $env:LOCALAPPDATA "GameDesignTools\bin"
    $stateDir = Join-Path $env:LOCALAPPDATA "GameDesignTools\VoxCPM"
    New-Item -ItemType Directory -Force -Path $cmdDir, $stateDir | Out-Null
    Add-UserPath $cmdDir

    $configPath = Join-Path $stateDir "voxcpm-config.json"
    $runnerPath = Join-Path $cmdDir "voxcpm-run.ps1"
    $servicePath = Join-Path $cmdDir "voxcpm-service.ps1"
    $logPath = Join-Path $stateDir "voxcpm.log"
    $stderrPath = Join-Path $stateDir "voxcpm.err.log"
    $pidPath = Join-Path $stateDir "voxcpm.pid"

    @{
        PythonCommand = $script:PythonCommand
        PythonArgs = @($script:PythonArgs)
        RepoDir = $repoDir
        LaunchId = $launchId
        ModelPath = $modelPath
        ModelVariant = $modelVariant
        Source = $source
        Port = $Port
        HfMirror = $HfMirror
        LogPath = $logPath
        StderrPath = $stderrPath
        PidPath = $pidPath
    } | ConvertTo-Json -Depth 4 | Set-Content -Path $configPath -Encoding utf8

    $runner = @'
$ErrorActionPreference = "Stop"
$configPath = Join-Path $PSScriptRoot "..\VoxCPM\voxcpm-config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json
$env:HF_ENDPOINT = [string]$config.HfMirror

function Write-RunnerError($message) {
    try {
        Add-Content -Path ([string]$config.LogPath) -Value $message -Encoding utf8
    } catch {}
}

try {
    $argsList = @()
    foreach ($item in @($config.PythonArgs)) { if ($null -ne $item -and "$item" -ne "") { $argsList += [string]$item } }
    $argsList += @("app.py", "--port", [string]$config.Port, "--model-id", [string]$config.LaunchId)
    $stdoutPath = [string]$config.LogPath
    $stderrPath = if ($config.StderrPath) { [string]$config.StderrPath } else { [string]$config.LogPath }
    New-Item -ItemType File -Force -Path $stdoutPath, $stderrPath | Out-Null
    $process = Start-Process -FilePath ([string]$config.PythonCommand) -ArgumentList $argsList -WorkingDirectory ([string]$config.RepoDir) -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
    Set-Content -Path ([string]$config.PidPath) -Value $process.Id -Encoding ascii
    $process.WaitForExit()
    exit $process.ExitCode
} catch {
    Write-RunnerError "[runner] $_"
    exit 1
} finally {
}
'@
    Write-Utf8PowerShellFile $runnerPath $runner

    $service = @'
param(
    [ValidateSet("start","stop","restart","status")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$configPath = Join-Path $PSScriptRoot "..\VoxCPM\voxcpm-config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json
$runnerPath = Join-Path $PSScriptRoot "voxcpm-run.ps1"

function Get-VoxProcess {
    if (-not (Test-Path ([string]$config.PidPath))) { return $null }
    $pidText = (Get-Content -Raw ([string]$config.PidPath)).Trim()
    if (-not $pidText) { return $null }
    return Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue
}

function Start-Vox {
    $existing = Get-VoxProcess
    if ($existing) {
        Write-Host "VoxCPM 已在运行：http://127.0.0.1:$($config.Port)"
        return
    }
    Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runnerPath) -WindowStyle Hidden | Out-Null
    Write-Host "VoxCPM 正在后台启动：http://127.0.0.1:$($config.Port)"
    Write-Host "日志：$($config.LogPath)"
}

function Stop-Vox {
    $existing = Get-VoxProcess
    if (-not $existing) {
        Remove-Item ([string]$config.PidPath) -ErrorAction SilentlyContinue
        Write-Host "VoxCPM 未运行"
        return
    }
    & taskkill /PID $existing.Id /T /F | Out-Null
    if ($LASTEXITCODE -ne 0) { Stop-Process -Id $existing.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item ([string]$config.PidPath) -ErrorAction SilentlyContinue
    Write-Host "VoxCPM 已停止"
}

function Show-Status {
    $existing = Get-VoxProcess
    if (-not $existing) {
        Write-Host "VoxCPM 未运行"
        return
    }
    Write-Host "VoxCPM 进程运行中 (PID $($existing.Id))"
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:$($config.Port)/config" -TimeoutSec 2 -UseBasicParsing
        if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 300) {
            Write-Host "服务已响应：http://127.0.0.1:$($config.Port)"
        }
    } catch {
        Write-Host "进程已启动，Gradio 仍在加载。日志：$($config.LogPath)"
    }
}

switch ($Action) {
    "start" { Start-Vox }
    "stop" { Stop-Vox }
    "restart" { Stop-Vox; Start-Sleep -Seconds 1; Start-Vox }
    "status" { Show-Status }
}
'@
    Write-Utf8PowerShellFile $servicePath $service

    foreach ($name in @("start","stop","restart","status")) {
        $cmdName = "voxcpm-$name.cmd"
        $cmdPath = Join-Path $cmdDir $cmdName
        $cmdText = "@echo off`r`nchcp 65001 >nul`r`npowershell -NoProfile -ExecutionPolicy Bypass -File ""%~dp0voxcpm-service.ps1"" $name %*`r`n"
        Set-Content -Path $cmdPath -Value $cmdText -Encoding ascii
    }

    Write-OK "命令已安装到 $cmdDir"
    Write-Host "    启动: voxcpm-start"
    Write-Host "    停止: voxcpm-stop"
    Write-Host "    重启: voxcpm-restart"
    Write-Host "    状态: voxcpm-status"
    Write-Host "    当前 PowerShell 已可直接使用；新终端若识别不到命令，请重开终端。"
}

try {
    Ensure-PythonAvailable
    Test-DiskSpace $ModelPath
    $HasNvidia = Test-NvidiaAvailable
    Ensure-GitAvailable
    Ensure-FfmpegAvailable

    $RepoDir = Join-Path $ModelPath "VoxCPM"
    Write-Step "准备 VoxCPM 仓库到 $RepoDir"
    if (-not (Test-Path $ModelPath)) { New-Item -ItemType Directory -Force -Path $ModelPath | Out-Null }
    if (Test-Path (Join-Path $RepoDir ".git")) {
        Write-OK "仓库已存在，跳过克隆"
    } else {
        & git clone --depth 1 https://gitclone.com/github.com/OpenBMB/VoxCPM.git $RepoDir
        if ($LASTEXITCODE -ne 0) { Write-Fail "克隆失败，请检查网络或 git 配置" }
        Write-OK "克隆完成"
    }

    Write-Step "安装 Python 依赖（使用阿里云镜像）"
    Invoke-Python @("-m", "pip", "install", "--upgrade", "pip", "-i", $PipMirror) "pip 升级失败"
    Ensure-Torch $HasNvidia
    Invoke-Python @("-m", "pip", "install", "voxcpm", "-i", $PipMirror) "voxcpm 安装失败"
    Push-Location $RepoDir
    try {
        if (Test-Path "requirements.txt") {
            Invoke-Python @("-m", "pip", "install", "-r", "requirements.txt", "-i", $PipMirror) "依赖安装失败"
        }
    } finally {
        Pop-Location
    }
    Write-OK "依赖安装完成"
    Verify-Torch $HasNvidia

    $Chosen = $Source
    if ($Source -eq "auto") {
        Write-Step "测速选择下载源（基于连接延迟，不代表下载速度）"
        $hfMs = Measure-Latency "https://hf-mirror.com"
        $msMs = Measure-Latency "https://modelscope.cn"
        $hfStr = if ($hfMs -eq [double]::MaxValue) { "超时" } else { "$([int]$hfMs)ms" }
        $msStr = if ($msMs -eq [double]::MaxValue) { "超时" } else { "$([int]$msMs)ms" }
        Write-Host "    hf-mirror.com: $hfStr    modelscope.cn: $msStr" -ForegroundColor Gray
        if ($hfMs -eq [double]::MaxValue -and $msMs -eq [double]::MaxValue) {
            Write-Host "    两个源均不可达，回退 HF 镜像" -ForegroundColor Yellow
            $Chosen = "hf"
        } elseif ($msMs -lt $hfMs) { $Chosen = "ms" } else { $Chosen = "hf" }
        Write-OK "已选择下载源：$Chosen"
    }

    if ($Chosen -eq "ms") {
        $MsId = $MsMap[$ModelVariant]
        if (-not $MsId) { $MsId = "OpenBMB/VoxCPM2" }
        $LocalDir = Join-Path $ModelPath "pretrained_models\$ModelVariant"
        Write-Step "通过 ModelScope 下载 $MsId 到 $LocalDir"
        Invoke-Python @("-m", "pip", "install", "modelscope", "-i", $PipMirror) "modelscope 安装失败"
        $msIdJson = $MsId | ConvertTo-Json -Compress
        $localDirJson = $LocalDir | ConvertTo-Json -Compress
        $pyCode = @"
from modelscope import snapshot_download
snapshot_download($msIdJson, local_dir=$localDirJson)
"@
        $pyFile = Join-Path $env:TEMP "voxcpm_ms_dl.py"
        Set-Content -Path $pyFile -Value $pyCode -Encoding utf8
        Invoke-Python @($pyFile) "ModelScope 下载失败"
        Remove-Item $pyFile -ErrorAction SilentlyContinue
        Write-OK "模型已下载到本地"
        $LaunchId = $LocalDir
    } else {
        $env:HF_ENDPOINT = $HfMirror
        $LaunchId = $HfId
    }

    Install-ServiceCommands $RepoDir $LaunchId $ModelPath $ModelVariant $Chosen

    Write-Step "准备完成"
    Write-Host "    脚本不会自动启动 VoxCPM 服务。"
    Write-Host "    需要启动时运行: voxcpm-start"
    Write-Host "    浏览器地址: http://127.0.0.1:$Port"
} catch {
    Write-Host "`n    错误: $_" -ForegroundColor Red
    Write-Host "`n按任意键退出..." -ForegroundColor Gray
    try { $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") } catch {}
    exit 1
}
