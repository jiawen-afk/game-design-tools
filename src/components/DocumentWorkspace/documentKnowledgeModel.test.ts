import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createDocumentSearchText,
  getKnowledgeBaseAdapter,
  listKnowledgeBaseAdapters,
} from './documentKnowledgeModel'

test('document search text flattens values and removes duplicate whitespace', () => {
  assert.equal(
    createDocumentSearchText(['傲徕', '  其状如牛  ', ['动物', '兽名'], undefined, '', '动物']),
    '傲徕 其状如牛 动物 兽名',
  )
})

test('knowledge base adapter registry exposes shj entity graph without graph json compatibility', () => {
  const adapters = listKnowledgeBaseAdapters()
  const adapter = getKnowledgeBaseAdapter('shj_nlc_graph')

  assert.equal(adapter?.displayName, '山海经实体图谱')
  assert.deepEqual(adapter?.acceptedFileNames, ['entity_graph.json'])
  assert.equal(adapters.some((item) => item.sourceType === 'shj_nlc_graph'), true)
  assert.equal(getKnowledgeBaseAdapter('unknown_source'), null)
})
