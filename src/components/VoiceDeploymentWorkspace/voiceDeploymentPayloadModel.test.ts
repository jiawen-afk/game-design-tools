import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildGradioApiCall,
  buildGradioGeneratePayload,
  defaultPort,
  defaultVoiceGenerationParams,
  voiceModeMeta,
} from './voiceDeploymentModel'

test('Gradio API call example uses gradio_client predict', () => {
  const call = buildGradioApiCall({ port: defaultPort, text: '测试文本' })
  assert.match(call, /gradio_client/)
  assert.match(call, new RegExp(`127\\.0\\.0\\.1:${defaultPort}`))
  assert.match(call, /\.predict\(/)
  assert.match(call, /测试文本/)
})

test('default port is a valid local Gradio port', () => {
  assert.equal(Number.isInteger(defaultPort), true)
  assert.equal(defaultPort > 0, true)
  assert.equal(defaultPort <= 65535, true)
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
