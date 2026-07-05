# Stable Audio 3 one-click setup script (Windows PowerShell)
# Local usage: .\deploy-stable-audio-3.ps1 'D:\models\StableAudio3' 'small-sfx' 'auto'

param(
    [string]$ModelPath = "D:\models\StableAudio3",
    [ValidateSet("small-sfx","small-music","medium")][string]$ModelVariant = "small-sfx",
    [ValidateSet("auto","hf","ms")][string]$Source = "auto"
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    chcp 65001 > $null
} catch {}

$ErrorActionPreference = "Stop"
$Port = 8818
$RepoUrl = "https://github.com/Stability-AI/stable-audio-3.git"
$RepoDir = Join-Path $ModelPath "stable-audio-3"
# Invoke-StableAudioInstall runs: uv sync --extra ui
# Invoke-StableAudioModelDownload runs stable_audio_3 model cfg.resolve()

. (Join-Path $PSScriptRoot "stable-audio-deploy-common.ps1")
. (Join-Path $PSScriptRoot "stable-audio-service-install.ps1")

try {
    Ensure-GitAvailable
    Ensure-UvAvailable
    Ensure-Repository $RepoUrl $RepoDir
    Invoke-StableAudioInstall $RepoDir
    Invoke-StableAudioModelDownload $RepoDir $ModelVariant $Source
    Install-StableAudioServiceCommands $RepoDir $ModelPath $ModelVariant $Port $Source

    Write-Step "准备完成"
    Write-Host "    Stable Audio 3 服务端口: http://127.0.0.1:$Port"
    Write-Host "    默认模型: $ModelVariant"
    Write-Host "    需要启动时运行: stable-audio-start"
} catch {
    Write-Host "`n    错误: $_" -ForegroundColor Red
    Write-Host "`n按任意键退出..." -ForegroundColor Gray
    try { $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") } catch {}
    exit 1
}
