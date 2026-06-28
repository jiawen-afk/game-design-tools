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
