param(
    [string]$ModelId = "ZhengPeng7/BiRefNet_HR-matting",
    [int]$Port = 17860,
    [ValidateSet("auto", "cuda", "cpu")]
    [string]$Device = "auto"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

. (Join-Path $PSScriptRoot "birefnet-deploy-common.ps1")
. (Join-Path $PSScriptRoot "birefnet-python-runtime.ps1")
. (Join-Path $PSScriptRoot "birefnet-service-install.ps1")

$rootDir = Join-Path $env:LOCALAPPDATA "GameDesignTools"
$stateDir = Join-Path $rootDir "BiRefNet"
$cmdDir = Join-Path $rootDir "bin"
$venvDir = Join-Path $stateDir ".venv"
$serviceDir = Join-Path $stateDir "service"
$serverPath = Join-Path $serviceDir "birefnet_server.py"
$configPath = Join-Path $stateDir "birefnet-config.json"
$servicePath = Join-Path $cmdDir "birefnet-service.ps1"
$logPath = Join-Path $stateDir "birefnet.log"
$stderrPath = Join-Path $stateDir "birefnet.err.log"
$pidPath = Join-Path $stateDir "birefnet.pid"

New-Item -ItemType Directory -Force -Path $stateDir, $cmdDir, $serviceDir | Out-Null

Write-Host "== BiRefNet 本地抠图服务安装 =="
Write-Host "模型: $ModelId"
Write-Host "端口: $Port"
Write-Host "设备: $Device"

$python = Resolve-Python
$basePythonCommand = $python.Command
$basePythonArgs = @($python.Args)

if (!(Test-Path $venvDir)) {
    Write-Host "创建虚拟环境: $venvDir"
    & $basePythonCommand @basePythonArgs -m venv $venvDir
    if ($LASTEXITCODE -ne 0) { throw "创建 Python 虚拟环境失败。" }
}

$pythonCommand = Join-Path $venvDir "Scripts\python.exe"
$pythonArgs = @()
if (!(Test-Path $pythonCommand)) { throw "虚拟环境 Python 不存在：$pythonCommand" }
$nvidiaAvailable = Test-NvidiaAvailable

Write-Host "升级 pip"
Invoke-Python @("-m", "pip", "install", "--upgrade", "pip", "-i", "https://pypi.tuna.tsinghua.edu.cn/simple") "pip 升级失败"

if ($nvidiaAvailable) {
    Write-Host "检测到 NVIDIA，安装 CUDA 版 PyTorch"
    Invoke-Python @(
        "-m", "pip", "install", "--upgrade", "--force-reinstall",
        "torch",
        "torchvision",
        "--index-url", "https://download.pytorch.org/whl/cu128"
    ) "CUDA 版 PyTorch 安装失败"
} else {
    Write-Host "未检测到 NVIDIA，安装 CPU 版 PyTorch"
    Invoke-Python @(
        "-m", "pip", "install",
        "torch>=2.5.0",
        "torchvision",
        "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"
    ) "CPU 版 PyTorch 安装失败"
}

Write-Host "安装 BiRefNet 推理依赖"
Invoke-Python @(
    "-m", "pip", "install",
    "numpy<2",
    "opencv-python",
    "pillow",
    "timm",
    "scipy",
    "scikit-image",
    "kornia",
    "einops",
    "huggingface-hub>0.25",
    "accelerate",
    "transformers",
    "fastapi",
    "uvicorn[standard]",
    "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"
) "BiRefNet 推理依赖安装失败"

Install-BirefnetServiceFiles `
    -ModelId $ModelId `
    -Port $Port `
    -Device $Device `
    -CmdDir $cmdDir `
    -ServiceDir $serviceDir `
    -ServerPath $serverPath `
    -ConfigPath $configPath `
    -ServicePath $servicePath `
    -LogPath $logPath `
    -StderrPath $stderrPath `
    -PidPath $pidPath `
    -PythonCommand $pythonCommand

Write-Host ""
Write-Host "BiRefNet 依赖安装完成。"
Write-Host "服务命令:"
Write-Host "  启动: birefnet-start"
Write-Host "  停止: birefnet-stop"
Write-Host "  重启: birefnet-restart"
Write-Host "  状态: birefnet-status"
Write-Host "也可以回到精灵图工作台点击「启动服务」。"
