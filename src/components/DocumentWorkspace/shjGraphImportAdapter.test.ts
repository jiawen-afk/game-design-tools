import test from 'node:test'
import assert from 'node:assert/strict'

import { createDocumentSearchText } from './documentKnowledgeModel'
import { shjGraphImportAdapter } from './shjGraphImportAdapter'

const now = '2026-06-26T00:00:00.000Z'

function sourceInput(text: string, fileName = 'entity_graph.json') {
  return {
    projectId: 'p1',
    collectionId: 'collection-1',
    sourceId: 'source-1',
    fileName,
    text,
    sizeBytes: text.length,
    hashSha256: 'hash-1',
    now,
  }
}

const validEntityGraphText = JSON.stringify({
  nodes: {
    'entity:傲徕': {
      id: 'entity:傲徕',
      label: '傲徕',
      type: 'entity',
      records: ['830'],
      data: {
        roles: ['term'],
        category_paths: [['动物', '兽名']],
        has_description: true,
        term_record: {
          source_id: '830',
          glx_id: 'GJSH20210001001SY0830',
          name: '傲徕',
          category_1: '动物',
          category_2: '兽名',
          category_3: '',
          description: '其状如牛，白身，四角。',
          usage: '可用于角色设定',
          effect: '补充异兽特征',
          place_path: '西山经-西次三经-三危之山',
          book_title: '山海经十八卷',
          chapter_title: '西山经第二',
          version: '宋淳熙七年池阳郡斋刻本',
          source_url: 'http://shj.nlc.cn/library/shjKgTerm/termView.jspx?id=830',
          site_graph_nodes: [{ id: 1, name: '傲徕' }],
          site_graph_edges: [{ source: '1', target: '2', value: '描述' }],
        },
      },
    },
    'descriptor:四角': {
      id: 'descriptor:四角',
      label: '四角',
      type: 'descriptor',
      records: ['830'],
      data: {
        descriptor_type: 'description',
      },
    },
  },
  edges: {
    'edge:1': {
      id: 'edge:1',
      source: 'entity:傲徕',
      target: 'descriptor:四角',
      type: 'site_relation',
      label: '描述',
      weight: 1,
      record_ids: ['830'],
      source_kind: 'record',
      data: {
        source_original_types: ['term'],
      },
    },
  },
})

test('shj adapter only accepts entity_graph.json', () => {
  assert.deepEqual(shjGraphImportAdapter.acceptedFileNames, ['entity_graph.json'])
  assert.equal(shjGraphImportAdapter.validateSource(sourceInput(validEntityGraphText)).ok, true)

  const invalid = shjGraphImportAdapter.validateSource(sourceInput(validEntityGraphText, 'graph.json'))
  assert.equal(invalid.ok, false)
  assert.match(invalid.errors.join('\n'), /entity_graph\.json/)
})

test('shj adapter converts entity graph JSON into normalized records nodes edges and links', () => {
  const rows = shjGraphImportAdapter.convertSource(sourceInput(validEntityGraphText))

  assert.equal(rows.sources.length, 1)
  assert.equal(rows.sources[0]?.file_name, 'entity_graph.json')
  assert.equal(rows.sources[0]?.hash_sha256, 'hash-1')
  assert.equal('content_text' in rows.sources[0]!, false)
  assert.equal('content_blob' in rows.sources[0]!, false)
  assert.equal(rows.records.length, 1)
  assert.equal(rows.records[0]?.external_id, '830')
  assert.equal(rows.records[0]?.title, '傲徕')
  assert.equal(rows.records[0]?.category_1, '动物')
  assert.equal(rows.records[0]?.category_2, '兽名')
  assert.equal(rows.records[0]?.category_3, null)
  assert.equal(rows.records[0]?.place_path, '西山经-西次三经-三危之山')
  assert.equal(rows.records[0]?.book_title, '山海经十八卷')
  assert.equal(rows.records[0]?.chapter_title, '西山经第二')
  assert.equal(rows.records[0]?.version_title, '宋淳熙七年池阳郡斋刻本')
  assert.equal(rows.records[0]?.usage_text, '可用于角色设定')
  assert.equal(rows.records[0]?.effect_text, '补充异兽特征')
  assert.equal(rows.records[0]?.source_url, 'http://shj.nlc.cn/library/shjKgTerm/termView.jspx?id=830')
  assert.match(rows.records[0]?.search_text ?? '', /傲徕/)
  assert.match(rows.records[0]?.search_text ?? '', /三危之山/)
  assert.equal(rows.nodes.length, 2)
  assert.equal(rows.nodes[0]?.external_id, 'entity:傲徕')
  assert.equal(rows.nodes[0]?.node_type, 'entity')
  assert.equal(rows.nodes[0]?.label, '傲徕')
  assert.equal(rows.edges.length, 1)
  assert.equal(rows.edges[0]?.external_id, 'edge:1')
  assert.equal(rows.edges[0]?.source_node_id, rows.nodes[0]?.id)
  assert.equal(rows.edges[0]?.target_node_id, rows.nodes[1]?.id)
  assert.equal(rows.edges[0]?.edge_type, 'site_relation')
  assert.equal(rows.nodeRecordLinks.length, 2)
  assert.equal(rows.edgeRecordLinks.length, 1)
})

test('shj adapter rejects edges that reference missing nodes', () => {
  const graph = JSON.parse(validEntityGraphText)
  graph.edges['edge:1'].target = 'descriptor:不存在'

  const result = shjGraphImportAdapter.validateSource(sourceInput(JSON.stringify(graph)))

  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /未知节点/)
})

test('shj adapter reports duplicate node external ids before database writes', () => {
  const graph = JSON.parse(validEntityGraphText)
  graph.nodes['entity:duplicate'] = {
    ...graph.nodes['descriptor:四角'],
    id: 'entity:傲徕',
  }

  const result = shjGraphImportAdapter.validateSource(sourceInput(JSON.stringify(graph)))

  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /重复节点/)
})

test('shj adapter does not copy the full source graph into row metadata', () => {
  const rows = shjGraphImportAdapter.convertSource(sourceInput(validEntityGraphText))
  const serializedRows = JSON.stringify([
    ...rows.records.map((row) => row.metadata_json),
    ...rows.nodes.map((row) => row.metadata_json),
    ...rows.edges.map((row) => row.metadata_json),
  ])
  const serializedMetadata = [
    ...rows.sources,
    ...rows.records,
    ...rows.nodes,
    ...rows.edges,
  ].map((row) => row.metadata_json ?? '').join('\n')

  assert.doesNotMatch(serializedMetadata, /site_graph_nodes/)
  assert.doesNotMatch(serializedMetadata, /site_graph_edges/)
  assert.doesNotMatch(serializedMetadata, /term_record/)
  assert.doesNotMatch(serializedMetadata, /"nodes"\s*:/)
  assert.doesNotMatch(serializedMetadata, /"edges"\s*:/)
  assert.equal(serializedRows.includes('"nodes"'), false)
  assert.equal(serializedRows.includes('"edges"'), false)
})

test('document search text normalizes parsed fields without raw JSON dependence', () => {
  assert.equal(
    createDocumentSearchText(['傲徕', ['动物', '兽名'], null, '  西山经  ']),
    '傲徕 动物 兽名 西山经',
  )
})
