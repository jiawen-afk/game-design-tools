import {
  readProjectDeviceBinding,
  sanitizeObjectKeyPart,
  writeProjectDeviceBinding,
  type Project,
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

  const bindProjectToCurrentDevice = (projectId: string, databaseProfileId: string, storageProfileId: string) => {
    writeProjectDeviceBinding(projectId, { databaseProfileId, storageProfileId }, options.storage)
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
    currentDeviceBindingForProject,
    getRemoteDatabaseProfileId,
    getRemoteStorageProfileId,
    rememberRemoteProject,
  }
}
