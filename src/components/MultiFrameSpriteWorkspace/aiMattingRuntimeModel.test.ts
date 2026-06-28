import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

test('BiRefNet runtime model normalizes service status and dependency output', async () => {
  const modelPath = 'src/components/MultiFrameSpriteWorkspace/aiMattingRuntimeModel.ts'
  assert.ok(existsSync(modelPath), `${modelPath} should exist`)
  const {
    extractBirefnetDevicePreferenceFromText,
    normalizeBirefnetDevicePreference,
    parseBirefnetServiceStatus,
  } = await import('./aiMattingRuntimeModel')

  assert.equal(normalizeBirefnetDevicePreference('cuda'), 'cuda')
  assert.equal(normalizeBirefnetDevicePreference('cpu'), 'cpu')
  assert.equal(normalizeBirefnetDevicePreference('metal'), 'auto')
  assert.deepEqual(
    parseBirefnetServiceStatus(JSON.stringify({ requested_device: 'cuda', device: 'cuda' })),
    { requestedDevice: 'cuda', activeDevice: 'cuda' },
  )
  assert.deepEqual(
    parseBirefnetServiceStatus(JSON.stringify({ requested_device: 'metal', device: 0 })),
    { requestedDevice: 'auto', activeDevice: '' },
  )
  assert.equal(parseBirefnetServiceStatus('service unavailable'), null)
  assert.equal(extractBirefnetDevicePreferenceFromText('当前设备偏好：cpu'), 'cpu')
  assert.equal(extractBirefnetDevicePreferenceFromText('当前未配置设备'), null)
})
