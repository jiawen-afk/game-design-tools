# VoxCPM Gradio 一键部署脚本 (Windows PowerShell)
# 本地执行: .\deploy-voxcpm.ps1 'D:\models\VoxCPM2' 'VoxCPM2'

param(
    [string]$ModelPath = "D:\models\VoxCPM2",
    [string]$ModelVariant = "VoxCPM2",
    [ValidateSet("auto","hf","ms")][string]$Source = "auto"
)

# 强制 UTF-8 输出，避免中文在 GBK 控制台下乱码
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    chcp 65001 > $null
} catch {}

$ErrorActionPreference = "Stop"
$Port = 8808
$PipMirror = "https://mirrors.aliyun.com/pypi/simple/"
$HfMirror = "https://hf-mirror.com"
# PyTorch CUDA wheel 官方源（cu128 兼容 20/30/40/50 系，含 RTX 50 Blackwell）。
# 必须用官方源：阿里云 pytorch-wheels 是扁平目录，不兼容 pip --index-url(PEP503)，
# 且与 PyPI 混用会误选 CPU 版 torch。官方源虽稍慢但解析正确、版本配对可靠。
$TorchCudaIndex = "https://download.pytorch.org/whl/cu128"

# 模型版本 -> 仓库 ID（HF 小写 openbmb，ModelScope 大写 OpenBMB）
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


function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Fail($msg) {
    Write-Host "`n    错误: $msg" -ForegroundColor Red
    Write-Host "`n按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# 对 url 发 3 次 HEAD 请求测延迟，取最小耗时（毫秒）；全部失败返回极大值表示不可用
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

function Refresh-PathFromRegistry {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path = "$machinePath;$userPath"
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

try {

# ── 1. Python ──────────────────────────────────────────────────────────────
Write-Step "检测 Python 版本"

# 优先尝试 py launcher 选择 3.12，再退回 python3.12，最后用默认 python
$PythonExe = $null
function Test-PyCandidate($candidate) {
    try {
        $ver = Invoke-Expression "$candidate --version" 2>&1
        if ($LASTEXITCODE -eq 0 -and "$ver" -match "3\.(10|11|12)\.") { return $true }
    } catch {}
    return $false
}
foreach ($candidate in @("py -3.12", "python3.12", "python")) {
    if (Test-PyCandidate $candidate) { $PythonExe = $candidate; break }
}

if (-not $PythonExe) {
    $pyver = python --version 2>&1
    Write-Host "    当前 Python：$pyver，版本不兼容，正在自动安装 Python 3.12..." -ForegroundColor Yellow

    # 用 winget 静默安装（Windows 10 1709+ 自带）
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "    使用 winget 安装 Python 3.12..." -ForegroundColor Cyan
        winget install --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
    } else {
        # 降级：用阿里云镜像下载安装包
        Write-Host "    winget 不可用，从阿里云镜像下载安装包..." -ForegroundColor Cyan
        $installer = "$env:TEMP\python-3.12-amd64.exe"
        $mirrorUrl = "https://mirrors.aliyun.com/python/3.12.10/python-3.12.10-amd64.exe"
        Invoke-WebRequest -Uri $mirrorUrl -OutFile $installer -UseBasicParsing
        Start-Process -FilePath $installer -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1" -Wait
        Remove-Item $installer -ErrorAction SilentlyContinue
    }

    # 刷新 PATH 后重新检测
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    foreach ($candidate in @("py -3.12", "python3.12", "python")) {
        if (Test-PyCandidate $candidate) { $PythonExe = $candidate; break }
    }

    if (-not $PythonExe) { Write-Fail "Python 3.12 安装失败，请手动安装后重试。" }
    Write-OK "Python 3.12 安装完成"
}

$pyver = Invoke-Expression "$PythonExe --version" 2>&1
Write-OK "$pyver（使用：$PythonExe）"

# ── 2. 磁盘空间（至少 30GB） ────────────────────────────────────────────────
Write-Step "检测磁盘空间"
$drive = (Get-Location).Drive.Name + ":"
$free  = (Get-PSDrive $drive.TrimEnd(':')).Free / 1GB
$freeStr = $free.ToString("F1")
if ($free -lt 30) { Write-Fail "可用空间不足（${freeStr}GB），至少需要 30GB" }
Write-OK "${freeStr}GB 可用"

# ── 3. CUDA ────────────────────────────────────────────────────────────────
Write-Step "检测 NVIDIA 驱动"
$smi = nvidia-smi 2>&1
$HasNvidia = ($LASTEXITCODE -eq 0)
if (-not $HasNvidia) { Write-Host "    警告: 未检测到 nvidia-smi，将使用 CPU 模式（速度较慢）" -ForegroundColor Yellow }
else { Write-OK "GPU 驱动正常" }

# ── 4. 检测 git（缺失则自动安装） ───────────────────────────────────────────
Write-Step "检测 git"

function Test-GitAvailable {
    # 先把注册表里的最新 PATH 和常见 git 目录补进当前会话，再检测
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path = "$machinePath;$userPath"
    foreach ($p in @("$env:ProgramFiles\Git\cmd", "${env:ProgramFiles(x86)}\Git\cmd", "$env:LOCALAPPDATA\Programs\Git\cmd")) {
        if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) { $env:Path = "$p;$env:Path" }
    }
    return [bool](Get-Command git -ErrorAction SilentlyContinue)
}

if (-not (Test-GitAvailable)) {
    Write-Host "    未找到 git，正在自动安装..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements
    } else {
        Write-Fail "git 未安装且 winget 不可用，请手动安装：https://git-scm.com/download/win"
    }
    if (-not (Test-GitAvailable)) { Write-Fail "git 安装后仍未找到，请重开 PowerShell 再运行本脚本" }
}
Write-OK "git 可用"

