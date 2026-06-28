import test from 'node:test'
import assert from 'node:assert/strict'

import {
  kodoProfile,
  type KodoPayload,
  validPayload,
  verifyKodoProfile,
} from './projectKodoStorageTestHelpers.test'

test('kodo verification uploads stats and deletes a probe object under project prefix', async () => {
  const events: string[] = []
  const payloads: KodoPayload[] = []

  const result = await verifyKodoProfile(kodoProfile(validPayload), {
    projectName: '默认 项目',
    probeId: 'probe_1',
    now: () => '2026-06-23T00:00:00.000Z',
    createClient: async (payload) => {
      payloads.push(payload)
      return {
        putObject: async (objectKey, body, mimeType) => {
          events.push(`put:${objectKey}:${body.toString('utf8')}:${mimeType}`)
        },
        statObject: async (objectKey) => {
          events.push(`stat:${objectKey}`)
        },
        getObject: async (objectKey) => {
          events.push(`get:${objectKey}`)
          return Buffer.from('game-design-tools-kodo-verification')
        },
        deleteObject: async (objectKey) => {
          events.push(`delete:${objectKey}`)
        },
      }
    },
  })

  assert.equal(result.ok, true)
  assert.equal(result.message, '七牛 Kodo 对象存储验证成功。')
  assert.equal(result.lastVerifiedAt, '2026-06-23T00:00:00.000Z')
  assert.deepEqual(payloads, [validPayload])
  assert.deepEqual(events, [
    'put:objects/默认_项目/verification/probe_1.txt:game-design-tools-kodo-verification:text/plain',
    'stat:objects/默认_项目/verification/probe_1.txt',
    'get:objects/默认_项目/verification/probe_1.txt',
    'delete:objects/默认_项目/verification/probe_1.txt',
  ])
})
