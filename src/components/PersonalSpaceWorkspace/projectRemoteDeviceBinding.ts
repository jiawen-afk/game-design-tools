import {
  readProjectDeviceBinding,
  sanitizeObjectKeyPart,
  hydrateProjectDeviceBindingsFromLocalPersistence,
  writeProjectDeviceBindingToLocalPersistence,
  clearProjectDeviceBindingFromLocalPersistence,
  type Project,
  type ProjectDeviceBindingPersistence,
} from '../ProjectStorage'

type RemoteProjectForDeviceBinding = Pick<Project, 'id' | 'name' | 'object_key_prefix'> & {
  assetObjectKeys?: string[]
}

export interface ProjectRemoteDeviceBindingResolverOptions {
  storage?: Storage
  projectIdByObjectProjectName?: Record<string, string>
  getDatabaseProfileIds: () => string[]
  getStorageProfileIds: () => string[]
  getSelectedDatabaseProfileId: () => string
  getSelectedStorageProfileId: () => string
  persistence?: ProjectDeviceBindingPersistence | null
}

export function objectProjectNameFromPrefix(prefix: string) {
  return prefix.split('/')[1] ?? ''
}

function findAvailableProfileId(profileId: string | null, availableProfileIds: string[]) {
  return profileId && availableProfileIds.includes(profileId) ? profileId : ''
}

export function createProjectRemoteDeviceBindingResolver(options: ProjectRemoteDeviceBindingResolverOptions) {
  const projectIdByObjectProjectName = options.projectIdByObjectProjectName ?? {}

  const currentDeviceBindingForProject = (projectId: string) => {
    const binding = readProjectDeviceBinding(projectId, options.storage)
    if (!binding) return null
    const databaseProfileId = findAvailableProfileId(binding.databaseProfileId, options.getDatabaseProfileIds())
    const storageProfileId = findAvailableProfileId(binding.storageProfileId, options.getStorageProfileIds())
    return databaseProfileId && storageProfileId ? { databaseProfileId, storageProfileId } : null
  }

  const databaseProfileIdForProject = (projectId: string) => {
    const binding = readProjectDeviceBinding(projectId, options.storage)
    return findAvailableProfileId(binding?.databaseProfileId ?? null, options.getDatabaseProfileIds())
  }

  const storageProfileIdForProject = (projectId: string) => {
    const binding = readProjectDeviceBinding(projectId, options.storage)
    return findAvailableProfileId(binding?.storageProfileId ?? null, options.getStorageProfileIds())
  }

  const hydrateCurrentDeviceBindings = () => hydrateProjectDeviceBindingsFromLocalPersistence({
    storage: options.storage,
    persistence: options.persistence,
  })

  const bindProjectToCurrentDevice = async (projectId: string, databaseProfileId: string, storageProfileId: string) => {
    await writeProjectDeviceBindingToLocalPersistence(
      projectId,
      { databaseProfileId, storageProfileId },
      {
        storage: options.storage,
        persistence: options.persistence,
      },
    )
  }

  const clearProjectFromCurrentDevice = async (projectId: string) => {
    await clearProjectDeviceBindingFromLocalPersistence(projectId, {
      storage: options.storage,
      persistence: options.persistence,
    })
  }

  const rememberRemoteProject = (project: RemoteProjectForDeviceBinding) => {
    projectIdByObjectProjectName[sanitizeObjectKeyPart(project.name)] = project.id
    for (const objectKey of [project.object_key_prefix, ...(project.assetObjectKeys ?? [])]) {
      const objectProjectName = objectProjectNameFromPrefix(objectKey)
      if (objectProjectName) projectIdByObjectProjectName[objectProjectName] = project.id
    }
  }

  const getRemoteDatabaseProfileId = (projectId?: string) => (
    projectId
      ? databaseProfileIdForProject(projectId)
      : options.getSelectedDatabaseProfileId()
  )

  const getRemoteStorageProfileId = (objectKey?: string) => {
    if (!objectKey) return options.getSelectedStorageProfileId()
    const objectProjectName = objectProjectNameFromPrefix(objectKey)
    if (!objectProjectName) return options.getSelectedStorageProfileId()
    const projectId = objectProjectName ? projectIdByObjectProjectName[objectProjectName] : ''
    return projectId ? storageProfileIdForProject(projectId) : ''
  }

  return {
    bindProjectToCurrentDevice,
    clearProjectFromCurrentDevice,
    currentDeviceBindingForProject,
    getRemoteDatabaseProfileId,
    getRemoteStorageProfileId,
    hydrateCurrentDeviceBindings,
    rememberRemoteProject,
  }
}
