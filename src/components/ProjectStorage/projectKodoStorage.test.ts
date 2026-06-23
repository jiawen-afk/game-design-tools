import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  normalizeKodoPayload,
  verifyKodoProfile,
} = require('../../../electron/projectKodoStorage.cjs') as {
  normalizeKodoPayload: (profile: unknown) => KodoPayload
  verifyKodoProfile: (profile: unknown, options: KodoVerifyOptions) => Promise<KodoVerifyResult>
}

interface KodoPayload {
  accessKey: string
  secretKey: string
  bucket: string
  region: string
  domain: string
}

interface KodoVerifyResult {
  ok: boolean
  message: string
  lastVerifiedAt: string | null
}

interface KodoVerifyOptions {
  projectId?: string
  projectName?: string
  probeId?: string
  now?: () => string
  createClient?: (payload: KodoPayload) => Promise<{
    putObject: (objectKey: string, body: Buffer, mimeType: string) => Promise<void>
    statObject: (objectKey: string) => Promise<void>
    deleteObject: (objectKey: string) => Promise<void>
  }>
}

function kodoProfile(payload: Record<string, unknown>) {
  return {
    id: 'kodo1',
    type: 'qiniu_kodo',
    lastVerifiedAt: null,
    encryptedPayload: {
      payload: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
    },
  }
}

const validPayload = {
  accessKey: 'ak',
  secretKey: 'sk',
  bucket: 'asset-bucket',
  region: 'z2',
  domain: 'https://cdn.example.com',
}

test('kodo profile payload is decoded and validated before remote verification', () => {
  assert.deepEqual(normalizeKodoPayload(kodoProfile(validPayload)), validPayload)

  assert.throws(
    () => normalizeKodoPayload(kodoProfile({ ...validPayload, secretKey: '' })),
    /缺少 Secret Key/,
  )
  assert.throws(
    () => normalizeKodoPayload(kodoProfile({ ...validPayload, bucket: '' })),
    /缺少 Bucket/,
  )
})

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
    'delete:objects/默认_项目/verification/probe_1.txt',
  ])
})

test('kodo verification rejects blank project prefix without touching remote storage', async () => {
  let touched = false

  const result = await verifyKodoProfile(kodoProfile(validPayload), {
    projectName: ' ',
    createClient: async () => {
      touched = true
      throw new Error('should not create client')
    },
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /缺少项目名称或项目 ID/)
  assert.equal(result.lastVerifiedAt, null)
  assert.equal(touched, false)
})

test('kodo verification deletes probe object when stat fails', async () => {
  const events: string[] = []

  const result = await verifyKodoProfile(kodoProfile(validPayload), {
    projectId: 'p1',
    probeId: 'probe_2',
    createClient: async () => ({
      putObject: async (objectKey) => {
        events.push(`put:${objectKey}`)
      },
      statObject: async (objectKey) => {
        events.push(`stat:${objectKey}`)
        throw new Error('object not found')
      },
      deleteObject: async (objectKey) => {
        events.push(`delete:${objectKey}`)
      },
    }),
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /object not found/)
  assert.equal(result.lastVerifiedAt, null)
  assert.deepEqual(events, [
    'put:objects/p1/verification/probe_2.txt',
    'stat:objects/p1/verification/probe_2.txt',
    'delete:objects/p1/verification/probe_2.txt',
  ])
})
