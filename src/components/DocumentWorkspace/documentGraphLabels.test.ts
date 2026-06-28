import assert from 'node:assert/strict'
import test from 'node:test'

import {
  documentGraphEdgeTypeLabel,
  documentGraphEntityRoleLabel,
  documentGraphNodeTypeLabel,
} from './documentGraphLabels'

test('document graph filter labels use Chinese names', () => {
  assert.equal(documentGraphEntityRoleLabel('term'), '词条')
  assert.equal(documentGraphEntityRoleLabel('place'), '属地')
  assert.equal(documentGraphEntityRoleLabel('category'), '类目')
  assert.equal(documentGraphNodeTypeLabel('entity'), '词条实体')
  assert.equal(documentGraphNodeTypeLabel('descriptor'), '描述特征')
  assert.equal(documentGraphNodeTypeLabel('description_group'), '描述')
  assert.equal(documentGraphEdgeTypeLabel('HAS_CATEGORY_2'), '二级类目')
  assert.equal(documentGraphEdgeTypeLabel('site_relation'), '详情页关系')
})
