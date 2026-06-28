import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { projectStorageIpcSources } from './appStructureTestHelpers.test'

test('local project repository uses electron sqlite bridge instead of renderer memory storage', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const infrastructureSource = readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8')
  const proxySource = readFileSync('src/components/ProjectStorage/projectLocalRepositoryProxy.ts', 'utf8')
  const repositorySource = readFileSync('electron/projectLocalRepository.cjs', 'utf8')
  const databaseSource = readFileSync('electron/projectLocalDatabase.cjs', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const projectIpcSource = projectStorageIpcSources()

  assert.match(hookSource, /useProjectStorageInfrastructure/)
  assert.doesNotMatch(hookSource, /createDesktopLocalProjectRepository/)
  assert.match(infrastructureSource, /createDesktopLocalProjectRepository/)
  assert.doesNotMatch(hookSource, /const projectRepository = createMemoryProjectRepository\(\)/)
  assert.match(proxySource, /createLocalProject/)
  assert.match(proxySource, /importLocalProjectRows/)
  assert.match(proxySource, /listLocalProjectAssets/)
  assert.match(repositorySource, /projectLocalDatabase\.cjs/)
  assert.match(repositorySource, /createLocalProjectRepository/)
  assert.match(databaseSource, /sql\.js/)
  assert.match(databaseSource, /Database/)
  assert.match(preloadSource, /project-local-repository:create-project/)
  assert.match(projectIpcSource, /project-local-repository:create-project/)
})
