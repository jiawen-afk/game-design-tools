function Resolve-PythonCandidate {
    $candidates = @(
        @{ Command = "py"; Args = @("-3.12"); Display = "py -3.12" },
        @{ Command = "python3.12"; Args = @(); Display = "python3.12" },
        @{ Command = "python"; Args = @(); Display = "python" }
    )

    foreach ($candidate in $candidates) {
        $cmd = Get-Command $candidate.Command -ErrorAction SilentlyContinue
        if (-not $cmd) { continue }
        try {
            $ver = & $cmd.Source @($candidate.Args) --version 2>&1
            if ($LASTEXITCODE -eq 0 -and "$ver" -match "3\.12\.") {
                return @{
                    Command = $cmd.Source
                    Args = @($candidate.Args)
                    Display = $candidate.Display
                    Version = "$ver"
                }
            }
        } catch {}
    }
    return $null
}

function Resolve-PythonExecutablePath($command, [string[]]$launcherArgs) {
    $probeArgs = @($launcherArgs) + @("-c", "import sys; print(sys.executable)")
    $output = & $command @probeArgs 2>&1
    if ($LASTEXITCODE -ne 0) { return $null }
    $path = ($output | Select-Object -Last 1).ToString().Trim()
    if ($path -and (Test-Path $path)) { return $path }
    return $null
}

function Assert-PythonRuntimeCompatible($context) {
    if (-not $script:PythonCommand) {
        Write-Fail "$context：未设置 Python 解释器，请重新运行最新部署脚本。"
    }
    $probeCode = "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}'); print(sys.executable)"
    $allArgs = @($script:PythonArgs) + @("-c", $probeCode)
    $probe = & $script:PythonCommand @allArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "$context：无法检查 Python 版本。$($probe -join ' ')"
    }
    $version = if ($probe.Count -gt 0) { "$($probe[0])".Trim() } else { "" }
    $executable = if ($probe.Count -gt 1) { "$($probe[1])".Trim() } else { [string]$script:PythonCommand }
    if ($version -ne "3.12") {
        Write-Fail "$context：需要 Python 3.12，当前 $version（$executable）。请重新运行最新部署脚本。"
    }
}

function Ensure-PythonAvailable {
    Write-Step "检测 Python 版本"
    $candidate = Resolve-PythonCandidate
    if (-not $candidate) {
        Write-Host "    未找到兼容的 Python 3.12，正在自动安装 Python 3.12..." -ForegroundColor Yellow
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        } else {
            $installer = "$env:TEMP\python-3.12-amd64.exe"
            $mirrorUrl = "https://mirrors.aliyun.com/python/3.12.10/python-3.12.10-amd64.exe"
            Invoke-WebRequest -Uri $mirrorUrl -OutFile $installer -UseBasicParsing
            Start-Process -FilePath $installer -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1" -Wait
            Remove-Item $installer -ErrorAction SilentlyContinue
        }
        Refresh-PathFromRegistry
        $candidate = Resolve-PythonCandidate
    }

    if (-not $candidate) { Write-Fail "Python 3.12 安装失败，请手动安装 Python 3.12 后重试。" }
    $realCommand = Resolve-PythonExecutablePath $candidate.Command @($candidate.Args)
    if (-not $realCommand) { Write-Fail "无法解析 Python 解释器路径，请手动检查 Python 安装。" }
    $candidate.RealCommand = $realCommand
    $script:PythonCommand = $candidate.RealCommand
    $script:PythonArgs = @()
    Assert-PythonRuntimeCompatible "Python 环境检查"
    Write-OK "$($candidate.Version)（使用：$($candidate.Display)）"
}

function Invoke-Python($arguments, $failureMessage) {
    Assert-PythonRuntimeCompatible $failureMessage
    $allArgs = @($script:PythonArgs) + @($arguments)
    $process = Start-Process -FilePath $script:PythonCommand -ArgumentList $allArgs -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) { Write-Fail $failureMessage }
}

function Invoke-PythonOutput($arguments) {
    Assert-PythonRuntimeCompatible "Python 命令输出"
    $allArgs = @($script:PythonArgs) + @($arguments)
    $output = & $script:PythonCommand @allArgs 2>&1
    return @{ Output = @($output); ExitCode = $LASTEXITCODE }
}

function Invoke-PythonScriptOutput($code) {
    Assert-PythonRuntimeCompatible "Python 脚本输出"
    $pyFile = [System.IO.Path]::GetTempFileName()
    try {
        Set-Content -Path $pyFile -Value $code -Encoding utf8
        $allArgs = @($script:PythonArgs) + @($pyFile)
        $output = & $script:PythonCommand @allArgs 2>&1
        return @{ Output = @($output); ExitCode = $LASTEXITCODE }
    } finally {
        Remove-Item $pyFile -ErrorAction SilentlyContinue
    }
}
