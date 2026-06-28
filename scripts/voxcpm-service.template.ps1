param(
    [ValidateSet("start","stop","restart","status")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$configPath = Join-Path $PSScriptRoot "..\VoxCPM\voxcpm-config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json
$runnerPath = Join-Path $PSScriptRoot "voxcpm-run.ps1"

function Get-VoxProcess {
    if (-not (Test-Path ([string]$config.PidPath))) { return $null }
    $pidText = (Get-Content -Raw ([string]$config.PidPath)).Trim()
    if (-not $pidText) { return $null }
    return Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue
}

function Start-Vox {
    $existing = Get-VoxProcess
    if ($existing) {
        Write-Host "VoxCPM 已在运行：http://127.0.0.1:$($config.Port)"
        return
    }
    Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runnerPath) -WindowStyle Hidden | Out-Null
    Write-Host "VoxCPM 正在后台启动：http://127.0.0.1:$($config.Port)"
    Write-Host "日志：$($config.LogPath)"
}

function Stop-Vox {
    $existing = Get-VoxProcess
    if (-not $existing) {
        Remove-Item ([string]$config.PidPath) -ErrorAction SilentlyContinue
        Write-Host "VoxCPM 未运行"
        return
    }
    & taskkill /PID $existing.Id /T /F | Out-Null
    if ($LASTEXITCODE -ne 0) { Stop-Process -Id $existing.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item ([string]$config.PidPath) -ErrorAction SilentlyContinue
    Write-Host "VoxCPM 已停止"
}

function Show-Status {
    $existing = Get-VoxProcess
    if (-not $existing) {
        Write-Host "VoxCPM 未运行"
        return
    }
    Write-Host "VoxCPM 进程运行中 (PID $($existing.Id))"
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:$($config.Port)/config" -TimeoutSec 2 -UseBasicParsing
        if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 300) {
            Write-Host "服务已响应：http://127.0.0.1:$($config.Port)"
        }
    } catch {
        Write-Host "进程已启动，Gradio 仍在加载。日志：$($config.LogPath)"
    }
}

switch ($Action) {
    "start" { Start-Vox }
    "stop" { Stop-Vox }
    "restart" { Stop-Vox; Start-Sleep -Seconds 1; Start-Vox }
    "status" { Show-Status }
}
