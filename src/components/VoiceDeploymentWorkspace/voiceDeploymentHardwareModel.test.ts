import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
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

test('recommends VoxCPM2 when VRAM reaches its configured requirement', () => {
  const result = evaluateHardware({ gpuName: 'RTX 4090', vramGb: modelVramRequirements.VoxCPM2, device: 'nvidia' })
  assert.equal(result.status, 'ready')
  assert.equal(result.recommendedModel, 'VoxCPM2')
})

test('lower VoxCPM models remain metadata only and are disabled in setup UI', () => {
  const panelsSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.match(panelsSource, /disabledModelIds/)
  assert.match(panelsSource, /VoxCPM1\.5/)
  assert.match(panelsSource, /VoxCPM-0\.5B/)
  assert.match(panelsSource, /disabled:\s*disabledModelIds\.has\('VoxCPM1\.5'\)/)
  assert.match(panelsSource, /disabled:\s*disabledModelIds\.has\('VoxCPM-0\.5B'\)/)
})

test('recommends VoxCPM1.5 when VRAM reaches its configured requirement', () => {
  const result = evaluateHardware({ gpuName: 'RTX 3060', vramGb: modelVramRequirements['VoxCPM1.5'], device: 'nvidia' })
  assert.equal(result.status, 'warning')
  assert.equal(result.recommendedModel, 'VoxCPM1.5')
})

test('recommends VoxCPM-0.5B when VRAM reaches its configured requirement', () => {
  const result = evaluateHardware({ gpuName: 'GTX 1660', vramGb: modelVramRequirements['VoxCPM-0.5B'], device: 'nvidia' })
  assert.equal(result.status, 'warning')
  assert.equal(result.recommendedModel, 'VoxCPM-0.5B')
})

test('blocks deployment when NVIDIA VRAM is below the smallest configured requirement', () => {
  const result = evaluateHardware({ gpuName: 'GTX 1650', vramGb: modelVramRequirements['VoxCPM-0.5B'] - 1, device: 'nvidia' })
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
  assert.equal(modelVramRequirements.VoxCPM2 > modelVramRequirements['VoxCPM1.5'], true)
  assert.equal(modelVramRequirements['VoxCPM1.5'] > modelVramRequirements['VoxCPM-0.5B'], true)
  assert.equal(Math.min(...Object.values(modelVramRequirements)) > 0, true)
})

test('requires a local model path before deployment', () => {
  assert.equal(validateModelPath('').valid, true)
  assert.equal(validateModelPath('D:\\models\\VoxCPM2').valid, true)
})

test('VoxCPM setup uses the desktop bridge instead of remote shell bootstrap commands', () => {
  const modelSource = readFileSync('src/components/VoiceDeploymentWorkspace/voiceDeploymentModel.ts', 'utf8')
  const hookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentSetup.ts', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.doesNotMatch(modelSource, /buildOneClickCommand/)
  assert.doesNotMatch(modelSource, /tools\.linjiawen\.com/)
  assert.doesNotMatch(modelSource, /deploy-voxcpm\.sh/)
  assert.doesNotMatch(hookSource, /oneClickCommand/)
  assert.doesNotMatch(panelSource, /复制命令/)
  assert.doesNotMatch(panelSource, /macOS \/ Linux/)
  assert.match(hookSource, /runVoxcpmSetup/)
  assert.match(panelSource, /安装依赖/)
})

test('downloadSources metadata covers auto/hf/ms with correct hosts', () => {
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
  assert.deepEqual(voxcpmModels.map((m) => m.id), Object.keys(modelVramRequirements))
  for (const m of voxcpmModels) {
    assert.equal(m.hfId, `openbmb/${m.id}`)
    assert.equal(m.vramGb, modelVramRequirements[m.id])
    assert.ok(m.note.length > 0)
  }
})
