import test from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryProjectRepository } from './projectSqliteRepository'
import { createProjectWorkspaceBootstrapper } from './projectWorkspaceBootstrap'

test('project workspace bootstrap creates one default project under concurrent initialization', async () => {
  const repository = createMemoryProjectRepository()
  const bootstrapper = createProjectWorkspaceBootstrapper(repository, () => '2026-06-23T00:00:00.000Z')

  const [firstProjects, secondProjects] = await Promise.all([
    bootstrapper.listProjects('D:\\GameAssets'),
    bootstrapper.listProjects('D:\\GameAssets'),
  ])

  const projects = await repository.listProjects()
  assert.equal(projects.length, 1)
  assert.equal(firstProjects.length, 1)
  assert.equal(secondProjects.length, 1)
  assert.equal(projects[0]!.name, '默认项目')
  assert.equal(projects[0]!.mode, 'local')
})
