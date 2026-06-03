import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildOneClickCommand,
  buildVllmApiCall,
  evaluateHardware,
  modelVramRequirements,
  parseNvidiaSmiReport,
  validateModelPath,
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
  assert.equal(validateModelPath('').valid, false)
  assert.equal(validateModelPath('D:\\models\\VoxCPM2').valid, true)
})

test('Windows one-click command uses PowerShell scriptblock invocation', () => {
  const cmd = buildOneClickCommand('windows', 'D:\\models\\VoxCPM2')
  assert.match(cmd, /scriptblock/)
  assert.match(cmd, /deploy-voxcpm\.ps1/)
  assert.match(cmd, /D:\\models\\VoxCPM2/)
})

test('mac/linux one-click command uses curl | bash', () => {
  const cmd = buildOneClickCommand('mac', '/data/models/VoxCPM2')
  assert.match(cmd, /curl -fsSL .+ \| bash/)
  assert.match(cmd, /deploy-voxcpm\.sh/)
  assert.match(cmd, /\/data\/models\/VoxCPM2/)
})

test('vLLM API call example targets /v1/audio/speech', () => {
  const call = buildVllmApiCall({ port: 8000, text: '测试文本' })
  assert.match(call, /127\.0\.0\.1:8000\/v1\/audio\/speech/)
  assert.match(call, /openbmb\/VoxCPM2/)
  assert.match(call, /测试文本/)
  assert.match(call, /speech\.wav/)
})
