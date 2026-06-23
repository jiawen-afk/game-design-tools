import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildProjectAssetResourceRef,
  readProjectAssetResourceBlob,
  resolveProjectAssetResourceSource,
} from './projectAssetResourceResolver'
import { createMemoryProjectObjectStorage, type ProjectAssetManager } from '../ProjectStorage'

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
