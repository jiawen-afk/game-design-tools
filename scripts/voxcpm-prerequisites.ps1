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
    $probe = Invoke-PythonScriptOutput $probeCode
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
