import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { assertFocusedStructureFiles } from './appStructureTestHelpers.test'

test('document structure tests stay split by document responsibility', () => {
  const source = readFileSync('src/documentStructure.test.ts', 'utf8')
  const focusedSuites = [
    'src/documentWorkspaceBoundaryStructure.test.ts',
    'src/documentWorkspaceStyleStructure.test.ts',
    'src/documentGraphStructure.test.ts',
    'src/documentKnowledgeImportStructure.test.ts',
  ]

  assertFocusedStructureFiles(focusedSuites)
  assert.ok(source.split(/\r?\n/).length <= 100, 'documentStructure.test.ts should only keep split guards')
  for (const delegatedToken of [
    'panels free of ' + 'storage adapters',
    'hook delegates collection ' + 'loading',
    'styles stay split ' + 'by panel responsibility',
    'category tree filtering ' + 'to a focused component',
    'graph view model ' + 'stays pure',
    'adapter registry ' + 'instead of graph rendering',
    'concrete adapters ' + 'are only wired',
    'shj graph import adapter ' + 'delegates parsing',
    'tabbed results and ' + 'skeleton loading',
    'Ant Design v6 ' + 'alert title prop',
    'raw graph field assumptions ' + 'stay in focused',
    'only advertise entity graph ' + 'json support',
    'routes graph node clicks ' + 'through node actions',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
