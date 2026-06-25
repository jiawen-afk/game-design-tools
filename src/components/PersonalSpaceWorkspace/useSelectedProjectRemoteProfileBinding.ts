import { useEffect } from 'react'

import type { Project } from '../ProjectStorage'

interface SelectedProjectRemoteProfileSettingsWorkspace {
  setSelectedDatabaseProfileId: (profileId: string) => void
  setSelectedKodoProfileId: (profileId: string) => void
}

export interface SelectedProjectRemoteDeviceBinding {
  databaseProfileId: string
  storageProfileId: string
}

interface SelectedProjectRemoteDeviceBindingResolver {
  currentDeviceBindingForProject: (
    projectId: string,
  ) => SelectedProjectRemoteDeviceBinding | null
}

export interface UseSelectedProjectRemoteProfileBindingOptions {
  selectedManagementProjectId: string
  projects: Project[]
  findProject: (projectId: string, projectList?: Project[]) => Project | undefined
  ensureRemoteProjectSettings: (projectId: string) => Promise<void>
  remoteDeviceBindingResolver: SelectedProjectRemoteDeviceBindingResolver
  settingsWorkspace: SelectedProjectRemoteProfileSettingsWorkspace
}

export async function resolveSelectedProjectRemoteProfileBinding({
  selectedProjectId,
  ensureRemoteProjectSettings,
  remoteDeviceBindingResolver,
}: Pick<UseSelectedProjectRemoteProfileBindingOptions, 'ensureRemoteProjectSettings' | 'remoteDeviceBindingResolver'> & {
  selectedProjectId: string
}) {
  try {
    await ensureRemoteProjectSettings(selectedProjectId)
  } catch {
    return null
  }
  return remoteDeviceBindingResolver.currentDeviceBindingForProject(selectedProjectId)
}

export function useSelectedProjectRemoteProfileBinding({
  selectedManagementProjectId,
  projects,
  findProject,
  ensureRemoteProjectSettings,
  remoteDeviceBindingResolver,
  settingsWorkspace,
}: UseSelectedProjectRemoteProfileBindingOptions) {
  useEffect(() => {
    const selectedProjectId = selectedManagementProjectId
    const project = findProject(selectedProjectId)
    if (!selectedProjectId || project?.mode !== 'remote') return
    let active = true
    void resolveSelectedProjectRemoteProfileBinding({
      selectedProjectId,
      ensureRemoteProjectSettings,
      remoteDeviceBindingResolver,
    }).then((currentDeviceBinding) => {
      if (!active || !currentDeviceBinding) return
      const databaseProfileId = currentDeviceBinding?.databaseProfileId
      const storageProfileId = currentDeviceBinding?.storageProfileId
      if (databaseProfileId) {
        settingsWorkspace.setSelectedDatabaseProfileId(databaseProfileId)
      }
      if (storageProfileId) {
        settingsWorkspace.setSelectedKodoProfileId(storageProfileId)
      }
    })
    return () => {
      active = false
    }
  }, [selectedManagementProjectId, projects])
}
