import test from 'node:test'
import assert from 'node:assert/strict'

import { loadProjectSpaceStateFromStorage } from './currentProjectSpacePersistence'
import { createAssetResourceFields } from '../ProjectStorage'
import type { LegacyProjectRows } from '../ProjectStorage/projectLegacyMigration'
import { createResourceAssetFromUpload } from './personalSpaceModel'
import { createEmptyProjectSpaceState, writeProjectSpaceState } from './projectSpaceState'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

function createRemoteRows(): LegacyProjectRows {
  return {
    project: {
      id: 'project-a',
      name: '山海再就业',
      description: '',
      mode: 'remote',
      status: 'active',
      object_key_prefix: 'objects/山海再就业',
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
      metadata_json: null,
    },
    settings: {
      project_id: 'project-a',
      storage_provider: 'qiniu_kodo',
      database_provider: 'postgresql',
      local_object_root: '/remote/cache',
      remote_database_profile_id: 'db-profile',
      remote_storage_profile_id: 'kodo-profile',
      last_verified_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
    },
    assetGroups: [],
    assets: [],
    characters: [],
    characterAssetLinks: [],
    storyboardGroups: [],
    storyboardVoiceEntries: [],
    assetRelations: [],
  }
}

function createLocalRows(): LegacyProjectRows {
  const rows = createRemoteRows()
  return {
    ...rows,
    project: {
      ...rows.project,
      mode: 'local',
      object_key_prefix: 'objects/本地项目',
    },
    settings: {
      ...rows.settings,
      storage_provider: 'local',
      database_provider: 'sqlite',
      local_object_root: 'D:\\GameAssets',
      remote_database_profile_id: null,
      remote_storage_profile_id: null,
      last_verified_at: null,
    },
  }
}

test('remote project load still returns remote data when local cache import fails', async () => {
  const storage = createMemoryStorage()
  const warnings: string[] = []
  const remoteRows = createRemoteRows()

  const result = await loadProjectSpaceStateFromStorage({
    projectId: remoteRows.project.id,
    project: remoteRows.project,
    storage,
    localRepository: {
      importProjectRows: async () => {
        throw new Error('sqlite busy')
      },
      exportProjectRows: async () => null,
    },
    remoteRepository: {
      exportProjectRows: async () => remoteRows,
    },
    ensureRemoteSettings: async () => {},
    onWarning: (message) => warnings.push(message),
  })

  assert.ok(result)
  assert.equal(result.settings.storageDirectory, '/remote/cache')
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /本地项目缓存同步失败/)
  assert.match(warnings[0], /sqlite busy/)
})

test('local project load restores workspace state from local project repository rows', async () => {
  const storage = createMemoryStorage()
  const localRows = createLocalRows()
  const staleCache = createEmptyProjectSpaceState('D:\\GameAssets')
  staleCache.assets = [createResourceAssetFromUpload({
    kind: 'image',
    name: 'stale-cache.png',
    resourcePath: 'blob:stale-cache',
  })]
  writeProjectSpaceState(localRows.project.id, staleCache, storage)
  const resourceFields = createAssetResourceFields({
    projectId: localRows.project.id,
    projectName: localRows.project.name,
    fileName: 'fresh-db.png',
    mimeType: 'image/png',
    sizeBytes: 10,
    resourceId: 'fresh-resource',
  })
  localRows.assets = [{
    id: 'asset-fresh',
    project_id: localRows.project.id,
    kind: 'image',
    asset_subtype: 'generic',
    group_id: null,
    name: 'fresh-db.png',
    dialogue_text: null,
    source_key: null,
    ...resourceFields,
    sprite_frame_width: null,
    sprite_frame_height: null,
    sprite_sheet_width: null,
    sprite_sheet_height: null,
    sprite_fps: null,
    sprite_frame_count: null,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
    metadata_json: null,
  }]
  localRows.characters = [{
    id: 'character-db',
    project_id: localRows.project.id,
    name: 'DB Character',
    starred: false,
    sort_order: 0,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
  }]
  localRows.characterAssetLinks = [{
    id: 'character-asset-link-db',
    project_id: localRows.project.id,
    character_id: 'character-db',
    asset_id: 'asset-fresh',
    column_kind: 'portrait',
    sort_order: 0,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
  }]
  localRows.storyboardGroups = [{
    id: 'storyboard-db',
    project_id: localRows.project.id,
    name: 'DB Storyboard',
    starred: false,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
  }]

  const result = await loadProjectSpaceStateFromStorage({
    projectId: localRows.project.id,
    project: localRows.project,
    storage,
    localRepository: {
      importProjectRows: async () => {},
      exportProjectRows: async () => localRows,
    },
    remoteRepository: {
      exportProjectRows: async () => null,
    },
  })

  assert.ok(result)
  assert.deepEqual(result.assets.map((asset) => asset.name), ['fresh-db.png'])
  assert.deepEqual(result.characters.map((character) => character.name), ['DB Character'])
  assert.deepEqual(result.characters[0]?.portraitAssets.map((link) => link.assetId), ['asset-fresh'])
  assert.deepEqual(result.storyboardGroups.map((storyboard) => storyboard.name), ['DB Storyboard'])
  assert.equal(result.settings.storageDirectory, 'D:\\GameAssets')
})

test('remote project load reports cover object keys for cache synchronization', async () => {
  const storage = createMemoryStorage()
  const remoteRows = createRemoteRows()
  const resourceFields = createAssetResourceFields({
    projectId: remoteRows.project.id,
    projectName: remoteRows.project.name,
    fileName: 'hero.png',
    mimeType: 'image/png',
    sizeBytes: 10,
    resourceId: 'primary-resource',
    spriteIndex: {
      fileName: 'hero-index.json',
      mimeType: 'application/json',
      sizeBytes: 20,
      resourceId: 'sprite-index-resource',
    },
    cover: {
      fileName: 'hero-cover.png',
      mimeType: 'image/png',
      sizeBytes: 30,
      resourceId: 'cover-resource',
    },
  })
  remoteRows.assets = [{
    id: 'asset-a',
    project_id: remoteRows.project.id,
    kind: 'sprite',
    asset_subtype: 'character_sprite',
    group_id: null,
    name: 'hero.png',
    dialogue_text: null,
    source_key: null,
    ...resourceFields,
    sprite_frame_width: null,
    sprite_frame_height: null,
    sprite_sheet_width: null,
    sprite_sheet_height: null,
    sprite_fps: null,
    sprite_frame_count: null,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
    metadata_json: null,
  }]
  const loadedObjectKeys: string[][] = []

  await loadProjectSpaceStateFromStorage({
    projectId: remoteRows.project.id,
    project: remoteRows.project,
    storage,
    localRepository: {
      importProjectRows: async () => {},
      exportProjectRows: async () => null,
    },
    remoteRepository: {
      exportProjectRows: async () => remoteRows,
    },
    ensureRemoteSettings: async () => {},
    onRemoteProjectLoaded: async (_project, _settings, assetObjectKeys) => {
      loadedObjectKeys.push(assetObjectKeys)
    },
  })

  assert.deepEqual(loadedObjectKeys, [[
    resourceFields.primary_object_key,
    resourceFields.sprite_index_object_key,
    resourceFields.cover_object_key,
  ]])
})
