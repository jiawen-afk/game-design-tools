import { useEffect, useRef, useState } from 'react'

import {
  type Project,
} from '../ProjectStorage'
import {
  assetOptions,
  assetKindLabel,
  createPersonalSpaceDerivedState,
  createStoryboardVoiceRefs,
  readPersonalSpaceState,
} from './personalSpaceModel'
import { writeProjectSpaceState } from './projectSpaceState'
import { usePersonalSpaceSettingsWorkspace } from './usePersonalSpaceSettingsWorkspace'
import { useProjectStorageInfrastructure } from './useProjectStorageInfrastructure'
import { useProjectRemoteSync } from './useProjectRemoteSync'
import { useSelectedProjectRemoteProfileBinding } from './useSelectedProjectRemoteProfileBinding'
import { createProjectManagementActions } from './projectManagementActions'
import { createPersonalSpaceAssetActions } from './personalSpaceAssetActions'
import { createPersonalSpaceEditActions } from './personalSpaceEditActions'
import {
  createPersonalSpaceProjectSessionActions,
  type PersonalSpaceActiveModule,
  type ProjectSpacePage,
} from './personalSpaceProjectSessionActions'

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
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newStoryboardName, setNewStoryboardName] = useState('')
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
  } = useProjectStorageInfrastructure(settingsWorkspace)

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

  useEffect(() => {
    let cancelled = false

    void initializeProjects(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [settingsWorkspace.connectionProfilesLoaded])

  useEffect(() => {
    spaceRef.current = space
    if (activeProjectIdRef.current) {
      writeProjectSpaceState(activeProjectIdRef.current, space)
      scheduleRemoteProjectSync(space)
    }
  }, [space])

  useEffect(() => {
    if (settingsWorkspace.directoryHandleChecked && !settingsWorkspace.directoryHandle) {
      setActiveModule('settings')
    }
  }, [settingsWorkspace.directoryHandleChecked, settingsWorkspace.directoryHandle])

  useSelectedProjectRemoteProfileBinding({
    selectedManagementProjectId,
    projects,
    findProject,
    ensureRemoteProjectSettings,
    remoteDeviceBindingResolver,
    settingsWorkspace,
  })

  const {
    createLocalProject,
    createRemoteProject,
    renameProject,
    updateRemoteProjectLinks,
    deleteProject,
    migrateActiveProjectToRemote,
  } = createProjectManagementActions({
    localRepository: projectRepository,
    remoteRepository: remoteProjectRepository,
    localObjectStorage: projectObjectStorage,
    remoteObjectStorage: remoteProjectObjectStorage,
    assetManager: projectAssetManager,
    storageWorkflow: projectStorageWorkflow,
    remoteDeviceBindingResolver,
    messageApi,
    getSettingsWorkspace: () => settingsWorkspace,
    getProjects: () => projects,
    getActiveProjectId: () => activeProjectIdRef.current,
    getSpace: () => spaceRef.current,
    migrationInFlightProjectIdRef,
    setMigratingProjectId,
    refreshProjectList,
    activateProjectState,
    activateProjectStateFromStorage,
    ensureRemoteProjectSettings,
    rememberRemoteProjectSettings,
    findProject,
  })

  const {
    createCharacter: createCharacterInSpace,
    createStoryboard: createStoryboardInSpace,
    renameCharacter,
    toggleCharacterStar,
    reorderCharacter,
    deleteCharacter,
    assignAsset,
    unassignAsset,
    reorderCharacterVoice,
    moveCharacterVoice,
    renameStoryboard,
    toggleStoryboardStar,
    deleteStoryboard,
    getStoryboardLinkedCharacterIds,
    assignVoiceToStoryboard,
    unassignStoryboardVoice,
    assignStoryboardVoiceCharacter,
    updateStoryboardVoice,
    reorderStoryboardVoice,
    moveStoryboardVoice,
    renameAsset,
    changeAssetGroupName,
    changeVoiceDialogueText,
    changeEffectVoiceLinks,
    changeVoiceCharacterLinks,
    changeVoiceStoryboardLinks,
    addAssetGroup,
    renameAssetGroup,
    toggleAssetGroupStar,
    transferAssetGroup,
    deleteAssetGroup,
    setDeleteResourcesWithContent,
  } = createPersonalSpaceEditActions({
    messageApi,
    getSpace: () => spaceRef.current,
    setSpace,
  })

  const createCharacter = () => {
    createCharacterInSpace(newCharacterName)
    setNewCharacterName('')
  }

  const createStoryboard = () => {
    createStoryboardInSpace(newStoryboardName)
    setNewStoryboardName('')
  }

  const {
    deleteAsset,
    exportStoryboardAsset,
    exportStoryboardVoiceAssets,
    exportStoryboardCharacterAssets,
    exportAllStoryboardVoiceAssets,
    exportAllStoryboardCharacterAssets,
    portraitUploadProps,
    spriteUploadProps,
    voiceUploadProps,
    storyboardVoiceUploadProps,
    commonResourceUploadProps,
    imageSpriteUploadProps,
  } = createPersonalSpaceAssetActions({
    messageApi,
    getSpace: () => spaceRef.current,
    setSpace,
    getDirectoryHandle: () => settingsWorkspace.directoryHandle,
    getProjectResourceReadOptions: () => (
      projectStorageWorkflow.projectReadOptionsForProject(findProject(activeProjectIdRef.current))
    ),
    setStoryboardExportingKey,
    spriteUploadBatchKeyByCharacter,
    imageSpriteUploadBatchKey,
  })

  const {
    portraitAssets,
    spriteAssets,
    voiceAssets,
    characterOptions,
    resourceSections,
    assetCounts,
  } = createPersonalSpaceDerivedState(space)
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const activeProjectStorage = projectStorageWorkflow.objectStorageForProject(activeProject)
  const projectResourceReadOptions = projectStorageWorkflow.projectReadOptionsForProject(activeProject)
  const storyboardVoiceRefs = (assetId: string) => createStoryboardVoiceRefs(space, assetId)

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
    newCharacterName,
    newStoryboardName,
    storyboardExportingKey,
    migratingProjectId,
    syncingProjectId,
    portraitAssets,
    spriteAssets,
    voiceAssets,
    characterOptions,
    resourceSections,
    assetCounts,
    setNewCharacterName,
    setNewStoryboardName,
    changeActiveModule,
    createLocalProject,
    createRemoteProject,
    renameProject,
    updateRemoteProjectLinks,
    deleteProject,
    migrateActiveProjectToRemote,
    syncActiveProjectNow,
    createCharacter,
    createStoryboard,
    exportStoryboardAsset,
    exportStoryboardVoiceAssets,
    exportStoryboardCharacterAssets,
    exportAllStoryboardVoiceAssets,
    exportAllStoryboardCharacterAssets,
    portraitUploadProps,
    spriteUploadProps,
    voiceUploadProps,
    storyboardVoiceUploadProps,
    commonResourceUploadProps,
    imageSpriteUploadProps,
    assetOptions,
    assetKindLabel,
    storyboardVoiceRefs,
    renameCharacter,
    toggleCharacterStar,
    reorderCharacter,
    deleteCharacter,
    assignAsset,
    unassignAsset,
    reorderCharacterVoice,
    moveCharacterVoice,
    renameStoryboard,
    toggleStoryboardStar,
    deleteStoryboard,
    getStoryboardLinkedCharacterIds,
    assignVoiceToStoryboard,
    unassignStoryboardVoice,
    assignStoryboardVoiceCharacter,
    updateStoryboardVoice,
    reorderStoryboardVoice,
    moveStoryboardVoice,
    renameAsset,
    changeAssetGroupName,
    changeVoiceDialogueText,
    changeEffectVoiceLinks,
    changeVoiceCharacterLinks,
    changeVoiceStoryboardLinks,
    addAssetGroup,
    renameAssetGroup,
    toggleAssetGroupStar,
    transferAssetGroup,
    deleteAssetGroup,
    deleteAsset,
    setDeleteResourcesWithContent,
  }
}
