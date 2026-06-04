# VoxCPM Gradio 一键部署脚本 (Windows PowerShell)
# 本地执行: .\deploy-voxcpm.ps1 'D:\models\VoxCPM2' 'VoxCPM2'

param(
    [string]$ModelPath = "D:\models\VoxCPM2",
    [string]$ModelVariant = "VoxCPM2"
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

# 模型版本 -> HuggingFace 仓库 ID
$ModelMap = @{
    "VoxCPM2"     = "openbmb/VoxCPM2"
    "VoxCPM1.5"   = "openbmb/VoxCPM1.5"
    "VoxCPM-0.5B" = "openbmb/VoxCPM-0.5B"
}
$HfId = $ModelMap[$ModelVariant]
if (-not $HfId) { $HfId = "openbmb/VoxCPM2"; $ModelVariant = "VoxCPM2" }


function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Fail($msg) {
    Write-Host "`n    错误: $msg" -ForegroundColor Red
    Write-Host "`n按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
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
if ($LASTEXITCODE -ne 0) { Write-Host "    警告: 未检测到 nvidia-smi，将使用 CPU 模式（速度较慢）" -ForegroundColor Yellow }
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
Invoke-Expression "$PythonExe -m pip install voxcpm -i $PipMirror"
if ($LASTEXITCODE -ne 0) { Write-Fail "voxcpm 安装失败" }
Push-Location $RepoDir
if (Test-Path "requirements.txt") {
    Invoke-Expression "$PythonExe -m pip install -r requirements.txt -i $PipMirror"
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Fail "依赖安装失败" }
}
Pop-Location
Write-OK "依赖安装完成"

# ── 7. 启动 Gradio 服务 ────────────────────────────────────────────────────
Write-Step "启动 Gradio 服务（端口 $Port，模型 $ModelVariant）"
Write-Host "    模型 $HfId 在首次启动时通过 hf-mirror.com 自动下载" -ForegroundColor Gray
Write-Host "    服务地址: http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host "    按 Ctrl+C 停止服务`n"
$env:HF_ENDPOINT = $HfMirror
Push-Location $RepoDir
Invoke-Expression "$PythonExe app.py --port $Port --device auto --model-id $HfId"
Pop-Location

} catch {
    Write-Host "`n    错误: $_" -ForegroundColor Red
    Write-Host "`n按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
