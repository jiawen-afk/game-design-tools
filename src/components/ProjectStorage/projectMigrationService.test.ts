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
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { hardDeleteProjectWithObjects, migrateLocalProjectToRemote } from './projectMigrationService'
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
  assert.equal(remoteProject!.settings.local_object_root, null)
  assert.equal((await remote.listAssets('p1')).length, 1)
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
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(result.deletedProject, true)
  assert.deepEqual(result.cleanupTasks.map((task) => task.object_key), [objectKey])
  assert.deepEqual(await repository.listProjects(), [])
})
