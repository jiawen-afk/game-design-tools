import test from 'node:test'
import assert from 'node:assert/strict'

import {
  deleteAssetWithOptionalResources,
} from './personalSpaceResourceActions'
import {
  createMemoryDirectoryHandle,
  deleteStoredResourceFiles,
  readStoredResourceBlob,
} from './personalSpaceFileStorage'
import {
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
} from './personalSpaceModel'

test('deletes stored resource files and leaves missing files as pending cleanup', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  await root.writeText('配音素材/问候/audio.wav', 'voice')

  const result = await deleteStoredResourceFiles(root, [
    'PersonalSpace/配音素材/问候/audio.wav',
    'PersonalSpace/配音素材/问候/missing.wav',
  ])

  assert.deepEqual(result.deletedPaths, ['PersonalSpace/配音素材/问候/audio.wav'])
  assert.deepEqual(result.pendingPaths, ['PersonalSpace/配音素材/问候/missing.wav'])
  await assert.rejects(() => root.readText('配音素材/问候/audio.wav'))
})

test('deleting an asset with stored resources also deletes its cover file', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  await root.writeText('图片/2026-06-25/forest.png', 'image')
  await root.writeText('图片/2026-06-25/forest-cover.png', 'cover')
  const asset = {
    ...createPersonalSpaceAsset({
      kind: 'image',
      name: 'forest.png',
      resourcePaths: ['blob:forest'],
    }),
    storageResourcePaths: ['PersonalSpace/图片/2026-06-25/forest.png'],
    coverStorageResourcePath: 'PersonalSpace/图片/2026-06-25/forest-cover.png',
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: true },
    assets: [asset],
  }

  const result = await deleteAssetWithOptionalResources(state, asset.id, root)

  assert.equal(result.resourcesDeleted, true)
  assert.deepEqual(result.pendingDeletedPaths, [])
  await assert.rejects(() => root.readText('图片/2026-06-25/forest.png'))
  await assert.rejects(() => root.readText('图片/2026-06-25/forest-cover.png'))
})

test('reads stored resource blobs back from authorized directory paths', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  await root.writeText('配音/2026-06-06/audio.wav', 'voice')

  const blob = await readStoredResourceBlob(root, 'PersonalSpace/配音/2026-06-06/audio.wav')

  assert.equal(await blob.text(), 'voice')
})
