import test from 'node:test'
import assert from 'node:assert/strict'
import { DesktopRemoteProjectRepository } from './projectRemoteRepositoryProxy'

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

test('desktop remote project repository updates remote project metadata through current device profile without writing profile ids', async () => {
  const events: string[] = []
  const previousWindow = (globalThis as { window?: unknown }).window
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      updateRemoteProject: async (projectId: string, input: { databaseProfileId?: string; storageProfileId?: string }, databaseProfileId: string) => {
        events.push(`update:${projectId}:${databaseProfileId}:${input.databaseProfileId ?? ''}:${input.storageProfileId ?? ''}`)
        return null
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository(() => 'current-device-db')

    await repository.updateProject('project-a', {
      name: '远程项目',
      description: '',
      updatedAt: '2026-06-24T00:00:00.000Z',
    })

    assert.deepEqual(events, ['update:project-a:current-device-db::'])
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
