function Copy-VoxcpmTemplateFile($templateName, $targetPath) {
    $templatePath = Join-Path $PSScriptRoot $templateName
    if (-not (Test-Path $templatePath)) {
        Write-Fail "缺少 VoxCPM 模板文件：$templatePath"
    }
    $content = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)
    Write-Utf8PowerShellFile $targetPath $content
}

function Install-GradioCorsPatch($repoDir) {
    $patchPath = Join-Path $repoDir "sitecustomize.py"
    Copy-VoxcpmTemplateFile "voxcpm-sitecustomize.py" $patchPath
}

function Install-ServiceCommands($repoDir, $launchId, $modelPath, $modelVariant, $source) {
    Write-Step "安装 VoxCPM 服务管理命令"
    $cmdDir = Join-Path $env:LOCALAPPDATA "GameDesignTools\bin"
    $stateDir = Join-Path $env:LOCALAPPDATA "GameDesignTools\VoxCPM"
    New-Item -ItemType Directory -Force -Path $cmdDir, $stateDir | Out-Null
    Add-UserPath $cmdDir
    Install-GradioCorsPatch $repoDir

    $configPath = Join-Path $stateDir "voxcpm-config.json"
    $runnerPath = Join-Path $cmdDir "voxcpm-run.ps1"
    $servicePath = Join-Path $cmdDir "voxcpm-service.ps1"
    $logPath = Join-Path $stateDir "voxcpm.log"
    $stderrPath = Join-Path $stateDir "voxcpm.err.log"
    $pidPath = Join-Path $stateDir "voxcpm.pid"

    $configJson = @{
        PythonCommand = $script:PythonCommand
        PythonArgs = @($script:PythonArgs)
        RepoDir = $repoDir
        LaunchId = $launchId
        ModelPath = $modelPath
        ModelVariant = $modelVariant
        Source = $source
        Port = $Port
        AllowedOrigins = @("*")
        HfMirror = $HfMirror
        LogPath = $logPath
        StderrPath = $stderrPath
        PidPath = $pidPath
    } | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText($configPath, $configJson, [System.Text.UTF8Encoding]::new($false))

    Copy-VoxcpmTemplateFile "voxcpm-run.template.ps1" $runnerPath
    Copy-VoxcpmTemplateFile "voxcpm-service.template.ps1" $servicePath

    foreach ($name in @("start","stop","restart","status")) {
        $cmdName = "voxcpm-$name.cmd"
        $cmdPath = Join-Path $cmdDir $cmdName
        $cmdText = "@echo off`r`nchcp 65001 >nul`r`npowershell -NoProfile -ExecutionPolicy Bypass -File ""%~dp0voxcpm-service.ps1"" $name %*`r`n"
        Set-Content -Path $cmdPath -Value $cmdText -Encoding ascii
    }

    Write-OK "命令已安装到 $cmdDir"
    Write-Host "    启动: voxcpm-start"
    Write-Host "    停止: voxcpm-stop"
    Write-Host "    重启: voxcpm-restart"
    Write-Host "    状态: voxcpm-status"
    Write-Host "    当前 PowerShell 已可直接使用；新终端若识别不到命令，请重开终端。"
}
