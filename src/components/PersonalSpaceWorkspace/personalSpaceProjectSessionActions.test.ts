import test from 'node:test'
import assert from 'node:assert/strict'

import { createEmptyProjectSpaceState } from './projectSpaceState'
import {
  createPersonalSpaceProjectSessionActions,
  type PersonalSpaceActiveModule,
  type ProjectSpacePage,
} from './personalSpaceProjectSessionActions'
import type { Project, ProjectRepository } from '../ProjectStorage'
import type { LegacyProjectRows } from '../ProjectStorage/projectLegacyMigration'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

function installLocalStorage() {
  const storage = createMemoryStorage()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
  return () => {
    if (previous) {
      Object.defineProperty(globalThis, 'localStorage', previous)
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }
}

function createRepositoryStub(overrides: Partial<ProjectRepository> = {}): ProjectRepository {
  return {
    initializeSchema: async () => {},
    createProject: async () => {
      throw new Error('unexpected createProject')
    },
    createRemoteProject: async () => {
      throw new Error('unexpected createRemoteProject')
    },
    updateProject: async () => null,
    listProjects: async () => [],
    getProject: async () => null,
    importProjectRows: async () => {},
    exportProjectRows: async () => null,
    listAssets: async () => [],
    addCleanupTasks: async () => {},
    listCleanupTasks: async () => [],
    listDocumentCollections: async () => [],
    getDocumentCollection: async () => null,
    deleteDocumentCollection: async () => {},
    listDocumentSources: async () => [],
    getDocumentSourceContent: async () => null,
    replaceDocumentGraph: async (input) => ({ collection: input.collection, importRun: input.importRun }),
    getDocumentCollectionGraph: async () => ({ nodes: {}, edges: {} }),
    searchDocumentRecords: async () => ({ items: [], total: 0 }),
    searchDocumentNodes: async () => ({ items: [], total: 0 }),
    getDocumentNode: async () => null,
    listDocumentNeighbors: async () => [],
    deleteProject: async () => {},
    ...overrides,
  }
}

function createLocalProjectRows(project: Project): LegacyProjectRows {
  return {
    project,
    settings: {
      project_id: project.id,
      storage_provider: 'local',
      database_provider: 'sqlite',
      local_object_root: 'D:\\GameAssets',
      remote_database_profile_id: null,
      remote_storage_profile_id: null,
      last_verified_at: null,
      updated_at: project.updated_at,
    },
    assetGroups: [],
    assets: [],
    characters: [{
      id: 'character-db',
      project_id: project.id,
      name: 'DB Character',
      starred: false,
      sort_order: 0,
      created_at: project.created_at,
      updated_at: project.updated_at,
    }],
    characterAssetLinks: [],
    storyboardGroups: [],
    storyboardVoiceEntries: [],
    assetRelations: [],
  }
}

test('refreshing active project state reloads current workbench data from repository rows', async () => {
  const restoreLocalStorage = installLocalStorage()
  const project: Project = {
    id: 'project-a',
    name: '本地项目',
    description: '',
    mode: 'local',
    status: 'active',
    object_key_prefix: 'objects/本地项目',
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
    metadata_json: null,
  }
  const staleSpace = createEmptyProjectSpaceState('D:\\GameAssets')
  staleSpace.characters = [{
    id: 'character-stale',
    name: 'Stale Character',
    starred: false,
    order: 0,
    portraitAssetIds: [],
    spriteAssetIds: [],
    voiceAssetIds: [],
    portraitAssets: [],
    spriteAssets: [],
    voiceAssets: [],
  }]
  const state = {
    projects: [project],
    activeProjectId: project.id,
    workspacePage: 'workbench' as ProjectSpacePage,
    selectedManagementProjectId: project.id,
    activeModule: 'characters' as PersonalSpaceActiveModule,
    space: staleSpace,
  }
  const stateRefs = {
    spaceRef: { current: staleSpace },
    activeProjectIdRef: { current: project.id },
  }
  let exportCalls = 0
  const actions = createPersonalSpaceProjectSessionActions({
    projectBootstrapper: {
      listProjects: async () => [project],
    },
    localRepository: createRepositoryStub({
      exportProjectRows: async (projectId) => {
        exportCalls += 1
        assert.equal(projectId, project.id)
        return createLocalProjectRows(project)
      },
    }),
    remoteRepository: createRepositoryStub(),
    messageApi: {
      success: () => {},
      warning: () => {},
    },
    getSettingsWorkspace: () => ({
      connectionProfilesLoaded: true,
      directoryHandleChecked: true,
      directoryHandle: {},
      draftStorageDirectory: 'D:\\GameAssets',
    }),
    getProjects: () => state.projects,
    getActiveProjectId: () => state.activeProjectId,
    findProject: (projectId, projectList = state.projects) => projectList.find((item) => item.id === projectId),
    ensureRemoteProjectSettings: async () => {},
    rememberRemoteProjectSettings: () => {},
    stateRefs,
    stateSetters: {
      setProjects: (next) => {
        state.projects = typeof next === 'function' ? next(state.projects) : next
      },
      setActiveProjectId: (next) => {
        state.activeProjectId = typeof next === 'function' ? next(state.activeProjectId) : next
      },
      setWorkspacePage: (next) => {
        state.workspacePage = typeof next === 'function' ? next(state.workspacePage) : next
      },
      setSelectedManagementProjectId: (next) => {
        state.selectedManagementProjectId = typeof next === 'function' ? next(state.selectedManagementProjectId) : next
      },
      setActiveModule: (next) => {
        state.activeModule = typeof next === 'function' ? next(state.activeModule) : next
      },
      setSpace: (next) => {
        state.space = typeof next === 'function' ? next(state.space) : next
      },
    },
  })

  const refreshed = await actions.refreshActiveProjectState()

  assert.equal(refreshed, true)
  assert.equal(exportCalls, 1)
  assert.deepEqual(state.space.characters.map((character) => character.name), ['DB Character'])
  assert.deepEqual(stateRefs.spaceRef.current.characters.map((character) => character.name), ['DB Character'])

  restoreLocalStorage()
})

test('enabling a remote project without cached state does not report success', async () => {
  const restoreLocalStorage = installLocalStorage()
  const project: Project = {
    id: 'project-a',
    name: '山海再就业',
    description: '',
    mode: 'remote',
    status: 'active',
    object_key_prefix: 'objects/山海再就业',
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
    metadata_json: null,
  }
  const messages: Array<{ type: 'success' | 'warning'; content: string }> = []
  const space = createEmptyProjectSpaceState()
  const state: {
    projects: Project[]
    activeProjectId: string
    workspacePage: ProjectSpacePage
    selectedManagementProjectId: string
    activeModule: PersonalSpaceActiveModule
    space: typeof space
  } = {
    projects: [project],
    activeProjectId: '',
    workspacePage: 'workbench',
    selectedManagementProjectId: '',
    activeModule: 'settings',
    space,
  }

  const actions = createPersonalSpaceProjectSessionActions({
    projectBootstrapper: {
      listProjects: async () => [],
    },
    localRepository: createRepositoryStub(),
    remoteRepository: createRepositoryStub({
      listProjects: async () => [project],
    }),
    messageApi: {
      success: (content) => messages.push({ type: 'success', content }),
      warning: (content) => messages.push({ type: 'warning', content }),
    },
    getSettingsWorkspace: () => ({
      connectionProfilesLoaded: true,
      directoryHandleChecked: true,
      directoryHandle: null,
      draftStorageDirectory: '',
    }),
    getProjects: () => state.projects,
    getActiveProjectId: () => state.activeProjectId,
    findProject: (projectId, projectList = state.projects) => projectList.find((item) => item.id === projectId),
    ensureRemoteProjectSettings: async () => {},
    rememberRemoteProjectSettings: () => {},
    stateRefs: {
      spaceRef: {
        current: state.space,
      },
      activeProjectIdRef: {
        current: state.activeProjectId,
      },
    },
    stateSetters: {
      setProjects: (next) => {
        state.projects = typeof next === 'function' ? next(state.projects) : next
      },
      setActiveProjectId: (next) => {
        state.activeProjectId = typeof next === 'function' ? next(state.activeProjectId) : next
      },
      setWorkspacePage: (next) => {
        state.workspacePage = typeof next === 'function' ? next(state.workspacePage) : next
      },
      setSelectedManagementProjectId: (next) => {
        state.selectedManagementProjectId = typeof next === 'function' ? next(state.selectedManagementProjectId) : next
      },
      setActiveModule: (next) => {
        state.activeModule = typeof next === 'function' ? next(state.activeModule) : next
      },
      setSpace: (next) => {
        state.space = typeof next === 'function' ? next(state.space) : next
      },
    },
  })

  actions.enableProject('project-a')
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(state.selectedManagementProjectId, 'project-a')
  assert.equal(state.activeProjectId, '')
  assert.equal(messages.some((message) => message.type === 'success' && message.content === '已启用项目'), false)
  assert.ok(messages.some((message) => message.type === 'warning'))

  restoreLocalStorage()
})
