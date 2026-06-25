import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PROJECT_SCHEMA_TABLES,
  assetKindFromLegacyKind,
  assetSubtypeFromLegacyInput,
  buildProjectObjectKey,
  createAssetResourceFields,
  createProjectId,
  createProjectSchemaSql,
  createResourceId,
  createStoryboardVoiceEntry,
  fileNameFromProjectObjectKey,
  isProjectObjectKey,
  mimeGroupFromMimeType,
  normalizeFileExtension,
  resourceIdFromProjectObjectKey,
  validateRemoteProjectSettings,
  type ProjectSettings,
} from './projectStorageModel'

test('project ids and resource ids have no semantic prefixes', () => {
  for (let index = 0; index < 10; index += 1) {
    assert.doesNotMatch(createProjectId(), /^project[_-]/)
    assert.doesNotMatch(createResourceId(), /^resource[_-]/)
    assert.match(createProjectId(), /^[a-z0-9][a-z0-9_-]{15,}$/)
  }
})

test('project object keys use project name, full mime type, resource id, and extension', () => {
  assert.equal(
    buildProjectObjectKey({ projectName: '默认 项目', fileMime: 'image/png', resourceId: 'r456', extension: 'PNG' }),
    'objects/默认_项目/image_png/r456.png',
  )
  assert.equal(
    buildProjectObjectKey({ projectName: 'Project/Name', fileMime: 'application/json', resourceId: 'index 1', extension: '.json' }),
    'objects/Project_Name/application_json/index_1.json',
  )
})

test('project object key helpers classify and parse provider object keys', () => {
  assert.equal(isProjectObjectKey('objects/默认项目/audio_wav/r1.wav'), true)
  assert.equal(isProjectObjectKey('ProjectRoot/配音/r1.wav'), false)
  assert.equal(isProjectObjectKey(undefined), false)
  assert.equal(fileNameFromProjectObjectKey('objects/默认项目/audio_wav/r1.wav', 'fallback.wav'), 'r1.wav')
  assert.equal(fileNameFromProjectObjectKey('objects/默认项目/audio_wav/', 'fallback.wav'), 'fallback.wav')
  assert.equal(resourceIdFromProjectObjectKey('objects/默认项目/audio_wav/r1.wav', 'fallback'), 'r1')
  assert.equal(resourceIdFromProjectObjectKey('objects/默认项目/audio_wav/', 'fallback'), 'fallback')
})

test('mime group and extension normalization are stable across providers', () => {
  assert.equal(mimeGroupFromMimeType('image/png'), 'image')
  assert.equal(mimeGroupFromMimeType('audio/wav'), 'audio')
  assert.equal(mimeGroupFromMimeType('application/json'), 'application')
  assert.equal(mimeGroupFromMimeType(''), 'application')
  assert.equal(normalizeFileExtension('PNG'), 'png')
  assert.equal(normalizeFileExtension('.jpeg'), 'jpeg')
  assert.equal(normalizeFileExtension(''), 'bin')
})

test('asset subtype replaces old tag semantics', () => {
  assert.equal(assetKindFromLegacyKind('map'), 'image')
  assert.equal(assetKindFromLegacyKind('effect'), 'image')
  assert.equal(assetKindFromLegacyKind('sprite'), 'sprite')
  assert.equal(assetSubtypeFromLegacyInput({ kind: 'image', groupName: '角色肖像', tags: ['肖像'] }), 'portrait')
  assert.equal(assetSubtypeFromLegacyInput({ kind: 'map', groupName: '地图素材', tags: [] }), 'map')
  assert.equal(assetSubtypeFromLegacyInput({ kind: 'effect', groupName: '特效素材', tags: [] }), 'effect')
  assert.equal(assetSubtypeFromLegacyInput({ kind: 'sprite', groupName: '角色动作', tags: ['角色精灵图'] }), 'character_sprite')
  assert.equal(assetSubtypeFromLegacyInput({ kind: 'voice', groupName: '默认分组', tags: ['角色配音'] }), 'character_voice')
  assert.equal(assetSubtypeFromLegacyInput({ kind: 'image', groupName: '默认分组', tags: [] }), 'generic')
})

