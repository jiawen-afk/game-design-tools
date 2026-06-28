import { createEmptyProjectSpaceState } from './projectSpaceState'
import {
  createPersonalSpaceProjectSessionActions,
  type PersonalSpaceActiveModule,
  type ProjectSpacePage,
} from './personalSpaceProjectSessionActions'
import type { Project, ProjectRepository } from '../ProjectStorage'
import type { LegacyProjectRows } from '../ProjectStorage/projectLegacyMigration'

type ProjectSpaceState = ReturnType<typeof createEmptyProjectSpaceState>
type Message = { type: 'success' | 'warning'; content: string }

interface SessionSettings {
  connectionProfilesLoaded: boolean
  directoryHandleChecked: boolean
  directoryHandle: unknown
  draftStorageDirectory: string
}

interface SessionHarnessOptions {
  projects: Project[]
  activeProjectId?: string
  selectedManagementProjectId?: string
  activeModule?: PersonalSpaceActiveModule
  workspacePage?: ProjectSpacePage
  space?: ProjectSpaceState
  localRepository?: ProjectRepository
  remoteRepository?: ProjectRepository
  bootstrapProjects?: Project[]
  settings?: Partial<SessionSettings>
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

export function installLocalStorage() {
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

export function createRepositoryStub(overrides: Partial<ProjectRepository> = {}): ProjectRepository {
  return {
    initializeSchema: async () => {},
    createProject: async () => { throw new Error('unexpected createProject') },
    createRemoteProject: async () => { throw new Error('unexpected createRemoteProject') },
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

export function createSessionProject(overrides: Partial<Project> = {}): Project {
  const name = overrides.name ?? '本地项目'
  return {
    id: 'project-a',
    name,
    description: '',
    mode: 'local',
    status: 'active',
    object_key_prefix: `objects/${name}`,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
    metadata_json: null,
    ...overrides,
  }
}

export function createLocalProjectRows(project: Project): LegacyProjectRows {
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

export function createProjectSessionHarness(options: SessionHarnessOptions) {
  const messages: Message[] = []
  const state = {
    projects: options.projects,
    activeProjectId: options.activeProjectId ?? '',
    workspacePage: options.workspacePage ?? 'workbench',
    selectedManagementProjectId: options.selectedManagementProjectId ?? '',
    activeModule: options.activeModule ?? 'settings',
    space: options.space ?? createEmptyProjectSpaceState(),
  }
  const stateRefs = {
    spaceRef: { current: state.space },
    activeProjectIdRef: { current: state.activeProjectId },
  }
  const settings: SessionSettings = {
    connectionProfilesLoaded: true,
    directoryHandleChecked: true,
    directoryHandle: {},
    draftStorageDirectory: 'D:\\GameAssets',
    ...options.settings,
  }

  const actions = createPersonalSpaceProjectSessionActions({
    projectBootstrapper: {
      listProjects: async () => options.bootstrapProjects ?? options.projects,
    },
    localRepository: options.localRepository ?? createRepositoryStub(),
    remoteRepository: options.remoteRepository ?? createRepositoryStub(),
    messageApi: {
      success: (content) => messages.push({ type: 'success', content }),
      warning: (content) => messages.push({ type: 'warning', content }),
    },
    getSettingsWorkspace: () => settings,
    getProjects: () => state.projects,
    getActiveProjectId: () => state.activeProjectId,
    findProject: (projectId, projectList = state.projects) => projectList.find((item) => item.id === projectId),
    ensureRemoteProjectSettings: async () => {},
    rememberRemoteProjectSettings: () => {},
    stateRefs,
    stateSetters: {
      setProjects: (next) => { state.projects = typeof next === 'function' ? next(state.projects) : next },
      setActiveProjectId: (next) => { state.activeProjectId = typeof next === 'function' ? next(state.activeProjectId) : next },
      setWorkspacePage: (next) => { state.workspacePage = typeof next === 'function' ? next(state.workspacePage) : next },
      setSelectedManagementProjectId: (next) => {
        state.selectedManagementProjectId = typeof next === 'function' ? next(state.selectedManagementProjectId) : next
      },
      setActiveModule: (next) => { state.activeModule = typeof next === 'function' ? next(state.activeModule) : next },
      setSpace: (next) => { state.space = typeof next === 'function' ? next(state.space) : next },
    },
  })

  return { actions, messages, state, stateRefs }
}
