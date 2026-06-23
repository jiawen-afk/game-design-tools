# Project Storage Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build project-based asset storage with a unified local SQLite and remote PostgreSQL/MySQL + Qiniu Kodo data model, then migrate existing personal-space workflows onto project storage.

**Architecture:** Introduce a new `ProjectStorage` core under `src/components/ProjectStorage/` for schema, types, repositories, object storage adapters, migrations, and collection services. Keep Electron-only credential and connection checks behind `src/desktopApi.ts`, `electron/preload.cjs`, and `electron/main.cjs`; keep workspace entries thin and move current personal-space behaviors behind project-aware hooks and services.

**Tech Stack:** React 19, TypeScript 5.9, Ant Design 6, Electron 41, SQLite for local metadata, PostgreSQL/MySQL SQL generation for remote schema, Qiniu Kodo adapter boundary, Node test runner with `tsx --test`.

---

## Files

- Create: `src/components/ProjectStorage/projectStorageTypes.ts`
- Create: `src/components/ProjectStorage/projectId.ts`
- Create: `src/components/ProjectStorage/projectObjectKeys.ts`
- Create: `src/components/ProjectStorage/projectSchema.ts`
- Create: `src/components/ProjectStorage/projectStorageModel.ts`
- Create: `src/components/ProjectStorage/projectStorageModel.test.ts`
- Create: `src/components/ProjectStorage/projectSqliteRepository.ts`
- Create: `src/components/ProjectStorage/projectSqliteRepository.test.ts`
- Create: `src/components/ProjectStorage/projectObjectStorage.ts`
- Create: `src/components/ProjectStorage/projectLocalObjectStorage.ts`
- Create: `src/components/ProjectStorage/projectLocalObjectStorage.test.ts`
- Create: `src/components/ProjectStorage/projectLegacyMigration.ts`
- Create: `src/components/ProjectStorage/projectLegacyMigration.test.ts`
- Create: `src/components/ProjectStorage/projectMigrationService.ts`
- Create: `src/components/ProjectStorage/projectMigrationService.test.ts`
- Create: `src/components/ProjectStorage/projectAssetCollectionService.ts`
- Create: `src/components/ProjectStorage/projectAssetCollectionService.test.ts`
- Create: `src/components/ProjectStorage/projectRemoteProfiles.ts`
- Create: `src/components/ProjectStorage/projectRemoteProfiles.test.ts`
- Create: `src/components/ProjectStorage/projectStoryboardPlayback.ts`
- Create: `src/components/ProjectStorage/projectStoryboardPlayback.test.ts`
- Create: `src/components/ProjectStorage/index.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceModel.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceAssets.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceCharacters.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceStoryboards.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceState.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceAssetOperations.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceModel.test.ts`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalCharacterPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalResourceSections.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts`
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.test.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts`
- Modify: `src/App.tsx`
- Modify: `src/desktopApi.ts`
- Modify: `electron/preload.cjs`
- Modify: `electron/main.cjs`
- Modify: `src/appStructure.test.ts`
- Modify: `package.json`

## Task 1: Unified Project Types, IDs, Object Keys, and Schema SQL

**Files:**
- Create: `src/components/ProjectStorage/projectStorageModel.test.ts`
- Create: `src/components/ProjectStorage/projectStorageTypes.ts`
- Create: `src/components/ProjectStorage/projectId.ts`
- Create: `src/components/ProjectStorage/projectObjectKeys.ts`
- Create: `src/components/ProjectStorage/projectSchema.ts`
- Create: `src/components/ProjectStorage/projectStorageModel.ts`
- Create: `src/components/ProjectStorage/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing model and schema tests**

Create `src/components/ProjectStorage/projectStorageModel.test.ts`:

```ts
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
  mimeGroupFromMimeType,
  normalizeFileExtension,
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

