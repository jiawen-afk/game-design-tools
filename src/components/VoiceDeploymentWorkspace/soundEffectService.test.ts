import test from 'node:test'
import assert from 'node:assert/strict'

import {
  checkStableAudioConnection,
  generateStableAudioSound,
} from './soundEffectService'

test('stable audio connection check requires a ready health response', async () => {
  const originalFetch = globalThis.fetch
  const responses = [
    new Response(JSON.stringify({ ok: true, ready: false }), { status: 200 }),
    new Response(JSON.stringify({ ok: true, ready: true }), { status: 200 }),
  ]
  globalThis.fetch = async () => responses.shift() ?? new Response('', { status: 503 })
  try {
    assert.equal(await checkStableAudioConnection(8818), false)
    assert.equal(await checkStableAudioConnection(8818), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('stable audio generation surfaces server detail on failure', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    detail: 'Stable Audio 3 模型需要 HuggingFace 授权。',
  }), { status: 503 })
  try {
    await assert.rejects(
      () => generateStableAudioSound(8818, {
        prompt: 'sword hit',
        durationSeconds: 2,
        seed: null,
        outputName: '',
      }),
      /HuggingFace 授权/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
