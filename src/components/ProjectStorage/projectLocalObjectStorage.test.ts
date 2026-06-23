import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

import { buildProjectObjectKey } from './projectStorageModel'
import { createDesktopKodoProjectObjectStorage } from './projectKodoObjectStorage'
import { createDesktopLocalProjectObjectStorage, createMemoryProjectObjectStorage } from './projectLocalObjectStorage'

const require = createRequire(import.meta.url)
const { createLocalProjectObjectStorage } = require('../../../electron/projectLocalObjectStorage.cjs') as {
  createLocalProjectObjectStorage: (rootPath: string) => {
    putObject: (objectKey: string, data: Buffer, options?: { mimeType?: string }) => Promise<boolean>
    getObject: (objectKey: string) => Promise<{ data: Buffer; mimeType: string }>
    deleteObject: (objectKey: string) => Promise<boolean>
  }
}

test('local object storage writes, reads, and deletes objects by provider-neutral keys', async () => {
  const storage = createMemoryProjectObjectStorage()
  const key = buildProjectObjectKey({ projectName: '默认项目', fileMime: 'image/png', resourceId: 'r1', extension: 'png' })

  await storage.putObject(key, new Blob(['hello'], { type: 'image/png' }))
  const read = await storage.getObject(key)
  assert.equal(await read.text(), 'hello')

  await storage.deleteObject(key)
  await assert.rejects(() => storage.getObject(key), /对象不存在/)
})

test('local object storage records failed delete keys for project cleanup', async () => {
  const storage = createMemoryProjectObjectStorage({ failDeleteKeys: new Set(['objects/p1/image/r1.png']) })
  await storage.putObject('objects/p1/image/r1.png', new Blob(['hello']))

  const result = await storage.deleteObjects(['objects/p1/image/r1.png', 'objects/p1/image/r2.png'])

  assert.deepEqual(result.deletedKeys, ['objects/p1/image/r2.png'])
  assert.deepEqual(result.failed, [{ objectKey: 'objects/p1/image/r1.png', errorMessage: '删除对象失败' }])
})

test('desktop local object storage proxies object operations through the desktop bridge', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  const stored = new Map<string, { data: ArrayBuffer; mimeType: string }>()
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      putLocalProjectObject: async (objectKey: string, data: ArrayBuffer, mimeType: string) => {
        events.push(`put:${objectKey}:${Buffer.from(data).toString('utf8')}:${mimeType}`)
        stored.set(objectKey, { data, mimeType })
        return true
      },
      getLocalProjectObject: async (objectKey: string) => {
        events.push(`get:${objectKey}`)
        const item = stored.get(objectKey)
        if (!item) throw new Error('missing object')
        return item
      },
      deleteLocalProjectObject: async (objectKey: string) => {
        events.push(`delete:${objectKey}`)
        stored.delete(objectKey)
        return true
      },
    },
  }

  try {
    const storage = createDesktopLocalProjectObjectStorage()
    await storage.putObject('objects/p1/audio/wav/r1.wav', new Blob(['voice'], { type: 'audio/wav' }))
    const read = await storage.getObject('objects/p1/audio/wav/r1.wav')
    await storage.deleteObject('objects/p1/audio/wav/r1.wav')

    assert.equal(read.type, 'audio/wav')
    assert.equal(await read.text(), 'voice')
    assert.deepEqual(events, [
      'put:objects/p1/audio/wav/r1.wav:voice:audio/wav',
      'get:objects/p1/audio/wav/r1.wav',
      'delete:objects/p1/audio/wav/r1.wav',
    ])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

test('desktop kodo object storage resolves the profile per object operation', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      putProjectKodoObject: async (profileId: string, objectKey: string, data: ArrayBuffer, mimeType: string) => {
        events.push(`put:${profileId}:${objectKey}:${Buffer.from(data).toString('utf8')}:${mimeType}`)
        return true
      },
      deleteProjectKodoObject: async (profileId: string, objectKey: string) => {
        events.push(`delete:${profileId}:${objectKey}`)
        return true
      },
    },
  }

  try {
    const profileIdsByProjectName = new Map([
      ['项目A', 'kodo-a'],
      ['项目B', 'kodo-b'],
    ])
    const storage = createDesktopKodoProjectObjectStorage((objectKey) => {
      const projectName = objectKey?.split('/')[1] ?? ''
      return profileIdsByProjectName.get(projectName) ?? ''
    })

    await storage.putObject('objects/项目A/audio_wav/r1.wav', new Blob(['voice-a'], { type: 'audio/wav' }))
    await storage.putObject('objects/项目B/image_png/r2.png', new Blob(['image-b'], { type: 'image/png' }))
    await storage.deleteObject('objects/项目A/audio_wav/r1.wav')

    assert.deepEqual(events, [
      'put:kodo-a:objects/项目A/audio_wav/r1.wav:voice-a:audio/wav',
      'put:kodo-b:objects/项目B/image_png/r2.png:image-b:image/png',
      'delete:kodo-a:objects/项目A/audio_wav/r1.wav',
    ])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

test('electron local object storage persists object bytes across storage instances', async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), 'gdt-project-objects-'))
  const objectKey = 'objects/默认_项目/image/png/r1.png'

  try {
    const first = createLocalProjectObjectStorage(rootPath)
    await first.putObject(objectKey, Buffer.from('hello'), { mimeType: 'image/png' })

    const second = createLocalProjectObjectStorage(rootPath)
    const read = await second.getObject(objectKey)
    assert.equal(read.mimeType, 'image/png')
    assert.equal(read.data.toString('utf8'), 'hello')

    await second.deleteObject(objectKey)
    await assert.rejects(() => first.getObject(objectKey), /对象不存在/)
  } finally {
    await rm(rootPath, { recursive: true, force: true })
  }
})
