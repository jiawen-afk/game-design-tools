import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildDeployCommand,
  buildLocalServiceUsage,
  evaluateHardware,
  parseNvidiaSmiReport,
  validateModelPath,
} from './voiceDeploymentModel'

test('parses nvidia-smi CSV output and keeps the largest VRAM card', () => {
  const report = parseNvidiaSmiReport(`
NVIDIA GeForce RTX 3060, 12288
NVIDIA GeForce GTX 1650, 4096
`)

  assert.deepEqual(report, {
    gpuName: 'NVIDIA GeForce RTX 3060',
    vramGb: 12,
  })
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

test('builds a Docker deployment command with the local model path', () => {
  const command = buildDeployCommand({
    mode: 'docker',
    modelPath: 'D:\\models\\VoxCPM2',
    port: 8808,
  })

  assert.match(command, /docker run/)
  assert.match(command, /D:\\models\\VoxCPM2/)
  assert.match(command, /--model-id \/models\/VoxCPM2/)
  assert.match(command, /-p 8808:8808/)
})

test('builds a direct deployment command with the local model path', () => {
  const command = buildDeployCommand({
    mode: 'direct',
    modelPath: '/data/models/VoxCPM2',
    port: 8808,
  })

  assert.match(command, /python app.py/)
  assert.match(command, /--model-id '\/data\/models\/VoxCPM2'/)
  assert.match(command, /--port 8808/)
})

test('builds local service usage snippets for the deployed voice service', () => {
  const usage = buildLocalServiceUsage(8808)

  assert.match(usage.browserUrl, /http:\/\/127\.0\.0\.1:8808/)
  assert.match(usage.pythonClient, /gradio_client/)
  assert.match(usage.pythonClient, /Client\('http:\/\/127\.0\.0\.1:8808'\)/)
  assert.match(usage.healthCheck, /curl -I http:\/\/127\.0\.0\.1:8808/)
})
