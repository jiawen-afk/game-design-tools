import test from 'node:test'
import assert from 'node:assert/strict'

import {
  kodoProfile,
  validPayload,
  verifyKodoProfile,
} from './projectKodoStorageTestHelpers.test'

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
      getObject: async (objectKey) => {
        events.push(`get:${objectKey}`)
        return Buffer.from('should not read')
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

test('kodo verification downloads probe object so invalid access domains are rejected', async () => {
  const events: string[] = []

  const result = await verifyKodoProfile(kodoProfile(validPayload), {
    projectId: 'p1',
    probeId: 'probe_3',
    createClient: async () => ({
      putObject: async (objectKey) => {
        events.push(`put:${objectKey}`)
      },
      statObject: async (objectKey) => {
        events.push(`stat:${objectKey}`)
      },
      getObject: async (objectKey) => {
        events.push(`get:${objectKey}`)
        throw new Error('getaddrinfo ENOTFOUND kodi.linjiawen.com')
      },
      deleteObject: async (objectKey) => {
        events.push(`delete:${objectKey}`)
      },
    }),
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /ENOTFOUND kodi\.linjiawen\.com/)
  assert.equal(result.lastVerifiedAt, null)
  assert.deepEqual(events, [
    'put:objects/p1/verification/probe_3.txt',
    'stat:objects/p1/verification/probe_3.txt',
    'get:objects/p1/verification/probe_3.txt',
    'delete:objects/p1/verification/probe_3.txt',
  ])
})
