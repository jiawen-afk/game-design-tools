import test from 'node:test'
import assert from 'node:assert/strict'
import { DesktopRemoteProjectRepository } from './projectRemoteRepositoryProxy'

test('desktop remote project repository does not list projects without an explicit database profile', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      listRemoteProjects: async (databaseProfileId: string) => {
        events.push(`list:${databaseProfileId}`)
        return []
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository(() => '')

    await assert.rejects(
      () => repository.listProjects(),
      /缺少远程数据库配置/,
    )
    assert.deepEqual(events, [])
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
      /项目“A”缺少远程数据库配置/,
    )
    assert.deepEqual(events, [])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})

test('desktop remote project repository names imported projects when a database profile is missing', async () => {
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
    const repository = new DesktopRemoteProjectRepository(() => '')

    await assert.rejects(
      () => repository.importProjectRows({
        project: {
          id: 'project-shanhai',
          name: '山海再就业',
          description: '',
          mode: 'remote',
          status: 'active',
          object_key_prefix: 'objects/山海再就业',
          created_at: '2026-06-24T00:00:00.000Z',
          updated_at: '2026-06-24T00:00:00.000Z',
          metadata_json: null,
        },
        settings: {
          project_id: 'project-shanhai',
          storage_provider: 'qiniu_kodo',
          database_provider: 'postgresql',
          local_object_root: null,
          remote_database_profile_id: null,
          remote_storage_profile_id: null,
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
      /项目“山海再就业”缺少远程数据库配置/,
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
