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
$pyver = python --version 2>&1
if ($LASTEXITCODE -ne 0) { Write-Fail "未找到 Python，请先安装 Python 3.10-3.12" }
if ($pyver -notmatch "3\.(10|11|12)") { Write-Fail "需要 Python 3.10-3.12，当前：$pyver" }
Write-OK $pyver

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
python -m pip install -q --upgrade pip -i $PipMirror
python -m pip install -q voxcpm nano-vllm-voxcpm -i $PipMirror
Write-OK "依赖安装完成"

# ── 5. 下载模型 ────────────────────────────────────────────────────────────
if (-not $ModelPath) {
    Write-Step "下载模型（使用 hf-mirror.com）"
    $env:HF_ENDPOINT = $HfMirror
    python -c "from huggingface_hub import snapshot_download; snapshot_download('openbmb/VoxCPM2')"
    Write-OK "模型下载完成"
    $ModelPath = python -c "from huggingface_hub import snapshot_download; print(snapshot_download('openbmb/VoxCPM2'))"
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