test('project object keys use project id, mime group, resource id, and extension', () => {
  assert.equal(
    buildProjectObjectKey({ projectId: 'p123', mimeGroup: 'image', resourceId: 'r456', extension: 'PNG' }),
    'objects/p123/image/r456.png',
  )
  assert.equal(
    buildProjectObjectKey({ projectId: 'Project Name', mimeGroup: 'application/json', resourceId: 'index 1', extension: '.json' }),
    'objects/Project_Name/application/index_1.json',
  )
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
    fileName: 'hero.png',
    mimeType: 'image/png',
    sizeBytes: 128,
    resourceId: 'r1',
  })
  assert.equal(image.primary_resource_id, 'r1')
  assert.equal(image.primary_object_key, 'objects/p1/image/r1.png')
  assert.equal(image.primary_mime_group, 'image')
  assert.equal(image.sprite_index_resource_id, null)

  const sprite = createAssetResourceFields({
    projectId: 'p1',
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
  assert.equal(sprite.primary_object_key, 'objects/p1/image/r2.png')
  assert.equal(sprite.sprite_index_resource_id, 'r3')
  assert.equal(sprite.sprite_index_object_key, 'objects/p1/application/r3.json')
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

test('remote mode requires verified database and object storage profiles', () => {
  const base: ProjectSettings = {
    project_id: 'p1',
    storage_provider: 'qiniu_kodo',
    database_provider: 'postgresql',
    local_object_root: null,
    remote_database_profile_id: 'db1',
    remote_storage_profile_id: 'kodo1',
    last_verified_at: '2026-06-23T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
  }

  assert.deepEqual(validateRemoteProjectSettings(base), [])
  assert.deepEqual(validateRemoteProjectSettings({ ...base, remote_storage_profile_id: null }), ['缺少远程对象存储配置'])
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
    assert.match(sql, /start_offset_us/)
    assert.match(sql, /asset_relations/)
    assert.match(sql, /UNIQUE\s*\(\s*project_id,\s*kind,\s*name\s*\)/i)
  }
})
```

Update `package.json` test script so it includes the new test:

```json
"test": "tsx --test src/appStructure.test.ts src/components/ProjectStorage/projectStorageModel.test.ts src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts src/components/ImageProcessingWorkspace/imageUpscaleModel.test.ts src/components/MultiFrameSpriteWorkspace/model.test.ts src/components/VoiceDeploymentWorkspace/voiceDeploymentModel.test.ts src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.test.ts src/components/PersonalSpaceWorkspace/personalSpaceModel.test.ts src/components/PersonalSpaceWorkspace/personalSpaceFileStorage.test.ts"
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because `src/components/ProjectStorage/projectStorageModel.ts` does not exist.

- [ ] **Step 3: Implement project storage types**

Create `src/components/ProjectStorage/projectStorageTypes.ts`:

```ts
export type ProjectMode = 'local' | 'remote'
export type ProjectStatus = 'active' | 'migrating' | 'migration_failed'
export type ProjectStorageProvider = 'local' | 'qiniu_kodo'
export type ProjectDatabaseProvider = 'sqlite' | 'postgresql' | 'mysql'
export type ProjectAssetKind = 'image' | 'sprite' | 'voice'
export type ProjectAssetSubtype =
  | 'generic'
  | 'portrait'
  | 'map'
  | 'effect'
  | 'character_sprite'
  | 'effect_sprite'
  | 'character_voice'
  | 'narration'
  | 'sound_effect'
export type ProjectAssetGroupKind = ProjectAssetKind
export type CharacterAssetColumnKind = 'portrait' | 'sprite' | 'voice'
export type ProjectSqlDialect = 'sqlite' | 'postgresql' | 'mysql'
export type ProjectMigrationStatus = 'pending' | 'running' | 'succeeded' | 'failed'
export type CleanupTaskStatus = 'pending' | 'succeeded' | 'failed'
export type ProjectMimeGroup = 'image' | 'audio' | 'application' | 'video' | 'text' | 'font' | 'model'

export interface Project {
  id: string
  name: string
  description: string
  mode: ProjectMode
  status: ProjectStatus
  object_key_prefix: string
  created_at: string
  updated_at: string
  metadata_json: string | null
}

export interface ProjectSettings {
  project_id: string
  storage_provider: ProjectStorageProvider
  database_provider: ProjectDatabaseProvider
  local_object_root: string | null
  remote_database_profile_id: string | null
  remote_storage_profile_id: string | null
  last_verified_at: string | null
  updated_at: string
}

export interface AssetGroup {
  id: string
  project_id: string
  kind: ProjectAssetGroupKind
  name: string
  starred: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AssetResourceFields {
  primary_resource_id: string
  primary_object_key: string
  primary_file_name: string
  primary_mime_group: ProjectMimeGroup
  primary_mime_type: string
  primary_extension: string
  primary_size_bytes: number
  primary_hash_sha256: string | null
  sprite_index_resource_id: string | null
  sprite_index_object_key: string | null
  sprite_index_file_name: string | null
  sprite_index_mime_type: string | null
  sprite_index_size_bytes: number | null
  sprite_index_hash_sha256: string | null
}

export interface Asset extends AssetResourceFields {
  id: string
  project_id: string
  kind: ProjectAssetKind
  asset_subtype: ProjectAssetSubtype
  group_id: string | null
  name: string
  dialogue_text: string | null
  source_key: string | null
  sprite_frame_width: number | null
  sprite_frame_height: number | null
  sprite_sheet_width: number | null
  sprite_sheet_height: number | null
  sprite_fps: number | null
  sprite_frame_count: number | null
  created_at: string
  updated_at: string
  metadata_json: string | null
}

export interface Character {
  id: string
  project_id: string
  name: string
  starred: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CharacterAssetLink {
  id: string
  project_id: string
  character_id: string
  asset_id: string
  column_kind: CharacterAssetColumnKind
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StoryboardGroup {
  id: string
  project_id: string
  name: string
  starred: boolean
  created_at: string
  updated_at: string
}

export interface StoryboardVoiceEntry {
  id: string
  project_id: string
  storyboard_id: string
  asset_id: string
  character_id: string | null
  text: string
  start_offset_us: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AssetRelation {
  id: string
  project_id: string
  source_asset_id: string
  target_asset_id: string
  relation_type: 'effect_voice' | 'derived_from' | string
  created_at: string
}
```

- [ ] **Step 4: Implement ID and object key helpers**

Create `src/components/ProjectStorage/projectId.ts`:

```ts
export function createProjectId() {
  return createProjectStorageId()
}

export function createResourceId() {
  return createProjectStorageId()
}

export function createProjectStorageId() {
  const random = Math.random().toString(36).slice(2, 12)
  return `${Date.now().toString(36)}_${random}`
}
```

Create `src/components/ProjectStorage/projectObjectKeys.ts`:

```ts
import type { ProjectMimeGroup } from './projectStorageTypes'

export interface ProjectObjectKeyInput {
  projectId: string
  mimeGroup: string
  resourceId: string
  extension: string
}

const knownMimeGroups = new Set<ProjectMimeGroup>(['image', 'audio', 'application', 'video', 'text', 'font', 'model'])

function sanitizeObjectKeyPart(value: string) {
  return (value.trim() || 'unnamed').replace(/[\\/]+/g, '_').replace(/\s+/g, '_')
}

export function normalizeFileExtension(value: string) {
  const extension = value.trim().replace(/^\./, '').toLowerCase()
  return extension || 'bin'
}

export function extensionFromFileName(fileName: string) {
  const match = fileName.trim().match(/\.([^.\\/]+)$/)
  return normalizeFileExtension(match?.[1] ?? '')
}

export function mimeGroupFromMimeType(mimeType: string): ProjectMimeGroup {
  const group = mimeType.trim().toLowerCase().split('/')[0] as ProjectMimeGroup
  return knownMimeGroups.has(group) ? group : 'application'
}

export function buildProjectObjectKey(input: ProjectObjectKeyInput) {
  const mimeGroup = sanitizeObjectKeyPart(input.mimeGroup.split('/')[0] || 'application')
  return [
    'objects',
    sanitizeObjectKeyPart(input.projectId),
    mimeGroup,
    `${sanitizeObjectKeyPart(input.resourceId)}.${normalizeFileExtension(input.extension)}`,
  ].join('/')
}
```

- [ ] **Step 5: Implement schema SQL generation**

Create `src/components/ProjectStorage/projectSchema.ts`:

```ts
import type { ProjectSqlDialect } from './projectStorageTypes'

export const PROJECT_SCHEMA_TABLES = [
  'schema_migrations',
  'projects',
  'project_settings',
  'asset_groups',
  'assets',
  'characters',
  'character_asset_links',
  'storyboard_groups',
  'storyboard_voice_entries',
  'asset_relations',
  'project_migrations',
  'deleted_project_cleanup_tasks',
] as const

function boolType(dialect: ProjectSqlDialect) {
  return dialect === 'sqlite' ? 'integer' : 'boolean'
}

function jsonType(dialect: ProjectSqlDialect) {
  if (dialect === 'postgresql') return 'jsonb'
  if (dialect === 'mysql') return 'json'
  return 'text'
}

function serialSql(dialect: ProjectSqlDialect) {
  void dialect
  return ''
}

export function createProjectSchemaSql(dialect: ProjectSqlDialect): string[] {
  const boolean = boolType(dialect)
  const json = jsonType(dialect)
  const statements = [
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version text primary key,
      applied_at text not null,
      checksum text null
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id text primary key,
      name text not null,
      description text not null default '',
      mode text not null,
      status text not null,
      object_key_prefix text not null,
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null
    )`,
    `CREATE TABLE IF NOT EXISTS project_settings (
      project_id text primary key references projects(id) on delete cascade,
      storage_provider text not null,
      database_provider text not null,
      local_object_root text null,
      remote_database_profile_id text null,
      remote_storage_profile_id text null,
      last_verified_at text null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS asset_groups (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      kind text not null,
      name text not null,
      starred ${boolean} not null default false,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null,
      UNIQUE (project_id, kind, name)
    )`,
    `CREATE TABLE IF NOT EXISTS assets (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      kind text not null,
      asset_subtype text not null,
      group_id text null references asset_groups(id) on delete set null,
      name text not null,
      dialogue_text text null,
      source_key text null,
      primary_resource_id text not null,
      primary_object_key text not null,
      primary_file_name text not null,
      primary_mime_group text not null,
      primary_mime_type text not null,
      primary_extension text not null,
      primary_size_bytes integer not null default 0,
      primary_hash_sha256 text null,
      sprite_index_resource_id text null,
      sprite_index_object_key text null,
      sprite_index_file_name text null,
      sprite_index_mime_type text null,
      sprite_index_size_bytes integer null,
      sprite_index_hash_sha256 text null,
      sprite_frame_width integer null,
      sprite_frame_height integer null,
      sprite_sheet_width integer null,
      sprite_sheet_height integer null,
      sprite_fps integer null,
      sprite_frame_count integer null,
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, primary_object_key),
      UNIQUE (project_id, sprite_index_object_key)
    )`,
    `CREATE TABLE IF NOT EXISTS characters (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      name text not null,
      starred ${boolean} not null default false,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS character_asset_links (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      character_id text not null references characters(id) on delete cascade,
      asset_id text not null references assets(id) on delete cascade,
      column_kind text not null,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null,
      UNIQUE (character_id, asset_id, column_kind)
    )`,
    `CREATE TABLE IF NOT EXISTS storyboard_groups (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      name text not null,
      starred ${boolean} not null default false,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS storyboard_voice_entries (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      storyboard_id text not null references storyboard_groups(id) on delete cascade,
      asset_id text not null references assets(id) on delete cascade,
      character_id text null references characters(id) on delete set null,
      text text not null default '',
      start_offset_us integer not null default 0,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS asset_relations (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      source_asset_id text not null references assets(id) on delete cascade,
      target_asset_id text not null references assets(id) on delete cascade,
      relation_type text not null,
      created_at text not null,
      UNIQUE (project_id, source_asset_id, target_asset_id, relation_type)
    )`,
    `CREATE TABLE IF NOT EXISTS project_migrations (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      from_mode text not null,
      to_mode text not null,
      status text not null,
      started_at text null,
      finished_at text null,
      total_assets integer not null default 0,
      total_objects integer not null default 0,
      uploaded_objects integer not null default 0,
      error_message text null,
      report_json ${json} null
    )`,
    `CREATE TABLE IF NOT EXISTS deleted_project_cleanup_tasks (
      id text primary key,
      project_id text not null,
      storage_provider text not null,
      object_key text not null,
      status text not null,
      error_message text null,
      created_at text not null,
      updated_at text not null
    )`,
  ]
  return [
    ...statements.map((statement) => `${statement.trim()}${serialSql(dialect)}`),
    'CREATE INDEX IF NOT EXISTS idx_asset_groups_project_kind ON asset_groups(project_id, kind)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_kind ON assets(project_id, kind)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_subtype ON assets(project_id, asset_subtype)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_group ON assets(project_id, group_id)',
    'CREATE INDEX IF NOT EXISTS idx_characters_project_sort ON characters(project_id, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_character_links_project_character ON character_asset_links(project_id, character_id, column_kind, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_storyboards_project_starred ON storyboard_groups(project_id, starred)',
    'CREATE INDEX IF NOT EXISTS idx_storyboard_voice_project_storyboard ON storyboard_voice_entries(project_id, storyboard_id, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_asset_relations_source ON asset_relations(project_id, source_asset_id)',
    'CREATE INDEX IF NOT EXISTS idx_asset_relations_target ON asset_relations(project_id, target_asset_id)',
  ]
}
```

- [ ] **Step 6: Implement model facade**

Create `src/components/ProjectStorage/projectStorageModel.ts`:

```ts
import { createProjectId, createProjectStorageId, createResourceId } from './projectId'
import {
  buildProjectObjectKey,
  extensionFromFileName,
  mimeGroupFromMimeType,
  normalizeFileExtension,
} from './projectObjectKeys'
import { PROJECT_SCHEMA_TABLES, createProjectSchemaSql } from './projectSchema'
import type {
  AssetResourceFields,
  ProjectAssetKind,
  ProjectAssetSubtype,
  ProjectSettings,
  StoryboardVoiceEntry,
} from './projectStorageTypes'

export interface LegacySubtypeInput {
  kind: 'map' | 'image' | 'effect' | 'voice' | 'sprite'
  groupName?: string
  tags?: string[]
}

export interface ResourceFieldInput {
  projectId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  resourceId?: string
  hashSha256?: string | null
  spriteIndex?: {
    fileName: string
    mimeType: string
    sizeBytes: number
    resourceId?: string
    hashSha256?: string | null
  }
}

export function assetKindFromLegacyKind(kind: LegacySubtypeInput['kind']): ProjectAssetKind {
  if (kind === 'voice') return 'voice'
  if (kind === 'sprite') return 'sprite'
  return 'image'
}

export function assetSubtypeFromLegacyInput(input: LegacySubtypeInput): ProjectAssetSubtype {
  const tags = new Set((input.tags ?? []).map((tag) => tag.trim()))
  const groupName = input.groupName?.trim() ?? ''
  if (input.kind === 'map' || tags.has('地图') || groupName.includes('地图')) return 'map'
  if (input.kind === 'effect' || tags.has('特效') || groupName.includes('特效')) return 'effect'
  if (tags.has('肖像') || groupName.includes('肖像')) return 'portrait'
  if (input.kind === 'sprite' && (tags.has('角色精灵图') || groupName.includes('角色'))) return 'character_sprite'
  if (input.kind === 'sprite' && (tags.has('特效精灵图') || groupName.includes('特效'))) return 'effect_sprite'
  if (input.kind === 'voice' && (tags.has('角色配音') || tags.has('配音'))) return 'character_voice'
  return 'generic'
}

