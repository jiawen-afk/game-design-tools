function Resolve-Python {
    $candidates = @(
        @("py", @("-3.11")),
        @("py", @("-3.12")),
        @("python", @())
    )
    foreach ($candidate in $candidates) {
        $cmd = $candidate[0]
        $args = @($candidate[1]) + @("-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        try {
            $version = & $cmd @args 2>$null
            if ($LASTEXITCODE -eq 0 -and $version -match "^3\.(11|12)") {
                return @{ Command = $cmd; Args = @($candidate[1]) }
            }
        } catch {
        }
    }
    throw "未找到 Python 3.11 或 3.12。请先安装 Python，并确保 py 或 python 可用。"
}

function Invoke-Python {
    param([string[]]$Arguments, [string]$FailureMessage)
    & $pythonCommand @pythonArgs @Arguments
    if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}
