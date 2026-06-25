import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildProjectAssetCoverResourceRef,
  buildProjectAssetResourceRef,
  readProjectAssetResourceBlob,
  resolveProjectAssetResourceSource,
} from './projectAssetResourceResolver'
import { createMemoryProjectObjectStorage, type ProjectAssetManager } from '../ProjectStorage'
import { assetListPreviewSource, assetPrimaryPreviewSource } from './personalSpacePreviewSourceModel'

test('project asset resources can be read from provider-neutral object keys', async () => {
  const storage = createMemoryProjectObjectStorage()
  await storage.putObject('objects/远程项目/audio_wav/r1.wav', new Blob(['voice'], { type: 'audio/wav' }))

  const blob = await readProjectAssetResourceBlob(
    'objects/远程项目/audio_wav/r1.wav',
    'objects/远程项目/audio_wav/r1.wav',
    { projectObjectStorage: storage },
  )

  assert.equal(blob.type, 'audio/wav')
  assert.equal(await blob.text(), 'voice')
})

test('project asset resource sources create playable object URLs from object storage', async () => {
  const previousCreateObjectUrl = URL.createObjectURL
  const previousRevokeObjectUrl = URL.revokeObjectURL
  const created: Array<Blob | MediaSource> = []
  URL.createObjectURL = (blob) => {
    created.push(blob)
    return `blob:resolved-${created.length}`
  }
  URL.revokeObjectURL = () => {}

  try {
    const storage = createMemoryProjectObjectStorage()
    await storage.putObject('objects/远程项目/image_png/r2.png', new Blob(['sprite'], { type: 'image/png' }))

    const resolved = await resolveProjectAssetResourceSource(
      'objects/远程项目/image_png/r2.png',
      'objects/远程项目/image_png/r2.png',
      { projectObjectStorage: storage },
    )

    assert.equal(resolved?.source, 'blob:resolved-1')
    assert.equal(resolved?.objectUrl, 'blob:resolved-1')
    assert.equal(await (created[0]! as Blob).text(), 'sprite')
  } finally {
    URL.createObjectURL = previousCreateObjectUrl
    URL.revokeObjectURL = previousRevokeObjectUrl
  }
})

test('project asset resource sources do not fall back to provider object keys', async () => {
  const resolved = await resolveProjectAssetResourceSource(
    'objects/远程项目/audio_wav/missing.wav',
    'objects/远程项目/audio_wav/missing.wav',
    {
      projectObjectStorage: {
        putObject: async () => {},
        getObject: async () => {
          throw new Error('对象不存在')
        },
        deleteObject: async () => {},
        deleteObjects: async () => ({ deletedKeys: [], failed: [] }),
      },
    },
  )

  assert.equal(resolved, null)
})

test('project asset resources can be read through the asset manager', async () => {
  const ref = buildProjectAssetResourceRef({
    asset: {
      id: 'a1',
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: 'voice.wav',
      groupName: '默认分组',
      resourcePaths: ['objects/远程项目/audio_wav/r1.wav'],
      createdAt: '2026-06-24T00:00:00.000Z',
      linkedCharacterIds: [],
      linkedStoryboardIds: [],
      linkedVoiceAssetIds: [],
      storageResourcePaths: ['objects/远程项目/audio_wav/r1.wav'],
      projectResourceIds: ['r1'],
      projectResourceSizes: [5],
      projectResourceHashes: ['hash-a'],
      projectResourceMimeTypes: ['audio/wav'],
    },
    resourceIndex: 0,
    projectId: 'p1',
    projectMode: 'remote',
  })!
  const manager: ProjectAssetManager = {
    putResource: async () => {},
    getResourceBlob: async (input) => new Blob([`${input.resourceId}:${input.hashSha256}`], { type: input.mimeType ?? '' }),
    resolveResourceSource: async () => ({ source: '' }),
    deleteResources: async () => {},
    deleteProjectCache: async () => {},
  }

  const blob = await readProjectAssetResourceBlob(ref.objectKey, ref.objectKey, {
    projectAssetManager: manager,
    resourceRef: ref,
  })

  assert.equal(blob.type, 'audio/wav')
  assert.equal(await blob.text(), 'r1:hash-a')
})

test('project asset cover resources build cover refs for cached previews', async () => {
  const ref = buildProjectAssetCoverResourceRef({
    asset: {
      id: 'a1',
      kind: 'image',
      assetSubtype: 'effect',
      name: 'fire.png',
      groupName: '默认分组',
      resourcePaths: ['objects/远程项目/image_png/r1.png'],
      coverResourcePath: 'objects/远程项目/image_png/c1.png',
      createdAt: '2026-06-24T00:00:00.000Z',
      linkedCharacterIds: [],
      linkedStoryboardIds: [],
      linkedVoiceAssetIds: [],
      storageResourcePaths: ['objects/远程项目/image_png/r1.png'],
      coverStorageResourcePath: 'objects/远程项目/image_png/c1.png',
      coverProjectResourceId: 'c1',
      coverProjectResourceSize: 12,
      coverProjectResourceHash: 'cover-hash',
      coverProjectResourceMimeType: 'image/png',
    },
    projectId: 'p1',
    projectMode: 'remote',
  })!
  const manager: ProjectAssetManager = {
    putResource: async () => {},
    getResourceBlob: async (input) => new Blob([`${input.role}:${input.resourceId}:${input.hashSha256}`], { type: input.mimeType ?? '' }),
    resolveResourceSource: async () => ({ source: '' }),
    deleteResources: async () => {},
    deleteProjectCache: async () => {},
  }

  const blob = await readProjectAssetResourceBlob(ref.objectKey, ref.objectKey, {
    projectAssetManager: manager,
    resourceRef: ref,
  })

  assert.equal(ref.role, 'cover')
  assert.equal(ref.resourceId, 'c1')
  assert.equal(ref.objectKey, 'objects/远程项目/image_png/c1.png')
  assert.equal(blob.type, 'image/png')
  assert.equal(await blob.text(), 'cover:c1:cover-hash')
})

test('project list previews prefer cover resources and never fall back to primary objects in remote mode', () => {
  const asset = {
    id: 'a1',
    kind: 'image' as const,
    assetSubtype: 'effect' as const,
    name: 'fire.png',
    groupName: '默认分组',
    resourcePaths: ['objects/远程项目/image_png/primary.png'],
    createdAt: '2026-06-24T00:00:00.000Z',
    linkedCharacterIds: [],
    linkedStoryboardIds: [],
    linkedVoiceAssetIds: [],
    storageResourcePaths: ['objects/远程项目/image_png/primary.png'],
  }

  assert.equal(assetListPreviewSource({
    ...asset,
    coverResourcePath: 'objects/远程项目/image_png/cover.png',
  }, { projectMode: 'remote' }), 'objects/远程项目/image_png/cover.png')
  assert.equal(assetListPreviewSource(asset, { projectMode: 'remote' }), '')
  assert.equal(assetListPreviewSource(asset, { projectMode: 'local' }), 'objects/远程项目/image_png/primary.png')
  assert.equal(assetPrimaryPreviewSource(asset), 'objects/远程项目/image_png/primary.png')
})
