import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

test('document graph view model tests stay split by model responsibility', () => {
  const source = readFileSync('src/components/DocumentWorkspace/documentGraphViewModel.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/DocumentWorkspace/documentGraphFilterModel.test.ts',
    'src/components/DocumentWorkspace/documentGraphCategoryModel.test.ts',
    'src/components/DocumentWorkspace/documentGraphLabels.test.ts',
    'src/components/DocumentWorkspace/documentGraphChartModel.test.ts',
    'src/components/DocumentWorkspace/documentGraphNodeDetailsModel.test.ts',
    'src/components/DocumentWorkspace/documentGraphNodeActionModel.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'documentGraphViewModel.test.ts should only keep split guards')
  for (const delegatedToken of [
    'filterDocument' + 'Graph',
    'buildDocument' + 'CategoryTree',
    'documentGraph' + 'EntityRoleLabel',
    'buildDocument' + 'GraphChartOption',
    'describeDocument' + 'GraphNode',
    'contextAction' + 'ForDocumentNode',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
