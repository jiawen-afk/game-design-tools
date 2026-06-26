import test from 'node:test'
import assert from 'node:assert/strict'

import { DesktopRemoteProjectRepository } from './projectRemoteRepositoryProxy'
import type { ReplaceDocumentGraphInput } from './projectSqliteRepository'

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

test('desktop remote project repository resolves database profile for document knowledge operations', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      listRemoteDocumentCollections: async (projectId: string, databaseProfileId: string) => {
        events.push(`collections:${projectId}:${databaseProfileId}`)
        return []
      },
      getRemoteDocumentCollection: async (projectId: string, collectionId: string, databaseProfileId: string) => {
        events.push(`collection:${projectId}:${collectionId}:${databaseProfileId}`)
        return null
      },
      listRemoteDocumentSources: async (projectId: string, collectionId: string, databaseProfileId: string) => {
        events.push(`sources:${projectId}:${collectionId}:${databaseProfileId}`)
        return []
      },
      replaceRemoteDocumentGraph: async (input: { projectId: string }, databaseProfileId: string) => {
        events.push(`replace:${input.projectId}:${databaseProfileId}`)
        return { collection: { id: 'collection-1' }, importRun: { id: 'import-1' } }
      },
      searchRemoteDocumentRecords: async (input: { projectId: string }, databaseProfileId: string) => {
        events.push(`records:${input.projectId}:${databaseProfileId}`)
        return { items: [], total: 0 }
      },
      searchRemoteDocumentNodes: async (input: { projectId: string }, databaseProfileId: string) => {
        events.push(`nodes:${input.projectId}:${databaseProfileId}`)
        return { items: [], total: 0 }
      },
      getRemoteDocumentNode: async (projectId: string, nodeId: string, databaseProfileId: string) => {
        events.push(`node:${projectId}:${nodeId}:${databaseProfileId}`)
        return null
      },
      listRemoteDocumentNeighbors: async (projectId: string, nodeId: string, databaseProfileId: string) => {
        events.push(`neighbors:${projectId}:${nodeId}:${databaseProfileId}`)
        return []
      },
      deleteRemoteDocumentCollection: async (projectId: string, collectionId: string, databaseProfileId: string) => {
        events.push(`deleteCollection:${projectId}:${collectionId}:${databaseProfileId}`)
        return true
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository((projectId) => {
      if (!projectId) return 'current-ui-db'
      return projectId === 'project-a' ? 'db-a' : 'db-b'
    })
    const replaceInput: ReplaceDocumentGraphInput = {
      projectId: 'project-b',
      collection: {
        id: 'collection-1',
        project_id: 'project-b',
        name: '知识库',
        description: '',
        source_type: 'shj_nlc_graph',
        status: 'ready',
        record_count: 0,
        node_count: 0,
        edge_count: 0,
        created_at: '2026-06-26T00:00:00.000Z',
        updated_at: '2026-06-26T00:00:00.000Z',
        imported_at: '2026-06-26T00:00:00.000Z',
        metadata_json: null,
      },
      sources: [],
      records: [],
      nodes: [],
      edges: [],
      nodeRecordLinks: [],
      edgeRecordLinks: [],
      importRun: {
        id: 'import-1',
        project_id: 'project-b',
        collection_id: 'collection-1',
        source_type: 'shj_nlc_graph',
        status: 'succeeded',
        started_at: '2026-06-26T00:00:00.000Z',
        finished_at: '2026-06-26T00:00:00.000Z',
        total_records: 0,
        total_nodes: 0,
        total_edges: 0,
        imported_records: 0,
        imported_nodes: 0,
        imported_edges: 0,
        error_message: null,
        report_json: null,
      },
    }

    await repository.listDocumentCollections('project-a')
    await repository.getDocumentCollection('project-a', 'collection-1')
    await repository.listDocumentSources('project-b', 'collection-1')
    await repository.replaceDocumentGraph(replaceInput)
    await repository.searchDocumentRecords({ projectId: 'project-a', query: '傲徕' })
    await repository.searchDocumentNodes({ projectId: 'project-b', query: '四角' })
    await repository.getDocumentNode('project-a', 'node-1')
    await repository.listDocumentNeighbors('project-b', 'node-2')
    await repository.deleteDocumentCollection('project-a', 'collection-1')

    assert.deepEqual(events, [
      'collections:project-a:db-a',
      'collection:project-a:collection-1:db-a',
      'sources:project-b:collection-1:db-b',
      'replace:project-b:db-b',
      'records:project-a:db-a',
      'nodes:project-b:db-b',
      'node:project-a:node-1:db-a',
      'neighbors:project-b:node-2:db-b',
      'deleteCollection:project-a:collection-1:db-a',
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
