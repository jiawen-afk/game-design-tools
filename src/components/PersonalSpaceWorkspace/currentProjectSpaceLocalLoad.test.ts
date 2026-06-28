import test from 'node:test'
import assert from 'node:assert/strict'

import { createAssetResourceFields } from '../ProjectStorage'
import { loadProjectSpaceStateFromStorage } from './currentProjectSpacePersistence'
import { createResourceAssetFromUpload } from './personalSpaceModel'
import { createEmptyProjectSpaceState, writeProjectSpaceState } from './projectSpaceState'
import { createLocalRows, createMemoryStorage } from './currentProjectSpacePersistenceTestHelpers.test'

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