export function createAssetResourceFields(input: ResourceFieldInput): AssetResourceFields {
  const primaryResourceId = input.resourceId ?? createResourceId()
  const primaryMimeGroup = mimeGroupFromMimeType(input.mimeType)
  const primaryExtension = extensionFromFileName(input.fileName)
  const spriteIndexResourceId = input.spriteIndex?.resourceId ?? (input.spriteIndex ? createResourceId() : null)
  const spriteIndexExtension = input.spriteIndex ? extensionFromFileName(input.spriteIndex.fileName) : null
  const spriteIndexMimeGroup = input.spriteIndex ? mimeGroupFromMimeType(input.spriteIndex.mimeType) : null
  return {
    primary_resource_id: primaryResourceId,
    primary_object_key: buildProjectObjectKey({
      projectId: input.projectId,
      mimeGroup: primaryMimeGroup,
      resourceId: primaryResourceId,
      extension: primaryExtension,
    }),
    primary_file_name: input.fileName,
    primary_mime_group: primaryMimeGroup,
    primary_mime_type: input.mimeType,
    primary_extension: primaryExtension,
    primary_size_bytes: input.sizeBytes,
    primary_hash_sha256: input.hashSha256 ?? null,
    sprite_index_resource_id: spriteIndexResourceId,
    sprite_index_object_key: input.spriteIndex && spriteIndexResourceId && spriteIndexExtension && spriteIndexMimeGroup
      ? buildProjectObjectKey({
        projectId: input.projectId,
        mimeGroup: spriteIndexMimeGroup,
        resourceId: spriteIndexResourceId,
        extension: spriteIndexExtension,
      })
      : null,
    sprite_index_file_name: input.spriteIndex?.fileName ?? null,
    sprite_index_mime_type: input.spriteIndex?.mimeType ?? null,
    sprite_index_size_bytes: input.spriteIndex?.sizeBytes ?? null,
    sprite_index_hash_sha256: input.spriteIndex?.hashSha256 ?? null,
  }
}

export function createStoryboardVoiceEntry(input: {
  id?: string
  projectId: string
  storyboardId: string
  assetId: string
  characterId: string | null
  text: string
  startOffsetUs?: number
  sortOrder: number
  now?: string
}): StoryboardVoiceEntry {
  const now = input.now ?? new Date().toISOString()
  return {
    id: input.id ?? createProjectStorageId(),
    project_id: input.projectId,
    storyboard_id: input.storyboardId,
    asset_id: input.assetId,
    character_id: input.characterId,
    text: input.text,
    start_offset_us: Math.trunc(input.startOffsetUs ?? 0),
    sort_order: input.sortOrder,
    created_at: now,
    updated_at: now,
  }
}

export function validateRemoteProjectSettings(settings: ProjectSettings): string[] {
  const errors: string[] = []
  if (settings.storage_provider !== 'qiniu_kodo') errors.push('远程项目必须使用七牛 Kodo 对象存储')
  if (settings.database_provider !== 'postgresql' && settings.database_provider !== 'mysql') {
    errors.push('远程项目必须使用 PostgreSQL 或 MySQL')
  }
  if (!settings.remote_database_profile_id) errors.push('缺少远程数据库配置')
  if (!settings.remote_storage_profile_id) errors.push('缺少远程对象存储配置')
  return errors
}

export {
  PROJECT_SCHEMA_TABLES,
  buildProjectObjectKey,
  createProjectId,
  createProjectSchemaSql,
  createProjectStorageId,
  createResourceId,
  mimeGroupFromMimeType,
  normalizeFileExtension,
}
export type * from './projectStorageTypes'
```

Create `src/components/ProjectStorage/index.ts`:

```ts
export * from './projectStorageModel'
```

- [ ] **Step 7: Run tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS for `projectStorageModel.test.ts` and all existing tests.

- [ ] **Step 8: Commit Task 1**

```powershell
git add package.json src/components/ProjectStorage
git commit -m "feat: add project storage schema model"
```

## Task 2: Remove Tags and Link Notes from Current Personal-Space Model

**Files:**
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceModel.test.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceModel.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceAssets.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceCharacters.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceStoryboards.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceState.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceAssetOperations.ts`

- [ ] **Step 1: Write failing tests for removed tags, removed notes, and voice offsets**

In `src/components/PersonalSpaceWorkspace/personalSpaceModel.test.ts`, replace tests that assert tags and note names with the new behavior:

```ts
test('personal space assets use asset subtype instead of tags', () => {
  const portrait = createPortraitAssetFromUpload({
    name: 'hero-face.png',
    portraitPath: 'blob:portrait',
  })
  const effect = createResourceAssetFromUpload({
    kind: 'effect',
    name: 'fire.png',
    resourcePath: 'blob:fire',
  })
  const sprite = createSpriteAssetFromExport({
    name: '主角行走',
    spritePath: 'D:\\assets\\sprite.png',
    indexPath: 'D:\\assets\\index.json',
  })

  assert.equal(portrait.kind, 'image')
  assert.equal(portrait.assetSubtype, 'portrait')
  assert.equal(effect.kind, 'image')
  assert.equal(effect.assetSubtype, 'effect')
  assert.equal(sprite.kind, 'sprite')
  assert.equal(sprite.assetSubtype, 'character_sprite')
  assert.equal('tags' in portrait, false)
})

test('character asset links no longer store tags or note names', () => {
  const portrait = createPersonalSpaceAsset({ kind: 'image', assetSubtype: 'portrait', name: '肖像' })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [portrait] }, '主角')
  const characterId = state.characters[0]!.id

  state = assignAssetToCharacterColumn(state, characterId, portrait.id, 'portrait')

  const link = state.characters[0]!.portraitAssets[0]!
  assert.deepEqual(link, { assetId: portrait.id, order: 0 })
})

test('storyboard voice entries store microsecond start offsets without note names', () => {
  const voice = createPersonalSpaceAsset({ kind: 'voice', assetSubtype: 'character_voice', name: '第一句', dialogueText: '你好' })
  let state = addStoryboardGroup({ ...defaultPersonalSpaceState, assets: [voice] }, '开场')
  const groupId = state.storyboardGroups[0]!.id

  state = assignVoiceToStoryboardGroup(state, groupId, voice.id, '提前', -200000)

  const entry = state.storyboardGroups[0]!.voiceEntries[0]!
  assert.equal(entry.startOffsetUs, -200000)
  assert.equal('noteName' in entry, false)
})
```

Remove imports and assertions for `updateCharacterAssetNote`, `updateStoryboardVoiceNote`, `tags`, and `noteName`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because current types still require `tags`, note update functions still exist, and storyboard voice entries do not accept `startOffsetUs`.

- [ ] **Step 3: Update personal-space types**

Modify `src/components/PersonalSpaceWorkspace/personalSpaceModel.ts`:

```ts
export type PersonalSpaceModule = 'characters' | 'storyboards' | 'assets' | 'settings'
export type CommonAssetKind = 'map' | 'image' | 'effect' | 'voice' | 'sprite'
export type StoredAssetKind = 'image' | 'sprite' | 'voice'
export type AssetGroupKind = 'image' | 'sprite' | 'voice'
export type PersonalAssetSubtype =
  | 'generic'
  | 'portrait'
  | 'map'
  | 'effect'
  | 'character_sprite'
  | 'effect_sprite'
  | 'character_voice'
  | 'narration'
  | 'sound_effect'
```

Update `PersonalSpaceAsset`:

```ts
export interface PersonalSpaceAsset {
  id: string
  kind: StoredAssetKind
  assetSubtype: PersonalAssetSubtype
  name: string
  groupName: string
  dialogueText?: string
  resourcePaths: string[]
  createdAt: string
  linkedCharacterIds: string[]
  linkedStoryboardIds: string[]
  linkedVoiceAssetIds: string[]
  storageResourcePaths: string[]
  sourceKey?: string
}
```

Update link and storyboard entry types:

```ts
export interface CharacterAssetLink {
  assetId: string
  order: number
}

export interface StoryboardVoiceEntry {
  assetId: string
  text: string
  startOffsetUs: number
  order: number
}
```

Remove `tags?: string[]` from `SpriteExportAssetInput`, `PortraitUploadAssetInput`, and `ResourceUploadAssetInput`.

Remove exports of `updateCharacterAssetNote` and `updateStoryboardVoiceNote`.

- [ ] **Step 4: Update asset factories**

Modify `src/components/PersonalSpaceWorkspace/personalSpaceAssets.ts`:

```ts
import type {
  CommonAssetKind,
  PersonalAssetSubtype,
  PersonalSpaceAsset,
  PersonalSpaceState,
  PortraitUploadAssetInput,
  ResourceUploadAssetInput,
  SpriteExportAssetInput,
  StoredAssetKind,
  VoiceRecordAssetInput,
} from './personalSpaceModel'

function storedKindForInput(kind: CommonAssetKind): StoredAssetKind {
  if (kind === 'voice') return 'voice'
  if (kind === 'sprite') return 'sprite'
  return 'image'
}

function subtypeForInput(kind: CommonAssetKind, groupName?: string): PersonalAssetSubtype {
  const group = groupName?.trim() ?? ''
  if (kind === 'map' || group.includes('地图')) return 'map'
  if (kind === 'effect' || group.includes('特效')) return 'effect'
  if (kind === 'sprite' && group.includes('特效')) return 'effect_sprite'
  if (kind === 'sprite') return 'character_sprite'
  if (kind === 'voice') return 'character_voice'
  return 'generic'
}
```

Update `createPersonalSpaceAsset` input:

