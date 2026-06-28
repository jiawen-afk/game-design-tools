import test from 'node:test'
import assert from 'node:assert/strict'

import { createAssetResourceFields } from '../ProjectStorage'
import { loadProjectSpaceStateFromStorage } from './currentProjectSpacePersistence'
import { createMemoryStorage, createRemoteRows } from './currentProjectSpacePersistenceTestHelpers.test'

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
