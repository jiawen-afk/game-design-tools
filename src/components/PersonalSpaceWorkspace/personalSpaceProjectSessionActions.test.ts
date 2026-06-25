import test from 'node:test'
import assert from 'node:assert/strict'

import { createEmptyProjectSpaceState } from './projectSpaceState'
import {
  createPersonalSpaceProjectSessionActions,
  type PersonalSpaceActiveModule,
  type ProjectSpacePage,
} from './personalSpaceProjectSessionActions'
import type { Project } from '../ProjectStorage'

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
    localRepository: {
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
      deleteProject: async () => {},
    },
    remoteRepository: {
      initializeSchema: async () => {},
      createProject: async () => {
        throw new Error('unexpected createProject')
      },
      createRemoteProject: async () => {
        throw new Error('unexpected createRemoteProject')
      },
      updateProject: async () => null,
      listProjects: async () => [project],
      getProject: async () => null,
      importProjectRows: async () => {},
      exportProjectRows: async () => null,
      listAssets: async () => [],
      addCleanupTasks: async () => {},
      listCleanupTasks: async () => [],
      deleteProject: async () => {},
    },
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
