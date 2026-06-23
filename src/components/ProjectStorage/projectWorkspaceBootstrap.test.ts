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

test('project workspace bootstrap returns existing projects without creating another default', async () => {
  const repository = createMemoryProjectRepository()
  await repository.createProject({
    name: '已有项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-23T00:00:00.000Z',
  })
  const bootstrapper = createProjectWorkspaceBootstrapper(repository, () => '2026-06-24T00:00:00.000Z')

  const projects = await bootstrapper.listProjects('D:\\GameAssets')

  assert.deepEqual(projects.map((project) => project.name), ['已有项目'])
})
