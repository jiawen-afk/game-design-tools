export interface ProjectRemoteConfigurationReadiness {
  remoteReady: boolean
  kodoVerificationProjectId: string
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
}

export function isRemoteProjectConfigurationReady(
  readiness: ProjectRemoteConfigurationReadiness,
  projectId: string,
) {
  return Boolean(
    projectId &&
    readiness.remoteReady &&
    readiness.kodoVerificationProjectId === projectId &&
    readiness.selectedDatabaseProfileId &&
    readiness.selectedKodoProfileId
  )
}
