import type {
  ProjectConnectionProfileSummary,
  ProjectConnectionVerificationResult,
} from '../../desktopApi'
import type { RemoteProfileActionMessageApi } from './projectRemoteProfileActionGuards'
import type {
  DatabaseProfileDraft,
  DraftTestState,
  KodoProfileDraft,
  ProfileEditMode,
} from './projectRemoteProfileDraftModel'

export interface RemoteProfileMessageApi extends RemoteProfileActionMessageApi {
  success: (content: string) => void
}

export interface RemoteProfileDraftStatus {
  isExisting: boolean
  draftTested: boolean
}

export type StateSetter<T> = (next: T | ((current: T) => T)) => void

export interface MutableValue<T> {
  current: T
}

export interface ProjectRemoteProfileActionsOptions {
  messageApi: RemoteProfileMessageApi
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  selectedDatabaseProfile?: ProjectConnectionProfileSummary
  databaseProfileMode: ProfileEditMode
  kodoProfileMode: ProfileEditMode
  databaseProfileDraft: DatabaseProfileDraft
  kodoProfileDraft: KodoProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  databaseDraftStatus: RemoteProfileDraftStatus
  kodoDraftStatus: RemoteProfileDraftStatus
  previousDatabaseProfileDraftRef: MutableValue<DatabaseProfileDraft | null>
  skipNextDatabaseProfileLoadRef: MutableValue<boolean>
  skipNextKodoProfileLoadRef: MutableValue<boolean>
  setDatabaseProfiles: StateSetter<ProjectConnectionProfileSummary[]>
  setKodoProfiles: StateSetter<ProjectConnectionProfileSummary[]>
  setSelectedDatabaseProfileId: StateSetter<string>
  setSelectedKodoProfileId: StateSetter<string>
  setDatabaseProfileMode: StateSetter<ProfileEditMode>
  setKodoProfileMode: StateSetter<ProfileEditMode>
  setDatabaseVerification: StateSetter<ProjectConnectionVerificationResult | null>
  setKodoVerification: StateSetter<ProjectConnectionVerificationResult | null>
  setKodoVerificationProjectId: StateSetter<string>
  setDatabaseProfileDraft: StateSetter<DatabaseProfileDraft>
  setKodoProfileDraft: StateSetter<KodoProfileDraft>
  setDatabaseSchemaReady: StateSetter<boolean>
  setDatabaseDraftTestState: StateSetter<DraftTestState>
  setKodoDraftTestState: StateSetter<DraftTestState>
}