```ts
export function createPersonalSpaceAsset(input: {
  kind: CommonAssetKind | StoredAssetKind
  assetSubtype?: PersonalAssetSubtype
  name: string
  groupName?: string
  dialogueText?: string
  resourcePaths?: string[]
  linkedCharacterIds?: string[]
  linkedStoryboardIds?: string[]
  linkedVoiceAssetIds?: string[]
  sourceKey?: string
}): PersonalSpaceAsset {
  const storedKind = storedKindForInput(input.kind)
  return {
    id: `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind: storedKind,
    assetSubtype: input.assetSubtype ?? subtypeForInput(input.kind, input.groupName),
    name: input.name.trim() || '未命名资源',
    groupName: input.groupName?.trim() || '默认分组',
    dialogueText: input.dialogueText?.trim() || undefined,
    resourcePaths: input.resourcePaths ?? [],
    linkedCharacterIds: input.linkedCharacterIds ?? [],
    linkedStoryboardIds: input.linkedStoryboardIds ?? [],
    linkedVoiceAssetIds: input.linkedVoiceAssetIds ?? [],
    storageResourcePaths: [],
    createdAt: new Date().toISOString(),
    sourceKey: input.sourceKey?.trim() || undefined,
  }
}
```

Update `storageCategoryForAsset`:

```ts
export function storageCategoryForAsset(asset: PersonalSpaceAsset): string {
  if (asset.assetSubtype === 'portrait') return '角色肖像'
  if (asset.kind === 'sprite') return '精灵图'
  if (asset.kind === 'voice') return '配音'
  return '图片'
}
```

Update factory calls so they set `assetSubtype` and do not set `tags`.

- [ ] **Step 5: Update character operations**

Modify `src/components/PersonalSpaceWorkspace/personalSpaceCharacters.ts`:

```ts
function normalizeAssetLinks(links: CharacterAssetLink[]): CharacterAssetLink[] {
  return links.map((link, index) => ({ assetId: link.assetId, order: index }))
}
```

Update `assignAssetToCharacterColumn` signature:

```ts
export function assignAssetToCharacterColumn(
  state: PersonalSpaceState,
  characterId: string,
  assetId: string,
  column: 'portrait' | 'sprite' | 'voice',
): PersonalSpaceState {
```

Inside it, create links with:

```ts
const links = normalizeAssetLinks([...existing, { assetId, order: existing.length }])
```

Delete `updateCharacterAssetNote` and remove its export.

- [ ] **Step 6: Update storyboard operations**

Modify `src/components/PersonalSpaceWorkspace/personalSpaceStoryboards.ts`.

Update `assignVoiceToStoryboardGroup` signature:

```ts
export function assignVoiceToStoryboardGroup(
  state: PersonalSpaceState,
  groupId: string,
  assetId: string,
  text = '',
  startOffsetUs = 0,
): PersonalSpaceState {
```

Create entries with:

```ts
const voiceEntries = [
  ...existing,
  { assetId, text: dialogueText, startOffsetUs: Math.trunc(startOffsetUs), order: existing.length },
].map((entry, index) => ({ ...entry, startOffsetUs: entry.startOffsetUs ?? 0, order: index }))
```

Delete `updateStoryboardVoiceNote` and remove its export.

- [ ] **Step 7: Update state migration and asset operations**

Modify `src/components/PersonalSpaceWorkspace/personalSpaceState.ts`:

```ts
function migrateAssetKind(asset: PersonalSpaceAsset): PersonalSpaceAsset {
  if ((asset as unknown as { kind: string }).kind === 'map') {
    return { ...asset, kind: 'image', assetSubtype: 'map' }
  }
  if ((asset as unknown as { kind: string }).kind === 'effect') {
    return { ...asset, kind: 'image', assetSubtype: 'effect' }
  }
  return { ...asset, assetSubtype: asset.assetSubtype ?? legacySubtypeFromAsset(asset) }
}
```

Add:

```ts
function legacySubtypeFromAsset(asset: PersonalSpaceAsset): PersonalAssetSubtype {
  const legacy = asset as unknown as { tags?: string[]; groupName?: string; kind?: string }
  const tags = new Set(legacy.tags ?? [])
  if (legacy.kind === 'map' || tags.has('地图') || legacy.groupName?.includes('地图')) return 'map'
  if (legacy.kind === 'effect' || tags.has('特效') || legacy.groupName?.includes('特效')) return 'effect'
  if (tags.has('肖像') || legacy.groupName?.includes('肖像')) return 'portrait'
  if (legacy.kind === 'sprite' && (tags.has('特效精灵图') || legacy.groupName?.includes('特效'))) return 'effect_sprite'
  if (legacy.kind === 'sprite') return 'character_sprite'
  if (legacy.kind === 'voice') return 'character_voice'
  return 'generic'
}
```

When cloning links and storyboard entries, stop copying `tags` and `noteName`, and ensure `startOffsetUs` defaults to `0`.

Modify `src/components/PersonalSpaceWorkspace/personalSpaceAssetOperations.ts` so `updatePersonalSpaceAsset` patch only accepts:

```ts
Partial<Pick<PersonalSpaceAsset, 'name' | 'groupName' | 'assetSubtype' | 'dialogueText' | 'linkedCharacterIds' | 'linkedStoryboardIds' | 'linkedVoiceAssetIds'>>
```

- [ ] **Step 8: Run tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS after updating any old test call sites that still pass tags or note names.

- [ ] **Step 9: Commit Task 2**

```powershell
git add src/components/PersonalSpaceWorkspace
git commit -m "refactor: remove personal space tags and link notes"
```

## Task 3: Project-Aware Legacy Migration

**Files:**
- Create: `src/components/ProjectStorage/projectLegacyMigration.test.ts`
- Create: `src/components/ProjectStorage/projectLegacyMigration.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing migration tests**

Create `src/components/ProjectStorage/projectLegacyMigration.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
  type PersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'

test('legacy migration creates a default local project and project settings', () => {
  const migrated = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })

  assert.equal(migrated.project.id, 'p1')
  assert.equal(migrated.project.mode, 'local')
  assert.equal(migrated.project.object_key_prefix, 'objects/p1')
  assert.equal(migrated.settings.database_provider, 'sqlite')
  assert.equal(migrated.settings.storage_provider, 'local')
  assert.equal(migrated.settings.local_object_root, 'D:\\GameAssets')
})

test('legacy migration converts assets, groups, character links, storyboard entries, and asset relations', () => {
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    dialogueText: '欢迎来到我的商店。',
    resourcePaths: ['D:\\voice\\welcome.wav'],
    storageResourcePaths: ['ProjectRoot/配音/2026-06-23/audio.wav'],
  })
  const effect = createPersonalSpaceAsset({
    kind: 'image',
    assetSubtype: 'effect',
    name: '火球',
    resourcePaths: ['D:\\image\\fire.png'],
    storageResourcePaths: ['ProjectRoot/图片/2026-06-23/fire.png'],
    linkedVoiceAssetIds: [voice.id],
  })
  const state: PersonalSpaceState = {
    ...defaultPersonalSpaceState,
    assetGroups: { image: ['默认分组', '特效'], sprite: ['默认分组'], voice: ['默认分组'] },
    starredAssetGroups: { image: ['特效'], sprite: [], voice: [] },
    assets: [voice, effect],
    characters: [{
      id: 'c1',
      name: '商人',
      order: 0,
      starred: true,
      portraitAssets: [],
      spriteAssets: [],
      voiceAssets: [{ assetId: voice.id, order: 0 }],
      portraitAssetIds: [],
      spriteAssetIds: [],
      voiceAssetIds: [voice.id],
    }],
    storyboardGroups: [{
      id: 's1',
      name: '开场',
      starred: true,
      voiceEntries: [{ assetId: voice.id, text: '欢迎', startOffsetUs: -100000, order: 0 }],
      characterIds: ['c1'],
      voiceAssetIds: [voice.id],
    }],
  }

  const migrated = migratePersonalSpaceStateToProjectRows(state, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })

  assert.deepEqual(migrated.assetGroups.map((group) => [group.kind, group.name, group.starred]), [
    ['image', '默认分组', false],
    ['image', '特效', true],
    ['sprite', '默认分组', false],
    ['voice', '默认分组', false],
  ])
  assert.equal(migrated.assets.length, 2)
  assert.equal(migrated.assets.find((asset) => asset.id === effect.id)!.asset_subtype, 'effect')
  assert.equal(migrated.assets.find((asset) => asset.id === voice.id)!.dialogue_text, '欢迎来到我的商店。')
  assert.equal(migrated.characterAssetLinks[0]!.asset_id, voice.id)
  assert.equal(migrated.characterAssetLinks[0]!.column_kind, 'voice')
  assert.equal(migrated.storyboardVoiceEntries[0]!.start_offset_us, -100000)
  assert.equal(migrated.assetRelations[0]!.relation_type, 'effect_voice')
  assert.equal(migrated.assetRelations[0]!.source_asset_id, effect.id)
  assert.equal(migrated.assetRelations[0]!.target_asset_id, voice.id)
})
```

Add the new test to `package.json`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because `projectLegacyMigration.ts` does not exist.

- [ ] **Step 3: Implement legacy migration**

Create `src/components/ProjectStorage/projectLegacyMigration.ts`:

```ts
import type {
  Asset,
  AssetGroup,
  AssetRelation,
  Character,
  CharacterAssetLink,
  Project,
  ProjectSettings,
  StoryboardGroup,
  StoryboardVoiceEntry,
} from './projectStorageTypes'
import { createAssetResourceFields } from './projectStorageModel'
import { createProjectStorageId } from './projectId'
import type { AssetGroupKind, PersonalSpaceAsset, PersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

export interface LegacyMigrationOptions {
  projectId: string
  projectName: string
  now: string
  localObjectRoot: string
}

export interface LegacyProjectRows {
  project: Project
  settings: ProjectSettings
  assetGroups: AssetGroup[]
  assets: Asset[]
  characters: Character[]
  characterAssetLinks: CharacterAssetLink[]
  storyboardGroups: StoryboardGroup[]
  storyboardVoiceEntries: StoryboardVoiceEntry[]
  assetRelations: AssetRelation[]
}

function mimeTypeForAsset(asset: PersonalSpaceAsset, index: number) {
  if (asset.kind === 'voice') return 'audio/wav'
  if (asset.kind === 'sprite' && index === 1) return 'application/json'
  return 'image/png'
}

function fileNameFromPath(path: string, fallback: string) {
  return path.split(/[\\/]/).pop()?.trim() || fallback
}

function assetGroupId(projectId: string, kind: AssetGroupKind, name: string) {
  return `${projectId}_${kind}_${name}`.replace(/[^a-zA-Z0-9_-]+/g, '_')
}

export function migratePersonalSpaceStateToProjectRows(state: PersonalSpaceState, options: LegacyMigrationOptions): LegacyProjectRows {
  const project: Project = {
    id: options.projectId,
    name: options.projectName,
    description: '',
    mode: 'local',
    status: 'active',
    object_key_prefix: `objects/${options.projectId}`,
    created_at: options.now,
    updated_at: options.now,
    metadata_json: null,
  }
  const settings: ProjectSettings = {
    project_id: options.projectId,
    storage_provider: 'local',
    database_provider: 'sqlite',
    local_object_root: options.localObjectRoot,
    remote_database_profile_id: null,
    remote_storage_profile_id: null,
    last_verified_at: null,
    updated_at: options.now,
  }
  const assetGroups = (Object.entries(state.assetGroups) as Array<[AssetGroupKind, string[]]>).flatMap(([kind, names]) => (
    names.map((name, sortOrder) => ({
      id: assetGroupId(options.projectId, kind, name),
      project_id: options.projectId,
      kind,
      name,
      starred: state.starredAssetGroups[kind]?.includes(name) ?? false,
      sort_order: sortOrder,
      created_at: options.now,
      updated_at: options.now,
    }))
  ))
  const assets = state.assets.map((asset): Asset => {
    const primaryPath = asset.resourcePaths[0] ?? asset.storageResourcePaths[0] ?? asset.name
    const spriteIndexPath = asset.kind === 'sprite' ? asset.resourcePaths[1] ?? asset.storageResourcePaths[1] : undefined
    const resources = createAssetResourceFields({
      projectId: options.projectId,
      fileName: fileNameFromPath(primaryPath, asset.name),
      mimeType: mimeTypeForAsset(asset, 0),
      sizeBytes: 0,
      resourceId: createProjectStorageId(),
      spriteIndex: spriteIndexPath ? {
        fileName: fileNameFromPath(spriteIndexPath, 'index.json'),
        mimeType: mimeTypeForAsset(asset, 1),
        sizeBytes: 0,
        resourceId: createProjectStorageId(),
      } : undefined,
    })
    return {
      id: asset.id,
      project_id: options.projectId,
      kind: asset.kind,
      asset_subtype: asset.assetSubtype,
      group_id: assetGroupId(options.projectId, asset.kind, asset.groupName),
      name: asset.name,
      dialogue_text: asset.dialogueText ?? null,
      source_key: asset.sourceKey ?? null,
      ...resources,
      sprite_frame_width: null,
      sprite_frame_height: null,
      sprite_sheet_width: null,
      sprite_sheet_height: null,
      sprite_fps: null,
      sprite_frame_count: null,
      created_at: asset.createdAt,
      updated_at: options.now,
      metadata_json: null,
    }
  })
  const characters = state.characters.map((character): Character => ({
    id: character.id,
    project_id: options.projectId,
    name: character.name,
    starred: Boolean(character.starred),
    sort_order: character.order,
    created_at: options.now,
    updated_at: options.now,
  }))
  const characterAssetLinks = state.characters.flatMap((character) => (
    [
      ...character.portraitAssets.map((link) => ({ link, column: 'portrait' as const })),
      ...character.spriteAssets.map((link) => ({ link, column: 'sprite' as const })),
      ...character.voiceAssets.map((link) => ({ link, column: 'voice' as const })),
    ].map(({ link, column }): CharacterAssetLink => ({
      id: createProjectStorageId(),
      project_id: options.projectId,
      character_id: character.id,
      asset_id: link.assetId,
      column_kind: column,
      sort_order: link.order,
      created_at: options.now,
      updated_at: options.now,
    }))
  ))
  const storyboardGroups = state.storyboardGroups.map((group): StoryboardGroup => ({
    id: group.id,
    project_id: options.projectId,
    name: group.name,
    starred: Boolean(group.starred),
    created_at: options.now,
    updated_at: options.now,
  }))
  const storyboardVoiceEntries = state.storyboardGroups.flatMap((group) => (
    group.voiceEntries.map((entry): StoryboardVoiceEntry => ({
      id: createProjectStorageId(),
      project_id: options.projectId,
      storyboard_id: group.id,
      asset_id: entry.assetId,
      character_id: group.characterIds[0] ?? null,
      text: entry.text,
      start_offset_us: entry.startOffsetUs,
      sort_order: entry.order,
      created_at: options.now,
      updated_at: options.now,
    }))
  ))
  const assetRelations = state.assets.flatMap((asset) => (
    asset.linkedVoiceAssetIds.map((voiceAssetId): AssetRelation => ({
      id: createProjectStorageId(),
      project_id: options.projectId,
      source_asset_id: asset.id,
      target_asset_id: voiceAssetId,
      relation_type: 'effect_voice',
      created_at: options.now,
    }))
  ))
  return { project, settings, assetGroups, assets, characters, characterAssetLinks, storyboardGroups, storyboardVoiceEntries, assetRelations }
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS for migration tests and existing tests.

- [ ] **Step 5: Commit Task 3**

```powershell
git add package.json src/components/ProjectStorage/projectLegacyMigration.ts src/components/ProjectStorage/projectLegacyMigration.test.ts
git commit -m "feat: migrate personal space rows to project schema"
```

## Task 4: Local SQLite Repository Boundary

**Files:**
- Create: `src/components/ProjectStorage/projectSqliteRepository.test.ts`
- Create: `src/components/ProjectStorage/projectSqliteRepository.ts`
- Modify: `src/components/ProjectStorage/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing repository tests**

Create `src/components/ProjectStorage/projectSqliteRepository.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryProjectRepository } from './projectSqliteRepository'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createPersonalSpaceAsset, defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

test('local project repository initializes schema idempotently and stores projects', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  await repository.initializeSchema()

  const project = await repository.createProject({
    name: '本地项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(project.project.name, '本地项目')
  assert.equal(project.project.mode, 'local')
  assert.equal(project.settings.database_provider, 'sqlite')
  assert.deepEqual((await repository.listProjects()).map((item) => item.name), ['本地项目'])
})

test('local project repository imports migrated rows and hard deletes project rows', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  const voice = createPersonalSpaceAsset({ kind: 'voice', assetSubtype: 'character_voice', name: '欢迎', resourcePaths: ['welcome.wav'] })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [voice] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })

  await repository.importProjectRows(rows)
  assert.equal((await repository.listAssets('p1')).length, 1)

  await repository.deleteProject('p1')
  assert.deepEqual(await repository.listProjects(), [])
  assert.deepEqual(await repository.listAssets('p1'), [])
})
```

Add the test to `package.json`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because `projectSqliteRepository.ts` does not exist.

- [ ] **Step 3: Implement repository interface and memory-backed first version**

Create `src/components/ProjectStorage/projectSqliteRepository.ts`:

```ts
import { createProjectId } from './projectId'
import { createProjectSchemaSql } from './projectSchema'
import type { Asset, Project, ProjectSettings } from './projectStorageTypes'
import type { LegacyProjectRows } from './projectLegacyMigration'

export interface CreateLocalProjectInput {
  name: string
  description: string
  localObjectRoot: string
  now: string
}

export interface ProjectWithSettings {
  project: Project
  settings: ProjectSettings
}

export interface ProjectRepository {
  initializeSchema(): Promise<void>
  createProject(input: CreateLocalProjectInput): Promise<ProjectWithSettings>
  listProjects(): Promise<Project[]>
  getProject(projectId: string): Promise<ProjectWithSettings | null>
  importProjectRows(rows: LegacyProjectRows): Promise<void>
  listAssets(projectId: string): Promise<Asset[]>
  deleteProject(projectId: string): Promise<void>
}

export class MemoryProjectRepository implements ProjectRepository {
  private initialized = false
  private projects = new Map<string, Project>()
  private settings = new Map<string, ProjectSettings>()
  private assets = new Map<string, Asset[]>()

  async initializeSchema() {
    createProjectSchemaSql('sqlite')
    this.initialized = true
  }

  async createProject(input: CreateLocalProjectInput): Promise<ProjectWithSettings> {
    if (!this.initialized) await this.initializeSchema()
    const id = createProjectId()
    const project: Project = {
      id,
      name: input.name.trim() || '未命名项目',
      description: input.description.trim(),
      mode: 'local',
      status: 'active',
      object_key_prefix: `objects/${id}`,
      created_at: input.now,
      updated_at: input.now,
      metadata_json: null,
    }
    const settings: ProjectSettings = {
      project_id: id,
      storage_provider: 'local',
      database_provider: 'sqlite',
      local_object_root: input.localObjectRoot,
      remote_database_profile_id: null,
      remote_storage_profile_id: null,
      last_verified_at: null,
      updated_at: input.now,
    }
    this.projects.set(id, project)
    this.settings.set(id, settings)
    this.assets.set(id, [])
    return { project, settings }
  }

  async listProjects() {
    return Array.from(this.projects.values())
  }

  async getProject(projectId: string) {
    const project = this.projects.get(projectId)
    const settings = this.settings.get(projectId)
    return project && settings ? { project, settings } : null
  }

  async importProjectRows(rows: LegacyProjectRows) {
    this.projects.set(rows.project.id, rows.project)
    this.settings.set(rows.project.id, rows.settings)
    this.assets.set(rows.project.id, rows.assets)
  }

  async listAssets(projectId: string) {
    return [...(this.assets.get(projectId) ?? [])]
  }

  async deleteProject(projectId: string) {
    this.projects.delete(projectId)
    this.settings.delete(projectId)
    this.assets.delete(projectId)
  }
}

export function createMemoryProjectRepository() {
  return new MemoryProjectRepository()
}
```

Export from `src/components/ProjectStorage/index.ts`:

```ts
export * from './projectSqliteRepository'
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS. The first repository is intentionally memory-backed so UI and migration can be wired safely before native SQLite packaging is introduced.

- [ ] **Step 5: Commit Task 4**

```powershell
git add package.json src/components/ProjectStorage/projectSqliteRepository.ts src/components/ProjectStorage/projectSqliteRepository.test.ts src/components/ProjectStorage/index.ts
git commit -m "feat: add local project repository boundary"
```

## Task 5: Local Object Storage Adapter

**Files:**
- Create: `src/components/ProjectStorage/projectLocalObjectStorage.test.ts`
- Create: `src/components/ProjectStorage/projectObjectStorage.ts`
- Create: `src/components/ProjectStorage/projectLocalObjectStorage.ts`
- Modify: `src/components/ProjectStorage/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing object storage tests**

Create `src/components/ProjectStorage/projectLocalObjectStorage.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { buildProjectObjectKey } from './projectStorageModel'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'

test('local object storage writes, reads, and deletes objects by provider-neutral keys', async () => {
  const storage = createMemoryProjectObjectStorage()
  const key = buildProjectObjectKey({ projectId: 'p1', mimeGroup: 'image', resourceId: 'r1', extension: 'png' })

  await storage.putObject(key, new Blob(['hello'], { type: 'image/png' }))
  const read = await storage.getObject(key)
  assert.equal(await read.text(), 'hello')

  await storage.deleteObject(key)
  await assert.rejects(() => storage.getObject(key), /对象不存在/)
})

test('local object storage records failed delete keys for project cleanup', async () => {
  const storage = createMemoryProjectObjectStorage({ failDeleteKeys: new Set(['objects/p1/image/r1.png']) })
  await storage.putObject('objects/p1/image/r1.png', new Blob(['hello']))

  const result = await storage.deleteObjects(['objects/p1/image/r1.png', 'objects/p1/image/r2.png'])

  assert.deepEqual(result.deletedKeys, ['objects/p1/image/r2.png'])
  assert.deepEqual(result.failed, [{ objectKey: 'objects/p1/image/r1.png', errorMessage: '删除对象失败' }])
})
```

Add the test to `package.json`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because the object storage adapter does not exist.

- [ ] **Step 3: Implement object storage interface and memory local adapter**

Create `src/components/ProjectStorage/projectObjectStorage.ts`:

```ts
export interface ProjectObjectDeleteResult {
  deletedKeys: string[]
  failed: Array<{ objectKey: string; errorMessage: string }>
}

export interface ProjectObjectStorage {
  putObject(objectKey: string, data: Blob): Promise<void>
  getObject(objectKey: string): Promise<Blob>
  deleteObject(objectKey: string): Promise<void>
  deleteObjects(objectKeys: string[]): Promise<ProjectObjectDeleteResult>
}
```

Create `src/components/ProjectStorage/projectLocalObjectStorage.ts`:

```ts
import type { ProjectObjectDeleteResult, ProjectObjectStorage } from './projectObjectStorage'

export interface MemoryProjectObjectStorageOptions {
  failDeleteKeys?: Set<string>
}

export class MemoryProjectObjectStorage implements ProjectObjectStorage {
  private objects = new Map<string, Blob>()
  private readonly failDeleteKeys: Set<string>

  constructor(options: MemoryProjectObjectStorageOptions = {}) {
    this.failDeleteKeys = options.failDeleteKeys ?? new Set()
  }

  async putObject(objectKey: string, data: Blob) {
    this.objects.set(objectKey, data)
  }

  async getObject(objectKey: string) {
    const data = this.objects.get(objectKey)
    if (!data) throw new Error(`对象不存在：${objectKey}`)
    return data
  }

  async deleteObject(objectKey: string) {
    if (this.failDeleteKeys.has(objectKey)) throw new Error('删除对象失败')
    this.objects.delete(objectKey)
  }

  async deleteObjects(objectKeys: string[]): Promise<ProjectObjectDeleteResult> {
    const deletedKeys: string[] = []
    const failed: ProjectObjectDeleteResult['failed'] = []
    for (const objectKey of objectKeys) {
      try {
        await this.deleteObject(objectKey)
        deletedKeys.push(objectKey)
      } catch (error) {
        failed.push({ objectKey, errorMessage: error instanceof Error ? error.message : String(error) })
      }
    }
    return { deletedKeys, failed }
  }
}

export function createMemoryProjectObjectStorage(options?: MemoryProjectObjectStorageOptions) {
  return new MemoryProjectObjectStorage(options)
}
```

Export from `src/components/ProjectStorage/index.ts`:

```ts
export * from './projectObjectStorage'
export * from './projectLocalObjectStorage'
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```powershell
git add package.json src/components/ProjectStorage/projectObjectStorage.ts src/components/ProjectStorage/projectLocalObjectStorage.ts src/components/ProjectStorage/projectLocalObjectStorage.test.ts src/components/ProjectStorage/index.ts
git commit -m "feat: add project object storage adapter"
```

## Task 6: Project Asset Collection Service

**Files:**
- Create: `src/components/ProjectStorage/projectAssetCollectionService.test.ts`
- Create: `src/components/ProjectStorage/projectAssetCollectionService.ts`
- Modify: `src/components/ProjectStorage/index.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.test.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing collection service tests**

Create `src/components/ProjectStorage/projectAssetCollectionService.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { createProjectAssetFromCollection } from './projectAssetCollectionService'

test('voice collection creates character voice assets without tags', () => {
  const asset = createProjectAssetFromCollection({
    projectId: 'p1',
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    fileName: 'welcome.wav',
    mimeType: 'audio/wav',
    sizeBytes: 10,
    dialogueText: '欢迎',
    sourceKey: 'voice:v1',
    now: '2026-06-23T00:00:00.000Z',
    resourceId: 'r1',
  })

  assert.equal(asset.kind, 'voice')
  assert.equal(asset.asset_subtype, 'character_voice')
  assert.equal(asset.primary_object_key, 'objects/p1/audio/r1.wav')
  assert.equal(asset.dialogue_text, '欢迎')
  assert.equal('tags_json' in asset, false)
})

test('sprite collection creates primary sprite and sprite index object fields', () => {
  const asset = createProjectAssetFromCollection({
    projectId: 'p1',
    kind: 'sprite',
    assetSubtype: 'character_sprite',
    name: '行走',
    fileName: 'sprite.png',
    mimeType: 'image/png',
    sizeBytes: 100,
    now: '2026-06-23T00:00:00.000Z',
    resourceId: 'r1',
    spriteIndex: {
      fileName: 'index.json',
      mimeType: 'application/json',
      sizeBytes: 20,
      resourceId: 'r2',
      frameWidth: 64,
      frameHeight: 64,
      sheetWidth: 256,
      sheetHeight: 256,
      fps: 8,
      frameCount: 16,
    },
  })

  assert.equal(asset.primary_object_key, 'objects/p1/image/r1.png')
  assert.equal(asset.sprite_index_object_key, 'objects/p1/application/r2.json')
  assert.equal(asset.sprite_frame_width, 64)
  assert.equal(asset.sprite_frame_count, 16)
})
```

Add the test to `package.json`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because `projectAssetCollectionService.ts` does not exist.

- [ ] **Step 3: Implement collection asset factory**

Create `src/components/ProjectStorage/projectAssetCollectionService.ts`:

```ts
import { createProjectStorageId } from './projectId'
import { createAssetResourceFields } from './projectStorageModel'
import type { Asset, ProjectAssetKind, ProjectAssetSubtype } from './projectStorageTypes'

export interface ProjectAssetCollectionInput {
  projectId: string
  kind: ProjectAssetKind
  assetSubtype: ProjectAssetSubtype
  name: string
  groupId?: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  dialogueText?: string
  sourceKey?: string
  now: string
  resourceId?: string
  spriteIndex?: {
    fileName: string
    mimeType: string
    sizeBytes: number
    resourceId?: string
    frameWidth: number
    frameHeight: number
    sheetWidth: number
    sheetHeight: number
    fps: number
    frameCount: number
  }
}

export function createProjectAssetFromCollection(input: ProjectAssetCollectionInput): Asset {
  const resources = createAssetResourceFields({
    projectId: input.projectId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    resourceId: input.resourceId,
    spriteIndex: input.spriteIndex,
  })
  return {
    id: createProjectStorageId(),
    project_id: input.projectId,
    kind: input.kind,
    asset_subtype: input.assetSubtype,
    group_id: input.groupId ?? null,
    name: input.name.trim() || '未命名素材',
    dialogue_text: input.dialogueText?.trim() || null,
    source_key: input.sourceKey?.trim() || null,
    ...resources,
    sprite_frame_width: input.spriteIndex?.frameWidth ?? null,
    sprite_frame_height: input.spriteIndex?.frameHeight ?? null,
    sprite_sheet_width: input.spriteIndex?.sheetWidth ?? null,
    sprite_sheet_height: input.spriteIndex?.sheetHeight ?? null,
    sprite_fps: input.spriteIndex?.fps ?? null,
    sprite_frame_count: input.spriteIndex?.frameCount ?? null,
    created_at: input.now,
    updated_at: input.now,
    metadata_json: null,
  }
}
```

Export from `src/components/ProjectStorage/index.ts`:

```ts
export * from './projectAssetCollectionService'
```

- [ ] **Step 4: Update existing collection call sites**

Modify existing collection code so it no longer passes semantic tags:

- `src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.ts`: create voice assets with `assetSubtype: 'character_voice'`.
- `src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts`: create sprite assets with `assetSubtype: 'character_sprite'`.
- `src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts`: create image assets with `assetSubtype: 'effect'` or `generic` based on the existing workflow intent.

Keep old personal-space state writes working in this task; full repository wiring happens later.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS after updating old collector tests that asserted tags.

- [ ] **Step 6: Commit Task 6**

```powershell
git add package.json src/components/ProjectStorage/projectAssetCollectionService.ts src/components/ProjectStorage/projectAssetCollectionService.test.ts src/components/ProjectStorage/index.ts src/components/VoiceDeploymentWorkspace src/components/MultiFrameSpriteWorkspace
git commit -m "feat: add project asset collection service"
```

## Task 7: Project Space UI Shell and Local Project CRUD

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/appStructure.test.ts`
- Modify: `src/components/PersonalSpaceWorkspace/index.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts`
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts`

- [ ] **Step 1: Write failing structure tests**

Add tests to `src/appStructure.test.ts`:

```ts
test('app shell exposes project space instead of personal space copy', () => {
  const source = appSource()
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const settingsSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx', 'utf8')

  assert.match(source, /项目空间/)
  assert.match(source, /打开项目空间/)
  assert.doesNotMatch(source, /打开个人空间/)
  assert.match(workspaceSource, /项目空间/)
  assert.match(workspaceSource, /projectSelector/)
  assert.match(settingsSource, /创建项目/)
  assert.match(settingsSource, /编辑项目/)
  assert.match(settingsSource, /删除项目/)
  assert.match(settingsSource, /本地模式/)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because current UI still says personal space and has no project controls.

- [ ] **Step 3: Add project shell state**

Modify `usePersonalSpaceWorkspace.ts` to initialize a memory project repository from Task 4, expose:

```ts
projectSelector
projects
activeProject
createLocalProject
renameProject
deleteProject
```

Use `createMemoryProjectRepository()` first so the UI workflow can be validated before Electron SQLite is wired.

- [ ] **Step 4: Add project controls to settings panel**

Modify `PersonalSettingsPanel.tsx` so settings includes:

- Project selector.
- Create project button.
- Edit project name/description modal.
- Delete project confirmation modal.
- Mode tag showing `本地模式` or `远程模式`.

Hard delete should call repository delete and keep object cleanup integration for Task 10.

- [ ] **Step 5: Rename global app copy**

Modify `src/App.tsx`:

- Change visible copy from `个人空间` to `项目空间`.
- Change action copy from `打开个人空间` to `打开项目空间`.
- Keep route/surface IDs unchanged in this task to reduce churn.

- [ ] **Step 6: Run tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit Task 7**

```powershell
git add src/App.tsx src/appStructure.test.ts src/components/PersonalSpaceWorkspace
git commit -m "feat: add local project space shell"
```

## Task 8: Remote Profile Types, Desktop API Boundary, and Verification Stubs

**Files:**
- Create: `src/components/ProjectStorage/projectRemoteProfiles.test.ts`
- Create: `src/components/ProjectStorage/projectRemoteProfiles.ts`
- Modify: `src/desktopApi.ts`
- Modify: `electron/preload.cjs`
- Modify: `electron/main.cjs`
- Modify: `src/appStructure.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing profile tests and structure guards**

Create `src/components/ProjectStorage/projectRemoteProfiles.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  redactDatabaseProfile,
  redactKodoProfile,
  validateDatabaseProfileInput,
  validateKodoProfileInput,
} from './projectRemoteProfiles'

test('database profile validation requires provider, host, database, username, and password', () => {
  assert.deepEqual(validateDatabaseProfileInput({
    provider: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'game_assets',
    username: 'user',
    password: 'secret',
    ssl: false,
  }), [])
  assert.match(validateDatabaseProfileInput({
    provider: 'sqlite' as never,
    host: '',
    port: 0,
    database: '',
    username: '',
    password: '',
    ssl: false,
  }).join('\n'), /PostgreSQL 或 MySQL/)
})

test('profile redaction never exposes secrets', () => {
  assert.deepEqual(redactDatabaseProfile({
    provider: 'mysql',
    host: 'db.example.com',
    port: 3306,
    database: 'assets',
    username: 'root',
    password: 'secret',
    ssl: true,
  }), {
    provider: 'mysql',
    redactedSummary: 'root@db.example.com:3306/assets (SSL)',
  })
  assert.deepEqual(redactKodoProfile({
    accessKey: 'ak',
    secretKey: 'sk',
    bucket: 'bucket',
    region: 'z0',
    domain: 'https://cdn.example.com',
  }), {
    provider: 'qiniu_kodo',
    redactedSummary: 'bucket@z0 https://cdn.example.com',
  })
})

test('kodo profile validation requires access key, secret key, bucket, and region', () => {
  assert.deepEqual(validateKodoProfileInput({
    accessKey: 'ak',
    secretKey: 'sk',
    bucket: 'bucket',
    region: 'z0',
    domain: '',
  }), [])
  assert.match(validateKodoProfileInput({
    accessKey: '',
    secretKey: '',
    bucket: '',
    region: '',
    domain: '',
  }).join('\n'), /Access Key/)
})
```

Add `src/appStructure.test.ts` guard:

```ts
test('remote secrets stay behind the desktop api boundary', () => {
  const desktopApiSource = readFileSync('src/desktopApi.ts', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const rendererProjectSource = readFileSync('src/components/ProjectStorage/projectRemoteProfiles.ts', 'utf8')

  assert.match(desktopApiSource, /saveProjectConnectionProfile/)
  assert.match(desktopApiSource, /verifyProjectDatabaseProfile/)
  assert.match(desktopApiSource, /verifyProjectKodoProfile/)
  assert.match(preloadSource, /project-profile:save/)
  assert.match(mainSource, /project-profile:save/)
  assert.doesNotMatch(rendererProjectSource, /encrypted_payload/)
})
```

Add the profile test to `package.json`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because remote profile helpers and desktop APIs do not exist.

- [ ] **Step 3: Implement profile validation and redaction**

Create `src/components/ProjectStorage/projectRemoteProfiles.ts`:

```ts
export interface DatabaseProfileInput {
  provider: 'postgresql' | 'mysql'
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
}

export interface KodoProfileInput {
  accessKey: string
  secretKey: string
  bucket: string
  region: string
  domain: string
}

export function validateDatabaseProfileInput(input: DatabaseProfileInput): string[] {
  const errors: string[] = []
  if (input.provider !== 'postgresql' && input.provider !== 'mysql') errors.push('数据库类型必须是 PostgreSQL 或 MySQL')
  if (!input.host.trim()) errors.push('缺少数据库主机')
  if (!Number.isInteger(input.port) || input.port <= 0) errors.push('数据库端口无效')
  if (!input.database.trim()) errors.push('缺少数据库名')
  if (!input.username.trim()) errors.push('缺少数据库用户名')
  if (!input.password) errors.push('缺少数据库密码')
  return errors
}

export function validateKodoProfileInput(input: KodoProfileInput): string[] {
  const errors: string[] = []
  if (!input.accessKey.trim()) errors.push('缺少 Access Key')
  if (!input.secretKey.trim()) errors.push('缺少 Secret Key')
  if (!input.bucket.trim()) errors.push('缺少 Bucket')
  if (!input.region.trim()) errors.push('缺少 Region')
  return errors
}

export function redactDatabaseProfile(input: DatabaseProfileInput) {
  return {
    provider: input.provider,
    redactedSummary: `${input.username}@${input.host}:${input.port}/${input.database}${input.ssl ? ' (SSL)' : ''}`,
  }
}

export function redactKodoProfile(input: KodoProfileInput) {
  return {
    provider: 'qiniu_kodo' as const,
    redactedSummary: `${input.bucket}@${input.region}${input.domain ? ` ${input.domain}` : ''}`,
  }
}
```

- [ ] **Step 4: Add desktop API types and IPC stubs**

Modify `src/desktopApi.ts`:

```ts
export interface ProjectConnectionProfileSummary {
  id: string
  type: 'database' | 'qiniu_kodo'
  displayName: string
  redactedSummary: string
  lastVerifiedAt: string | null
}

export interface ProjectConnectionVerificationResult {
  ok: boolean
  message: string
  lastVerifiedAt: string | null
}
```

Add to `GameDesignToolsDesktopApi`:

```ts
listProjectConnectionProfiles(type?: 'database' | 'qiniu_kodo'): Promise<ProjectConnectionProfileSummary[]>
saveProjectConnectionProfile(input: unknown): Promise<ProjectConnectionProfileSummary>
deleteProjectConnectionProfile(profileId: string): Promise<boolean>
verifyProjectDatabaseProfile(profileId: string): Promise<ProjectConnectionVerificationResult>
initializeProjectDatabaseSchema(profileId: string, dialect: 'postgresql' | 'mysql'): Promise<ProjectConnectionVerificationResult>
verifyProjectKodoProfile(profileId: string, projectId: string): Promise<ProjectConnectionVerificationResult>
```

Add matching channels to `electron/preload.cjs`.

In `electron/main.cjs`, add encrypted-profile store placeholders under `app.getPath('userData')`. First version can store JSON with a clear `encryptedPayload` placeholder and return redacted summaries, but do not return raw profile payloads to renderer.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit Task 8**

```powershell
git add package.json src/desktopApi.ts electron/preload.cjs electron/main.cjs src/components/ProjectStorage/projectRemoteProfiles.ts src/components/ProjectStorage/projectRemoteProfiles.test.ts src/appStructure.test.ts
git commit -m "feat: add remote profile desktop boundary"
```

## Task 9: Remote Configuration UI and Verification Workflow

**Files:**
- Modify: `src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpace.css`
- Modify: `src/appStructure.test.ts`

- [ ] **Step 1: Write failing structure guard for remote settings UI**

Add to `src/appStructure.test.ts`:

```ts
test('project settings exposes remote database and qiniu kodo configuration', () => {
  const panelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx', 'utf8')
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8')

  assert.match(panelSource, /远程数据库/)
  assert.match(panelSource, /PostgreSQL/)
  assert.match(panelSource, /MySQL/)
  assert.match(panelSource, /七牛 Kodo/)
  assert.match(panelSource, /测试连接/)
  assert.match(panelSource, /初始化表结构/)
  assert.match(panelSource, /验证 Kodo/)
  assert.match(hookSource, /verifyProjectDatabaseProfile/)
  assert.match(hookSource, /initializeProjectDatabaseSchema/)
  assert.match(hookSource, /verifyProjectKodoProfile/)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because settings UI does not expose remote project configuration.

- [ ] **Step 3: Add remote settings state and actions**

Modify `usePersonalSpaceSettingsWorkspace.ts` to expose:

```ts
databaseProfiles
kodoProfiles
selectedDatabaseProfileId
selectedKodoProfileId
saveDatabaseProfile
saveKodoProfile
verifyDatabaseProfile
initializeDatabaseSchema
verifyKodoProfile
remoteReady
```

Use `getDesktopApi()` methods from Task 8. Remote-ready is true only when both selected profiles verified successfully.

- [ ] **Step 4: Add UI controls**

Modify `PersonalSettingsPanel.tsx`:

- Add a `远程数据库` section with provider select (`PostgreSQL`, `MySQL`), host, port, database, username, password, SSL switch, save button, profile selector, test button, and initialize schema button.
- Add a `七牛 Kodo` section with access key, secret key, bucket, region, domain, save button, profile selector, and verify button.
- Add a remote migration button disabled until `remoteReady`.

- [ ] **Step 5: Run tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit Task 9**

```powershell
git add src/components/PersonalSpaceWorkspace src/appStructure.test.ts
git commit -m "feat: add remote project configuration ui"
```

## Task 10: Local-to-Remote Migration Service and Project Hard Delete Cleanup

**Files:**
- Create: `src/components/ProjectStorage/projectMigrationService.test.ts`
- Create: `src/components/ProjectStorage/projectMigrationService.ts`
- Modify: `src/components/ProjectStorage/projectSqliteRepository.ts`
- Modify: `src/components/ProjectStorage/index.ts`
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing migration and cleanup tests**

Create `src/components/ProjectStorage/projectMigrationService.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { migrateLocalProjectToRemote, hardDeleteProjectWithObjects } from './projectMigrationService'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import { createMemoryProjectRepository } from './projectSqliteRepository'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createPersonalSpaceAsset, defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

test('local to remote migration keeps project local when object upload fails', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
  const voice = createPersonalSpaceAsset({ kind: 'voice', assetSubtype: 'character_voice', name: '欢迎', resourcePaths: ['welcome.wav'] })
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

test('hard delete records cleanup failures for object deletion', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  const voice = createPersonalSpaceAsset({ kind: 'voice', assetSubtype: 'character_voice', name: '欢迎', resourcePaths: ['welcome.wav'] })
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
```

Add the test to `package.json`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because migration service does not exist and repository lacks mode/cleanup helpers.

- [ ] **Step 3: Implement migration service**

Create `src/components/ProjectStorage/projectMigrationService.ts`:

```ts
import { createProjectStorageId } from './projectId'
import type { ProjectObjectStorage } from './projectObjectStorage'
import type { ProjectRepository } from './projectSqliteRepository'

export interface LocalToRemoteMigrationInput {
  projectId: string
  localRepository: ProjectRepository
  remoteRepository: ProjectRepository
  uploadObject(objectKey: string): Promise<void>
  now: string
}

export async function migrateLocalProjectToRemote(input: LocalToRemoteMigrationInput) {
  const project = await input.localRepository.getProject(input.projectId)
  if (!project) throw new Error('项目不存在')
  const assets = await input.localRepository.listAssets(input.projectId)
  try {
    for (const asset of assets) {
      await input.uploadObject(asset.primary_object_key)
      if (asset.sprite_index_object_key) await input.uploadObject(asset.sprite_index_object_key)
    }
    await input.remoteRepository.importProjectRows({
      project: { ...project.project, mode: 'remote', updated_at: input.now },
      settings: {
        ...project.settings,
        storage_provider: 'qiniu_kodo',
        database_provider: project.settings.database_provider === 'sqlite' ? 'postgresql' : project.settings.database_provider,
        local_object_root: null,
        updated_at: input.now,
      },
      assetGroups: [],
      assets,
      characters: [],
      characterAssetLinks: [],
      storyboardGroups: [],
      storyboardVoiceEntries: [],
      assetRelations: [],
    })
    return { status: 'succeeded' as const, errorMessage: '' }
  } catch (error) {
    return { status: 'failed' as const, errorMessage: error instanceof Error ? error.message : String(error) }
  }
}

export async function hardDeleteProjectWithObjects(input: {
  projectId: string
  repository: ProjectRepository
  objectStorage: ProjectObjectStorage
  now: string
}) {
  const assets = await input.repository.listAssets(input.projectId)
  const objectKeys = assets.flatMap((asset) => [
    asset.primary_object_key,
    ...(asset.sprite_index_object_key ? [asset.sprite_index_object_key] : []),
  ])
  const result = await input.objectStorage.deleteObjects(objectKeys)
  await input.repository.deleteProject(input.projectId)
  return {
    deletedProject: true,
    cleanupTasks: result.failed.map((failure) => ({
      id: createProjectStorageId(),
      project_id: input.projectId,
      storage_provider: 'local' as const,
      object_key: failure.objectKey,
      status: 'pending' as const,
      error_message: failure.errorMessage,
      created_at: input.now,
      updated_at: input.now,
    })),
  }
}
```

Export from `src/components/ProjectStorage/index.ts`.

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 5: Wire UI actions**

Modify `usePersonalSpaceWorkspace.ts`:

- Project delete calls `hardDeleteProjectWithObjects`.
- Local-to-remote button calls `migrateLocalProjectToRemote` after settings verification succeeds.
- If migration fails, show the failure message and keep the local project active.

- [ ] **Step 6: Run tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit Task 10**

```powershell
git add package.json src/components/ProjectStorage src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts
git commit -m "feat: add project migration and hard delete cleanup"
```

## Task 11: Storyboard Playback Scheduler for Microsecond Offsets

**Files:**
- Create: `src/components/ProjectStorage/projectStoryboardPlayback.test.ts`
- Create: `src/components/ProjectStorage/projectStoryboardPlayback.ts`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/storyboardPlaybackSources.ts`
- Modify: `src/appStructure.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing scheduler tests**

Create `src/components/ProjectStorage/projectStoryboardPlayback.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { scheduleStoryboardVoiceStarts } from './projectStoryboardPlayback'

test('storyboard scheduler delays or overlaps entries using microsecond offsets', () => {
  const schedule = scheduleStoryboardVoiceStarts([
    { id: 'a', durationUs: 1_000_000, startOffsetUs: 0 },
    { id: 'b', durationUs: 800_000, startOffsetUs: -200_000 },
    { id: 'c', durationUs: 500_000, startOffsetUs: 300_000 },
  ])

  assert.deepEqual(schedule, [
    { id: 'a', startAtUs: 0, endAtUs: 1_000_000 },
    { id: 'b', startAtUs: 800_000, endAtUs: 1_600_000 },
    { id: 'c', startAtUs: 1_900_000, endAtUs: 2_400_000 },
  ])
})
```

Add guard to `src/appStructure.test.ts`:

```ts
test('storyboard playback scheduling is delegated outside the panel', () => {
  const panelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8')
  const schedulerSource = readFileSync('src/components/ProjectStorage/projectStoryboardPlayback.ts', 'utf8')

  assert.match(panelSource, /scheduleStoryboardVoiceStarts/)
  assert.match(schedulerSource, /startOffsetUs/)
  assert.doesNotMatch(panelSource, /onEnded=\{playNextStoryboardVoice\}/)
})
```

Add the scheduler test to `package.json`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because scheduler does not exist.

- [ ] **Step 3: Implement scheduler**

Create `src/components/ProjectStorage/projectStoryboardPlayback.ts`:

```ts
export interface StoryboardPlaybackInput {
  id: string
  durationUs: number
  startOffsetUs: number
}

export interface StoryboardPlaybackScheduleItem {
  id: string
  startAtUs: number
  endAtUs: number
}

export function scheduleStoryboardVoiceStarts(entries: StoryboardPlaybackInput[]): StoryboardPlaybackScheduleItem[] {
  const schedule: StoryboardPlaybackScheduleItem[] = []
  let previousEndUs = 0
  for (const entry of entries) {
    const startAtUs = Math.max(0, previousEndUs + Math.trunc(entry.startOffsetUs))
    const endAtUs = startAtUs + Math.max(0, Math.trunc(entry.durationUs))
    schedule.push({ id: entry.id, startAtUs, endAtUs })
    previousEndUs = endAtUs
  }
  return schedule
}
```

Export from `src/components/ProjectStorage/index.ts`.

- [ ] **Step 4: Wire storyboard panel to scheduler**

Modify `PersonalStoryboardPanel.tsx` playback code:

- Collect durations for selected voice assets.
- Call `scheduleStoryboardVoiceStarts`.
- Start each audio with `setTimeout` based on `startAtUs`.
- Allow overlap for negative offsets.
- Stop playback clears all timers and pauses all active audio elements.

- [ ] **Step 5: Run tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit Task 11**

```powershell
git add package.json src/components/ProjectStorage src/components/PersonalSpaceWorkspace src/appStructure.test.ts
git commit -m "feat: schedule storyboard voice offsets"
```

## Task 12: Final Architecture Guards and Verification

**Files:**
- Modify: `src/appStructure.test.ts`
- Modify: `docs/current-version-reference.md` only if the user asks to update the reference doc

- [ ] **Step 1: Add final architecture guards**

Add tests to `src/appStructure.test.ts`:

```ts
test('project storage boundaries keep database and object storage out of workspace entries', () => {
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const projectStorageSource = readFileSync('src/components/ProjectStorage/projectAssetCollectionService.ts', 'utf8')

  assert.doesNotMatch(workspaceSource, /projectSqliteRepository/)
  assert.doesNotMatch(workspaceSource, /projectLocalObjectStorage/)
  assert.match(hookSource, /projectAssetCollectionService|createProjectAssetFromCollection|createMemoryProjectRepository/)
  assert.match(projectStorageSource, /createProjectAssetFromCollection/)
})

test('removed tag and note features do not return to project space', () => {
  const projectSpaceSource = [
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalCharacterPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceSections.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8'),
  ].join('\n')

  assert.doesNotMatch(projectSpaceSource, /关联备注/)
  assert.doesNotMatch(projectSpaceSource, /noteName/)
  assert.doesNotMatch(projectSpaceSource, /tags_json/)
  assert.doesNotMatch(projectSpaceSource, /标签/)
})
```

- [ ] **Step 2: Run final verification**

Run:

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected:

- `npm test` passes.
- `npm run build` passes.
- `git diff --check` prints no errors.
- `git status --short --branch` shows only intentional commits and the already-untracked `docs/current-version-reference.md` if the user still wants it uncommitted.

- [ ] **Step 3: Manual UI smoke check**

Run a local preview:

```powershell
npx vite --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173` in the in-app browser and verify:

- App shell opens `项目空间`.
- Local project can be created, edited, selected, and deleted.
- Asset, character, and storyboard panels no longer show tag or note controls.
- Storyboard voice rows show offset control in microseconds.
- Settings shows remote DB + Qiniu Kodo configuration and verification actions.
- Remote migration action stays disabled until both profiles verify.

- [ ] **Step 4: Commit final guards**

```powershell
git add src/appStructure.test.ts
git commit -m "test: guard project storage architecture"
```

