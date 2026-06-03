import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildOneClickCommand,
  buildVllmApiCall,
  evaluateHardware,
  parseNvidiaSmiReport,
  validateModelPath,
} from './voiceDeploymentModel'

test('parses nvidia-smi CSV output and keeps the largest VRAM card', () => {
  const report = parseNvidiaSmiReport(`
NVIDIA GeForce RTX 3060, 12288
NVIDIA GeForce GTX 1650, 4096
`)
  assert.deepEqual(report, { gpuName: 'NVIDIA GeForce RTX 3060', vramGb: 12 })
})

test('blocks deployment when GPU VRAM is below the minimum', () => {
  const result = evaluateHardware({ gpuName: 'NVIDIA GeForce GTX 1650', vramGb: 4 })
  assert.equal(result.status, 'blocked')
  assert.match(result.detail, /至少 8GB/)
})

test('warns when GPU meets minimum but is below recommended VRAM', () => {
  const result = evaluateHardware({ gpuName: 'NVIDIA GeForce RTX 3060', vramGb: 12 })
  assert.equal(result.status, 'warning')
  assert.match(result.detail, /建议 16GB/)
})

test('requires a local model path before deployment', () => {
  assert.equal(validateModelPath('').valid, false)
  assert.equal(validateModelPath('D:\\models\\VoxCPM2').valid, true)
})

test('Windows one-click command uses PowerShell irm | iex', () => {
  const cmd = buildOneClickCommand('windows', 'D:\\models\\VoxCPM2')
  assert.match(cmd, /irm .+ \| iex/)
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
