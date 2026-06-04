import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  buildGradioApiCall,
  buildOneClickCommand,
  defaultPort,
  downloadSources,
  evaluateHardware,
  latencyDisclaimer,
  modelVramRequirements,
  parseNvidiaSmiReport,
  validateModelPath,
  voxcpmModels,
} from './voiceDeploymentModel'

test('parses nvidia-smi CSV output and keeps the largest VRAM card', () => {
  const report = parseNvidiaSmiReport(`
NVIDIA GeForce RTX 3060, 12288
NVIDIA GeForce GTX 1650, 4096
`)
  assert.deepEqual(report, { gpuName: 'NVIDIA GeForce RTX 3060', vramGb: 12, device: 'nvidia' })
})

test('recommends VoxCPM2 when VRAM >= 8GB', () => {
  const result = evaluateHardware({ gpuName: 'RTX 4090', vramGb: 24, device: 'nvidia' })
  assert.equal(result.status, 'ready')
  assert.equal(result.recommendedModel, 'VoxCPM2')
})

test('recommends VoxCPM1.5 when VRAM is 6-7GB', () => {
  const result = evaluateHardware({ gpuName: 'RTX 3060', vramGb: 6, device: 'nvidia' })
  assert.equal(result.status, 'warning')
  assert.equal(result.recommendedModel, 'VoxCPM1.5')
})

test('recommends VoxCPM-0.5B when VRAM is 5GB', () => {
  const result = evaluateHardware({ gpuName: 'GTX 1660', vramGb: 5, device: 'nvidia' })
  assert.equal(result.status, 'warning')
  assert.equal(result.recommendedModel, 'VoxCPM-0.5B')
})

test('blocks deployment when NVIDIA VRAM is below 5GB', () => {
  const result = evaluateHardware({ gpuName: 'GTX 1650', vramGb: 4, device: 'nvidia' })
  assert.equal(result.status, 'blocked')
  assert.equal(result.recommendedModel, null)
})

test('Apple Silicon is always ready with VoxCPM-0.5B recommendation', () => {
  const result = evaluateHardware({ gpuName: 'Apple Silicon', vramGb: 0, device: 'apple' })
  assert.equal(result.status, 'ready')
  assert.equal(result.recommendedModel, 'VoxCPM-0.5B')
  assert.match(result.detail, /MPS/)
})

test('CPU mode is warning with VoxCPM-0.5B recommendation', () => {
  const result = evaluateHardware({ gpuName: 'CPU', vramGb: 0, device: 'cpu' })
  assert.equal(result.status, 'warning')
  assert.equal(result.recommendedModel, 'VoxCPM-0.5B')
})

test('model VRAM requirements match VoxCPM documentation', () => {
  assert.equal(modelVramRequirements['VoxCPM2'], 8)
  assert.equal(modelVramRequirements['VoxCPM1.5'], 6)
  assert.equal(modelVramRequirements['VoxCPM-0.5B'], 5)
})

test('requires a local model path before deployment', () => {
  assert.equal(validateModelPath('').valid, true)
  assert.equal(validateModelPath('D:\\models\\VoxCPM2').valid, true)
})

test('Windows one-click command downloads script to temp file then executes', () => {
  const cmd = buildOneClickCommand('windows', 'D:\\models\\VoxCPM2', 'VoxCPM-0.5B')
  assert.match(cmd, /irm .+ -OutFile/)
  assert.match(cmd, /deploy-voxcpm\.ps1/)
  assert.match(cmd, /D:\\models\\VoxCPM2/)
  assert.match(cmd, /'VoxCPM-0\.5B'/)
})

test('mac/linux one-click command uses curl | bash', () => {
  const cmd = buildOneClickCommand('mac', '/data/models/VoxCPM2', 'VoxCPM1.5')
  assert.match(cmd, /curl -fsSL .+ \| bash/)
  assert.match(cmd, /deploy-voxcpm\.sh/)
  assert.match(cmd, /\/data\/models\/VoxCPM2/)
  assert.match(cmd, /'VoxCPM1\.5'/)
})

test('one-click command defaults to VoxCPM2 when model omitted', () => {
  const cmd = buildOneClickCommand('windows', 'D:\\models\\VoxCPM2')
  assert.match(cmd, /'VoxCPM2'/)
})

test('one-click command defaults download source to auto when omitted', () => {
  const win = buildOneClickCommand('windows', 'D:\\models\\VoxCPM2', 'VoxCPM2')
  assert.match(win, /'VoxCPM2'\s+'auto'/)
  const mac = buildOneClickCommand('mac', '/data/models/VoxCPM2', 'VoxCPM2')
  assert.match(mac, /'VoxCPM2'\s+'auto'/)
})

