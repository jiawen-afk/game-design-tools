import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  getKodoObject,
  normalizeDownloadDomain,
  normalizeKodoPayload,
  verifyKodoProfile,
} = require('../../../electron/projectKodoStorage.cjs') as {
  getKodoObject: (profile: unknown, objectKey: string, options: KodoObjectOptions) => Promise<{ data: Buffer; mimeType: string }>
  normalizeDownloadDomain: (domain: string) => string
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

interface KodoObjectOptions {
  createClient?: (payload: KodoPayload) => Promise<{
    statObject: (objectKey: string) => Promise<{ mimeType?: string }>
    getObject: (objectKey: string) => Promise<Buffer>
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

test('kodo download domain accepts bare host names from project configuration', () => {
  assert.equal(normalizeDownloadDomain('kodi.linjiawen.com'), 'https://kodi.linjiawen.com')
  assert.equal(normalizeDownloadDomain('https://cdn.example.com/'), 'https://cdn.example.com')
  assert.equal(normalizeDownloadDomain('http://cdn.example.com/'), 'http://cdn.example.com')
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

test('kodo object reads return object bytes and mime type', async () => {
  const events: string[] = []

  const result = await getKodoObject(kodoProfile(validPayload), 'objects/默认项目/audio_wav/r1.wav', {
    createClient: async () => ({
      statObject: async (objectKey) => {
        events.push(`stat:${objectKey}`)
        return { mimeType: 'audio/wav' }
      },
      getObject: async (objectKey) => {
        events.push(`get:${objectKey}`)
        return Buffer.from('voice')
      },
    }),
  })

  assert.equal(result.mimeType, 'audio/wav')
  assert.equal(result.data.toString('utf8'), 'voice')
  assert.deepEqual(events, [
    'stat:objects/默认项目/audio_wav/r1.wav',
    'get:objects/默认项目/audio_wav/r1.wav',
  ])
})