# ── 4b. 检测 ffmpeg（librosa/audioread 读取浏览器录制 m4a 需要） ─────────────
Ensure-FfmpegAvailable

# ── 5. 克隆仓库 ────────────────────────────────────────────────────────────
$RepoDir = Join-Path $ModelPath "VoxCPM"
Write-Step "准备 VoxCPM 仓库到 $RepoDir"
if (-not (Test-Path $ModelPath)) { New-Item -ItemType Directory -Force -Path $ModelPath | Out-Null }
if (Test-Path (Join-Path $RepoDir ".git")) {
    Write-OK "仓库已存在，跳过克隆"
} else {
    git clone --depth 1 https://gitclone.com/github.com/OpenBMB/VoxCPM.git $RepoDir
    if ($LASTEXITCODE -ne 0) { Write-Fail "克隆失败，请检查网络或 git 配置" }
    Write-OK "克隆完成"
}

# ── 6. 安装依赖（阿里云镜像，检查退出码） ───────────────────────────────────
Write-Step "安装 Python 依赖（使用阿里云镜像）"
Invoke-Expression "$PythonExe -m pip install --upgrade pip -i $PipMirror"
if ($LASTEXITCODE -ne 0) { Write-Fail "pip 升级失败" }

# 先确定该装哪种 PyTorch：有 N 卡 -> CUDA(cu128) 版；否则 -> CPU 版（voxcpm 自带）。
# N 卡时先检测现有 torch：已是 CUDA 版则跳过；是 CPU 版/版本不符则卸载，再装 cu128。
if ($HasNvidia) {
    Write-Step "检测 PyTorch 版本（目标：GPU/cu128）"
    $torchInfo = Invoke-Expression "$PythonExe -c `"import torch;print(torch.version.cuda)`"" 2>&1
    $isCuda = "$torchInfo" -match "12\."
    if ($isCuda) {
        Write-OK "已安装 CUDA 版 PyTorch，跳过"
    } else {
        if ("$torchInfo" -notmatch "No module named") {
            Write-Host "    检测到非 CUDA 版 PyTorch，正在卸载..." -ForegroundColor Yellow
            Invoke-Expression "$PythonExe -m pip uninstall -y torch torchaudio"
        }
        Write-Step "安装 GPU 版 PyTorch（cu128，约 2.5GB，请耐心等待）"
        Invoke-Expression "$PythonExe -m pip install torch torchaudio --index-url $TorchCudaIndex"
        if ($LASTEXITCODE -ne 0) { Write-Fail "GPU 版 PyTorch 安装失败" }
        Write-OK "GPU 版 PyTorch 安装完成"
    }
}

Invoke-Expression "$PythonExe -m pip install voxcpm -i $PipMirror"
if ($LASTEXITCODE -ne 0) { Write-Fail "voxcpm 安装失败" }
Push-Location $RepoDir
if (Test-Path "requirements.txt") {
    Invoke-Expression "$PythonExe -m pip install -r requirements.txt -i $PipMirror"
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Fail "依赖安装失败" }
}
Pop-Location
Write-OK "依赖安装完成"

# ── 6b. 校验 PyTorch GPU 支持（确认 cuda 可用；万一被覆盖成 CPU 版则重装） ────
if ($HasNvidia) {
    Write-Step "校验 PyTorch GPU 支持"
    $cudaOk = (Invoke-Expression "$PythonExe -c `"import torch;print(torch.cuda.is_available())`"" 2>&1) -match "True"
    if ($cudaOk) {
        Write-OK "PyTorch 已启用 GPU (CUDA)"
    } else {
        Write-Host "    PyTorch 不可用 GPU，重装 cu128 版..." -ForegroundColor Yellow
        Invoke-Expression "$PythonExe -m pip uninstall -y torch torchaudio"
        Invoke-Expression "$PythonExe -m pip install torch torchaudio --index-url $TorchCudaIndex"
        if ($LASTEXITCODE -ne 0) { Write-Fail "GPU 版 PyTorch 安装失败" }
        $cudaOk2 = (Invoke-Expression "$PythonExe -c `"import torch;print(torch.cuda.is_available())`"" 2>&1) -match "True"
        if ($cudaOk2) { Write-OK "GPU 版 PyTorch 安装完成，已启用 CUDA" }
        else { Write-Host "    警告: 仍未检测到 CUDA，将以 CPU 模式运行（请检查显卡驱动）" -ForegroundColor Yellow }
    }
}

# ── 7. 选择下载源（测速 / 手动） ───────────────────────────────────────────
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

# ── 8. 准备模型（按下载源分两条路径） ───────────────────────────────────────
if ($Chosen -eq "ms") {
    $MsId = $MsMap[$ModelVariant]
    if (-not $MsId) { $MsId = "OpenBMB/VoxCPM2" }
    $LocalDir = Join-Path $ModelPath "pretrained_models\$ModelVariant"
    Write-Step "通过 ModelScope 下载 $MsId 到 $LocalDir"
    Invoke-Expression "$PythonExe -m pip install modelscope -i $PipMirror"
    if ($LASTEXITCODE -ne 0) { Write-Fail "modelscope 安装失败" }
    # 用 here-string 构造 Python 代码，避免内层引号与反斜杠转义问题
    $pyCode = @"
from modelscope import snapshot_download
snapshot_download('$MsId', local_dir=r'$LocalDir')
"@
    $pyFile = Join-Path $env:TEMP "voxcpm_ms_dl.py"
    Set-Content -Path $pyFile -Value $pyCode -Encoding ascii
    Invoke-Expression "$PythonExe `"$pyFile`""
    $dlCode = $LASTEXITCODE
    Remove-Item $pyFile -ErrorAction SilentlyContinue
    if ($dlCode -ne 0) { Write-Fail "ModelScope 下载失败" }
    Write-OK "模型已下载到本地"
    $LaunchId = $LocalDir
} else {
    $env:HF_ENDPOINT = $HfMirror
    $LaunchId = $HfId
}

# ── 9. 启动 Gradio 服务 ────────────────────────────────────────────────────
Write-Step "启动 Gradio 服务（端口 $Port，模型 $ModelVariant，来源 $Chosen）"
if ($Chosen -eq "ms") {
    Write-Host "    使用本地模型: $LaunchId" -ForegroundColor Gray
} else {
    Write-Host "    模型 $LaunchId 在首次启动时通过 hf-mirror.com 自动下载" -ForegroundColor Gray
}
Write-Host "    服务地址: http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host "    按 Ctrl+C 停止服务`n"
Push-Location $RepoDir
Invoke-Expression "$PythonExe app.py --port $Port --model-id $LaunchId"
Pop-Location

} catch {
    Write-Host "`n    错误: $_" -ForegroundColor Red
    Write-Host "`n按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
