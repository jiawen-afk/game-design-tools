import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createSpriteAssetForUpload,
} from './personalSpaceResourceActions'
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
  defaultPersonalSpaceState,
} from './personalSpaceModel'

test('writes asset resources into category and import-date folders with hashed names', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const asset = {
    ...createSpriteAssetFromExport({
    name: '主角行走',
    spritePath: 'blob:sprite',
    indexPath: 'blob:index',
    }),
    createdAt: '2026-06-06T12:00:00.000Z',
  }

  const stored = await writeAssetResourcesToDirectory(root, asset, [
    { name: 'sprite.png', data: new Blob(['png']) },
    { name: 'index.json', data: new Blob(['{}'], { type: 'application/json' }) },
  ])

  assert.equal(stored.storageResourcePaths.length, 2)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/精灵图\/2026-06-06\/[a-f0-9]{16}\.png$/)
  assert.match(stored.storageResourcePaths[1]!, /^PersonalSpace\/精灵图\/2026-06-06\/[a-f0-9]{16}\.json$/)
  assert.doesNotMatch(stored.storageResourcePaths.join('\n'), /主角行走|sprite|index/)
  assert.equal(await root.readText(stored.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), 'png')
  assert.equal(await root.readText(stored.storageResourcePaths[1]!.replace(/^PersonalSpace\//, '')), '{}')
})

test('uploaded character sprite resources require png and index json, keep original asset name, and use hashed storage names', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
  }

  const stored = await createSpriteAssetForUpload(state, [
    new File(['png'], 'hero.png', { type: 'image/png' }),
    new File(['{}'], 'index.json', { type: 'application/json' }),
  ], root)

  assert.equal(stored.kind, 'sprite')
  assert.equal(stored.name, 'hero.png')
  assert.equal(stored.groupName, '默认分组')
  assert.equal(stored.storageResourcePaths.length, 2)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/精灵图\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.png$/)
  assert.match(stored.storageResourcePaths[1]!, /^PersonalSpace\/精灵图\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.json$/)
  assert.doesNotMatch(stored.storageResourcePaths.join('\n'), /hero\.png|index\.json/)
  assert.equal(await root.readText(stored.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), 'png')
  assert.equal(await root.readText(stored.storageResourcePaths[1]!.replace(/^PersonalSpace\//, '')), '{}')
  await assert.rejects(
    () => createSpriteAssetForUpload(state, [new File(['{}'], 'index.json')], null),
    /请选择一个 PNG 精灵图和一个 index\.json/,
  )
})

test('uploaded portrait resources are stored under the portrait category', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const asset = {
    ...createPortraitAssetFromUpload({
    name: 'hero-face.png',
    portraitPath: 'blob:portrait',
    }),
    createdAt: '2026-06-06T12:00:00.000Z',
  }

  const stored = await writeAssetResourcesToDirectory(root, asset, [
    { name: 'portrait.png', data: new Blob(['portrait']) },
  ])

  assert.equal(stored.name, 'hero-face.png')
  assert.equal(stored.storageResourcePaths.length, 1)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/角色肖像\/2026-06-06\/[a-f0-9]{16}\.png$/)
  assert.doesNotMatch(stored.storageResourcePaths[0]!, /hero-face/)
  assert.equal(await root.readText(stored.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), 'portrait')
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
