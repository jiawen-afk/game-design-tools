import {
  clearActiveProjectId,
  type Project,
  type ProjectRepository,
  type ProjectSettings,
  writeActiveProjectId,
} from '../ProjectStorage'
import type { PersonalSpaceState } from './personalSpaceModel'
import {
  createEmptyProjectSpaceState,
  hasProjectSpaceState,
  readProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'
import { loadProjectSpaceStateFromStorage } from './currentProjectSpacePersistence'

export type StateSetter<T> = (next: T | ((current: T) => T)) => void

export interface ProjectSessionStateRefs {
  spaceRef: { current: PersonalSpaceState }
  activeProjectIdRef: { current: string }
}

interface PersonalSpaceProjectActivationMessageApi {
  warning: (content: string) => void
}

interface ProjectActivationStateSetters {
  setActiveProjectId: StateSetter<string>
  setSpace: StateSetter<PersonalSpaceState>
}

interface PersonalSpaceProjectActivationActionsOptions {
  localRepository: ProjectRepository
  remoteRepository: ProjectRepository
  messageApi: PersonalSpaceProjectActivationMessageApi
  getProjects: () => Project[]
  findProject: (projectId: string, projectList?: Project[]) => Project | undefined
  ensureRemoteProjectSettings: (projectId: string) => Promise<void>
  rememberRemoteProjectSettings: (
    project: Project,
    settings: ProjectSettings,
    assetObjectKeys?: string[],
  ) => void
  stateRefs: ProjectSessionStateRefs
  stateSetters: ProjectActivationStateSetters
}

function getActiveProjectState(stateRefs: ProjectSessionStateRefs) {
  return stateRefs.spaceRef.current
}

function getCurrentProjectList(options: PersonalSpaceProjectActivationActionsOptions) {
  return options.getProjects()
}

export function createPersonalSpaceProjectActivationActions(options: PersonalSpaceProjectActivationActionsOptions) {
  const loadProjectSpaceState = async (
    projectId: string,
    fallbackState?: PersonalSpaceState,
    projectList = getCurrentProjectList(options),
  ): Promise<PersonalSpaceState | null> => {
    const project = options.findProject(projectId, projectList)
    return loadProjectSpaceStateFromStorage({
      projectId,
      project,
      fallbackState,
      localRepository: options.localRepository,
      remoteRepository: options.remoteRepository,
      ensureRemoteSettings: options.ensureRemoteProjectSettings,
      onRemoteProjectLoaded: options.rememberRemoteProjectSettings,
      onWarning: (content) => {
        void options.messageApi.warning(content)
      },
    })
  }

  const activateProjectState = (projectId: string, fallbackState?: PersonalSpaceState) => {
    if (options.stateRefs.activeProjectIdRef.current && options.stateRefs.activeProjectIdRef.current !== projectId) {
      writeProjectSpaceState(options.stateRefs.activeProjectIdRef.current, getActiveProjectState(options.stateRefs))
    }

    if (!projectId) {
      options.stateRefs.activeProjectIdRef.current = ''
      options.stateSetters.setActiveProjectId('')
      clearActiveProjectId()
      const emptySpace = createEmptyProjectSpaceState()
      options.stateRefs.spaceRef.current = emptySpace
      options.stateSetters.setSpace(() => emptySpace)
      return
    }

    if (!hasProjectSpaceState(projectId)) {
      writeProjectSpaceState(projectId, fallbackState ?? createEmptyProjectSpaceState())
    }

    const nextSpace = readProjectSpaceState(projectId)
    options.stateRefs.activeProjectIdRef.current = projectId
    options.stateRefs.spaceRef.current = nextSpace
    options.stateSetters.setActiveProjectId(projectId)
    options.stateSetters.setSpace(() => nextSpace)
    writeActiveProjectId(projectId)
  }

  const activateProjectStateFromStorage = async (
    projectId: string,
    fallbackState?: PersonalSpaceState,
    projectList = getCurrentProjectList(options),
  ) => {
    if (!projectId) {
      activateProjectState('')
      return false
    }
    const nextSpace = await loadProjectSpaceState(projectId, fallbackState, projectList)
    if (!nextSpace) {
      activateProjectState('')
      return false
    }
    activateProjectState(projectId, nextSpace)
    return true
  }

  const refreshActiveProjectState = async () => {
    const activeProjectId = options.stateRefs.activeProjectIdRef.current
    if (!activeProjectId) return false
    return activateProjectStateFromStorage(
      activeProjectId,
      getActiveProjectState(options.stateRefs),
    )
  }

  return {
    activateProjectState,
    activateProjectStateFromStorage,
    loadProjectSpaceState,
    refreshActiveProjectState,
  }
}
