import test from 'node:test'
import assert from 'node:assert/strict'
import { DesktopRemoteProjectRepository } from './projectRemoteRepositoryProxy'

test('desktop remote project repository exposes remote export errors', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      exportRemoteProjectRows: async () => {
        throw new Error('远程数据库配置不存在。')
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository(() => 'db-a')

    await assert.rejects(
      () => repository.exportProjectRows('project-a'),
      /远程数据库配置不存在/,
    )
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

test('desktop remote project repository exposes remote list and asset errors', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      listRemoteProjects: async () => {
        throw new Error('远程数据库连接失败')
      },
      getRemoteProject: async () => {
        throw new Error('远程项目读取失败')
      },
      listRemoteProjectAssets: async () => {
        throw new Error('远程素材读取失败')
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository(() => 'db-a')

    await assert.rejects(
      () => repository.listProjects(),
      /远程数据库连接失败/,
    )
    await assert.rejects(
      () => repository.getProject('project-a'),
      /远程项目读取失败/,
    )
    await assert.rejects(
      () => repository.listAssets('project-a'),
      /远程素材读取失败/,
    )
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})
