import test from 'node:test'
import assert from 'node:assert/strict'

import {
  archiveAssetForStorageDirectory,
  createPersonalSpaceAsset,
  createPortraitAssetFromUpload,
  createSpriteAssetFromExport,
  defaultPersonalSpaceState,
  deletePersonalSpaceAsset,
  personalSpaceStorageKey,
  readPersonalSpaceState,
} from './personalSpaceModel'

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

test('stored personal space state migrates legacy character and storyboard asset id lists', () => {
  const storage = createMemoryStorage({
    [personalSpaceStorageKey]: JSON.stringify({
      settings: { storageDirectory: 'D:\\assets', deleteResourcesWithContent: true },
      assets: [createPersonalSpaceAsset({ kind: 'voice', name: '旧配音' })],
      characters: [{
        id: 'c1',
        name: '旧角色',
        order: 0,
        portraitAssetIds: ['p1'],
        spriteAssetIds: ['s1'],
        voiceAssetIds: ['v1'],
      }],
      storyboardGroups: [{
        id: 'g1',
        name: '旧剧情',
        characterIds: ['c1'],
        voiceAssetIds: ['v1'],
      }],
    }),
  })

  const state = readPersonalSpaceState(storage)

  assert.deepEqual(state.characters[0]!.portraitAssets.map((item) => item.assetId), ['p1'])
  assert.deepEqual(state.characters[0]!.spriteAssets.map((item) => item.assetId), ['s1'])
  assert.deepEqual(state.characters[0]!.voiceAssets.map((item) => item.assetId), ['v1'])
  assert.deepEqual(state.storyboardGroups[0]!.voiceEntries.map((item) => item.assetId), ['v1'])
})

test('assets archived with a storage directory receive categorized target paths', () => {
  const sprite = {
    ...createSpriteAssetFromExport({
      name: 'hero.png',
      spritePath: 'blob:sprite',
      indexPath: 'blob:index',
    }),
    createdAt: '2026-06-06T12:00:00.000Z',
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
    assets: [],
  }

  const archived = archiveAssetForStorageDirectory(state, sprite)

  assert.equal(archived.storageResourcePaths.length, sprite.resourcePaths.length)
  assert.match(archived.storageResourcePaths[0]!, /^D:\\GameAssets\\精灵图\\2026-06-06\\[a-f0-9]{16}\.png$/)
  assert.match(archived.storageResourcePaths[1]!, /^D:\\GameAssets\\精灵图\\2026-06-06\\[a-f0-9]{16}\.json$/)
  assert.doesNotMatch(archived.storageResourcePaths.join('\n'), /hero|index/)
})

test('portrait assets archived with a storage directory use the character portrait category', () => {
  const portrait = {
    ...createPortraitAssetFromUpload({
      name: 'hero-face.png',
      portraitPath: 'blob:portrait',
    }),
    createdAt: '2026-06-06T12:00:00.000Z',
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
    assets: [],
  }

  const archived = archiveAssetForStorageDirectory(state, portrait)

  assert.equal(archived.name, 'hero-face.png')
  assert.equal(archived.storageResourcePaths.length, portrait.resourcePaths.length)
  assert.match(archived.storageResourcePaths[0]!, /^D:\\GameAssets\\角色肖像\\2026-06-06\\[a-f0-9]{16}\.png$/)
  assert.doesNotMatch(archived.storageResourcePaths[0]!, /hero-face/)
})

test('deleting assets with resource deletion enabled records stored resource paths for cleanup', () => {
  const voice = {
    ...createPersonalSpaceAsset({ kind: 'voice', name: '问候' }),
    storageResourcePaths: ['D:\\GameAssets\\配音素材\\问候\\audio.wav'],
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: true },
    assets: [voice],
    pendingDeletedResourcePaths: [],
  }

  const deleted = deletePersonalSpaceAsset(state, voice.id)

  assert.deepEqual(deleted.assets, [])
  assert.deepEqual(deleted.pendingDeletedResourcePaths, ['D:\\GameAssets\\配音素材\\问候\\audio.wav'])
})

test('deleting image assets with resource deletion enabled records cover paths for cleanup', () => {
  const image = {
    ...createPersonalSpaceAsset({ kind: 'image', name: 'forest.png' }),
    storageResourcePaths: ['D:\\GameAssets\\图片\\forest.png'],
    coverStorageResourcePath: 'D:\\GameAssets\\图片\\forest-cover.png',
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: true },
    assets: [image],
    pendingDeletedResourcePaths: [],
  }

  const deleted = deletePersonalSpaceAsset(state, image.id)

  assert.deepEqual(deleted.assets, [])
  assert.deepEqual(deleted.pendingDeletedResourcePaths, [
    'D:\\GameAssets\\图片\\forest.png',
    'D:\\GameAssets\\图片\\forest-cover.png',
  ])
})

test('deleting assets after resource cleanup removes links without recording pending cleanup', () => {
  const voice = {
    ...createPersonalSpaceAsset({ kind: 'voice', name: '问候' }),
    storageResourcePaths: ['D:\\GameAssets\\配音素材\\问候\\audio.wav'],
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: true },
    assets: [voice],
    pendingDeletedResourcePaths: [],
  }

  const deleted = deletePersonalSpaceAsset(state, voice.id, { resourcesDeleted: true })

  assert.deepEqual(deleted.assets, [])
  assert.deepEqual(deleted.pendingDeletedResourcePaths, [])
})
