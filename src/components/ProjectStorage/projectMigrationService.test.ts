import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
  updatePersonalSpaceAsset,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { createMemoryDirectoryHandle } from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import {
  hardDeleteProjectWithObjects,
  migrateLocalProjectToRemote,
  syncProjectSpaceStateToLocalProjectStorage,
} from './projectMigrationService'
import { createMemoryProjectRepository } from './projectSqliteRepository'

test('local to remote migration keeps project local when object upload fails', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [voice] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  await local.importProjectRows(rows)

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async () => { throw new Error('upload failed') },
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(result.status, 'failed')
  assert.equal((await local.getProject('p1'))!.project.mode, 'local')
  assert.deepEqual(await remote.listProjects(), [])
})

test('local to remote migration imports project rows and switches remote settings after upload succeeds', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
  const sprite = createPersonalSpaceAsset({
    kind: 'sprite',
    assetSubtype: 'character_sprite',
    name: '行走',
    resourcePaths: ['walk.png', 'index.json'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [sprite] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  await local.importProjectRows(rows)
  const uploadedKeys: string[] = []

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async (objectKey) => { uploadedKeys.push(objectKey) },
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  assert.deepEqual(uploadedKeys, [
    rows.assets[0]!.primary_object_key,
    rows.assets[0]!.sprite_index_object_key,
  ])
  const remoteProject = await remote.getProject('p1')
  assert.equal(remoteProject!.project.mode, 'remote')
  assert.equal(remoteProject!.settings.storage_provider, 'qiniu_kodo')
  assert.notEqual(remoteProject!.settings.database_provider, 'sqlite')
  assert.equal(remoteProject!.settings.remote_database_profile_id, 'db1')
  assert.equal(remoteProject!.settings.remote_storage_profile_id, 'kodo1')
  assert.equal(remoteProject!.settings.local_object_root, null)
  assert.equal((await remote.listAssets('p1')).length, 1)
})

test('local to remote migration persists remote mode back to the local project snapshot', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [voice] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  await local.importProjectRows(rows)

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async () => {},
    remoteDatabaseProvider: 'mysql',
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  const localSnapshot = await local.getProject('p1')
  assert.equal(localSnapshot!.project.mode, 'remote')
  assert.equal(localSnapshot!.settings.storage_provider, 'qiniu_kodo')
  assert.equal(localSnapshot!.settings.database_provider, 'mysql')
  assert.equal(localSnapshot!.settings.remote_database_profile_id, 'db1')
  assert.equal(localSnapshot!.settings.remote_storage_profile_id, 'kodo1')
  assert.equal(localSnapshot!.settings.local_object_root, null)
})

test('local to remote migration copies object bytes from local storage to remote storage', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const remoteObjects = createMemoryProjectObjectStorage()
  await local.initializeSchema()
  await remote.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [voice] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  await local.importProjectRows(rows)
  const objectKey = rows.assets[0]!.primary_object_key
  await localObjects.putObject(objectKey, new Blob(['voice-bytes'], { type: 'audio/wav' }))

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    sourceObjectStorage: localObjects,
    remoteObjectStorage: remoteObjects,
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  assert.equal(await (await remoteObjects.getObject(objectKey)).text(), 'voice-bytes')
})

