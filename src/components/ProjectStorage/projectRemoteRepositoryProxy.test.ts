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

test('desktop remote project repository can update a project with an explicit database profile', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      updateRemoteProject: async (projectId: string, _input: unknown, databaseProfileId: string) => {
        events.push(`update:${projectId}:${databaseProfileId}`)
        return null
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository(() => '')

    await repository.updateProject(
      'project-a',
      {
        name: 'A',
        description: '',
        updatedAt: '2026-06-24T00:00:00.000Z',
        databaseProvider: 'postgresql',
        databaseProfileId: 'current-device-db',
        storageProfileId: 'current-device-kodo',
      },
    )

    assert.deepEqual(events, ['update:project-a:current-device-db'])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

test('desktop remote project repository reuses the listing database profile before project settings are loaded', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      listRemoteProjects: async (databaseProfileId: string) => {
        events.push(`list:${databaseProfileId}`)
        return [{
          id: 'project-a',
          name: 'A',
          description: '',
          mode: 'remote',
          status: 'active',
          object_key_prefix: 'objects/A',
          created_at: '2026-06-24T00:00:00.000Z',
          updated_at: '2026-06-24T00:00:00.000Z',
          metadata_json: null,
        }]
      },
      exportRemoteProjectRows: async (projectId: string, databaseProfileId: string) => {
        events.push(`export:${projectId}:${databaseProfileId}`)
        return null
      },
      importRemoteProjectRows: async (rows: { project: { id: string } }, databaseProfileId: string) => {
        events.push(`import:${rows.project.id}:${databaseProfileId}`)
        return true
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository((projectId) => {
      if (!projectId) return 'current-device-db'
      return ''
    })

    await repository.listProjects()
    await repository.exportProjectRows('project-a')
    await repository.importProjectRows({
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
        remote_database_profile_id: 'old-device-db',
        remote_storage_profile_id: 'old-device-kodo',
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
    })

    assert.deepEqual(events, [
      'list:current-device-db',
      'export:project-a:current-device-db',
      'import:project-a:current-device-db',
    ])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

test('desktop remote project repository keeps listed database profile across repository instances', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      listRemoteProjects: async (databaseProfileId: string) => {
        events.push(`list:${databaseProfileId}`)
        return [{
          id: 'project-rendered',
          name: 'Rendered',
          description: '',
          mode: 'remote',
          status: 'active',
          object_key_prefix: 'objects/Rendered',
          created_at: '2026-06-24T00:00:00.000Z',
          updated_at: '2026-06-24T00:00:00.000Z',
          metadata_json: null,
        }]
      },
      exportRemoteProjectRows: async (projectId: string, databaseProfileId: string) => {
        events.push(`export:${projectId}:${databaseProfileId}`)
        return null
      },
    },
  }

  try {
    const listingRepository = new DesktopRemoteProjectRepository((projectId) => {
      if (!projectId) return 'render-db'
      return ''
    })
    const laterRepository = new DesktopRemoteProjectRepository(() => '')

    await listingRepository.listProjects()
    await laterRepository.exportProjectRows('project-rendered')

    assert.deepEqual(events, [
      'list:render-db',
      'export:project-rendered:render-db',
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
          id: 'project-unbound-write',
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
          project_id: 'project-unbound-write',
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
      /项目 project-unbound-write 缺少远程数据库配置/,
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
      () => repository.exportProjectRows('project-unbound-read'),
      /项目 project-unbound-read 缺少远程数据库配置/,
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
