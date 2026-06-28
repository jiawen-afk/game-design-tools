import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { projectStorageIpcSources } from './appStructureTestHelpers.test'

test('remote project repository uses electron database bridge instead of renderer memory storage', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const infrastructureSource = readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8')
  const proxySource = readFileSync('src/components/ProjectStorage/projectRemoteRepositoryProxy.ts', 'utf8')
  const repositorySource = readFileSync('electron/projectRemoteRepository.cjs', 'utf8')
  const repositorySqlSource = existsSync('electron/projectRemoteRepositorySql.cjs')
    ? readFileSync('electron/projectRemoteRepositorySql.cjs', 'utf8')
    : repositorySource
  const repositoryTableSource = existsSync('electron/projectStorageTables.cjs')
    ? [
      readFileSync('electron/projectStorageTables.cjs', 'utf8'),
      existsSync('electron/projectStorageCoreTables.cjs') ? readFileSync('electron/projectStorageCoreTables.cjs', 'utf8') : '',
      existsSync('electron/projectStorageAssetTables.cjs') ? readFileSync('electron/projectStorageAssetTables.cjs', 'utf8') : '',
    ].join('\n')
    : repositorySqlSource
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const projectIpcSource = projectStorageIpcSources()

  assert.match(hookSource, /useProjectStorageInfrastructure/)
  assert.doesNotMatch(hookSource, /createDesktopRemoteProjectRepository/)
  assert.match(infrastructureSource, /createDesktopRemoteProjectRepository/)
  assert.doesNotMatch(hookSource, /const remoteProjectRepository = createMemoryProjectRepository\(\)/)
  assert.match(proxySource, /createRemoteProject/)
  assert.match(proxySource, /importRemoteProjectRows/)
  assert.match(proxySource, /listRemoteProjectAssets/)
  assert.match(proxySource, /getDatabaseProfileId\(projectId\)/)
  assert.match(proxySource, /requireProjectDatabaseProfileId\(rows\.project\.id,\s*rows\.project\.name\)/)
  assert.match(proxySource, /缺少远程数据库配置/)
  assert.match(projectIpcSource, /if \(!String\(profileId \|\| ''\)\.trim\(\)\) throw new Error\('远程数据库配置不存在。'\)/)
  assert.doesNotMatch(mainSource, /:\s*databaseProfiles\.find\(\(item\) => item\.lastVerifiedAt\) \|\| databaseProfiles\[0\]/)
  assert.doesNotMatch(mainSource, /rows\?\.settings\?\.remote_database_profile_id/)
  assert.match(repositorySqlSource, /buildUpsertSql/)
  assert.match(repositoryTableSource, /projects:\s*\{/)
  assert.match(repositoryTableSource, /assets:\s*\{/)
  assert.match(repositorySqlSource, /ON CONFLICT/)
  assert.match(repositorySqlSource, /DO UPDATE SET/)
  assert.match(repositorySqlSource, /ON DUPLICATE KEY UPDATE/)
})

test('remote project repository delegates database runner management to a focused module', () => {
  const repositorySource = readFileSync('electron/projectRemoteRepository.cjs', 'utf8')
  const runnerModulePath = 'electron/projectRemoteRunner.cjs'

  assert.ok(existsSync(runnerModulePath), `${runnerModulePath} should exist`)
  const runnerSource = readFileSync(runnerModulePath, 'utf8')

  assert.match(repositorySource, /projectRemoteRunner\.cjs/)
  assert.match(runnerSource, /function requireNodeModule\b/)
  assert.match(runnerSource, /async function createRunner\b/)
  assert.match(runnerSource, /async function withRunner\b/)
  assert.match(runnerSource, /async function withTransaction\b/)
  assert.match(runnerSource, /attachPostgresConnectionErrorSink/)

  for (const functionName of [
    'requireNodeModule',
    'defaultCreatePostgresClient',
    'defaultCreateMysqlConnection',
    'postgresConfig',
    'mysqlConfig',
    'normalizeRows',
    'createRunner',
    'withRunner',
    'withTransaction',
  ]) {
    assert.doesNotMatch(repositorySource, new RegExp(`(?:async\\s+)?function ${functionName}\\b`))
  }
})
