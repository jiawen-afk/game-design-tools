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

. (Join-Path $PSScriptRoot "voxcpm-deploy-common.ps1")
. (Join-Path $PSScriptRoot "voxcpm-python-runtime.ps1")
. (Join-Path $PSScriptRoot "voxcpm-prerequisites.ps1")
. (Join-Path $PSScriptRoot "voxcpm-service-install.ps1")

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

$script:PythonCommand = $null
$script:PythonArgs = @()

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
