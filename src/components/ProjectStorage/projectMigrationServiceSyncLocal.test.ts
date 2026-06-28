import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCharacterProfile,
  assignAssetToCharacterColumn,
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { createMemoryDirectoryHandle } from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import {
  migrateLocalProjectToRemote,
  syncProjectSpaceStateToLocalProjectStorage,
} from './projectMigrationService'
import {
  createSyncSpriteAsset,
  createSyncVoiceAsset,
  writeSpriteAndVoiceFiles,
} from './projectMigrationServiceSyncTestHelpers.test'
import { createMemoryProjectRepository } from './projectSqliteRepository'

test('syncing the active project snapshot before migration persists characters, sprites, voices, and object bytes', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const remoteObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await local.initializeSchema()
  await remote.initializeSchema()
  await writeSpriteAndVoiceFiles(directory)

  const sprite = createSyncSpriteAsset()
  const voice = createSyncVoiceAsset({ dialogueText: '欢迎来到我的商店。' })
  let state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
    assets: [sprite, voice],
  }
  state = addCharacterProfile(state, '商人')
  const characterId = state.characters[0]!.id
  state = assignAssetToCharacterColumn(state, characterId, sprite.id, 'sprite')
  state = assignAssetToCharacterColumn(state, characterId, voice.id, 'voice')

  await syncProjectSpaceStateToLocalProjectStorage({
    projectId: 'p1',
    projectName: '默认项目',
    localObjectRoot: 'D:\\GameAssets',
    state,
    localRepository: local,
    localObjectStorage: localObjects,
    directoryHandle: directory,
    now: '2026-06-23T01:00:00.000Z',
  })

  const localRows = await local.exportProjectRows('p1')
  assert.ok(localRows)
  assert.deepEqual(localRows.characters.map((character) => character.name), ['商人'])
  assert.deepEqual(localRows.characterAssetLinks.map((link) => link.column_kind).sort(), ['sprite', 'voice'])
  const migratedSprite = localRows.assets.find((asset) => asset.kind === 'sprite')!
  const migratedVoice = localRows.assets.find((asset) => asset.kind === 'voice')!
  assert.equal(await (await localObjects.getObject(migratedSprite.primary_object_key)).text(), 'sprite-bytes')
  assert.equal(await (await localObjects.getObject(migratedSprite.sprite_index_object_key!)).text(), '{"frames":[]}')
  assert.equal(await (await localObjects.getObject(migratedVoice.primary_object_key)).text(), 'voice-bytes')
  assert.equal(migratedSprite.primary_size_bytes, 'sprite-bytes'.length)
  assert.equal(migratedSprite.sprite_index_size_bytes, '{"frames":[]}'.length)
  assert.equal(migratedVoice.primary_size_bytes, 'voice-bytes'.length)

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    sourceObjectStorage: localObjects,
    remoteObjectStorage: remoteObjects,
    now: '2026-06-23T02:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  const remoteRows = await remote.exportProjectRows('p1')
  assert.ok(remoteRows)
  assert.equal(remoteRows.assets.length, 2)
  assert.deepEqual(remoteRows.characters.map((character) => character.name), ['商人'])
  assert.deepEqual(remoteRows.characterAssetLinks.map((link) => link.column_kind).sort(), ['sprite', 'voice'])
  assert.equal(await (await remoteObjects.getObject(migratedSprite.primary_object_key)).text(), 'sprite-bytes')
  assert.equal(await (await remoteObjects.getObject(migratedSprite.sprite_index_object_key!)).text(), '{"frames":[]}')
  assert.equal(await (await remoteObjects.getObject(migratedVoice.primary_object_key)).text(), 'voice-bytes')
})

test('syncing project snapshot preserves resource bytes when voices precede sprites', async () => {
  const local = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await local.initializeSchema()
  await writeSpriteAndVoiceFiles(directory)

  const sprite = createSyncSpriteAsset()
  const voice = createSyncVoiceAsset()
  const state = {
    ...defaultPersonalSpaceState,
    assets: [voice, sprite],
  }

  await syncProjectSpaceStateToLocalProjectStorage({
    projectId: 'p1',
    projectName: '默认项目',
    localObjectRoot: 'D:\\GameAssets',
    state,
    localRepository: local,
    localObjectStorage: localObjects,
    directoryHandle: directory,
    now: '2026-06-23T01:00:00.000Z',
  })

  const localRows = await local.exportProjectRows('p1')
  assert.ok(localRows)
  const migratedSprite = localRows.assets.find((asset) => asset.kind === 'sprite')!
  const migratedVoice = localRows.assets.find((asset) => asset.kind === 'voice')!
  assert.equal(await (await localObjects.getObject(migratedSprite.primary_object_key)).text(), 'sprite-bytes')
  assert.equal(await (await localObjects.getObject(migratedSprite.sprite_index_object_key!)).text(), '{"frames":[]}')
  assert.equal(await (await localObjects.getObject(migratedVoice.primary_object_key)).text(), 'voice-bytes')
})

test('syncing project snapshot persists image cover object bytes', async () => {
  const local = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await local.initializeSchema()
  await directory.writeText('图片/2026-06-23/fire.png', 'image-bytes')
  await directory.writeText('图片/2026-06-23/fire-cover.png', 'cover-bytes')

  const image = {
    ...createPersonalSpaceAsset({
      kind: 'image',
      assetSubtype: 'effect',
      name: '火球',
      resourcePaths: ['blob:expired-image'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: ['ProjectRoot/图片/2026-06-23/fire.png'],
    coverResourcePath: 'blob:expired-cover',
    coverStorageResourcePath: 'ProjectRoot/图片/2026-06-23/fire-cover.png',
  }

  await syncProjectSpaceStateToLocalProjectStorage({
    projectId: 'p1',
    projectName: '默认项目',
    localObjectRoot: 'D:\\GameAssets',
    state: { ...defaultPersonalSpaceState, assets: [image] },
    localRepository: local,
    localObjectStorage: localObjects,
    directoryHandle: directory,
    now: '2026-06-23T01:00:00.000Z',
  })

  const rows = await local.exportProjectRows('p1')
  assert.ok(rows)
  const asset = rows.assets[0]!
  assert.equal(await (await localObjects.getObject(asset.primary_object_key)).text(), 'image-bytes')
  assert.equal(await (await localObjects.getObject(asset.cover_object_key!)).text(), 'cover-bytes')
  assert.equal(asset.cover_size_bytes, 'cover-bytes'.length)
})
