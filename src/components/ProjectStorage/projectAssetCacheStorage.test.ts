import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fsp from 'node:fs/promises'
import { createRequire } from 'node:module'

import type { ProjectAssetResourceRef } from './projectAssetManager'

const require = createRequire(import.meta.url)
const {
  createProjectAssetCacheStorage,
  resolveProjectAssetCachePath,
} = require('../../../electron/projectAssetCacheStorage.cjs') as {
  createProjectAssetCacheStorage: (rootPath: string) => {
    getCachedResource: (ref: ProjectAssetResourceRef, expectedFingerprint: string) => Promise<{ data: Buffer; mimeType: string } | null>
    putCachedResource: (ref: ProjectAssetResourceRef, fingerprint: string, data: Buffer, options?: { mimeType?: string }) => Promise<boolean>
    deleteCachedResource: (ref: ProjectAssetResourceRef) => Promise<boolean>
    deleteProjectCache: (projectId: string) => Promise<boolean>
  }
  resolveProjectAssetCachePath: (rootPath: string, ref: Pick<ProjectAssetResourceRef, 'projectId' | 'role' | 'resourceId'>) => string
}

function ref(overrides: Partial<ProjectAssetResourceRef> = {}): ProjectAssetResourceRef {
  return {
    projectId: 'p1',
    projectMode: 'remote',
    assetId: 'a1',
    resourceId: 'r1',
    role: 'primary',
    objectKey: 'objects/项目A/image_png/r1.png',
    mimeType: 'image/png',
    sizeBytes: 5,
    hashSha256: 'hash-a',
    ...overrides,
  }
}

async function tempRoot() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'gdt-cache-'))
}

test('filesystem cache writes data and metadata and returns matching cache', async () => {
  const root = await tempRoot()
  const storage = createProjectAssetCacheStorage(root)
  const assetRef = ref()

  await storage.putCachedResource(assetRef, 'sha256:hash-a', Buffer.from('cache'), { mimeType: 'image/png' })
  const read = await storage.getCachedResource(assetRef, 'sha256:hash-a')
  const cachePath = resolveProjectAssetCachePath(root, assetRef)
  const meta = JSON.parse(await fsp.readFile(path.join(cachePath, 'meta.json'), 'utf8'))

  assert.equal(read!.data.toString('utf8'), 'cache')
  assert.equal(read!.mimeType, 'image/png')
  assert.equal(meta.objectKey, assetRef.objectKey)
  assert.equal(meta.fingerprint, 'sha256:hash-a')
})

test('filesystem cache accepts cover resources as independent cache entries', async () => {
  const root = await tempRoot()
  const storage = createProjectAssetCacheStorage(root)
  const coverRef = ref({
    resourceId: 'cover1',
    role: 'cover',
    objectKey: 'objects/项目A/image_png/cover1.png',
  })

  await storage.putCachedResource(coverRef, 'sha256:cover', Buffer.from('cover'), { mimeType: 'image/png' })
  const read = await storage.getCachedResource(coverRef, 'sha256:cover')
  const cachePath = resolveProjectAssetCachePath(root, coverRef)

  assert.match(cachePath.replace(/\\/g, '/'), /\/cover\/cover1$/)
  assert.equal(read!.data.toString('utf8'), 'cover')
})

test('filesystem cache returns null when object key or fingerprint mismatches', async () => {
  const root = await tempRoot()
  const storage = createProjectAssetCacheStorage(root)
  const assetRef = ref()
  await storage.putCachedResource(assetRef, 'sha256:hash-a', Buffer.from('cache'))

  assert.equal(await storage.getCachedResource(assetRef, 'sha256:other'), null)
  assert.equal(await storage.getCachedResource(ref({ objectKey: 'objects/项目A/image_png/r1-new.png' }), 'sha256:hash-a'), null)
})

test('filesystem cache rejects path traversal identifiers', async () => {
  const root = await tempRoot()
  const storage = createProjectAssetCacheStorage(root)

  await assert.rejects(
    () => storage.putCachedResource(ref({ resourceId: '../escape' }), 'sha256:hash-a', Buffer.from('cache')),
    /不能包含相对路径/,
  )
})

test('filesystem cache project deletion removes only target project cache', async () => {
  const root = await tempRoot()
  const storage = createProjectAssetCacheStorage(root)
  const first = ref()
  const second = ref({ projectId: 'p2', resourceId: 'r2', objectKey: 'objects/项目B/image_png/r2.png' })
  await storage.putCachedResource(first, 'sha256:hash-a', Buffer.from('cache-a'))
  await storage.putCachedResource(second, 'sha256:hash-a', Buffer.from('cache-b'))

  await storage.deleteProjectCache('p1')

  assert.equal(await storage.getCachedResource(first, 'sha256:hash-a'), null)
  assert.equal((await storage.getCachedResource(second, 'sha256:hash-a'))!.data.toString('utf8'), 'cache-b')
})
