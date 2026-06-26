import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createMemoryProjectRepository } from './projectSqliteRepository'

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
  assert.equal(project.project.object_key_prefix, 'objects/本地项目')
  assert.equal(project.settings.database_provider, 'sqlite')
  assert.equal(project.settings.storage_provider, 'local')
  assert.equal(project.settings.local_object_root, 'D:\\GameAssets')
  assert.deepEqual((await repository.listProjects()).map((item) => item.name), ['本地项目'])
})

test('local project repository imports migrated rows and hard deletes project rows', async () => {
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
  assert.equal((await repository.getProject('p1'))!.project.name, '默认项目')
  assert.equal((await repository.listAssets('p1')).length, 1)

  await repository.deleteProject('p1')
  assert.deepEqual(await repository.listProjects(), [])
  assert.equal(await repository.getProject('p1'), null)
  assert.deepEqual(await repository.listAssets('p1'), [])
})

test('local project repository exports the complete project row set', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [voice] }, '商人')
  state = addStoryboardGroup(state, '开场')
  state = assignAssetToCharacterColumn(state, state.characters[0]!.id, voice.id, 'voice')
  state = assignVoiceToStoryboardGroup(state, state.storyboardGroups[0]!.id, voice.id, '欢迎')
  const rows = migratePersonalSpaceStateToProjectRows(state, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })

  await repository.importProjectRows(rows)

  assert.deepEqual(await repository.exportProjectRows('p1'), rows)
})

