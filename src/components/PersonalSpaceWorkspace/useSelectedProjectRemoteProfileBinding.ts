import { useEffect } from 'react'

import type { Project } from '../ProjectStorage'

interface SelectedProjectRemoteProfileSettingsWorkspace {
  setSelectedDatabaseProfileId: (profileId: string) => void
  setSelectedKodoProfileId: (profileId: string) => void
}

interface SelectedProjectRemoteDeviceBindingResolver {
  currentDeviceBindingForProject: (
    projectId: string,
  ) => { databaseProfileId: string; storageProfileId: string } | null
}

export interface UseSelectedProjectRemoteProfileBindingOptions {
  selectedManagementProjectId: string
  projects: Project[]
  findProject: (projectId: string, projectList?: Project[]) => Project | undefined
  ensureRemoteProjectSettings: (projectId: string) => Promise<void>
  remoteDeviceBindingResolver: SelectedProjectRemoteDeviceBindingResolver
  settingsWorkspace: SelectedProjectRemoteProfileSettingsWorkspace
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
}
