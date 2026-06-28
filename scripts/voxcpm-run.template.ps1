$ErrorActionPreference = "Stop"
$configPath = Join-Path $PSScriptRoot "..\VoxCPM\voxcpm-config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json
$env:HF_ENDPOINT = [string]$config.HfMirror
$allowedOrigins = @($config.AllowedOrigins | ForEach-Object { [string]$_ } | Where-Object { $_ })
if ($allowedOrigins.Count -eq 0) { $allowedOrigins = @("*") }
$env:VOXCPM_ALLOWED_BROWSER_ORIGINS = ($allowedOrigins -join ",")
$existingPythonPath = [System.Environment]::GetEnvironmentVariable("PYTHONPATH", "Process")
$repoPythonPath = [string]$config.RepoDir
$env:PYTHONPATH = if ($existingPythonPath) { "$repoPythonPath;$existingPythonPath" } else { $repoPythonPath }

function Write-RunnerError($message) {
    try {
        Add-Content -Path ([string]$config.LogPath) -Value $message -Encoding utf8
    } catch {}
}

try {
    $argsList = @()
    foreach ($item in @($config.PythonArgs)) { if ($null -ne $item -and "$item" -ne "") { $argsList += [string]$item } }
    $argsList += @("app.py", "--port", [string]$config.Port, "--model-id", [string]$config.LaunchId)
    $stdoutPath = [string]$config.LogPath
    $stderrPath = if ($config.StderrPath) { [string]$config.StderrPath } else { [string]$config.LogPath }
    New-Item -ItemType File -Force -Path $stdoutPath, $stderrPath | Out-Null
    $process = Start-Process -FilePath ([string]$config.PythonCommand) -ArgumentList $argsList -WorkingDirectory ([string]$config.RepoDir) -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
    Set-Content -Path ([string]$config.PidPath) -Value $process.Id -Encoding ascii
    $process.WaitForExit()
    exit $process.ExitCode
} catch {
    Write-RunnerError "[runner] $_"
    exit 1
} finally {
}
