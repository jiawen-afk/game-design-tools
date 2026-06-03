# VoxCPM 一键部署脚本 (Windows PowerShell)
# 本地执行: .\deploy-voxcpm.ps1 'D:\models\VoxCPM2'

param([string]$ModelPath = "")

$ErrorActionPreference = "Stop"
$Port = 8000
$PipMirror = "https://mirrors.aliyun.com/pypi/simple/"
$HfMirror = "https://hf-mirror.com"

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
foreach ($candidate in @("py -3.12", "python3.12", "python")) {
    $ver = Invoke-Expression "$candidate --version" 2>&1
    if ($LASTEXITCODE -eq 0 -and $ver -match "3\.(10|11|12)") {
        $PythonExe = $candidate
        break
    }
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
        $ver = Invoke-Expression "$candidate --version" 2>&1
        if ($LASTEXITCODE -eq 0 -and $ver -match "3\.(10|11|12)") {
            $PythonExe = $candidate
            break
        }
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
if ($free -lt 30) { Write-Fail "可用空间不足（${free:F1}GB），至少需要 30GB" }
Write-OK "${free:F1}GB 可用"

# ── 3. CUDA ────────────────────────────────────────────────────────────────
Write-Step "检测 NVIDIA 驱动"
$smi = nvidia-smi 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host "    警告: 未检测到 nvidia-smi，将使用 CPU 模式（速度较慢）" -ForegroundColor Yellow }
else { Write-OK "GPU 驱动正常" }

# ── 4. 安装 voxcpm + vllm-omni ────────────────────────────────────────────
Write-Step "安装 Python 依赖（使用阿里云镜像）"
Invoke-Expression "$PythonExe -m pip install -q --upgrade pip -i $PipMirror"
Invoke-Expression "$PythonExe -m pip install -q voxcpm nano-vllm-voxcpm -i $PipMirror"
Write-OK "依赖安装完成"

# ── 5. 下载模型 ────────────────────────────────────────────────────────────
if (-not $ModelPath) {
    Write-Step "下载模型（使用 hf-mirror.com）"
    $env:HF_ENDPOINT = $HfMirror
    Invoke-Expression "$PythonExe -c `"from huggingface_hub import snapshot_download; snapshot_download('openbmb/VoxCPM2')`""
    Write-OK "模型下载完成"
    $ModelPath = Invoke-Expression "$PythonExe -c `"from huggingface_hub import snapshot_download; print(snapshot_download('openbmb/VoxCPM2'))`""
} else {
    Write-Step "使用本地模型: $ModelPath"
    if (-not (Test-Path $ModelPath)) { Write-Fail "路径不存在: $ModelPath" }
}

# ── 6. 启动服务 ────────────────────────────────────────────────────────────
Write-Step "启动 vLLM 服务（端口 $Port）"
Write-Host "    服务地址: http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host "    按 Ctrl+C 停止服务`n"
vllm serve $ModelPath --omni --port $Port

} catch {
    Write-Host "`n    错误: $_" -ForegroundColor Red
    Write-Host "`n按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
