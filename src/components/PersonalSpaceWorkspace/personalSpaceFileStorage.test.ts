import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createMemoryDirectoryHandle,
  deleteStoredResourceFiles,
  loadPersistedPersonalSpaceDirectoryHandle,
  persistPersonalSpaceDirectoryHandle,
  writeJsonFileToDirectory,
  writeAssetResourcesToDirectory,
} from './personalSpaceFileStorage'
import {
  createPortraitAssetFromUpload,
  createSpriteAssetFromExport,
} from './personalSpaceModel'

test('writes asset resources into category and asset folders', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const asset = createSpriteAssetFromExport({
    name: '主角行走',
    spritePath: 'blob:sprite',
    indexPath: 'blob:index',
  })

  const stored = await writeAssetResourcesToDirectory(root, asset, [
    { name: 'sprite.png', data: new Blob(['png']) },
    { name: 'index.json', data: new Blob(['{}'], { type: 'application/json' }) },
  ])

  assert.deepEqual(stored.storageResourcePaths, [
    'PersonalSpace/角色精灵图/主角行走/sprite.png',
    'PersonalSpace/角色精灵图/主角行走/index.json',
  ])
  assert.equal(await root.readText('角色精灵图/主角行走/sprite.png'), 'png')
  assert.equal(await root.readText('角色精灵图/主角行走/index.json'), '{}')
})

test('uploaded portrait resources are stored under the portrait category', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const asset = createPortraitAssetFromUpload({
    name: '主角头像',
    portraitPath: 'blob:portrait',
  })

  const stored = await writeAssetResourcesToDirectory(root, asset, [
    { name: 'portrait.png', data: new Blob(['portrait']) },
  ])

  assert.deepEqual(stored.storageResourcePaths, [
    'PersonalSpace/角色肖像/主角头像/portrait.png',
  ])
  assert.equal(await root.readText('角色肖像/主角头像/portrait.png'), 'portrait')
})

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

test('writes storyboard reference json into the storyboard export folder', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')

  const storedPath = await writeJsonFileToDirectory(root, ['剧情编排资产'], 'storyboard-开场.json', {
    group: { name: '开场' },
  })

  assert.equal(storedPath, 'PersonalSpace/剧情编排资产/storyboard-开场.json')
  assert.equal(await root.readText('剧情编排资产/storyboard-开场.json'), JSON.stringify({ group: { name: '开场' } }, null, 2))
})

test('persists and restores the authorized personal space directory handle', async () => {
  const handles = new Map<string, unknown>()
  const store = {
    get: async (key: string) => handles.get(key) ?? null,
    set: async (key: string, value: unknown) => { handles.set(key, value) },
  }
  const root = createMemoryDirectoryHandle('PersonalSpace')

  await persistPersonalSpaceDirectoryHandle(root, store)
  const restored = await loadPersistedPersonalSpaceDirectoryHandle(store)

  assert.equal(restored, root)
})

test('restored directory handles must allow readwrite access', async () => {
  const denied = {
    ...createMemoryDirectoryHandle('PersonalSpace'),
    queryPermission: async () => 'denied' as PermissionState,
    requestPermission: async () => 'denied' as PermissionState,
  }
  const store = {
    get: async () => denied,
    set: async () => {},
  }

  const restored = await loadPersistedPersonalSpaceDirectoryHandle(store)

  assert.equal(restored, null)
})
