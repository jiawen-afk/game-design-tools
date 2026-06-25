import test from 'node:test'
import assert from 'node:assert/strict'

import { loadProjectSpaceStateFromStorage } from './currentProjectSpacePersistence'
import { createAssetResourceFields } from '../ProjectStorage'
import type { LegacyProjectRows } from '../ProjectStorage/projectLegacyMigration'

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
