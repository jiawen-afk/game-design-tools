import type {
  ProjectConnectionProfileSummary,
  ProjectConnectionVerificationResult,
} from '../../desktopApi'
import {
  getRemoteProfileDraftStatus,
  type DraftTestState,
  type ProfileEditMode,
} from './projectRemoteProfileDraftModel'

export interface RemoteConnectionProfileWorkspaceStatusInput {
  databaseProfiles: ProjectConnectionProfileSummary[]
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileMode: ProfileEditMode
  kodoProfileMode: ProfileEditMode
  databaseDraftTestState: DraftTestState
  kodoDraftTestState: DraftTestState
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  kodoVerificationProjectId: string
  databaseSchemaReady: boolean
}

export function getRemoteConnectionProfileWorkspaceStatus(
  input: RemoteConnectionProfileWorkspaceStatusInput,
) {
  const selectedDatabaseProfile = input.databaseProfiles.find((profile) => (
    profile.id === input.selectedDatabaseProfileId
  ))
  const databaseReady = Boolean(
    input.selectedDatabaseProfileId
      && (input.databaseVerification?.ok || selectedDatabaseProfile?.lastVerifiedAt),
  )
  const kodoReady = Boolean(
    input.selectedKodoProfileId
      && input.kodoVerification?.ok
      && input.kodoVerificationProjectId,
  )
  const databaseDraftStatus = getRemoteProfileDraftStatus({
    mode: input.databaseProfileMode,
    selectedProfileId: input.selectedDatabaseProfileId,
    draftTestState: input.databaseDraftTestState,
  })
  const kodoDraftStatus = getRemoteProfileDraftStatus({
    mode: input.kodoProfileMode,
    selectedProfileId: input.selectedKodoProfileId,
    draftTestState: input.kodoDraftTestState,
  })

  return {
    selectedDatabaseProfile,
    databaseReady,
    kodoReady,
    remoteReady: databaseReady && input.databaseSchemaReady && kodoReady,
    databaseDraftStatus,
    kodoDraftStatus,
    databaseDraftTested: databaseDraftStatus.draftTested,
    kodoDraftTested: kodoDraftStatus.draftTested,
  }
}
