import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { productionSourceFiles, readSources } from './appStructureTestHelpers.test'

test('document knowledge model owns import adapter registry instead of graph rendering', () => {
  const source = readFileSync('src/components/DocumentWorkspace/documentKnowledgeModel.ts', 'utf8')

  assert.match(source, /createDocumentSearchText/)
  assert.match(source, /listKnowledgeBaseAdapters/)
  assert.match(source, /getKnowledgeBaseAdapter/)
  assert.doesNotMatch(source, /DocumentGraphView/)
  assert.doesNotMatch(source, /buildDocumentGraphView/)
  assert.doesNotMatch(source, /buildDocumentGraphChartOption/)
  assert.doesNotMatch(source, /DocumentGraphChart/)
})

test('document knowledge concrete adapters are only wired through the adapter registry', () => {
  const allowedPaths = new Set([
    'src/components/DocumentWorkspace/documentKnowledgeModel.ts',
    'src/components/DocumentWorkspace/shjGraphImportAdapter.ts',
  ])
  const offenders = productionSourceFiles('src/components/DocumentWorkspace')
    .filter((path) => !allowedPaths.has(path))
    .filter((path) => /shjGraphImportAdapter/.test(readFileSync(path, 'utf8')))

  assert.deepEqual(offenders, [])
})

test('shj graph import adapter delegates parsing validation and row mapping to focused modules', () => {
  const adapterSource = readFileSync('src/components/DocumentWorkspace/shjGraphImportAdapter.ts', 'utf8')
  const modulePaths = [
    'src/components/DocumentWorkspace/shjGraphTypes.ts',
    'src/components/DocumentWorkspace/shjGraphHelpers.ts',
    'src/components/DocumentWorkspace/shjGraphValidation.ts',
    'src/components/DocumentWorkspace/shjGraphRowMappers.ts',
    'src/components/DocumentWorkspace/shjGraphImportConverter.ts',
  ]

  for (const path of modulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  for (const moduleName of [
    'shjGraphTypes',
    'shjGraphValidation',
    'shjGraphImportConverter',
  ]) {
    assert.match(adapterSource, new RegExp(`from './${moduleName}'`))
  }

  assert.doesNotMatch(adapterSource, /interface\s+ShjGraph(Node|Edge|Data)\b/)
  assert.doesNotMatch(adapterSource, /function\s+(parseGraphText|validateSource|requireValidGraph|collectRecords|createRecordRow|createNodeRow|createEdgeRow|convertSource)\b/)
  assert.doesNotMatch(adapterSource, /term_record|category_paths|site_relation|source_kind/)
})

test('document knowledge raw graph field assumptions stay in focused shj graph modules', () => {
  const shjGraphModulePaths = new Set([
    'src/components/DocumentWorkspace/shjGraphImportAdapter.ts',
    'src/components/DocumentWorkspace/shjGraphTypes.ts',
    'src/components/DocumentWorkspace/shjGraphHelpers.ts',
    'src/components/DocumentWorkspace/shjGraphValidation.ts',
    'src/components/DocumentWorkspace/shjGraphRowMappers.ts',
    'src/components/DocumentWorkspace/shjGraphImportConverter.ts',
  ])
  const shjGraphSource = readSources([...shjGraphModulePaths])
  const documentWorkspaceSource = readSources(
    productionSourceFiles('src/components/DocumentWorkspace')
      .filter((path) => !shjGraphModulePaths.has(path)),
  )

  for (const field of ['term_record', 'category_paths', 'site_relation', 'source_kind']) {
    assert.match(shjGraphSource, new RegExp(field))
    assert.doesNotMatch(documentWorkspaceSource, new RegExp(field))
  }
})

test('production import paths only advertise entity graph json support', () => {
  const source = readSources(productionSourceFiles('src'))

  assert.match(source, /entity_graph\.json/)
  assert.doesNotMatch(source, /acceptedFileNames:\s*\[[^\]]*graph\.json/)
  assert.doesNotMatch(source, /支持导入 graph\.json|接受 graph\.json|兼容 graph\.json/)
})
