function buildStableAudioHfLoginScript() {
  return [
    'param(',
    '    [Parameter(Mandatory=$true)]',
    '    [string]$RepoDir',
    ')',
    '',
    '$ErrorActionPreference = "Stop"',
    'Write-Host "==> Stable Audio 3 HuggingFace 登录"',
    'if (-not (Test-Path -LiteralPath $RepoDir)) {',
    '    Write-Host "Stable Audio 3 仓库不存在：$RepoDir" -ForegroundColor Red',
    '    exit 1',
    '}',
    'Set-Location -LiteralPath $RepoDir',
    'Write-Host "请先在 HuggingFace 模型页申请或同意模型访问许可。"',
    'Write-Host "Token 页面：https://huggingface.co/settings/tokens"',
    'Write-Host "下面会执行：uv run hf auth login"',
    'uv run hf auth login',
    'if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }',
    'Write-Host ""',
    'Write-Host "HuggingFace 登录完成。请回到工具点击“检测依赖和模型”。"',
  ].join('\r\n')
}

module.exports = {
  buildStableAudioHfLoginScript,
}
