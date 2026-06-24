import {
  readProjectDeviceBinding,
  sanitizeObjectKeyPart,
  writeProjectDeviceBinding,
  type Project,
} from '../ProjectStorage'

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

  const bindProjectToCurrentDevice = (projectId: string, databaseProfileId: string, storageProfileId: string) => {
    writeProjectDeviceBinding(projectId, { databaseProfileId, storageProfileId }, options.storage)
  }

  const rememberRemoteProject = (project: Pick<Project, 'id' | 'name' | 'object_key_prefix'>) => {
    projectIdByObjectProjectName[sanitizeObjectKeyPart(project.name)] = project.id
    const objectProjectName = objectProjectNameFromPrefix(project.object_key_prefix)
    if (objectProjectName) projectIdByObjectProjectName[objectProjectName] = project.id
  }

  const getRemoteDatabaseProfileId = (projectId?: string) => (
    projectId
      ? (currentDeviceBindingForProject(projectId)?.databaseProfileId ?? '')
      : options.getSelectedDatabaseProfileId()
  )

  const getRemoteStorageProfileId = (objectKey?: string) => {
    const objectProjectName = objectKey?.split('/')[1] ?? ''
    const projectId = objectProjectName ? projectIdByObjectProjectName[objectProjectName] : ''
    return (
      projectId
        ? (currentDeviceBindingForProject(projectId)?.storageProfileId ?? '')
        : options.getSelectedStorageProfileId()
    )
  }

  return {
    bindProjectToCurrentDevice,
    currentDeviceBindingForProject,
    getRemoteDatabaseProfileId,
    getRemoteStorageProfileId,
    rememberRemoteProject,
  }
}
