import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

const voxcpmDeploymentScriptPaths = [
  'scripts/deploy-voxcpm.ps1',
  'scripts/voxcpm-deploy-common.ps1',
  'scripts/voxcpm-python-runtime.ps1',
  'scripts/voxcpm-prerequisites.ps1',
  'scripts/voxcpm-service-install.ps1',
  'scripts/voxcpm-sitecustomize.py',
  'scripts/voxcpm-run.template.ps1',
  'scripts/voxcpm-service.template.ps1',
]

function readVoxcpmDeploymentSources() {
  return voxcpmDeploymentScriptPaths
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
}

test('Windows deployment script installs ffmpeg for browser-recorded m4a reference audio', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /Get-Command ffmpeg/)
  assert.match(source, /Gyan\.FFmpeg/)
})

test('Windows deployment script prepares service commands without auto-starting Gradio', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /Install-ServiceCommands/)
  assert.match(source, /voxcpm-start/)
  assert.match(source, /voxcpm-stop/)
  assert.match(source, /voxcpm-restart/)
  assert.match(source, /voxcpm-status/)
  assert.doesNotMatch(source, /Invoke-Expression "\$PythonExe app\.py --port/)
})

test('Windows deployment script safely detects optional tools and checks the model drive', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /Get-Command \$candidate\.Command -ErrorAction SilentlyContinue/)
  assert.match(source, /Get-Command nvidia-smi -ErrorAction SilentlyContinue/)
  assert.match(source, /Resolve-ModelDriveName/)
  assert.doesNotMatch(source, /\$pyver = python --version/)
  assert.doesNotMatch(source, /\$smi = nvidia-smi 2>&1/)
})

test('Windows deployment script keeps command arguments and generated files safe', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /Invoke-Python/)
  assert.match(source, /Start-Process -FilePath \$script:PythonCommand/)
  assert.match(source, /-Encoding utf8/)
  assert.match(source, /sm_120/)
  assert.doesNotMatch(source, /Set-Content -Path \$pyFile -Value \$pyCode -Encoding ascii/)
})

test('Windows deployment script runs multiline Python probes from temporary files', () => {
  const source = readVoxcpmDeploymentSources()
  const ensureTorch = source.match(/function Ensure-Torch\([\s\S]*?\n\}/)?.[0] || ''

  assert.match(source, /Invoke-PythonScriptOutput/)
  assert.match(source, /\[System\.IO\.Path\]::GetTempFileName\(\)/)
  assert.doesNotMatch(source, /New-TemporaryFile/)
  assert.match(source, /Remove-Item \$pyFile -ErrorAction SilentlyContinue/)
  assert.match(ensureTorch, /Invoke-PythonScriptOutput \$probeCode/)
  assert.doesNotMatch(ensureTorch, /Invoke-PythonOutput @\("-c", \$probeCode\)/)
})

test('Windows service command scripts preserve Chinese console output', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /UTF8Encoding\]::new\(\$true\)/)
  assert.match(source, /Write-Utf8PowerShellFile/)
  assert.match(source, /chcp 65001/)
})

test('Windows service runner keeps native stderr warnings in the log', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /Start-Process -FilePath \(\[string\]\$config\.PythonCommand\)/)
  assert.match(source, /-RedirectStandardOutput \$stdoutPath/)
  assert.match(source, /-RedirectStandardError \$stderrPath/)
  assert.match(source, /voxcpm\.err\.log/)
  assert.match(source, /taskkill/)
  assert.doesNotMatch(source, /\*\> \(\[string\]\$config\.LogPath\)/)
  assert.doesNotMatch(source, /BeginErrorReadLine/)
})

test('Windows deployment script allows the Electron renderer to call local Gradio', () => {
  const windows = readVoxcpmDeploymentSources()

  for (const source of [windows]) {
    assert.match(source, /VOXCPM_ALLOWED_BROWSER_ORIGINS", "\*"/)
    assert.match(source, /"\*" in allowed/)
    assert.match(source, /VOXCPM_ALLOWED_BROWSER_ORIGINS/)
    assert.match(source, /CustomCORSMiddleware/)
    assert.match(source, /Access-Control-Allow-Private-Network/)
  }

  assert.match(windows, /if \(\$allowedOrigins\.Count -eq 0\) \{ \$allowedOrigins = @\("\*"\) \}/)
  assert.match(windows, /PYTHONPATH/)
})

test('Windows service stores the real Python interpreter instead of the py launcher', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /Resolve-PythonExecutablePath/)
  assert.match(source, /sys\.executable/)
  assert.match(source, /RealCommand/)
  assert.match(source, /PythonArgs = @\(\)/)
})

