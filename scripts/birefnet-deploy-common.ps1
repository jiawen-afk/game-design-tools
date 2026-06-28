function Test-NvidiaAvailable {
    try {
        & nvidia-smi *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Write-BirefnetTemplateFile($templateName, $targetPath, $replacements = @{}) {
    $templatePath = Join-Path $PSScriptRoot $templateName
    if (!(Test-Path $templatePath)) { throw "缺少 BiRefNet 模板文件：$templatePath" }
    $source = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)
    foreach ($key in $replacements.Keys) {
        $source = $source.Replace($key, [string]$replacements[$key])
    }
    Set-Content -Path $targetPath -Value $source -Encoding UTF8
}
