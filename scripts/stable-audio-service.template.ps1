param(
    [ValidateSet("start","stop","restart","status")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$configPath = Join-Path $PSScriptRoot "..\StableAudio3\stable-audio-config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json

function Get-ServiceProcess {
    if (-not (Test-Path ([string]$config.PidPath))) { return $null }
    $pidText = (Get-Content -Raw ([string]$config.PidPath)).Trim()
    if (-not $pidText) { return $null }
    return Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue
}

function Write-RecentLog($path, $title) {
    if (-not (Test-Path ([string]$path))) { return }
    Write-Host $title
    Get-Content -Path ([string]$path) -Tail 40 -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  $_"
    }
}

function Start-ServiceProcess {
    $existing = Get-ServiceProcess
    if ($existing) {
        Write-Host "Stable Audio 3 已在运行：http://127.0.0.1:$($config.Port)"
        return
    }

    $env:STABLE_AUDIO_MODEL = [string]$config.ModelVariant
    $env:STABLE_AUDIO_REPO_DIR = [string]$config.RepoDir
    $env:STABLE_AUDIO_OUTPUT_DIR = [string]$config.OutputDir
    if (-not (Test-Path ([string]$config.OutputDir))) {
        New-Item -ItemType Directory -Force -Path ([string]$config.OutputDir) | Out-Null
    }
    $arguments = @(
        "-m",
        "uvicorn",
        "stable_audio_server:app",
        "--host",
        "127.0.0.1",
        "--port",
        [string]$config.Port
    )
    $workDir = Split-Path -Parent ([string]$config.ServerPath)
    $process = Start-Process -FilePath ([string]$config.PythonCommand) `
        -ArgumentList $arguments `
        -WorkingDirectory $workDir `
        -RedirectStandardOutput ([string]$config.LogPath) `
        -RedirectStandardError ([string]$config.StderrPath) `
        -WindowStyle Hidden `
        -PassThru
    Set-Content -Path ([string]$config.PidPath) -Value ([string]$process.Id) -Encoding ascii
    Start-Sleep -Seconds 2
    $started = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
    if (-not $started) {
        Remove-Item ([string]$config.PidPath) -ErrorAction SilentlyContinue
        Write-Host "Stable Audio 3 启动后立即退出" -ForegroundColor Red
        Write-RecentLog ([string]$config.StderrPath) "错误日志："
        Write-RecentLog ([string]$config.LogPath) "输出日志："
        exit 1
    }
    Write-Host "Stable Audio 3 正在后台启动：http://127.0.0.1:$($config.Port)"
    Write-Host "日志：$($config.LogPath)"
}

function Stop-ServiceProcess {
    $existing = Get-ServiceProcess
    if (-not $existing) {
        Remove-Item ([string]$config.PidPath) -ErrorAction SilentlyContinue
        Write-Host "Stable Audio 3 未运行"
        return
    }
    & taskkill /PID $existing.Id /T /F | Out-Null
    if ($LASTEXITCODE -ne 0) { Stop-Process -Id $existing.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item ([string]$config.PidPath) -ErrorAction SilentlyContinue
    Write-Host "Stable Audio 3 已停止"
}

function Show-ServiceStatus {
    $existing = Get-ServiceProcess
    if (-not $existing) {
        Write-Host "Stable Audio 3 未运行"
        return
    }
    Write-Host "Stable Audio 3 进程运行中 (PID $($existing.Id))"
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:$($config.Port)/health" -TimeoutSec 2 -UseBasicParsing
        if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 300) {
            Write-Host "服务已响应：http://127.0.0.1:$($config.Port)"
        }
    } catch {
        Write-Host "进程已启动，模型仍在加载或未授权。日志：$($config.LogPath)"
        if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
        else { Write-Host $_.Exception.Message }
        exit 1
    }
}

switch ($Action) {
    "start" { Start-ServiceProcess }
    "stop" { Stop-ServiceProcess }
    "restart" { Stop-ServiceProcess; Start-Sleep -Seconds 1; Start-ServiceProcess }
    "status" { Show-ServiceStatus }
}
