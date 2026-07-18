import test from 'node:test'
import assert from 'node:assert/strict'

import { executeUpscaleBatchCandidates } from './desktopUpscaleBatchClient'
import type {
  DesktopUpscaleApi,
  DesktopUpscaleImageBatchOptions,
  DesktopUpscaleOptions,
} from './desktopUpscaleApi'

const balanced: DesktopUpscaleOptions = {
  model: 'upscayl-standard-4x',
  scale: 4,
  tileSize: 128,
  ttaMode: false,
  gpuId: '0',
  threadProfile: 'balanced',
}

function binary(value: number) {
  return Uint8Array.from([value]).buffer
}

test('upscale batch client runs once per compatible group and restores candidate order', async () => {
  const calls: DesktopUpscaleImageBatchOptions[] = []
  const api: Pick<DesktopUpscaleApi, 'upscaleImageBatch'> = {
    async upscaleImageBatch(request) {
      calls.push(request)
      return [...request.items].reverse().map((item) => ({
        id: item.id,
        name: `${item.inputName}-result`,
        data: Uint8Array.from([Number(item.id.replace('item-', ''))]),
      }))
    },
  }

  const results = await executeUpscaleBatchCandidates(api, [
    { value: 'a', inputName: 'a.png', outputFormat: 'png', data: binary(1), options: balanced },
    { value: 'b', inputName: 'b.png', outputFormat: 'png', data: binary(2), options: { ...balanced } },
    {
      value: 'c',
      inputName: 'c.webp',
      outputFormat: 'webp',
      data: binary(3),
      options: { ...balanced, threadProfile: 'throughput' },
    },
  ])

  assert.equal(calls.length, 2)
  assert.equal(calls[0]?.items.length, 2)
  assert.equal(calls[0]?.options.threadProfile, 'balanced')
  assert.equal(calls[0]?.outputFormat, 'png')
  assert.equal(calls[1]?.items.length, 1)
  assert.equal(calls[1]?.options.threadProfile, 'throughput')
  assert.equal(calls[1]?.outputFormat, 'webp')
  assert.deepEqual(results.map((entry) => entry.value), ['a', 'b', 'c'])
  assert.deepEqual(results.map((entry) => entry.result.id), ['item-0', 'item-1', 'item-2'])
})

test('upscale batch client rejects a group with a missing result', async () => {
  const api: Pick<DesktopUpscaleApi, 'upscaleImageBatch'> = {
    async upscaleImageBatch() {
      return []
    },
  }

  await assert.rejects(() => executeUpscaleBatchCandidates(api, [
    { value: 'missing', inputName: 'missing.png', outputFormat: 'png', data: binary(1), options: balanced },
  ]), /item-0/)
})
