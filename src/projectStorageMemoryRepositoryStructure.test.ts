import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('memory project repository delegates project space row storage to a focused store', () => {
  const repositorySource = readFileSync('src/components/ProjectStorage/projectSqliteRepository.ts', 'utf8')
  const projectSpaceStorePath = 'src/components/ProjectStorage/projectMemoryProjectSpaceStore.ts'
  const projectSpaceStoreSource = existsSync(projectSpaceStorePath) ? readFileSync(projectSpaceStorePath, 'utf8') : ''

  assert.ok(existsSync(projectSpaceStorePath), `${projectSpaceStorePath} should exist`)
  assert.match(repositorySource, /from '\.\/projectMemoryProjectSpaceStore'/)
  assert.match(repositorySource, /new MemoryProjectSpaceStore\(\)/)
  assert.match(repositorySource, /this\.projectSpace\./)
  for (const mapName of [
    'assetGroups',
    'assets',
    'characters',
    'characterAssetLinks',
    'storyboardGroups',
    'storyboardVoiceEntries',
    'assetRelations',
    'cleanupTasks',
  ]) {
    assert.doesNotMatch(repositorySource, new RegExp(`private ${mapName} = new Map`))
  }
  assert.match(projectSpaceStoreSource, /export class MemoryProjectSpaceStore/)
  for (const methodName of [
    'initializeProject',
    'importProjectRows',
    'exportProjectRows',
    'listAssets',
    'addCleanupTasks',
    'listCleanupTasks',
    'deleteProject',
  ]) {
    assert.match(projectSpaceStoreSource, new RegExp(`${methodName}\\(`))
  }
})

test('memory project repository keeps repository contract types in a focused module', () => {
  const repositorySource = readFileSync('src/components/ProjectStorage/projectSqliteRepository.ts', 'utf8')
  const repositoryTypesPath = 'src/components/ProjectStorage/projectRepositoryTypes.ts'

  assert.ok(existsSync(repositoryTypesPath), `${repositoryTypesPath} should exist`)
  const repositoryTypesSource = readFileSync(repositoryTypesPath, 'utf8')

  assert.match(repositorySource, /from '\.\/projectRepositoryTypes'/)
  assert.match(repositorySource, /implements ProjectRepository/)
  assert.match(repositorySource, /export type \{[\s\S]*ProjectRepository[\s\S]*\} from '\.\/projectRepositoryTypes'/)
  assert.match(repositoryTypesSource, /from '\.\/projectDocumentRepositoryTypes'/)
  for (const typeName of [
    'CreateLocalProjectInput',
    'CreateRemoteProjectInput',
    'UpdateProjectInput',
    'ProjectWithSettings',
    'ProjectRepository',
  ]) {
    assert.match(repositoryTypesSource, new RegExp(`export interface ${typeName}\\b`))
    assert.doesNotMatch(repositorySource, new RegExp(`export interface ${typeName}\\b`))
  }
})
