import { useRef, useState } from 'react'

import {
  type Project,
} from '../ProjectStorage'
import {
  assetOptions,
  assetKindLabel,
  readPersonalSpaceState,
} from './personalSpaceModel'
import { writeProjectSpaceState } from './projectSpaceState'
import { usePersonalSpaceSettingsWorkspace } from './usePersonalSpaceSettingsWorkspace'
import { useProjectStorageInfrastructure } from './useProjectStorageInfrastructure'
import { useProjectRemoteSync } from './useProjectRemoteSync'
import { useSelectedProjectRemoteProfileBinding } from './useSelectedProjectRemoteProfileBinding'
import {
  createPersonalSpaceProjectSessionActions,
  type PersonalSpaceActiveModule,
  type ProjectSpacePage,
} from './personalSpaceProjectSessionActions'
import { usePersonalSpaceProjectResources } from './usePersonalSpaceProjectResources'
import { usePersonalSpaceWorkspaceActions } from './usePersonalSpaceWorkspaceActions'
import { usePersonalSpaceWorkspaceLifecycle } from './usePersonalSpaceWorkspaceLifecycle'

interface PersonalSpaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

export function usePersonalSpaceWorkspace(messageApi: PersonalSpaceMessageApi) {
  const [space, setSpace] = useState(() => readPersonalSpaceState())
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState('')
  const [workspacePage, setWorkspacePage] = useState<ProjectSpacePage>('workbench')
  const [selectedManagementProjectId, setSelectedManagementProjectId] = useState('')
  const [activeModule, setActiveModule] = useState<PersonalSpaceActiveModule>('characters')
  const [storyboardExportingKey, setStoryboardExportingKey] = useState('')
  const [migratingProjectId, setMigratingProjectId] = useState('')
  const spaceRef = useRef(space)
  const activeProjectIdRef = useRef('')
  const migrationInFlightProjectIdRef = useRef('')
  const spriteUploadBatchKeyByCharacter = useRef<Record<string, string>>({})
  const imageSpriteUploadBatchKey = useRef<string | null>(null)
  const settingsWorkspace = usePersonalSpaceSettingsWorkspace({
    storageDirectory: space.settings.storageDirectory,
    setSpace,
    messageApi,
  })
  const projectStorage = useProjectStorageInfrastructure(settingsWorkspace)
  const {
    ensureRemoteProjectSettings,
    projectAssetManager,
    projectBootstrapper,
    projectObjectStorage,
    projectRepository,
    projectStorageWorkflow,
    rememberRemoteProjectSettings,
    remoteDeviceBindingResolver,
    remoteProjectObjectStorage,
    remoteProjectRepository,
  } = projectStorage

  const findProject = (projectId: string, projectList = projects) => (
    projectList.find((item) => item.id === projectId)
  )

  const {
    activateProjectState,
    activateProjectStateFromStorage,
    changeActiveModule,
    closeProjectManagement,
    disableActiveProject,
    enableProject,
    initializeProjects,
    openProjectManagement,
    refreshActiveProjectState,
    refreshProjectList,
  } = createPersonalSpaceProjectSessionActions({
    projectBootstrapper,
    localRepository: projectRepository,
    remoteRepository: remoteProjectRepository,
    messageApi,
    getSettingsWorkspace: () => settingsWorkspace,
    getProjects: () => projects,
    getActiveProjectId: () => activeProjectIdRef.current,
    findProject,
    ensureRemoteProjectSettings,
    rememberRemoteProjectSettings,
    stateRefs: {
      spaceRef,
      activeProjectIdRef,
    },
    stateSetters: {
      setProjects,
      setActiveProjectId,
      setWorkspacePage,
      setSelectedManagementProjectId,
      setActiveModule,
      setSpace,
    },
  })

  const {
    scheduleRemoteProjectSync,
    syncStatus,
    syncingProjectId,
    syncActiveProjectNow,
  } = useProjectRemoteSync({
    findProject,
    getActiveProjectId: () => activeProjectIdRef.current,
    getCurrentSpace: () => spaceRef.current,
    persistProjectSpaceState: writeProjectSpaceState,
    syncProjectStateToStorage: projectStorageWorkflow.syncProjectStateToStorage,
    messageApi,
  })

  usePersonalSpaceWorkspaceLifecycle({
    activeProjectIdRef,
    initializeProjects,
    scheduleRemoteProjectSync,
    setActiveModule,
    settingsWorkspace,
    space,
    spaceRef,
  })

  useSelectedProjectRemoteProfileBinding({
    selectedManagementProjectId,
    projects,
    findProject,
    ensureRemoteProjectSettings,
    remoteDeviceBindingResolver,
    settingsWorkspace,
  })

  const {
    activeProject,
    activeProjectStorage,
    changeActiveModuleAndRefresh,
    getProjectResourceReadOptions,
    projectResourceReadOptions,
    refreshActiveProjectData,
  } = usePersonalSpaceProjectResources({
    projects,
    activeProjectId,
    getActiveProjectId: () => activeProjectIdRef.current,
    projectStorageWorkflow,
    refreshActiveProjectState,
    changeActiveModule,
  })

  const {
    assetActions,
    creationDrafts,
    derivedState,
    editActions,
    projectManagementActions,
    storyboardVoiceRefs,
  } = usePersonalSpaceWorkspaceActions({
    activeProjectIdRef,
    activateProjectState,
    activateProjectStateFromStorage,
    findProject,
    getProjectResourceReadOptions,
    messageApi,
    migrationInFlightProjectIdRef,
    projects,
    projectStorage,
    refreshProjectList,
    rememberRemoteProjectSettings,
    ensureRemoteProjectSettings,
    settingsWorkspace,
    setMigratingProjectId,
    setSpace,
    setStoryboardExportingKey,
    space,
    spaceRef,
    spriteUploadBatchKeyByCharacter,
    imageSpriteUploadBatchKey,
  })

  return {
    space,
    ...settingsWorkspace,
    projects,
    activeProject,
    enabledProjectId: activeProjectId,
    projectObjectStorage: activeProjectStorage,
    projectAssetManager,
    projectResourceReadOptions,
    workspacePage,
    openProjectManagement,
    closeProjectManagement,
    selectedManagementProjectId,
    setSelectedManagementProjectId,
    enableProject,
    disableActiveProject,
    activeModule,
    storyboardExportingKey,
    migratingProjectId,
    syncStatus,
    syncingProjectId,
    changeActiveModule,
    changeActiveModuleAndRefresh,
    refreshActiveProjectData,
    ...derivedState,
    ...projectManagementActions,
    syncActiveProjectNow,
    ...editActions,
    ...creationDrafts,
    ...assetActions,
    assetOptions,
    assetKindLabel,
    storyboardVoiceRefs,
  }
}