test('local project repository exports normalized document knowledge row sets', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  const rows = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  const documentRows = {
    documentCollections: [{
      id: 'collection-1',
      project_id: 'p1',
      name: '山海经实体图谱',
      description: '',
      source_type: 'shj_nlc_graph',
      status: 'ready',
      record_count: 1,
      node_count: 2,
      edge_count: 1,
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      imported_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentSources: [{
      id: 'source-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      role: 'entity_graph',
      file_name: 'entity_graph.json',
      mime_group: 'application' as const,
      mime_type: 'application/json',
      extension: 'json',
      size_bytes: 128,
      hash_sha256: 'sha256-1',
      encoding: 'utf-8',
      created_at: '2026-06-23T00:00:00.000Z',
      metadata_json: '{"sourceType":"shj_nlc_graph"}',
    }],
    documentSourceContents: [{
      source_id: 'source-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      content_text: '{"nodes":{},"edges":{}}',
      content_encoding: 'utf-8',
      size_bytes: 22,
      hash_sha256: 'sha256-1',
      created_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentRecords: [{
      id: 'record-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      source_id: 'source-1',
      external_id: '830',
      record_type: 'term',
      title: '傲徕',
      description: '实体描述',
      category_1: '兽',
      category_2: '异兽',
      category_3: null,
      place_path: '南山经',
      book_title: '山海经',
      chapter_title: '南山经',
      version_title: 'NLC',
      usage_text: '可用',
      effect_text: '有效',
      source_url: 'https://example.test/830',
      search_text: '傲徕 兽 异兽 南山经',
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentNodes: [{
      id: 'node-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'entity:傲徕',
      node_type: 'entity',
      label: '傲徕',
      description: '实体描述',
      search_text: '傲徕 兽 异兽 南山经',
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }, {
      id: 'node-2',
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'descriptor:有角',
      node_type: 'descriptor',
      label: '有角',
      description: '',
      search_text: '有角',
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentEdges: [{
      id: 'edge-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'edge-1',
      source_node_id: 'node-1',
      target_node_id: 'node-2',
      edge_type: 'site_relation',
      label: '关联',
      weight: 1,
      source_kind: 'entity_graph',
      created_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentNodeRecordLinks: [{
      id: 'node-record-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      node_id: 'node-1',
      record_id: 'record-1',
      link_role: 'primary',
      created_at: '2026-06-23T00:00:00.000Z',
    }],
    documentEdgeRecordLinks: [{
      id: 'edge-record-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      edge_id: 'edge-1',
      record_id: 'record-1',
      created_at: '2026-06-23T00:00:00.000Z',
    }],
    documentImportRuns: [{
      id: 'import-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      source_type: 'shj_nlc_graph',
      status: 'succeeded',
      started_at: '2026-06-23T00:00:00.000Z',
      finished_at: '2026-06-23T00:00:00.000Z',
      total_records: 1,
      total_nodes: 2,
      total_edges: 1,
      imported_records: 1,
      imported_nodes: 2,
      imported_edges: 1,
      error_message: null,
      report_json: null,
    }],
  }

  await repository.importProjectRows({ ...rows, ...documentRows })
  const exported = await repository.exportProjectRows('p1') as unknown as Record<string, unknown>

  assert.deepEqual(exported.documentCollections, documentRows.documentCollections)
  assert.deepEqual(exported.documentSources, documentRows.documentSources)
  assert.deepEqual(exported.documentSourceContents, documentRows.documentSourceContents)
  assert.deepEqual(exported.documentRecords, documentRows.documentRecords)
  assert.deepEqual(exported.documentNodes, documentRows.documentNodes)
  assert.deepEqual(exported.documentEdges, documentRows.documentEdges)
  assert.deepEqual(exported.documentNodeRecordLinks, documentRows.documentNodeRecordLinks)
  assert.deepEqual(exported.documentEdgeRecordLinks, documentRows.documentEdgeRecordLinks)
  assert.deepEqual(exported.documentImportRuns, documentRows.documentImportRuns)
  assert.equal('content_text' in documentRows.documentSources[0], false)
  assert.equal('content_blob' in documentRows.documentSources[0], false)

  assert.deepEqual(await repository.getDocumentSourceContent('p1', 'source-1'), documentRows.documentSourceContents[0])
  const graph = await repository.getDocumentCollectionGraph('p1', 'collection-1')
  assert.equal(graph.nodes['node-1']?.label, '傲徕')
  assert.deepEqual(graph.nodes['node-1']?.records, ['record-1'])
  assert.equal((graph.nodes['node-1']?.data.term_record as { title?: string }).title, '傲徕')
  assert.equal(graph.edges['edge-1']?.source, 'node-1')
  assert.deepEqual(graph.edges['edge-1']?.record_ids, ['record-1'])
})

test('local project repository updates project name and description', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createProject({
    name: '旧项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-23T00:00:00.000Z',
  })

  await repository.updateProject(created.project.id, {
    name: '新项目',
    description: '项目说明',
    updatedAt: '2026-06-24T00:00:00.000Z',
  })

  const updated = await repository.getProject(created.project.id)
  assert.equal(updated!.project.name, '新项目')
  assert.equal(updated!.project.description, '项目说明')
  assert.equal(updated!.project.updated_at, '2026-06-24T00:00:00.000Z')
})

test('local project repository creates remote projects only with remote settings', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createRemoteProject({
    id: 'remote-p1',
    name: '远程项目',
    description: '团队资产',
    databaseProvider: 'mysql',
    databaseProfileId: 'db1',
    storageProfileId: 'kodo1',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(created.project.id, 'remote-p1')
  assert.equal(created.project.mode, 'remote')
  assert.equal(created.project.object_key_prefix, 'objects/远程项目')
  assert.equal(created.settings.storage_provider, 'qiniu_kodo')
  assert.equal(created.settings.database_provider, 'mysql')
  assert.equal(created.settings.local_object_root, null)
  assert.equal(created.settings.remote_database_profile_id, null)
  assert.equal(created.settings.remote_storage_profile_id, null)
})

test('local project repository keeps device profile ids out of shared project settings', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createRemoteProject({
    id: 'remote-p1',
    name: '远程项目',
    description: '团队资产',
    databaseProvider: 'postgresql',
    databaseProfileId: 'db1',
    storageProfileId: 'kodo1',
    now: '2026-06-23T00:00:00.000Z',
  })

  const updated = await repository.updateProject(created.project.id, {
    name: '远程项目',
    description: '团队资产',
    updatedAt: '2026-06-24T00:00:00.000Z',
    databaseProvider: 'mysql',
    databaseProfileId: 'db2',
    storageProfileId: 'kodo2',
  })

  assert.equal(updated!.settings.database_provider, 'mysql')
  assert.equal(updated!.settings.remote_database_profile_id, null)
  assert.equal(updated!.settings.remote_storage_profile_id, null)
  assert.equal(updated!.settings.updated_at, '2026-06-24T00:00:00.000Z')
  assert.equal((await repository.getProject(created.project.id))!.settings.remote_storage_profile_id, null)
})

test('local project repository clears legacy shared device profile ids when renaming remote project', async () => {
  const repository = createMemoryProjectRepository()
  const rows = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
    projectId: 'remote-p1',
    projectName: '远程项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: '',
  })
  await repository.importProjectRows({
    ...rows,
    project: {
      ...rows.project,
      mode: 'remote',
    },
    settings: {
      ...rows.settings,
      storage_provider: 'qiniu_kodo',
      database_provider: 'postgresql',
      local_object_root: null,
      remote_database_profile_id: 'old-device-db',
      remote_storage_profile_id: 'old-device-kodo',
    },
  })

  const updated = await repository.updateProject('remote-p1', {
    name: '远程项目新名称',
    description: '团队资产',
    updatedAt: '2026-06-24T00:00:00.000Z',
  })

  assert.equal(updated!.settings.remote_database_profile_id, null)
  assert.equal(updated!.settings.remote_storage_profile_id, null)
  assert.equal((await repository.exportProjectRows('remote-p1'))!.settings.remote_database_profile_id, null)
  assert.equal((await repository.exportProjectRows('remote-p1'))!.settings.remote_storage_profile_id, null)
})
