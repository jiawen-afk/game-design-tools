import type {
  ProjectConnectionProfileSummary,
  ProjectConnectionVerificationResult,
} from '../../desktopApi'
import type { DatabaseProfileInput, KodoProfileInput } from '../ProjectStorage'
import { shouldKeepDatabaseSchemaInitialization } from '../ProjectStorage/projectProfileMetadata'

export type ProfileEditMode = 'create' | 'edit'
export type DraftTestState = 'untested' | 'passed' | 'failed'
export type DatabaseProfileDraft = DatabaseProfileInput
export type KodoProfileDraft = KodoProfileInput

export interface RemoteProfileDraftStatusInput {
  mode: ProfileEditMode
  selectedProfileId: string
  draftTestState: DraftTestState
}

export function getRemoteProfileDraftStatus(input: RemoteProfileDraftStatusInput) {
  const isExisting = input.mode === 'edit' && Boolean(input.selectedProfileId)
  const draftTested = input.draftTestState !== 'untested'
  return {
    isExisting,
    draftTested,
    canSave: draftTested,
  }
}

export interface DatabaseProfileSaveInputOptions {
  mode: ProfileEditMode
  selectedProfileId: string
  selectedProfile?: ProjectConnectionProfileSummary
  draft: DatabaseProfileDraft
  previousDraft: DatabaseProfileDraft | null
  verification: ProjectConnectionVerificationResult | null
}

export function createDatabaseProfileSaveInput(options: DatabaseProfileSaveInputOptions) {
  return {
    id: options.mode === 'edit' ? options.selectedProfileId : undefined,
    type: 'database' as const,
    displayName: `${options.draft.provider} ${options.draft.database || options.draft.host}`.trim(),
    payload: options.draft,
    lastVerifiedAt: options.verification?.ok ? options.verification.lastVerifiedAt : null,
    schemaInitializedAt: shouldKeepDatabaseSchemaInitialization(
      options.previousDraft,
      options.draft,
    ) ? options.selectedProfile?.schemaInitializedAt ?? null : null,
  }
}

export interface KodoProfileSaveInputOptions {
  mode: ProfileEditMode
  selectedProfileId: string
  draft: KodoProfileDraft
  verification: ProjectConnectionVerificationResult | null
}

export function createKodoProfileSaveInput(options: KodoProfileSaveInputOptions) {
  return {
    id: options.mode === 'edit' ? options.selectedProfileId : undefined,
    type: 'qiniu_kodo' as const,
    displayName: `Kodo ${options.draft.bucket}`.trim(),
    payload: options.draft,
    lastVerifiedAt: options.verification?.ok ? options.verification.lastVerifiedAt : null,
  }
}
