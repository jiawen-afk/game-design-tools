import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('memory project repository delegates document knowledge storage to a focused store', () => {
  const repositorySource = readFileSync('src/components/ProjectStorage/projectSqliteRepository.ts', 'utf8')
  const documentStorePath = 'src/components/ProjectStorage/projectMemoryDocumentStore.ts'
  const documentTypesPath = 'src/components/ProjectStorage/projectDocumentRepositoryTypes.ts'
  const repositoryTypesPath = 'src/components/ProjectStorage/projectRepositoryTypes.ts'

  assert.ok(existsSync(documentStorePath), `${documentStorePath} should exist`)
  assert.ok(existsSync(documentTypesPath), `${documentTypesPath} should exist`)
  assert.ok(existsSync(repositoryTypesPath), `${repositoryTypesPath} should exist`)
  const repositoryTypesSource = readFileSync(repositoryTypesPath, 'utf8')

  assert.match(repositorySource, /from '\.\/projectMemoryDocumentStore'/)
  assert.match(repositorySource, /from '\.\/projectRepositoryTypes'/)
  assert.match(repositoryTypesSource, /from '\.\/projectDocumentRepositoryTypes'/)
  assert.match(repositorySource, /new MemoryProjectDocumentStore\(\)/)
  assert.match(repositorySource, /this\.documents\./)
  assert.doesNotMatch(repositorySource, /private document(Collections|Sources|Records|Nodes|Edges|ImportRuns)/)
  assert.doesNotMatch(repositorySource, /function\s+(groupValuesByKey|parseMetadataJson|documentRecordGraphData|normalizeDocumentQuery|normalizeDocumentLimit)\b/)
  assert.doesNotMatch(repositorySource, /deleteDocumentCollectionChildren/)
})

test('memory document store delegates document graph queries to a focused module', () => {
  const storeSource = readFileSync('src/components/ProjectStorage/projectMemoryDocumentStore.ts', 'utf8')
  const queriesPath = 'src/components/ProjectStorage/projectMemoryDocumentQueries.ts'

  assert.ok(existsSync(queriesPath), `${queriesPath} should exist`)
  const queriesSource = readFileSync(queriesPath, 'utf8')

  assert.match(storeSource, /from '\.\/projectMemoryDocumentQueries'/)
  for (const helperName of [
    'buildMemoryDocumentCollectionGraph',
    'searchMemoryDocumentRecords',
    'searchMemoryDocumentNodes',
    'getMemoryDocumentNodeDetails',
    'listMemoryDocumentNeighbors',
  ]) {
    assert.match(storeSource, new RegExp(`${helperName}\\(`))
    assert.match(queriesSource, new RegExp(`function ${helperName}\\b`))
  }

  assert.doesNotMatch(storeSource, /function\s+(groupValuesByKey|parseMetadataJson|documentRecordGraphData|normalizeDocumentQuery|normalizeDocumentLimit)\b/)
  assert.doesNotMatch(storeSource, /DocumentGraph(Node|Edge)/)
  assert.match(queriesSource, /function documentRecordGraphData/)
  assert.match(queriesSource, /function normalizeDocumentLimit/)
})
