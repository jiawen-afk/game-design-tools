import test from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryProjectRepository } from '../ProjectStorage'
import { listProjectCatalogWithRemoteFallback } from './projectWorkspaceStartup'

test('project startup keeps local projects available when remote project listing fails', async () => {
  const localRepository = createMemoryProjectRepository()
  await localRepository.createProject({
    name: '本地项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-24T00:00:00.000Z',
  })
  const remoteRepository = {
    listProjects: async () => {
      throw new Error('远程数据库配置不存在。')
    },
  }

  const result = await listProjectCatalogWithRemoteFallback(localRepository, remoteRepository)

  assert.deepEqual(result.projects.map((project) => project.name), ['本地项目'])
  assert.match(result.remoteError instanceof Error ? result.remoteError.message : '', /远程数据库配置不存在/)
})
