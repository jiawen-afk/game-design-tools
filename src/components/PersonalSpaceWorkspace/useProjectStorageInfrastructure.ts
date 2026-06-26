import { useRef } from 'react'

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
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'
import type { PersonalSpaceState } from './personalSpaceModel'
import type { DatabaseProfileDraft } from './usePersonalSpaceSettingsWorkspace'
import { createProjectRemoteDeviceBindingResolver } from './projectRemoteDeviceBinding'
import { createProjectStorageWorkflow, type RemoteProjectSettingsSnapshot } from './projectStorageWorkflow'

interface ProjectStorageInfrastructureSettings {
  databaseProfiles: Array<{ id: string }>
  kodoProfiles: Array<{ id: string }>
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileDraft: DatabaseProfileDraft
  directoryHandle: PersonalSpaceDirectoryHandle | null
  draftStorageDirectory: string
}

const projectRepository = createDesktopLocalProjectRepository()
const projectObjectStorage = createDesktopLocalProjectObjectStorage()
const projectAssetCacheStorage = createDesktopProjectAssetCacheStorage()
const projectBootstrapper = createProjectWorkspaceBootstrapper(projectRepository)

export function useProjectStorageInfrastructure(settingsWorkspace: ProjectStorageInfrastructureSettings) {
  const settingsWorkspaceRef = useRef(settingsWorkspace)
  settingsWorkspaceRef.current = settingsWorkspace
  const remoteProjectSettingsByIdRef = useRef<Record<string, RemoteProjectSettingsSnapshot>>({})
  const remoteProjectIdByObjectProjectNameRef = useRef<Record<string, string>>({})
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
    await remoteDeviceBindingResolver.hydrateCurrentDeviceBindings()
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
    getLocalObjectRoot: (nextSpace: PersonalSpaceState) => (
      settingsWorkspace.draftStorageDirectory || nextSpace.settings.storageDirectory || ''
    ),
  })

  return {
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
  }
}