test('one-click command appends download source as third positional arg', () => {
  const ms = buildOneClickCommand('windows', 'D:\\models\\VoxCPM2', 'VoxCPM2', 'ms')
  assert.match(ms, /'VoxCPM2'\s+'ms'/)
  const hf = buildOneClickCommand('mac', '/data/models/VoxCPM2', 'VoxCPM1.5', 'hf')
  assert.match(hf, /'VoxCPM1\.5'\s+'hf'/)
})

test('downloadSources metadata covers auto/hf/ms with correct hosts', () => {
  assert.equal(downloadSources.length, 3)
  const ids = downloadSources.map((s) => s.id)
  assert.deepEqual(ids, ['auto', 'hf', 'ms'])
  const byId = Object.fromEntries(downloadSources.map((s) => [s.id, s]))
  assert.equal(byId.auto.host, '')
  assert.equal(byId.hf.host, 'hf-mirror.com')
  assert.equal(byId.ms.host, 'modelscope.cn')
  for (const s of downloadSources) {
    assert.ok(s.label.length > 0)
    assert.ok(s.note.length > 0)
  }
})

test('latencyDisclaimer honestly notes latency is not throughput', () => {
  assert.ok(latencyDisclaimer.length > 0)
  assert.match(latencyDisclaimer, /延迟/)
  assert.match(latencyDisclaimer, /吞吐/)
})

test('voxcpmModels metadata matches VRAM requirements and HF ids', () => {
  assert.equal(voxcpmModels.length, 3)
  for (const m of voxcpmModels) {
    assert.equal(m.hfId, `openbmb/${m.id}`)
    assert.equal(m.vramGb, modelVramRequirements[m.id])
    assert.ok(m.note.length > 0)
  }
})

test('Gradio API call example uses gradio_client predict', () => {
  const call = buildGradioApiCall({ port: 8808, text: '测试文本' })
  assert.match(call, /gradio_client/)
  assert.match(call, /127\.0\.0\.1:8808/)
  assert.match(call, /\.predict\(/)
  assert.match(call, /测试文本/)
})

test('default port is the Gradio web demo port 8808', () => {
  assert.equal(defaultPort, 8808)
})

test('Windows deployment script installs ffmpeg for browser-recorded m4a reference audio', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Get-Command ffmpeg/)
  assert.match(source, /Gyan\.FFmpeg/)
})

test('Windows deployment script prepares service commands without auto-starting Gradio', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Install-ServiceCommands/)
  assert.match(source, /voxcpm-start/)
  assert.match(source, /voxcpm-stop/)
  assert.match(source, /voxcpm-restart/)
  assert.match(source, /voxcpm-status/)
  assert.doesNotMatch(source, /Invoke-Expression "\$PythonExe app\.py --port/)
})

test('Windows deployment script safely detects optional tools and checks the model drive', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Get-Command \$candidate\.Command -ErrorAction SilentlyContinue/)
  assert.match(source, /Get-Command nvidia-smi -ErrorAction SilentlyContinue/)
  assert.match(source, /Resolve-ModelDriveName/)
  assert.doesNotMatch(source, /\$pyver = python --version/)
  assert.doesNotMatch(source, /\$smi = nvidia-smi 2>&1/)
})

test('Windows deployment script keeps command arguments and generated files safe', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Invoke-Python/)
  assert.match(source, /Start-Process -FilePath \$script:PythonCommand/)
  assert.match(source, /-Encoding utf8/)
  assert.match(source, /sm_120/)
  assert.doesNotMatch(source, /Set-Content -Path \$pyFile -Value \$pyCode -Encoding ascii/)
})

test('Windows service command scripts preserve Chinese console output', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /UTF8Encoding\]::new\(\$true\)/)
  assert.match(source, /Write-Utf8PowerShellFile/)
  assert.match(source, /chcp 65001/)
})

test('Windows service runner keeps native stderr warnings in the log', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /System\.Diagnostics\.ProcessStartInfo/)
  assert.match(source, /RedirectStandardError = \$true/)
  assert.match(source, /BeginErrorReadLine/)
  assert.match(source, /taskkill/)
  assert.doesNotMatch(source, /\*\> \(\[string\]\$config\.LogPath\)/)
})

test('home voice card describes Gradio instead of stale vLLM REST output', () => {
  const source = readFileSync('src/App.tsx', 'utf8')

  assert.doesNotMatch(source, /vLLM/)
  assert.doesNotMatch(source, /\/v1\/audio\/speech/)
  assert.match(source, /Gradio/)
  assert.match(source, /gradio_client/)
})
