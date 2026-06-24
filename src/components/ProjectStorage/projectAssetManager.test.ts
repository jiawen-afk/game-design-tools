import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createMemoryProjectAssetCacheStorage,
  createProjectAssetFingerprint,
  createProjectAssetManager,
  type ProjectAssetResourceRef,
} from './projectAssetManager'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'

function remoteRef(overrides: Partial<ProjectAssetResourceRef> = {}): ProjectAssetResourceRef {
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

test('project asset fingerprint prefers sha256 hash', () => {
  assert.equal(createProjectAssetFingerprint(remoteRef({ hashSha256: 'abc', sizeBytes: 123 })), 'sha256:abc')
})

test('project asset fingerprint falls back to object key and size', () => {
  assert.equal(
    createProjectAssetFingerprint(remoteRef({ hashSha256: null, sizeBytes: 123 })),
    'weak:objects/项目A/image_png/r1.png:123',
  )
})

test('project asset fingerprint falls back to object key', () => {
  assert.equal(
    createProjectAssetFingerprint(remoteRef({ hashSha256: null, sizeBytes: null })),
    'weak:objects/项目A/image_png/r1.png',
  )
})

test('remote manager returns cached blob when object key and fingerprint match', async () => {
  const localObjectStorage = createMemoryProjectObjectStorage()
  const remoteObjectStorage = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const manager = createProjectAssetManager({ localObjectStorage, remoteObjectStorage, cacheStorage })
  const ref = remoteRef()
  await cacheStorage.putCachedResource(ref, createProjectAssetFingerprint(ref), new Blob(['cache'], { type: 'image/png' }))
  await remoteObjectStorage.putObject(ref.objectKey, new Blob(['remote'], { type: 'image/png' }))

  const blob = await manager.getResourceBlob(ref)

  assert.equal(await blob.text(), 'cache')
})

test('remote manager downloads and caches when cache is missing', async () => {
  const localObjectStorage = createMemoryProjectObjectStorage()
  const remoteObjectStorage = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const manager = createProjectAssetManager({ localObjectStorage, remoteObjectStorage, cacheStorage })
  const ref = remoteRef()
  await remoteObjectStorage.putObject(ref.objectKey, new Blob(['remote'], { type: 'image/png' }))

  const blob = await manager.getResourceBlob(ref)
  const cached = await cacheStorage.getCachedResource(ref, createProjectAssetFingerprint(ref))

  assert.equal(await blob.text(), 'remote')
  assert.equal(await cached!.text(), 'remote')
})

test('remote manager replaces stale cache when fingerprint changes', async () => {
  const localObjectStorage = createMemoryProjectObjectStorage()
  const remoteObjectStorage = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const manager = createProjectAssetManager({ localObjectStorage, remoteObjectStorage, cacheStorage })
  const oldRef = remoteRef({ hashSha256: 'old' })
  const newRef = remoteRef({ hashSha256: 'new' })
  await cacheStorage.putCachedResource(oldRef, createProjectAssetFingerprint(oldRef), new Blob(['old-cache']))
  await remoteObjectStorage.putObject(newRef.objectKey, new Blob(['new-remote'], { type: 'image/png' }))

  const blob = await manager.getResourceBlob(newRef)
  const stale = await cacheStorage.getCachedResource(oldRef, createProjectAssetFingerprint(oldRef))
  const fresh = await cacheStorage.getCachedResource(newRef, createProjectAssetFingerprint(newRef))

  assert.equal(await blob.text(), 'new-remote')
  assert.equal(stale, null)
  assert.equal(await fresh!.text(), 'new-remote')
})

test('remote manager does not return stale cache when remote download fails', async () => {
  const localObjectStorage = createMemoryProjectObjectStorage()
  const remoteObjectStorage = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const manager = createProjectAssetManager({ localObjectStorage, remoteObjectStorage, cacheStorage })
  const oldRef = remoteRef({ hashSha256: 'old' })
  const newRef = remoteRef({ hashSha256: 'new' })
  await cacheStorage.putCachedResource(oldRef, createProjectAssetFingerprint(oldRef), new Blob(['old-cache']))

  await assert.rejects(() => manager.getResourceBlob(newRef), /对象不存在/)
})

test('remote putResource uploads to remote storage and writes cache after upload', async () => {
  const localObjectStorage = createMemoryProjectObjectStorage()
  const remoteObjectStorage = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const manager = createProjectAssetManager({ localObjectStorage, remoteObjectStorage, cacheStorage })
  const ref = remoteRef()

  await manager.putResource(ref, new Blob(['created'], { type: 'image/png' }))

  assert.equal(await (await remoteObjectStorage.getObject(ref.objectKey)).text(), 'created')
  assert.equal(await (await cacheStorage.getCachedResource(ref, createProjectAssetFingerprint(ref)))!.text(), 'created')
})

test('local manager bypasses cache and uses local object storage', async () => {
  const localObjectStorage = createMemoryProjectObjectStorage()
  const remoteObjectStorage = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const manager = createProjectAssetManager({ localObjectStorage, remoteObjectStorage, cacheStorage })
  const ref = remoteRef({ projectMode: 'local' })

  await manager.putResource(ref, new Blob(['local'], { type: 'image/png' }))
  const blob = await manager.getResourceBlob(ref)

  assert.equal(await blob.text(), 'local')
  assert.equal(await cacheStorage.getCachedResource(ref, createProjectAssetFingerprint(ref)), null)
})

test('manager deletes resource cache entries', async () => {
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const remoteObjectStorage = createMemoryProjectObjectStorage()
  const manager = createProjectAssetManager({
    localObjectStorage: createMemoryProjectObjectStorage(),
    remoteObjectStorage,
    cacheStorage,
  })
  const ref = remoteRef()
  await remoteObjectStorage.putObject(ref.objectKey, new Blob(['remote-object']))
  await cacheStorage.putCachedResource(ref, createProjectAssetFingerprint(ref), new Blob(['cache']))

  await manager.deleteResources([ref])

  assert.equal(await cacheStorage.getCachedResource(ref, createProjectAssetFingerprint(ref)), null)
  await assert.rejects(() => remoteObjectStorage.getObject(ref.objectKey), /对象不存在/)
})

test('manager deletes local object resources for local projects', async () => {
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const localObjectStorage = createMemoryProjectObjectStorage()
  const manager = createProjectAssetManager({
    localObjectStorage,
    remoteObjectStorage: createMemoryProjectObjectStorage(),
    cacheStorage,
  })
  const ref = remoteRef({ projectMode: 'local', objectKey: 'objects/本地项目/audio_wav/r1.wav' })
  await localObjectStorage.putObject(ref.objectKey, new Blob(['local-object']))

  await manager.deleteResources([ref])

  await assert.rejects(() => localObjectStorage.getObject(ref.objectKey), /对象不存在/)
})

test('manager deletes all cache entries for a project', async () => {
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const manager = createProjectAssetManager({
    localObjectStorage: createMemoryProjectObjectStorage(),
    remoteObjectStorage: createMemoryProjectObjectStorage(),
    cacheStorage,
  })
  const ref = remoteRef()
  const other = remoteRef({ projectId: 'p2', resourceId: 'r2', objectKey: 'objects/项目B/image_png/r2.png' })
  await cacheStorage.putCachedResource(ref, createProjectAssetFingerprint(ref), new Blob(['cache-a']))
  await cacheStorage.putCachedResource(other, createProjectAssetFingerprint(other), new Blob(['cache-b']))

  await manager.deleteProjectCache('p1')

  assert.equal(await cacheStorage.getCachedResource(ref, createProjectAssetFingerprint(ref)), null)
  assert.equal(await (await cacheStorage.getCachedResource(other, createProjectAssetFingerprint(other)))!.text(), 'cache-b')
})

test('remote manager deduplicates concurrent downloads for same fingerprint', async () => {
  const localObjectStorage = createMemoryProjectObjectStorage()
  const remoteObjectStorage = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  let reads = 0
  const originalGetObject = remoteObjectStorage.getObject.bind(remoteObjectStorage)
  remoteObjectStorage.getObject = async (objectKey: string) => {
    reads += 1
    await new Promise((resolve) => setTimeout(resolve, 10))
    return originalGetObject(objectKey)
  }
  const manager = createProjectAssetManager({ localObjectStorage, remoteObjectStorage, cacheStorage })
  const ref = remoteRef()
  await remoteObjectStorage.putObject(ref.objectKey, new Blob(['remote'], { type: 'image/png' }))

  const [first, second] = await Promise.all([
    manager.getResourceBlob(ref),
    manager.getResourceBlob(ref),
  ])

  assert.equal(await first.text(), 'remote')
  assert.equal(await second.text(), 'remote')
  assert.equal(reads, 1)
})
