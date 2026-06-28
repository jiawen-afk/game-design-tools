import type { ProjectRemoteProfileActionsOptions } from './projectRemoteProfileActionTypes'
import { createProjectRemoteProfileDeleteActions } from './projectRemoteProfileDeleteActions'
import { refreshProjectConnectionProfiles } from './projectRemoteProfileRefreshActions'
import { createProjectRemoteProfileSaveActions } from './projectRemoteProfileSaveActions'
import { createProjectRemoteProfileVerificationActions } from './projectRemoteProfileVerificationActions'

export type { ProjectRemoteProfileActionsOptions } from './projectRemoteProfileActionTypes'

export function createProjectRemoteProfileActions(options: ProjectRemoteProfileActionsOptions) {
  const refreshProfiles = () => refreshProjectConnectionProfiles({
    messageApi: options.messageApi,
    setDatabaseProfiles: options.setDatabaseProfiles,
    setKodoProfiles: options.setKodoProfiles,
  })
  const deleteActions = createProjectRemoteProfileDeleteActions({ ...options, refreshProfiles })
  const saveActions = createProjectRemoteProfileSaveActions(options)
  const verificationActions = createProjectRemoteProfileVerificationActions({ ...options, refreshProfiles })

  return {
    ...deleteActions,
    ...saveActions,
    ...verificationActions,
  }
}
