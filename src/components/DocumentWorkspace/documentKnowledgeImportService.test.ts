import test from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryProjectRepository } from '../ProjectStorage/projectSqliteRepository'
import type { ReplaceDocumentGraphInput } from '../ProjectStorage/projectSqliteRepository'
import { importKnowledgeBaseFile } from './documentKnowledgeImportService'

const now = '2026-06-26T00:00:00.000Z'

function entityGraphText(name: string, recordId: string) {
  return JSON.stringify({
    nodes: {
      [`entity:${name}`]: {
        id: `entity:${name}`,
        label: name,
        type: 'entity',
        records: [recordId],
        data: {
          roles: ['term'],
          category_paths: [['动物', '兽名']],
          term_record: {
            source_id: recordId,
            glx_id: `GJSH-${recordId}`,
            name,
            category_1: '动物',
            category_2: '兽名',
            category_3: '',
            description: `${name}的描述`,
            usage: '用于角色设定',
            effect: '补充异兽特征',
            place_path: '西山经-西次三经',
            book_title: '山海经十八卷',
            chapter_title: '西山经第二',
            version: '宋淳熙七年池阳郡斋刻本',
            source_url: `https://example.test/${recordId}`,
            site_graph_nodes: [{ id: 1, name }],
            site_graph_edges: [{ source: '1', target: '2', value: '描述' }],
          },
        },
      },
      [`descriptor:${name}:四角`]: {
        id: `descriptor:${name}:四角`,
        label: '四角',
        type: 'descriptor',
        records: [recordId],
        data: { descriptor_type: 'description' },
      },
    },
    edges: {
      [`edge:${recordId}`]: {
        id: `edge:${recordId}`,
        source: `entity:${name}`,
        target: `descriptor:${name}:四角`,
        type: 'site_relation',
        label: '描述',
        weight: 1,
        record_ids: [recordId],
        source_kind: 'record',
      },
    },
  })
}

function fileLike(name: string, text: string) {
  return {
    name,
    size: text.length,
    text: async () => text,
  }
}

test('imports entity graph files as normalized document rows without raw JSON source storage', async () => {
  const repository = createMemoryProjectRepository()
  const originalReplaceDocumentGraph = repository.replaceDocumentGraph.bind(repository)
  let replacedInput: ReplaceDocumentGraphInput | null = null
  repository.replaceDocumentGraph = async (input: ReplaceDocumentGraphInput) => {
    replacedInput = input
    return originalReplaceDocumentGraph(input)
  }
  const created = await repository.createProject({
    name: '山海再就业',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now,
  })

  const fileText = entityGraphText('傲徕', '830')
  const file = fileLike('entity_graph.json', fileText)
  const result = await importKnowledgeBaseFile({
    repository,
    projectId: created.project.id,
    collectionName: '山海经实体图谱',
    file,
    now,
  })

  assert.equal(result.collection.status, 'ready')
  assert.equal(result.collection.record_count, 1)
  assert.equal(result.collection.node_count, 2)
  assert.equal(result.collection.edge_count, 1)

  const collections = await repository.listDocumentCollections(created.project.id)
  assert.deepEqual(collections.map((collection) => collection.name), ['山海经实体图谱'])
  const sources = await repository.listDocumentSources(created.project.id, result.collection.id)
  assert.equal(sources[0]?.file_name, 'entity_graph.json')
  assert.equal(sources[0]?.hash_sha256?.length, 64)
  assert.equal('content_text' in sources[0]!, false)
  assert.equal('content_blob' in sources[0]!, false)
  assert.equal(replacedInput?.sourceContents.length, 1)
  assert.equal(replacedInput?.sourceContents[0]?.source_id, replacedInput?.sources[0]?.id)
  assert.equal(replacedInput?.sourceContents[0]?.content_text, fileText)
  assert.equal(replacedInput?.sourceContents[0]?.content_encoding, 'utf-8')
  assert.equal(replacedInput?.sourceContents[0]?.size_bytes, file.size)
  assert.equal(replacedInput?.sourceContents[0]?.hash_sha256, replacedInput?.sources[0]?.hash_sha256)
  assert.equal(replacedInput?.sources[0] && 'content_text' in replacedInput.sources[0], false)

  const sourceContent = await repository.getDocumentSourceContent(created.project.id, sources[0]!.id)
  assert.equal(sourceContent?.content_text, fileText)

  const recordSearch = await repository.searchDocumentRecords({
    projectId: created.project.id,
    collectionId: result.collection.id,
    query: '西次三经',
  })
  assert.equal(recordSearch.total, 1)
  assert.equal(recordSearch.items[0]?.title, '傲徕')

  const nodeSearch = await repository.searchDocumentNodes({
    projectId: created.project.id,
    collectionId: result.collection.id,
    query: '四角',
  })
  assert.equal(nodeSearch.total, 1)
  assert.equal(nodeSearch.items[0]?.label, '四角')

  const details = await repository.getDocumentNode(created.project.id, nodeSearch.items[0]!.id)
  assert.equal(details?.records[0]?.external_id, '830')
  assert.equal((await repository.listDocumentNeighbors(created.project.id, details!.node.id)).length, 1)
})

test('reimporting the same knowledge collection replaces old normalized rows', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createProject({
    name: '山海再就业',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now,
  })

  const first = await importKnowledgeBaseFile({
    repository,
    projectId: created.project.id,
    collectionName: '山海经实体图谱',
    file: fileLike('entity_graph.json', entityGraphText('傲徕', '830')),
    now,
  })
  const second = await importKnowledgeBaseFile({
    repository,
    projectId: created.project.id,
    collectionName: '山海经实体图谱',
    file: fileLike('entity_graph.json', entityGraphText('旋龟', '901')),
    now: '2026-06-26T01:00:00.000Z',
  })

  assert.equal(second.collection.id, first.collection.id)
  assert.equal((await repository.searchDocumentNodes({ projectId: created.project.id, query: '傲徕' })).total, 0)
  assert.equal((await repository.searchDocumentNodes({ projectId: created.project.id, query: '旋龟' })).total, 1)

  await repository.deleteDocumentCollection(created.project.id, second.collection.id)
  assert.deepEqual(await repository.listDocumentCollections(created.project.id), [])
  assert.equal((await repository.searchDocumentRecords({ projectId: created.project.id, query: '旋龟' })).total, 0)
})

test('import service reports staged progress with converted row counts', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createProject({
    name: '山海再就业',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now,
  })
  const progressEvents: Array<{
    stage: string
    percent: number
    counts?: { records: number; nodes: number; edges: number }
  }> = []

  await importKnowledgeBaseFile({
    repository,
    projectId: created.project.id,
    collectionName: '山海经实体图谱',
    file: fileLike('entity_graph.json', entityGraphText('傲徕', '830')),
    now,
    onProgress: (event) => progressEvents.push(event),
  })

  assert.deepEqual(
    progressEvents.map((event) => event.stage),
    ['reading', 'hashing', 'checking-existing', 'converting', 'writing', 'done'],
  )
  assert.deepEqual(progressEvents.at(-1)?.counts, { records: 1, nodes: 2, edges: 1 })
  assert.equal(progressEvents.at(-1)?.percent, 100)
})

test('import service rejects graph json compatibility input', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createProject({
    name: '山海再就业',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now,
  })

  await assert.rejects(
    () => importKnowledgeBaseFile({
      repository,
      projectId: created.project.id,
      collectionName: '山海经实体图谱',
      file: fileLike('graph.json', entityGraphText('傲徕', '830')),
      now,
    }),
    /entity_graph\.json/,
  )
})
