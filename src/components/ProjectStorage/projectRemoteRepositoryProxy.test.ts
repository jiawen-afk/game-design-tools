import test from 'node:test'
import assert from 'node:assert/strict'

import { DesktopRemoteProjectRepository } from './projectRemoteRepositoryProxy'

test('desktop remote project repository resolves database profile per project operation', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      listRemoteProjects: async (databaseProfileId: string) => {
        events.push(`list:${databaseProfileId}`)
        return []
      },
      getRemoteProject: async (projectId: string, databaseProfileId: string) => {
        events.push(`get:${projectId}:${databaseProfileId}`)
        return null
      },
      updateRemoteProject: async (projectId: string, _input: unknown, databaseProfileId: string) => {
        events.push(`update:${projectId}:${databaseProfileId}`)
        return null
      },
      exportRemoteProjectRows: async (projectId: string, databaseProfileId: string) => {
        events.push(`export:${projectId}:${databaseProfileId}`)
        return null
      },
      listRemoteProjectAssets: async (projectId: string, databaseProfileId: string) => {
        events.push(`assets:${projectId}:${databaseProfileId}`)
        return []
      },
      deleteRemoteProject: async (projectId: string, databaseProfileId: string) => {
        events.push(`delete:${projectId}:${databaseProfileId}`)
        return true
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository((projectId) => {
      if (!projectId) return 'current-ui-db'
      return projectId === 'project-a' ? 'db-a' : 'db-b'
    })

    await repository.listProjects()
    await repository.getProject('project-a')
    await repository.updateProject('project-b', { name: 'B', description: '', updatedAt: '2026-06-23T00:00:00.000Z' })
    await repository.exportProjectRows('project-a')
    await repository.listAssets('project-b')
    await repository.deleteProject('project-a')

    assert.deepEqual(events, [
      'list:current-ui-db',
      'get:project-a:db-a',
      'update:project-b:db-b',
      'export:project-a:db-a',
      'assets:project-b:db-b',
      'delete:project-a:db-a',
    ])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

test('desktop remote project repository rejects project writes without a project database profile', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      importRemoteProjectRows: async (_rows: unknown, databaseProfileId: string) => {
        events.push(`import:${databaseProfileId}`)
        return true
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository((projectId) => {
      if (!projectId) return 'current-ui-db'
      return ''
    })

    await assert.rejects(
      () => repository.importProjectRows({
        project: {
          id: 'project-a',
          name: 'A',
          description: '',
          mode: 'remote',
          status: 'active',
          object_key_prefix: 'objects/A',
          created_at: '2026-06-24T00:00:00.000Z',
          updated_at: '2026-06-24T00:00:00.000Z',
          metadata_json: null,
        },
        settings: {
          project_id: 'project-a',
          storage_provider: 'qiniu_kodo',
          database_provider: 'postgresql',
          local_object_root: null,
          remote_database_profile_id: null,
          remote_storage_profile_id: 'kodo-a',
          last_verified_at: '2026-06-24T00:00:00.000Z',
          updated_at: '2026-06-24T00:00:00.000Z',
        },
        assetGroups: [],
        assets: [],
        characters: [],
        characterAssetLinks: [],
        storyboardGroups: [],
        storyboardVoiceEntries: [],
        assetRelations: [],
      }),
      /项目 project-a 缺少远程数据库配置/,
    )
    assert.deepEqual(events, [])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

test('desktop remote project repository rejects project reads without a project database profile', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      exportRemoteProjectRows: async (_projectId: string, databaseProfileId: string) => {
        events.push(`export:${databaseProfileId}`)
        return null
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository(() => '')

    await assert.rejects(
      () => repository.exportProjectRows('project-a'),
      /项目 project-a 缺少远程数据库配置/,
    )
    assert.deepEqual(events, [])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

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
