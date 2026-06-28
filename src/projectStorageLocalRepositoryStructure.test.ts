import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('local project repository delegates sqlite database helpers to a focused module', () => {
  const repositorySource = readFileSync('electron/projectLocalRepository.cjs', 'utf8')
  const databaseModulePath = 'electron/projectLocalDatabase.cjs'

  assert.ok(existsSync(databaseModulePath), `${databaseModulePath} should exist`)
  const databaseSource = readFileSync(databaseModulePath, 'utf8')

  assert.match(repositorySource, /projectLocalDatabase\.cjs/)
  assert.match(databaseSource, /function getSqlModule\b/)
  assert.match(databaseSource, /async function openDatabase\b/)
  assert.match(databaseSource, /function upsertRow\b/)
  assert.match(databaseSource, /function allRows\b/)
  assert.match(databaseSource, /async function withDatabase\b/)
  assert.match(databaseSource, /async function withWriteTransaction\b/)

  for (const functionName of [
    'getSqlModule',
    'openDatabase',
    'saveDatabase',
    'buildSqliteUpsertSql',
    'upsertRow',
    'upsertRows',
    'allRows',
    'firstRow',
    'selectColumns',
    'withDatabase',
    'withWriteTransaction',
  ]) {
    assert.doesNotMatch(repositorySource, new RegExp(`(?:async\\s+)?function ${functionName}\\b`))
  }
})

test('local project repository delegates row shaping to a focused model module', () => {
  const repositorySource = readFileSync('electron/projectLocalRepository.cjs', 'utf8')
  const remoteRepositorySource = readFileSync('electron/projectRemoteRepository.cjs', 'utf8')
  const rowModulePath = 'electron/projectRepositoryRows.cjs'

  assert.ok(existsSync(rowModulePath), `${rowModulePath} should exist`)
  const rowSource = readFileSync(rowModulePath, 'utf8')

  assert.match(repositorySource, /projectRepositoryRows\.cjs/)
  assert.match(remoteRepositorySource, /projectRepositoryRows\.cjs/)
  assert.match(rowSource, /function createProjectRows\b/)
  assert.match(rowSource, /function createRemoteProjectRows\b/)
  assert.match(rowSource, /function normalizeBooleanRow\b/)
  assert.match(rowSource, /function sanitizeObjectKeyPart\b/)

  for (const functionName of [
    'createProjectStorageId',
    'sanitizeObjectKeyPart',
    'normalizeBooleanRow',
    'createProjectRows',
    'createRemoteProjectRows',
  ]) {
    assert.doesNotMatch(repositorySource, new RegExp(`function ${functionName}\\b`))
    assert.doesNotMatch(remoteRepositorySource, new RegExp(`function ${functionName}\\b`))
  }
})

test('local project repository delegates current-device bindings to a focused module', () => {
  const repositorySource = readFileSync('electron/projectLocalRepository.cjs', 'utf8')
  const repositoryRuntimeSource = repositorySource.slice(repositorySource.indexOf('class LocalProjectRepository'))
  const bindingModulePath = 'electron/projectLocalDeviceBindingRepository.cjs'

  assert.ok(existsSync(bindingModulePath), `${bindingModulePath} should exist`)
  const bindingSource = readFileSync(bindingModulePath, 'utf8')

  assert.match(repositorySource, /projectLocalDeviceBindingRepository\.cjs/)
  assert.match(repositorySource, /createLocalDeviceBindingRepository/)
  assert.match(repositorySource, /this\.deviceBindings\./)
  assert.match(bindingSource, /class LocalDeviceBindingRepository\b/)
  assert.match(bindingSource, /project_device_bindings/)
  assert.doesNotMatch(repositoryRuntimeSource, /async list\(\)[\s\S]*project_device_bindings/)
  assert.doesNotMatch(repositoryRuntimeSource, /async write\(projectId, binding\)[\s\S]*project_device_bindings/)
  assert.doesNotMatch(repositoryRuntimeSource, /async clear\(projectId\)[\s\S]*project_device_bindings/)
})
