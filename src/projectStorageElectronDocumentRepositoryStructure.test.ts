import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('electron project repositories share document graph helpers and local document storage is focused', () => {
  const localRepositorySource = readFileSync('electron/projectLocalRepository.cjs', 'utf8')
  const remoteRepositorySource = readFileSync('electron/projectRemoteRepository.cjs', 'utf8')
  const localRepositoryRuntimeSource = localRepositorySource.slice(localRepositorySource.indexOf('class LocalProjectRepository'))
  const remoteRepositoryRuntimeSource = remoteRepositorySource.slice(remoteRepositorySource.indexOf('class RemoteProjectRepository'))
  const documentModelPath = 'electron/projectDocumentGraphModel.cjs'
  const localDocumentRepositoryPath = 'electron/projectLocalDocumentRepository.cjs'
  const localDocumentGraphQueriesPath = 'electron/projectLocalDocumentGraphQueries.cjs'
  const remoteDocumentRepositoryPath = 'electron/projectRemoteDocumentRepository.cjs'
  const remoteDocumentGraphQueriesPath = 'electron/projectRemoteDocumentGraphQueries.cjs'

  assert.ok(existsSync(documentModelPath), `${documentModelPath} should exist`)
  assert.ok(existsSync(localDocumentRepositoryPath), `${localDocumentRepositoryPath} should exist`)
  assert.ok(existsSync(localDocumentGraphQueriesPath), `${localDocumentGraphQueriesPath} should exist`)
  assert.ok(existsSync(remoteDocumentRepositoryPath), `${remoteDocumentRepositoryPath} should exist`)
  assert.ok(existsSync(remoteDocumentGraphQueriesPath), `${remoteDocumentGraphQueriesPath} should exist`)

  const documentModelSource = readFileSync(documentModelPath, 'utf8')
  const localDocumentRepositorySource = readFileSync(localDocumentRepositoryPath, 'utf8')
  const localDocumentGraphQueriesSource = readFileSync(localDocumentGraphQueriesPath, 'utf8')
  const remoteDocumentRepositorySource = readFileSync(remoteDocumentRepositoryPath, 'utf8')
  const remoteDocumentGraphQueriesSource = readFileSync(remoteDocumentGraphQueriesPath, 'utf8')

  assert.match(localRepositorySource, /projectLocalDocumentRepository\.cjs/)
  assert.match(localRepositorySource, /createLocalDocumentRepository/)
  assert.match(localRepositorySource, /this\.documents\./)
  assert.match(remoteRepositorySource, /projectRemoteDocumentRepository\.cjs/)
  assert.match(remoteRepositorySource, /createRemoteDocumentRepository/)
  assert.match(remoteRepositorySource, /this\.documents\./)
  assert.match(localDocumentRepositorySource, /projectDocumentGraphModel\.cjs/)
  assert.match(localDocumentRepositorySource, /projectLocalDocumentGraphQueries\.cjs/)
  assert.match(localDocumentRepositorySource, /getLocalDocumentCollectionGraph/)
  assert.match(localDocumentRepositorySource, /getLocalDocumentNode/)
  assert.match(localDocumentRepositorySource, /listLocalDocumentNeighbors/)
  assert.match(localDocumentGraphQueriesSource, /createDocumentCollectionGraph/)
  assert.match(remoteDocumentRepositorySource, /projectRemoteDocumentGraphQueries\.cjs/)
  assert.match(remoteDocumentRepositorySource, /getRemoteDocumentCollectionGraph/)
  assert.match(remoteDocumentRepositorySource, /getRemoteDocumentNode/)
  assert.match(remoteDocumentRepositorySource, /listRemoteDocumentNeighbors/)
  assert.match(remoteDocumentRepositorySource, /projectDocumentGraphModel\.cjs/)
  assert.match(remoteDocumentGraphQueriesSource, /createDocumentCollectionGraph/)

  for (const helperName of [
    'normalizeDocumentLimit',
    'groupRowsByKey',
    'parseJsonObject',
    'documentRecordGraphData',
  ]) {
    assert.match(documentModelSource, new RegExp(`function ${helperName}\\b`))
    assert.doesNotMatch(localRepositorySource, new RegExp(`function ${helperName}\\b`))
    assert.doesNotMatch(remoteRepositorySource, new RegExp(`function ${helperName}\\b`))
  }

  assert.doesNotMatch(localRepositorySource, /function deleteDocumentCollectionRows\b/)
  assert.doesNotMatch(remoteRepositorySource, /function deleteDocumentCollectionRows\b/)
  assert.doesNotMatch(localRepositoryRuntimeSource, /document_source_contents|document_node_record_links|document_edge_record_links/)
  assert.doesNotMatch(remoteRepositoryRuntimeSource, /document_source_contents|document_node_record_links|document_edge_record_links/)
  assert.match(localDocumentRepositorySource, /function deleteDocumentCollectionRows\b/)
  assert.match(localDocumentRepositorySource, /document_source_contents/)
  assert.match(localDocumentRepositorySource, /document_node_record_links/)
  assert.match(localDocumentRepositorySource, /document_edge_record_links/)
  assert.match(remoteDocumentRepositorySource, /function deleteDocumentCollectionRows\b/)
  assert.match(remoteDocumentRepositorySource, /document_source_contents/)
  assert.match(remoteDocumentRepositorySource, /document_node_record_links/)
  assert.match(remoteDocumentRepositorySource, /document_edge_record_links/)
})

test('electron document repositories delegate graph mapping to the document graph model', () => {
  const localDocumentRepositorySource = readFileSync('electron/projectLocalDocumentRepository.cjs', 'utf8')
  const localDocumentGraphQueriesPath = 'electron/projectLocalDocumentGraphQueries.cjs'
  const localDocumentGraphQueriesSource = existsSync(localDocumentGraphQueriesPath)
    ? readFileSync(localDocumentGraphQueriesPath, 'utf8')
    : ''
  const remoteDocumentRepositorySource = readFileSync('electron/projectRemoteDocumentRepository.cjs', 'utf8')
  const remoteDocumentGraphQueriesPath = 'electron/projectRemoteDocumentGraphQueries.cjs'
  const remoteDocumentGraphQueriesSource = existsSync(remoteDocumentGraphQueriesPath)
    ? readFileSync(remoteDocumentGraphQueriesPath, 'utf8')
    : ''
  const graphModelSource = readFileSync('electron/projectDocumentGraphModel.cjs', 'utf8')

  assert.ok(existsSync(localDocumentGraphQueriesPath), `${localDocumentGraphQueriesPath} should exist`)
  assert.ok(existsSync(remoteDocumentGraphQueriesPath), `${remoteDocumentGraphQueriesPath} should exist`)
  assert.match(graphModelSource, /function createDocumentCollectionGraph\b/)
  assert.doesNotMatch(localDocumentRepositorySource, /createDocumentCollectionGraph/)
  assert.doesNotMatch(remoteDocumentRepositorySource, /createDocumentCollectionGraph/)
  for (const source of [localDocumentGraphQueriesSource, remoteDocumentGraphQueriesSource]) {
    assert.match(source, /createDocumentCollectionGraph/)
    assert.doesNotMatch(source, /documentRecordGraphData/)
    assert.doesNotMatch(source, /groupRowsByKey/)
    assert.doesNotMatch(source, /parseJsonObject/)
    assert.doesNotMatch(source, /Object\.fromEntries\(/)
  }
})
