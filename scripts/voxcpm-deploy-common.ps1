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
