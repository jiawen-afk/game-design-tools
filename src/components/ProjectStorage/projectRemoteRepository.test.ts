import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('remote project repository tests live in focused files', () => {
  const source = readFileSync('src/components/ProjectStorage/projectRemoteRepository.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const helperPath = 'src/components/ProjectStorage/projectRemoteRepositoryTestHelpers.test.ts'
  const projectRowsPath = 'src/components/ProjectStorage/projectRemoteRepositoryProjectRows.test.ts'
  const documentGraphPath = 'src/components/ProjectStorage/projectRemoteRepositoryDocumentGraph.test.ts'
  const documentGraphHelperPath = 'src/components/ProjectStorage/projectRemoteRepositoryDocumentGraphTestHelpers.test.ts'
  const documentGraphWritePath = 'src/components/ProjectStorage/projectRemoteRepositoryDocumentGraphWrite.test.ts'
  const documentGraphReadPath = 'src/components/ProjectStorage/projectRemoteRepositoryDocumentGraphRead.test.ts'
  const postgresConnectionPath = 'src/components/ProjectStorage/projectRemoteRepositoryPostgresConnection.test.ts'
  const postgresErrorHandlingPath = 'src/components/ProjectStorage/projectRemoteRepositoryPostgresErrorHandling.test.ts'
  const postgresRetryPath = 'src/components/ProjectStorage/projectRemoteRepositoryPostgresRetry.test.ts'
  const helperSource = existsSync(helperPath) ? readFileSync(helperPath, 'utf8') : ''
  const projectRowsSource = existsSync(projectRowsPath) ? readFileSync(projectRowsPath, 'utf8') : ''
  const documentGraphSource = existsSync(documentGraphPath) ? readFileSync(documentGraphPath, 'utf8') : ''
  const documentGraphWriteSource = existsSync(documentGraphWritePath) ? readFileSync(documentGraphWritePath, 'utf8') : ''
  const documentGraphReadSource = existsSync(documentGraphReadPath) ? readFileSync(documentGraphReadPath, 'utf8') : ''
  const postgresConnectionSource = existsSync(postgresConnectionPath) ? readFileSync(postgresConnectionPath, 'utf8') : ''
  const postgresErrorHandlingSource = existsSync(postgresErrorHandlingPath) ? readFileSync(postgresErrorHandlingPath, 'utf8') : ''
  const postgresRetrySource = existsSync(postgresRetryPath) ? readFileSync(postgresRetryPath, 'utf8') : ''

  for (const path of [
    helperPath,
    projectRowsPath,
    documentGraphPath,
    documentGraphHelperPath,
    documentGraphWritePath,
    documentGraphReadPath,
    postgresConnectionPath,
    postgresErrorHandlingPath,
    postgresRetryPath,
  ]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectRemoteRepositoryProjectRows\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectRemoteRepositoryDocumentGraph\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectRemoteRepositoryDocumentGraphWrite\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectRemoteRepositoryDocumentGraphRead\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectRemoteRepositoryPostgresConnection\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectRemoteRepositoryPostgresErrorHandling\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectRemoteRepositoryPostgresRetry\.test\.ts/)
  assert.match(helperSource, /export function databaseProfile/)
  assert.match(helperSource, /export function documentGraphInput/)
  assert.doesNotMatch(source, new RegExp("test\\('" + 'remote project repository creates project rows'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'remote project repository replaces document graph rows'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'remote project repository retries PostgreSQL connect'))
  assert.match(projectRowsSource, new RegExp("test\\('" + 'remote project repository creates project rows'))
  assert.match(documentGraphSource, new RegExp("test\\('" + 'remote repository document graph tests stay split'))
  assert.match(documentGraphWriteSource, new RegExp("test\\('" + 'remote project repository replaces document graph rows'))
  assert.match(documentGraphReadSource, new RegExp("test\\('" + 'remote project repository reads document source content'))
  assert.match(postgresConnectionSource, new RegExp("test\\('" + 'remote repository PostgreSQL connection tests stay split'))
  assert.match(postgresErrorHandlingSource, new RegExp("test\\('" + 'remote project repository swallows late PostgreSQL connection error'))
  assert.match(postgresRetrySource, new RegExp("test\\('" + 'remote project repository retries PostgreSQL connect'))
})
