function Install-BirefnetServiceFiles {
    param(
        [string]$ModelId,
        [int]$Port,
        [string]$Device,
        [string]$CmdDir,
        [string]$ServiceDir,
        [string]$ServerPath,
        [string]$ConfigPath,
        [string]$ServicePath,
        [string]$LogPath,
        [string]$StderrPath,
        [string]$PidPath,
        [string]$PythonCommand
    )

    Write-BirefnetTemplateFile "birefnet-server.template.py" $ServerPath @{
        "__MODEL_ID__" = $ModelId
        "__DEVICE__" = $Device
    }

    $config = @{
        PythonCommand = $PythonCommand
        PythonArgs = @()
        ServiceDir = $ServiceDir
        ServerPath = $ServerPath
        ModelId = $ModelId
        Port = $Port
        Device = $Device
        LogPath = $LogPath
        StderrPath = $StderrPath
        PidPath = $PidPath
        InstalledAt = (Get-Date).ToString("o")
    }
    $config | ConvertTo-Json -Depth 6 | Set-Content -Path $ConfigPath -Encoding UTF8

    Write-BirefnetTemplateFile "birefnet-service.template.ps1" $ServicePath

    foreach ($name in @("start", "stop", "restart", "status")) {
        $cmdName = "birefnet-$name.cmd"
        $cmdPath = Join-Path $CmdDir $cmdName
        $cmdText = "@echo off`r`nchcp 65001 >nul`r`npowershell -NoProfile -ExecutionPolicy Bypass -File ""%~dp0birefnet-service.ps1"" $name %*`r`n"
        Set-Content -Path $cmdPath -Value $cmdText -Encoding ASCII
    }
}
