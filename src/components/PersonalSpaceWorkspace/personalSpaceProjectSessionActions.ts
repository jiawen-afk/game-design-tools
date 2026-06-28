import {
  readActiveProjectId,
  resolveEnabledProjectId,
  type Project,
  type ProjectRepository,
  type ProjectSettings,
} from '../ProjectStorage'
import { readPersonalSpaceState, type PersonalSpaceState } from './personalSpaceModel'
import {
  createPersonalSpaceProjectActivationActions,
  type ProjectSessionStateRefs,
  type StateSetter,
} from './personalSpaceProjectActivationActions'
import { formatRemoteProjectListError } from './remoteProjectMessages'
import { listProjectCatalogWithRemoteFallback } from './projectWorkspaceStartup'

export type PersonalSpaceActiveModule = 'characters' | 'storyboards' | 'materials' | 'settings'
export type ProjectSpacePage = 'workbench' | 'management'

interface PersonalSpaceSessionMessageApi {
  warning: (content: string) => void
  success: (content: string) => void
}

interface PersonalSpaceSessionSettingsWorkspace {
  connectionProfilesLoaded: boolean
  directoryHandleChecked: boolean
  directoryHandle: unknown
  draftStorageDirectory: string
}

interface ProjectWorkspaceBootstrapper {
  listProjects: (storageDirectory: string) => Promise<Project[]>
}

interface ProjectSessionStateSetters {
  setProjects: StateSetter<Project[]>
  setActiveProjectId: StateSetter<string>
  setWorkspacePage: StateSetter<ProjectSpacePage>
  setSelectedManagementProjectId: StateSetter<string>
  setActiveModule: StateSetter<PersonalSpaceActiveModule>
  setSpace: StateSetter<PersonalSpaceState>
}

export interface PersonalSpaceProjectSessionActionsOptions {
  projectBootstrapper: ProjectWorkspaceBootstrapper
  localRepository: ProjectRepository
  remoteRepository: ProjectRepository
  messageApi: PersonalSpaceSessionMessageApi
  getSettingsWorkspace: () => PersonalSpaceSessionSettingsWorkspace
  getProjects: () => Project[]
  getActiveProjectId: () => string
  findProject: (projectId: string, projectList?: Project[]) => Project | undefined
  ensureRemoteProjectSettings: (projectId: string) => Promise<void>
  rememberRemoteProjectSettings: (
    project: Project,
    settings: ProjectSettings,
    assetObjectKeys?: string[],
  ) => void
  stateRefs: ProjectSessionStateRefs
  stateSetters: ProjectSessionStateSetters
}

function getCurrentProjectList(options: PersonalSpaceProjectSessionActionsOptions) {
  return options.getProjects()
}

export function createPersonalSpaceProjectSessionActions(options: PersonalSpaceProjectSessionActionsOptions) {
  const {
    activateProjectState,
    activateProjectStateFromStorage,
    loadProjectSpaceState,
    refreshActiveProjectState,
  } = createPersonalSpaceProjectActivationActions({
    localRepository: options.localRepository,
    remoteRepository: options.remoteRepository,
    messageApi: options.messageApi,
    getProjects: options.getProjects,
    findProject: options.findProject,
    ensureRemoteProjectSettings: options.ensureRemoteProjectSettings,
    rememberRemoteProjectSettings: options.rememberRemoteProjectSettings,
    stateRefs: options.stateRefs,
    stateSetters: options.stateSetters,
  })

  const refreshProjectList = async (preferredProjectId = '') => {
    const { projects, remoteError } = await listProjectCatalogWithRemoteFallback(
      options.localRepository,
      options.remoteRepository,
    )
    if (remoteError) {
      void options.messageApi.warning(formatRemoteProjectListError(remoteError))
    }
    options.stateSetters.setProjects(projects)
    options.stateSetters.setSelectedManagementProjectId((current) => {
      const nextPreferredProjectId = preferredProjectId || current || options.getActiveProjectId()
      if (nextPreferredProjectId && projects.some((project) => project.id === nextPreferredProjectId)) return nextPreferredProjectId
      return projects[0]?.id ?? ''
    })
    return projects
  }

  const initializeProjects = async (isCancelled = () => false) => {
    if (!options.getSettingsWorkspace().connectionProfilesLoaded) return
    const legacySpace = readPersonalSpaceState()
    const localProjects = await options.projectBootstrapper.listProjects(legacySpace.settings.storageDirectory || '')
    const { projects, remoteError } = await listProjectCatalogWithRemoteFallback(
      { listProjects: async () => localProjects },
      options.remoteRepository,
    )
    if (isCancelled()) return
    if (remoteError) {
      void options.messageApi.warning(formatRemoteProjectListError(remoteError))
    }
    const enabledProjectId = resolveEnabledProjectId(projects, readActiveProjectId())
    options.stateSetters.setProjects(projects)
    options.stateSetters.setSelectedManagementProjectId(enabledProjectId || projects[0]?.id || '')
    if (enabledProjectId) {
      void activateProjectStateFromStorage(enabledProjectId, legacySpace, projects)
    } else {
      activateProjectState('')
    }
  }

  const changeActiveModule = (key: string) => {
    const nextModule = key as PersonalSpaceActiveModule
    if (!options.stateRefs.activeProjectIdRef.current && nextModule !== 'settings') {
      options.stateSetters.setActiveModule('settings')
      void options.messageApi.warning('请先启用一个项目空间')
      return false
    }
    if (!options.getSettingsWorkspace().directoryHandle && nextModule !== 'settings') {
      options.stateSetters.setActiveModule('settings')
      void options.messageApi.warning('请先选择授权目录')
      return false
    }
    options.stateSetters.setActiveModule(nextModule)
    return true
  }

  const enableProject = (projectId: string) => {
    if (!options.getProjects().some((project) => project.id === projectId)) {
      void options.messageApi.warning('项目不存在，无法启用')
      return
    }
    options.stateSetters.setSelectedManagementProjectId(projectId)
    void activateProjectStateFromStorage(projectId).then((activated) => {
      if (activated) {
        void options.messageApi.success('已启用项目')
      }
    })
  }

  const disableActiveProject = () => {
    if (!options.stateRefs.activeProjectIdRef.current) return
    activateProjectState('')
    void options.messageApi.warning('已取消启用项目')
  }

  const openProjectManagement = () => {
    options.stateSetters.setSelectedManagementProjectId(options.stateRefs.activeProjectIdRef.current || options.getProjects()[0]?.id || '')
    options.stateSetters.setWorkspacePage('management')
  }

  const closeProjectManagement = () => {
    options.stateSetters.setWorkspacePage('workbench')
  }

  return {
    activateProjectState,
    activateProjectStateFromStorage,
    changeActiveModule,
    closeProjectManagement,
    disableActiveProject,
    enableProject,
    initializeProjects,
    findProject: options.findProject,
    loadProjectSpaceState,
    openProjectManagement,
    refreshActiveProjectState,
    refreshProjectList,
  }
}