test('asset resource fields merge primary and sprite index resources into assets', () => {
  const image = createAssetResourceFields({
    projectId: 'p1',
    projectName: '默认项目',
    fileName: 'hero.png',
    mimeType: 'image/png',
    sizeBytes: 128,
    resourceId: 'r1',
    cover: {
      fileName: 'hero-cover.png',
      mimeType: 'image/png',
      sizeBytes: 32,
      resourceId: 'c1',
    },
  })
  assert.equal(image.primary_resource_id, 'r1')
  assert.equal(image.primary_object_key, 'objects/默认项目/image_png/r1.png')
  assert.equal(image.primary_mime_group, 'image')
  assert.equal(image.cover_resource_id, 'c1')
  assert.equal(image.cover_object_key, 'objects/默认项目/image_png/c1.png')
  assert.equal(image.cover_file_name, 'hero-cover.png')
  assert.equal(image.cover_mime_type, 'image/png')
  assert.equal(image.cover_size_bytes, 32)
  assert.equal(image.sprite_index_resource_id, null)

  const sprite = createAssetResourceFields({
    projectId: 'p1',
    projectName: '默认项目',
    fileName: 'sprite.png',
    mimeType: 'image/png',
    sizeBytes: 256,
    resourceId: 'r2',
    spriteIndex: {
      fileName: 'index.json',
      mimeType: 'application/json',
      sizeBytes: 64,
      resourceId: 'r3',
    },
  })
  assert.equal(sprite.primary_object_key, 'objects/默认项目/image_png/r2.png')
  assert.equal(sprite.sprite_index_resource_id, 'r3')
  assert.equal(sprite.sprite_index_object_key, 'objects/默认项目/application_json/r3.json')
  assert.equal(sprite.cover_resource_id, null)
})

test('storyboard voice entries store microsecond offsets', () => {
  const entry = createStoryboardVoiceEntry({
    id: 'e1',
    projectId: 'p1',
    storyboardId: 's1',
    assetId: 'a1',
    characterId: null,
    text: '提前播放',
    startOffsetUs: -200000,
    sortOrder: 2,
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(entry.start_offset_us, -200000)
  assert.equal(entry.sort_order, 2)
  assert.equal(entry.text, '提前播放')
})

test('remote mode validates shared providers while device profiles stay local', () => {
  const base: ProjectSettings = {
    project_id: 'p1',
    storage_provider: 'qiniu_kodo',
    database_provider: 'postgresql',
    local_object_root: null,
    remote_database_profile_id: null,
    remote_storage_profile_id: null,
    last_verified_at: '2026-06-23T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
  }

  assert.deepEqual(validateRemoteProjectSettings(base), [])
  assert.deepEqual(validateRemoteProjectSettings({ ...base, database_provider: 'sqlite' }), ['远程项目必须使用 PostgreSQL 或 MySQL'])
  assert.deepEqual(validateRemoteProjectSettings({ ...base, storage_provider: 'local' }), ['远程项目必须使用七牛 Kodo 对象存储'])
})

test('schema SQL includes required tables and excludes removed tags and resource table', () => {
  for (const dialect of ['sqlite', 'postgresql', 'mysql'] as const) {
    const sql = createProjectSchemaSql(dialect).join('\n')
    for (const table of PROJECT_SCHEMA_TABLES) {
      assert.match(sql, new RegExp(`CREATE TABLE [^;]*${table}`, 'i'))
    }
    assert.doesNotMatch(sql, /asset_resources/i)
    assert.doesNotMatch(sql, /tags_json/i)
    assert.doesNotMatch(sql, /note_name/i)
    assert.match(sql, /asset_subtype/)
    assert.match(sql, /primary_resource_id/)
    assert.match(sql, /sprite_index_resource_id/)
    assert.match(sql, /cover_resource_id/)
    assert.match(sql, /cover_object_key/)
    assert.match(sql, /start_offset_us/)
    assert.match(sql, /asset_relations/)
    assert.match(sql, /UNIQUE\s*\(\s*project_id,\s*kind,\s*name\s*\)/i)
  }
})
