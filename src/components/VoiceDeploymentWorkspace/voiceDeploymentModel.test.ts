import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  buildGradioGeneratePayload,
  buildGradioApiCall,
  buildOneClickCommand,
  createVoiceRecordName,
  defaultVoiceGenerationParams,
  defaultPort,
  deleteVoiceRecord,
  downloadSources,
  evaluateHardware,
  latencyDisclaimer,
  modelVramRequirements,
  parseNvidiaSmiReport,
  prepareCloneFromRecord,
  toggleRecordFavorite,
  updateRecordName,
  validateModelPath,
  voiceModeMeta,
  voxcpmModels,
  type VoiceGenerationRecord,
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

test('voice modes cover blind box, design, reference clone, and high similarity clone', () => {
  assert.deepEqual(voiceModeMeta.map((item) => item.id), [
    'blind-box',
    'voice-design',
    'reference-clone',
    'high-similarity-clone',
  ])
  for (const mode of voiceModeMeta) {
    assert.ok(mode.label.length > 0)
    assert.ok(mode.note.length > 0)
  }
})

test('Gradio generate payload maps voice modes to VoxCPM API order', () => {
  const payload = buildGradioGeneratePayload({
    ...defaultVoiceGenerationParams,
    mode: 'high-similarity-clone',
    text: '生成台词',
    controlInstruction: '温柔',
    promptText: '参考文本',
    referenceAudioName: 'ref.wav',
    referenceAudioPath: '/tmp/ref.wav',
    advanced: {
      cfgValue: 2.4,
      normalize: true,
      denoise: true,
      ditSteps: 18,
    },
  })

  assert.equal(payload.data[0], '生成台词')
  assert.equal(payload.data[1], '')
  assert.deepEqual(payload.data[2], {
    path: '/tmp/ref.wav',
    orig_name: 'ref.wav',
    meta: { _type: 'gradio.FileData' },
  })
  assert.equal(payload.data[3], true)
  assert.equal(payload.data[4], '参考文本')
  assert.equal(payload.data[5], 2.4)
  assert.equal(payload.data[6], true)
  assert.equal(payload.data[7], true)
  assert.equal(payload.data[8], 18)
})

test('reference clone payload keeps control instruction and disables prompt text', () => {
  const payload = buildGradioGeneratePayload({
    ...defaultVoiceGenerationParams,
    mode: 'reference-clone',
    controlInstruction: '更年轻，语速稍快',
    promptText: '不会发送',
  })

  assert.equal(payload.data[1], '更年轻，语速稍快')
  assert.equal(payload.data[3], false)
  assert.equal(payload.data[4], '')
})

test('voice records can be renamed, favorited, deleted, and loaded for cloning', () => {
  const record: VoiceGenerationRecord = {
    id: 'r1',
    name: createVoiceRecordName(defaultVoiceGenerationParams, 1),
    createdAt: '2026-06-05T00:00:00.000Z',
    audioUrl: 'blob:voice',
    audioPath: '/tmp/out.wav',
    favorite: false,
    params: {
      ...defaultVoiceGenerationParams,
      mode: 'high-similarity-clone',
      referenceAudioPath: '/tmp/ref.wav',
      referenceAudioName: 'ref.wav',
    },
  }

  const renamed = updateRecordName([record], 'r1', '角色 A')
  assert.equal(renamed[0].name, '角色 A')
  assert.equal(updateRecordName(renamed, 'r1', '   ')[0].name, '角色 A')

  const favorited = toggleRecordFavorite(renamed, 'r1')
  assert.equal(favorited[0].favorite, true)
  assert.deepEqual(deleteVoiceRecord(favorited, 'r1'), [])

  const cloneParams = prepareCloneFromRecord(record)
  assert.equal(cloneParams.mode, 'reference-clone')
  assert.equal(cloneParams.referenceAudioPath, '/tmp/ref.wav')
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

  assert.match(source, /Start-Process -FilePath \(\[string\]\$config\.PythonCommand\)/)
  assert.match(source, /-RedirectStandardOutput \$stdoutPath/)
  assert.match(source, /-RedirectStandardError \$stderrPath/)
  assert.match(source, /voxcpm\.err\.log/)
  assert.match(source, /taskkill/)
  assert.doesNotMatch(source, /\*\> \(\[string\]\$config\.LogPath\)/)
  assert.doesNotMatch(source, /BeginErrorReadLine/)
})

test('deployment scripts allow browser pages to call local Gradio', () => {
  const windows = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')
  const unix = readFileSync('scripts/deploy-voxcpm.sh', 'utf8')

  for (const source of [windows, unix]) {
    assert.match(source, /VOXCPM_ALLOWED_BROWSER_ORIGINS", "\*"/)
    assert.match(source, /"\*" in allowed/)
    assert.match(source, /VOXCPM_ALLOWED_BROWSER_ORIGINS/)
    assert.match(source, /CustomCORSMiddleware/)
    assert.match(source, /Access-Control-Allow-Private-Network/)
  }

  assert.match(windows, /if \(\$allowedOrigins\.Count -eq 0\) \{ \$allowedOrigins = @\("\*"\) \}/)
  assert.match(windows, /PYTHONPATH/)
  assert.match(unix, /PYTHONPATH/)
})

test('Windows service stores the real Python interpreter instead of the py launcher', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Resolve-PythonExecutablePath/)
  assert.match(source, /sys\.executable/)
  assert.match(source, /RealCommand/)
  assert.match(source, /PythonArgs = @\(\)/)
})

test('Windows deployment script requires Python 3.12 for setup and service commands', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /py"; Args = @\("-3\.12"\)/)
  assert.match(source, /Python 3\.12/)
  assert.match(source, /-match "3\\\.12\\\."/)
  assert.doesNotMatch(source, /3\\\.\(10\|11\|12\)\\\./)
  assert.doesNotMatch(source, /Python 3\.10-3\.12/)
})

test('Windows deployment script refuses to install VoxCPM with a non-3.12 interpreter', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')
  const invokePython = source.match(/function Invoke-Python\([\s\S]*?\n\}/)?.[0] || ''

  assert.match(source, /function Assert-PythonRuntimeCompatible/)
  assert.match(source, /sys\.version_info\.major/)
  assert.match(source, /sys\.version_info\.minor/)
  assert.match(source, /Write-Fail "\$context：需要 Python 3\.12/)
  assert.match(invokePython, /Assert-PythonRuntimeCompatible \$failureMessage/)
})

test('Windows service runner tracks the actual long-lived Python process id', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Set-Content -Path \(\[string\]\$config\.PidPath\) -Value \$process\.Id/)
  assert.doesNotMatch(source, /Set-Content -Path \(\[string\]\$config\.PidPath\) -Value \$process\.Id -Encoding ascii\s+Write-Host "VoxCPM 正在后台启动/)
})

test('home voice card describes Gradio instead of stale vLLM REST output', () => {
  const source = readFileSync('src/App.tsx', 'utf8')

  assert.doesNotMatch(source, /vLLM/)
  assert.doesNotMatch(source, /\/v1\/audio\/speech/)
  assert.match(source, /Gradio/)
  assert.match(source, /gradio_client/)
})
