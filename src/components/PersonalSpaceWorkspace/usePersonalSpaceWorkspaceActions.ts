import type { Dispatch, MutableRefObject, SetStateAction } from 'react'

import type { Project } from '../ProjectStorage'
import {
  createPersonalSpaceDerivedState,
  createStoryboardVoiceRefs,
  type PersonalSpaceState,
} from './personalSpaceModel'
import { createProjectManagementActions } from './projectManagementActions'
import { createPersonalSpaceAssetActions } from './personalSpaceAssetActions'
import { createPersonalSpaceEditActions } from './personalSpaceEditActions'
import { usePersonalSpaceCreationDrafts } from './usePersonalSpaceCreationDrafts'
import type { usePersonalSpaceProjectResources } from './usePersonalSpaceProjectResources'
import type { usePersonalSpaceSettingsWorkspace } from './usePersonalSpaceSettingsWorkspace'
import type { useProjectStorageInfrastructure } from './useProjectStorageInfrastructure'

interface PersonalSpaceWorkspaceActionsMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

interface UsePersonalSpaceWorkspaceActionsOptions {
  activeProjectIdRef: MutableRefObject<string>
  activateProjectState: (projectId: string, fallbackState?: PersonalSpaceState) => void
  activateProjectStateFromStorage: (
    projectId: string,
    fallbackState?: PersonalSpaceState,
    projectList?: Project[],
  ) => Promise<boolean>
  findProject: (projectId: string, projectList?: Project[]) => Project | undefined
  getProjectResourceReadOptions: ReturnType<typeof usePersonalSpaceProjectResources>['getProjectResourceReadOptions']
  messageApi: PersonalSpaceWorkspaceActionsMessageApi
  migrationInFlightProjectIdRef: MutableRefObject<string>
  projects: Project[]
  projectStorage: ReturnType<typeof useProjectStorageInfrastructure>
  refreshProjectList: (preferredProjectId?: string) => Promise<Project[]>
  rememberRemoteProjectSettings: ReturnType<typeof useProjectStorageInfrastructure>['rememberRemoteProjectSettings']
  ensureRemoteProjectSettings: ReturnType<typeof useProjectStorageInfrastructure>['ensureRemoteProjectSettings']
  settingsWorkspace: ReturnType<typeof usePersonalSpaceSettingsWorkspace>
  setMigratingProjectId: Dispatch<SetStateAction<string>>
  setSpace: Dispatch<SetStateAction<PersonalSpaceState>>
  setStoryboardExportingKey: Dispatch<SetStateAction<string>>
  space: PersonalSpaceState
  spaceRef: MutableRefObject<PersonalSpaceState>
  spriteUploadBatchKeyByCharacter: MutableRefObject<Record<string, string>>
  imageSpriteUploadBatchKey: MutableRefObject<string | null>
}

export function usePersonalSpaceWorkspaceActions({
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
}: UsePersonalSpaceWorkspaceActionsOptions) {
  const projectManagementActions = createProjectManagementActions({
    localRepository: projectStorage.projectRepository,
    remoteRepository: projectStorage.remoteProjectRepository,
    localObjectStorage: projectStorage.projectObjectStorage,
    remoteObjectStorage: projectStorage.remoteProjectObjectStorage,
    assetManager: projectStorage.projectAssetManager,
    storageWorkflow: projectStorage.projectStorageWorkflow,
    remoteDeviceBindingResolver: projectStorage.remoteDeviceBindingResolver,
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

  const editActions = createPersonalSpaceEditActions({
    messageApi,
    getSpace: () => spaceRef.current,
    setSpace,
  })

  const creationDrafts = usePersonalSpaceCreationDrafts({
    createCharacterInSpace: editActions.createCharacter,
    createStoryboardInSpace: editActions.createStoryboard,
  })

  const assetActions = createPersonalSpaceAssetActions({
    messageApi,
    getSpace: () => spaceRef.current,
    setSpace,
    getDirectoryHandle: () => settingsWorkspace.directoryHandle,
    getProjectResourceReadOptions,
    setStoryboardExportingKey,
    spriteUploadBatchKeyByCharacter,
    imageSpriteUploadBatchKey,
  })

  const derivedState = createPersonalSpaceDerivedState(space)
  const storyboardVoiceRefs = (assetId: string) => createStoryboardVoiceRefs(space, assetId)

  return {
    assetActions,
    creationDrafts,
    derivedState,
    editActions,
    projectManagementActions,
    storyboardVoiceRefs,
  }
}