test('syncing the active project snapshot before migration persists characters, sprites, voices, and object bytes', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const remoteObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await local.initializeSchema()
  await remote.initializeSchema()
  await directory.writeText('精灵图/2026-06-23/walk.png', 'sprite-bytes')
  await directory.writeText('精灵图/2026-06-23/index.json', '{"frames":[]}')
  await directory.writeText('配音/2026-06-23/welcome.wav', 'voice-bytes')

  const sprite = {
    ...createPersonalSpaceAsset({
      kind: 'sprite',
      assetSubtype: 'character_sprite',
      name: '行走',
      resourcePaths: ['blob:expired-sprite', 'blob:expired-index'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: [
      'ProjectRoot/精灵图/2026-06-23/walk.png',
      'ProjectRoot/精灵图/2026-06-23/index.json',
    ],
  }
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      dialogueText: '欢迎来到我的商店。',
      resourcePaths: ['blob:expired-voice'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: ['ProjectRoot/配音/2026-06-23/welcome.wav'],
  }
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
  await directory.writeText('精灵图/2026-06-23/walk.png', 'sprite-bytes')
  await directory.writeText('精灵图/2026-06-23/index.json', '{"frames":[]}')
  await directory.writeText('配音/2026-06-23/welcome.wav', 'voice-bytes')

  const sprite = {
    ...createPersonalSpaceAsset({
      kind: 'sprite',
      assetSubtype: 'character_sprite',
      name: '行走',
      resourcePaths: ['blob:expired-sprite', 'blob:expired-index'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: [
      'ProjectRoot/精灵图/2026-06-23/walk.png',
      'ProjectRoot/精灵图/2026-06-23/index.json',
    ],
  }
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      resourcePaths: ['blob:expired-voice'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: ['ProjectRoot/配音/2026-06-23/welcome.wav'],
  }
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

test('syncing project snapshot can persist directly to remote repository and object storage', async () => {
  const remote = createMemoryProjectRepository()
  const remoteObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await remote.initializeSchema()
  await remote.createRemoteProject({
    id: 'p1',
    name: '远程项目',
    description: '团队资产',
    databaseProvider: 'postgresql',
    databaseProfileId: 'db1',
    storageProfileId: 'kodo1',
    now: '2026-06-23T00:00:00.000Z',
  })
  await directory.writeText('配音/2026-06-23/welcome.wav', 'voice-bytes')
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      resourcePaths: ['blob:expired-voice'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: ['ProjectRoot/配音/2026-06-23/welcome.wav'],
  }
  const state = {
    ...defaultPersonalSpaceState,
    assets: [voice],
  }

  await syncProjectSpaceStateToLocalProjectStorage({
    projectId: 'p1',
    projectName: '远程项目',
    localObjectRoot: '',
    state,
    repository: remote,
    objectStorage: remoteObjects,
    storageProvider: 'qiniu_kodo',
    databaseProvider: 'postgresql',
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    directoryHandle: directory,
    now: '2026-06-23T01:00:00.000Z',
  })

  const remoteRows = await remote.exportProjectRows('p1')
  assert.ok(remoteRows)
  assert.equal(remoteRows.project.mode, 'remote')
  assert.equal(remoteRows.settings.storage_provider, 'qiniu_kodo')
  assert.equal(remoteRows.settings.database_provider, 'postgresql')
  assert.equal(remoteRows.settings.remote_database_profile_id, 'db1')
  assert.equal(remoteRows.settings.remote_storage_profile_id, 'kodo1')
  assert.equal(remoteRows.settings.local_object_root, null)
  assert.equal(remoteRows.assets.length, 1)
  assert.equal(remoteRows.assets[0]!.id, voice.id)
  assert.equal(await (await remoteObjects.getObject(remoteRows.assets[0]!.primary_object_key)).text(), 'voice-bytes')
})

test('syncing restored remote project rows updates metadata without requiring local object reads', async () => {
  const remote = createMemoryProjectRepository()
  const remoteObjects = createMemoryProjectObjectStorage()
  await remote.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['objects/远程项目/audio_wav/r1.wav'],
  })
  const state = {
    ...defaultPersonalSpaceState,
    assets: [{
      ...voice,
      storageResourcePaths: ['objects/远程项目/audio_wav/r1.wav'],
    }],
  }

  await syncProjectSpaceStateToLocalProjectStorage({
    projectId: 'p1',
    projectName: '远程项目',
    localObjectRoot: '',
    state,
    repository: remote,
    objectStorage: remoteObjects,
    storageProvider: 'qiniu_kodo',
    databaseProvider: 'postgresql',
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    directoryHandle: null,
    now: '2026-06-23T01:00:00.000Z',
  })

  const remoteRows = await remote.exportProjectRows('p1')
  assert.ok(remoteRows)
  assert.equal(remoteRows.assets[0]!.id, voice.id)
  assert.equal(remoteRows.assets[0]!.primary_object_key, 'objects/远程项目/audio_wav/r1.wav')
  await assert.rejects(remoteObjects.getObject('objects/远程项目/audio_wav/r1.wav'), /对象不存在/)
})

test('local to remote migration preserves project groups, character links, storyboards, and relations', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    dialogueText: '欢迎来到我的商店。',
    resourcePaths: ['welcome.wav'],
  })
  const effect = createPersonalSpaceAsset({
    kind: 'image',
    assetSubtype: 'effect',
    name: '火球',
    groupName: '特效',
    resourcePaths: ['fire.png'],
  })
  let state = {
    ...defaultPersonalSpaceState,
    assetGroups: { image: ['默认分组', '特效'], sprite: ['默认分组'], voice: ['默认分组'] },
    assets: [voice, effect],
  }
  state = addCharacterProfile(state, '商人')
  state = addStoryboardGroup(state, '开场')
  state = assignAssetToCharacterColumn(state, state.characters[0]!.id, voice.id, 'voice')
  state = assignVoiceToStoryboardGroup(state, state.storyboardGroups[0]!.id, voice.id, '欢迎', -200000)
  state = updatePersonalSpaceAsset(state, effect.id, { linkedVoiceAssetIds: [voice.id] })
  const rows = migratePersonalSpaceStateToProjectRows(state, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  await local.importProjectRows(rows)

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async () => {},
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  const migrated = await remote.exportProjectRows('p1')
  assert.ok(migrated)
  assert.deepEqual(migrated.assetGroups.map((group) => group.name), rows.assetGroups.map((group) => group.name))
  assert.deepEqual(migrated.characters.map((character) => character.name), ['商人'])
  assert.deepEqual(migrated.characterAssetLinks.map((link) => link.column_kind), ['voice'])
  assert.deepEqual(migrated.storyboardGroups.map((storyboard) => storyboard.name), ['开场'])
  assert.equal(migrated.storyboardVoiceEntries[0]!.start_offset_us, -200000)
  assert.deepEqual(migrated.assetRelations.map((relation) => relation.relation_type), ['effect_voice'])
})

test('hard delete records cleanup failures for object deletion', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [voice] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  await repository.importProjectRows(rows)
  const objectKey = rows.assets[0]!.primary_object_key
  const storage = createMemoryProjectObjectStorage({ failDeleteKeys: new Set([objectKey]) })

  const result = await hardDeleteProjectWithObjects({
    projectId: 'p1',
    repository,
    objectStorage: storage,
    storageProvider: 'qiniu_kodo',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(result.deletedProject, true)
  assert.deepEqual(result.cleanupTasks.map((task) => task.storage_provider), ['qiniu_kodo'])
  assert.deepEqual(result.cleanupTasks.map((task) => task.object_key), [objectKey])
  assert.deepEqual(await repository.listProjects(), [])
})

test('hard deleting a remote project can also remove the migrated local snapshot', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [voice] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  await local.importProjectRows(rows)
  await remote.importProjectRows({
    ...rows,
    project: { ...rows.project, mode: 'remote' },
    settings: {
      ...rows.settings,
      storage_provider: 'qiniu_kodo',
      database_provider: 'postgresql',
      local_object_root: null,
      remote_database_profile_id: 'db1',
      remote_storage_profile_id: 'kodo1',
    },
  })
  const storage = createMemoryProjectObjectStorage()

  await hardDeleteProjectWithObjects({
    projectId: 'p1',
    repository: remote,
    localRepository: local,
    objectStorage: storage,
    storageProvider: 'qiniu_kodo',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.deepEqual(await remote.listProjects(), [])
  assert.deepEqual(await local.listProjects(), [])
})