test('Windows deployment script requires Python 3.12 for setup and service commands', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /py"; Args = @\("-3\.12"\)/)
  assert.match(source, /Python 3\.12/)
  assert.match(source, /-match "3\\\.12\\\."/)
  assert.doesNotMatch(source, /3\\\.\(10\|11\|12\)\\\./)
  assert.doesNotMatch(source, /Python 3\.10-3\.12/)
})

test('Windows deployment script refuses to install VoxCPM with a non-3.12 interpreter', () => {
  const source = readVoxcpmDeploymentSources()
  const invokePython = source.match(/function Invoke-Python\([\s\S]*?\n\}/)?.[0] || ''

  assert.match(source, /function Assert-PythonRuntimeCompatible/)
  assert.match(source, /sys\.version_info\.major/)
  assert.match(source, /sys\.version_info\.minor/)
  assert.match(source, /Write-Fail "\$context：需要 Python 3\.12/)
  assert.match(invokePython, /Assert-PythonRuntimeCompatible \$failureMessage/)
})

test('Windows Python executable resolver preserves launcher arguments', () => {
  const source = readVoxcpmDeploymentSources()
  const resolver = source.match(/function Resolve-PythonExecutablePath\([\s\S]*?\n\}/)?.[0] || ''

  assert.match(resolver, /\$launcherArgs/)
  assert.match(resolver, /\$probeArgs = @\(\$launcherArgs\) \+ @\("-c"/)
  assert.doesNotMatch(resolver, /function Resolve-PythonExecutablePath\(\$command, \$args\)/)
})

test('Windows service runner tracks the actual long-lived Python process id', () => {
  const source = readVoxcpmDeploymentSources()

  assert.match(source, /Set-Content -Path \(\[string\]\$config\.PidPath\) -Value \$process\.Id/)
  assert.doesNotMatch(source, /Set-Content -Path \(\[string\]\$config\.PidPath\) -Value \$process\.Id -Encoding ascii\s+Write-Host "VoxCPM 正在后台启动/)
})

test('Windows VoxCPM deployment delegates helpers and generated templates to focused files', () => {
  const deploySource = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')
  const viteConfig = readFileSync('vite.config.ts', 'utf8')
  const helperPaths = [
    'scripts/voxcpm-deploy-common.ps1',
    'scripts/voxcpm-python-runtime.ps1',
    'scripts/voxcpm-prerequisites.ps1',
    'scripts/voxcpm-service-install.ps1',
  ]
  const templatePaths = [
    'scripts/voxcpm-sitecustomize.py',
    'scripts/voxcpm-run.template.ps1',
    'scripts/voxcpm-service.template.ps1',
  ]

  for (const path of [...helperPaths, ...templatePaths]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }
  for (const path of helperPaths) {
    const fileName = path.split('/').pop()
    assert.match(deploySource, new RegExp(`Join-Path \\$PSScriptRoot "${fileName}"`))
    assert.match(viteConfig, new RegExp(fileName!.replace('.', '\\.')))
  }
  for (const path of templatePaths) {
    const fileName = path.split('/').pop()
    assert.match(viteConfig, new RegExp(fileName!.replace('.', '\\.')))
  }

  assert.doesNotMatch(deploySource, /function (?:Ensure-PythonAvailable|Ensure-FfmpegAvailable|Ensure-Torch|Install-ServiceCommands)\b/)
  assert.doesNotMatch(deploySource, /sitecustomize\.py[\s\S]*CustomCORSMiddleware/)
  assert.doesNotMatch(deploySource, /\$runner = @'/)
  assert.doesNotMatch(deploySource, /\$service = @'/)
  assert.ok(deploySource.split(/\r?\n/).length <= 180)
})
