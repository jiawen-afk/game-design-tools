param(
    [string]$ModelId = "ZhengPeng7/BiRefNet_HR-matting",
    [int]$Port = 17860,
    [ValidateSet("auto", "cuda", "cpu")]
    [string]$Device = "auto"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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

function Resolve-Python {
    $candidates = @(
        @("py", @("-3.11")),
        @("py", @("-3.12")),
        @("python", @())
    )
    foreach ($candidate in $candidates) {
        $cmd = $candidate[0]
        $args = @($candidate[1]) + @("-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        try {
            $version = & $cmd @args 2>$null
            if ($LASTEXITCODE -eq 0 -and $version -match "^3\.(11|12)") {
                return @{ Command = $cmd; Args = @($candidate[1]) }
            }
        } catch {
        }
    }
    throw "未找到 Python 3.11 或 3.12。请先安装 Python，并确保 py 或 python 可用。"
}

function Invoke-Python {
    param([string[]]$Arguments, [string]$FailureMessage)
    & $pythonCommand @pythonArgs @Arguments
    if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

function Test-NvidiaAvailable {
    try {
        & nvidia-smi *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

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

$serverSource = @'
import argparse
import base64
import io
from contextlib import nullcontext
from threading import Condition, Lock, Thread

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import torch
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

MODEL_ID = "__MODEL_ID__"
REQUESTED_DEVICE = "__DEVICE__"


def normalize_requested_device(value):
    normalized = str(value or "auto").strip().lower()
    if normalized in ("auto", "cuda", "cpu"):
        return normalized
    return "auto"


def resolve_device(requested_device):
    normalized = normalize_requested_device(requested_device)
    if normalized == "cpu":
        return "cpu"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


DEVICE = resolve_device(REQUESTED_DEVICE)

app = FastAPI(title="Game Design Tools BiRefNet Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
model = None
model_loading = False
model_error = ""
model_condition = Condition()
inference_lock = Lock()

transform_image = transforms.Compose([
    transforms.Resize((1024, 1024)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


class MatteRequest(BaseModel):
    name: str = "image.png"
    image_base64: str


def build_model():
    torch.set_float32_matmul_precision("high")
    loaded = AutoModelForImageSegmentation.from_pretrained(MODEL_ID, trust_remote_code=True)
    loaded.to(DEVICE)
    if DEVICE == "cpu":
        loaded.float()
    loaded.eval()
    return loaded


def store_model_result(loaded=None, error=None):
    global model, model_loading, model_error
    with model_condition:
        if loaded is not None:
            model = loaded
            model_error = ""
        elif error is not None:
            model_error = str(error)
        model_loading = False
        model_condition.notify_all()


def load_claimed_model():
    try:
        loaded = build_model()
    except Exception as exc:
        store_model_result(error=exc)
        raise
    store_model_result(loaded=loaded)
    return loaded


def get_model():
    global model_loading, model_error
    with model_condition:
        if model is not None:
            return model
        if model_loading:
            while model_loading:
                model_condition.wait(timeout=1)
            if model is not None:
                return model
            if model_error:
                raise RuntimeError(model_error)
        model_loading = True
        model_error = ""
    return load_claimed_model()


def get_model_dtype(loaded_model):
    try:
        return next(loaded_model.parameters()).dtype
    except StopIteration:
        return torch.float32


def inference_context():
    if DEVICE == "cpu":
        return inference_lock
    return nullcontext()


def load_model_background():
    try:
        load_claimed_model()
    except Exception:
        pass


def start_model_load():
    global model_loading, model_error
    with model_condition:
        if model is not None or model_loading:
            return
        model_loading = True
        model_error = ""
    Thread(target=load_model_background, daemon=True).start()


def model_status():
    with model_condition:
        return {
            "ok": model is not None,
            "ready": model is not None,
            "loading": model_loading,
            "error": model_error,
            "requested_device": REQUESTED_DEVICE,
            "device": DEVICE,
            "cuda_available": torch.cuda.is_available(),
            "model": MODEL_ID,
        }


@app.get("/health")
def health():
    status = model_status()
    status["ok"] = True
    return status


@app.get("/ready")
def ready():
    start_model_load()
    return model_status()


@app.post("/matte")
def matte(req: MatteRequest):
    try:
        raw = base64.b64decode(req.image_base64)
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"图片读取失败: {exc}") from exc

    try:
        with inference_context():
            active_model = get_model()
            input_tensor = transform_image(image).unsqueeze(0)
            input_tensor = input_tensor.to(device=DEVICE, dtype=get_model_dtype(active_model))
            with torch.no_grad():
                pred = active_model(input_tensor)[-1].sigmoid().to(torch.float32).cpu()[0].squeeze()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"BiRefNet 推理失败: {exc}") from exc

    mask = transforms.ToPILImage()(pred).resize(image.size)
    output = image.copy()
    output.putalpha(mask)
    buffer = io.BytesIO()
    output.save(buffer, format="PNG")
    return {
        "name": req.name,
        "width": image.width,
        "height": image.height,
        "image_base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=17860)
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default=REQUESTED_DEVICE)
    args = parser.parse_args()
    REQUESTED_DEVICE = normalize_requested_device(args.device)
    DEVICE = resolve_device(REQUESTED_DEVICE)
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=args.port)
'@
$serverSource = $serverSource.Replace("__MODEL_ID__", $ModelId)
$serverSource = $serverSource.Replace("__DEVICE__", $Device)
Set-Content -Path $serverPath -Value $serverSource -Encoding UTF8

$config = @{
    PythonCommand = $pythonCommand
    PythonArgs = @()
    ServiceDir = $serviceDir
    ServerPath = $serverPath
    ModelId = $ModelId
    Port = $Port
    Device = $Device
    LogPath = $logPath
    StderrPath = $stderrPath
    PidPath = $pidPath
    InstalledAt = (Get-Date).ToString("o")
}
$config | ConvertTo-Json -Depth 6 | Set-Content -Path $configPath -Encoding UTF8

$serviceSource = @'
param(
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$configPath = Join-Path $PSScriptRoot "..\BiRefNet\birefnet-config.json"

function Read-Config {
    if (!(Test-Path $configPath)) { throw "缺少 BiRefNet 安装配置：$configPath" }
    return Get-Content -Raw $configPath | ConvertFrom-Json
}

function Get-RunningProcess {
    param($Config)
    if (!(Test-Path $Config.PidPath)) { return $null }
    $pidText = (Get-Content -Raw $Config.PidPath).Trim()
    if (!($pidText -match "^\d+$")) { return $null }
    try { return Get-Process -Id ([int]$pidText) -ErrorAction Stop } catch { return $null }
}

function Start-ServiceProcess {
    $config = Read-Config
    $running = Get-RunningProcess $config
    if ($running) {
        Write-Host "BiRefNet 服务已在运行，PID=$($running.Id)"
        return
    }
    if (!$config.Device) { $config | Add-Member -NotePropertyName Device -NotePropertyValue "auto" -Force }
    $args = @("`"$($config.ServerPath)`"", "--port", [string]$config.Port, "--device", [string]$config.Device)
    $process = Start-Process -FilePath $config.PythonCommand -ArgumentList $args -WorkingDirectory $config.ServiceDir -WindowStyle Hidden -RedirectStandardOutput $config.LogPath -RedirectStandardError $config.StderrPath -PassThru
    Set-Content -Path $config.PidPath -Value ([string]$process.Id) -Encoding ASCII
    Write-Host "BiRefNet 服务启动中，PID=$($process.Id)，端口=$($config.Port)，设备=$($config.Device)"
}

function Stop-ServiceProcess {
    $config = Read-Config
    $running = Get-RunningProcess $config
    if (!$running) {
        Remove-Item $config.PidPath -Force -ErrorAction SilentlyContinue
        Write-Host "BiRefNet 服务未运行"
        return
    }
    Stop-Process -Id $running.Id -Force
    Remove-Item $config.PidPath -Force -ErrorAction SilentlyContinue
    Write-Host "BiRefNet 服务已停止"
}

function Show-Status {
    $config = Read-Config
    $running = Get-RunningProcess $config
    if ($running) {
        if (!$config.Device) { $config | Add-Member -NotePropertyName Device -NotePropertyValue "auto" -Force }
        Write-Host "BiRefNet 服务运行中，PID=$($running.Id)，端口=$($config.Port)，设备=$($config.Device)"
    } else {
        Write-Host "BiRefNet 服务未运行"
    }
}

if ($Action -eq "start") { Start-ServiceProcess; exit 0 }
if ($Action -eq "stop") { Stop-ServiceProcess; exit 0 }
if ($Action -eq "restart") { Stop-ServiceProcess; Start-Sleep -Seconds 1; Start-ServiceProcess; exit 0 }
Show-Status
'@
Set-Content -Path $servicePath -Value $serviceSource -Encoding UTF8

foreach ($name in @("start", "stop", "restart", "status")) {
    $cmdName = "birefnet-$name.cmd"
    $cmdPath = Join-Path $cmdDir $cmdName
    $cmdText = "@echo off`r`nchcp 65001 >nul`r`npowershell -NoProfile -ExecutionPolicy Bypass -File ""%~dp0birefnet-service.ps1"" $name %*`r`n"
    Set-Content -Path $cmdPath -Value $cmdText -Encoding ASCII
}

Write-Host ""
Write-Host "BiRefNet 依赖安装完成。"
Write-Host "服务命令:"
Write-Host "  启动: birefnet-start"
Write-Host "  停止: birefnet-stop"
Write-Host "  重启: birefnet-restart"
Write-Host "  状态: birefnet-status"
Write-Host "也可以回到精灵图工作台点击「启动服务」。"
