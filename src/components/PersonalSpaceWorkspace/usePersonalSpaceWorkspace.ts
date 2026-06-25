import { useEffect, useRef, useState } from 'react'

import {
  createDesktopLocalProjectObjectStorage,
  createDesktopProjectAssetCacheStorage,
  createDesktopLocalProjectRepository,
  createDesktopRemoteProjectRepository,
  createDesktopKodoProjectObjectStorage,
  createProjectAssetManager,
  createProjectWorkspaceBootstrapper,
  type Project,
  type ProjectSettings,
} from '../ProjectStorage'
import {
  assetOptions,
  assetKindLabel,
  createPersonalSpaceDerivedState,
  readPersonalSpaceState,
} from './personalSpaceModel'
import { writeProjectSpaceState } from './projectSpaceState'
import { usePersonalSpaceSettingsWorkspace } from './usePersonalSpaceSettingsWorkspace'
import { createProjectStorageWorkflow, type RemoteProjectSettingsSnapshot } from './projectStorageWorkflow'
import { createProjectRemoteDeviceBindingResolver } from './projectRemoteDeviceBinding'
import { useProjectRemoteSync } from './useProjectRemoteSync'
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

const projectRepository = createDesktopLocalProjectRepository()
const projectObjectStorage = createDesktopLocalProjectObjectStorage()
const projectAssetCacheStorage = createDesktopProjectAssetCacheStorage()
const projectBootstrapper = createProjectWorkspaceBootstrapper(projectRepository)

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
  const remoteProjectSettingsByIdRef = useRef<Record<string, RemoteProjectSettingsSnapshot>>({})
  const remoteProjectIdByObjectProjectNameRef = useRef<Record<string, string>>({})
  const spriteUploadBatchKeyByCharacter = useRef<Record<string, string>>({})
  const imageSpriteUploadBatchKey = useRef<string | null>(null)
  const settingsWorkspace = usePersonalSpaceSettingsWorkspace({
    storageDirectory: space.settings.storageDirectory,
    setSpace,
    messageApi,
  })
  const settingsWorkspaceRef = useRef(settingsWorkspace)
  settingsWorkspaceRef.current = settingsWorkspace
  const remoteDeviceBindingResolverRef = useRef<ReturnType<typeof createProjectRemoteDeviceBindingResolver> | null>(null)
  if (!remoteDeviceBindingResolverRef.current) {
    remoteDeviceBindingResolverRef.current = createProjectRemoteDeviceBindingResolver({
      projectIdByObjectProjectName: remoteProjectIdByObjectProjectNameRef.current,
      getDatabaseProfileIds: () => settingsWorkspaceRef.current.databaseProfiles.map((profile) => profile.id),
      getStorageProfileIds: () => settingsWorkspaceRef.current.kodoProfiles.map((profile) => profile.id),
      getSelectedDatabaseProfileId: () => settingsWorkspaceRef.current.selectedDatabaseProfileId,
      getSelectedStorageProfileId: () => settingsWorkspaceRef.current.selectedKodoProfileId,
    })
  }
  const remoteDeviceBindingResolver = remoteDeviceBindingResolverRef.current
  const rememberRemoteProjectSettings = (
    project: Project,
    settings: ProjectSettings,
    assetObjectKeys: string[] = [],
  ) => {
    remoteProjectSettingsByIdRef.current[project.id] = {
      database_provider: settings.database_provider,
    }
    remoteDeviceBindingResolver.rememberRemoteProject({ ...project, assetObjectKeys })
  }
  const selectedRemoteSettingsSnapshot = (): RemoteProjectSettingsSnapshot => ({
    database_provider: settingsWorkspace.databaseProfileDraft.provider,
  })
  const remoteSettingsForProject = (projectId: string): RemoteProjectSettingsSnapshot => (
    remoteProjectSettingsByIdRef.current[projectId] ?? selectedRemoteSettingsSnapshot()
  )
  const ensureRemoteProjectSettings = async (projectId: string) => {
    if (remoteProjectSettingsByIdRef.current[projectId]) return
    const localSnapshot = await projectRepository.getProject(projectId)
    if (localSnapshot?.project.mode === 'remote') {
      rememberRemoteProjectSettings(localSnapshot.project, localSnapshot.settings)
    }
  }
  const remoteProjectRepository = createDesktopRemoteProjectRepository(
    remoteDeviceBindingResolver.getRemoteDatabaseProfileId,
  )
  const remoteProjectObjectStorage = createDesktopKodoProjectObjectStorage(
    remoteDeviceBindingResolver.getRemoteStorageProfileId,
  )
  const projectAssetManager = createProjectAssetManager({
    localObjectStorage: projectObjectStorage,
    remoteObjectStorage: remoteProjectObjectStorage,
    cacheStorage: projectAssetCacheStorage,
  })
  const projectStorageWorkflow = createProjectStorageWorkflow({
    localRepository: projectRepository,
    remoteRepository: remoteProjectRepository,
    localObjectStorage: projectObjectStorage,
    remoteObjectStorage: remoteProjectObjectStorage,
    assetManager: projectAssetManager,
    getRemoteSettings: remoteSettingsForProject,
    ensureRemoteSettings: ensureRemoteProjectSettings,
    getDirectoryHandle: () => settingsWorkspace.directoryHandle,
    getLocalObjectRoot: (nextSpace) => (
      settingsWorkspace.draftStorageDirectory || nextSpace.settings.storageDirectory || ''
    ),
  })

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

  useEffect(() => {
    const selectedProjectId = selectedManagementProjectId
    const project = findProject(selectedProjectId)
    if (!selectedProjectId || project?.mode !== 'remote') return
    void ensureRemoteProjectSettings(selectedProjectId).then(() => {
      const currentDeviceBinding = remoteDeviceBindingResolver.currentDeviceBindingForProject(selectedProjectId)
      const databaseProfileId = currentDeviceBinding?.databaseProfileId
      const storageProfileId = currentDeviceBinding?.storageProfileId
      if (databaseProfileId) {
        settingsWorkspace.setSelectedDatabaseProfileId(databaseProfileId)
      }
      if (storageProfileId) {
        settingsWorkspace.setSelectedKodoProfileId(storageProfileId)
      }
    })
  }, [selectedManagementProjectId, projects])

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
  const activeProjectObjectStorage = activeProject?.mode === 'remote'
    ? remoteProjectObjectStorage
    : projectObjectStorage
  const projectResourceReadOptions = {
    projectObjectStorage: activeProjectObjectStorage,
    projectAssetManager,
    projectId: activeProject?.id,
    projectMode: activeProject?.mode,
  }

  const storyboardVoiceRefs = (assetId: string) => space.storyboardGroups
    .flatMap((group) => group.voiceEntries
      .filter((entry) => entry.assetId === assetId)
      .map((entry) => `${group.name} #${entry.order + 1}`))

  return {
    space,
    ...settingsWorkspace,
    projects,
    activeProject,
    enabledProjectId: activeProjectId,
    projectObjectStorage: activeProjectObjectStorage,
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
