function Copy-StableAudioTemplateFile($templateName, $targetPath) {
    $templatePath = Join-Path $PSScriptRoot $templateName
    if (-not (Test-Path $templatePath)) {
        Write-Fail "缺少 Stable Audio 3 模板文件：$templatePath"
    }
    $content = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)
    Write-Utf8PowerShellFile $targetPath $content
}

function Install-StableAudioServiceCommands($repoDir, $modelPath, $modelVariant, $port, $source) {
    Write-Step "安装 Stable Audio 3 服务管理命令"
    $cmdDir = Join-Path $env:LOCALAPPDATA "GameDesignTools\bin"
    $stateDir = Join-Path $env:LOCALAPPDATA "GameDesignTools\StableAudio3"
    New-Item -ItemType Directory -Force -Path $cmdDir, $stateDir | Out-Null
    Add-UserPath $cmdDir

    $configPath = Join-Path $stateDir "stable-audio-config.json"
    $servicePath = Join-Path $cmdDir "stable-audio-service.ps1"
    $serverPath = Join-Path $stateDir "stable_audio_server.py"
    $outputDir = Join-Path $stateDir "outputs"
    $logPath = Join-Path $stateDir "stable-audio.log"
    $stderrPath = Join-Path $stateDir "stable-audio.err.log"
    $pidPath = Join-Path $stateDir "stable-audio.pid"
    $pythonCommand = Join-Path $repoDir ".venv\Scripts\python.exe"

    Copy-StableAudioTemplateFile "stable-audio-server.template.py" $serverPath
    Copy-StableAudioTemplateFile "stable-audio-service.template.ps1" $servicePath

    $configJson = @{
        PythonCommand = $pythonCommand
        PythonArgs = @()
        RepoDir = $repoDir
        ModelPath = $modelPath
        ModelVariant = $modelVariant
        Source = $source
        Port = $port
        ServerPath = $serverPath
        OutputDir = $outputDir
        LogPath = $logPath
        StderrPath = $stderrPath
        PidPath = $pidPath
    } | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText($configPath, $configJson, [System.Text.UTF8Encoding]::new($false))

    foreach ($name in @("start","stop","restart","status")) {
        $cmdName = "stable-audio-$name.cmd"
        $cmdPath = Join-Path $cmdDir $cmdName
        $cmdText = "@echo off`r`nchcp 65001 >nul`r`npowershell -NoProfile -ExecutionPolicy Bypass -File ""%~dp0stable-audio-service.ps1"" $name %*`r`n"
        Set-Content -Path $cmdPath -Value $cmdText -Encoding ascii
    }

    Write-OK "命令已安装到 $cmdDir"
    Write-Host "    启动: stable-audio-start"
    Write-Host "    停止: stable-audio-stop"
    Write-Host "    重启: stable-audio-restart"
    Write-Host "    状态: stable-audio-status"
}
