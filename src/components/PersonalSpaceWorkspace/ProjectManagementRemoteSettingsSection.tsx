import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft, KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'
import type { ProjectManagementDirtySource } from './useProjectManagementDirtyNavigation'
import { RemoteProjectSettings } from './ProjectRemoteSettingsPanel'

export interface ProjectManagementRemoteSettingsSectionProps {
  databaseProfiles: ProjectConnectionProfileSummary[]
  kodoProfiles: ProjectConnectionProfileSummary[]
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileMode: 'create' | 'edit'
  kodoProfileMode: 'create' | 'edit'
  databaseDraftTestState: 'untested' | 'passed' | 'failed'
  kodoDraftTestState: 'untested' | 'passed' | 'failed'
  databaseDraftTested: boolean
  kodoDraftTested: boolean
  databaseProfileDraft: DatabaseProfileDraft
  kodoProfileDraft: KodoProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  kodoVerificationProjectId: string
  databaseSchemaReady: boolean
  selectedVerificationProjectId: string
  linkTargetProjectId: string
  linkReady: boolean
  bindingDirtySource: ProjectManagementDirtySource
  markDirty: (source: ProjectManagementDirtySource) => void
  clearDirtySource: (source: ProjectManagementDirtySource) => void
  onSelectedDatabaseProfileChange: (profileId: string) => void
  onSelectedKodoProfileChange: (profileId: string) => void
  onDatabaseProfileDraftChange: (draft: DatabaseProfileDraft) => void
  onKodoProfileDraftChange: (draft: KodoProfileDraft) => void
  onAddDatabaseProfile: () => void
  onAddKodoProfile: () => void
  onSaveDatabaseProfile: () => boolean | void | Promise<boolean | void>
  onDeleteDatabaseProfile: () => void
  onSaveKodoProfile: () => boolean | void | Promise<boolean | void>
  onDeleteKodoProfile: () => void
  onVerifyDatabaseProfile: () => void
  onInitializeDatabaseSchema: () => void
  onVerifyKodoProfile: (projectId: string) => void
  onUpdateRemoteProjectLinks: (projectId: string) => boolean | void | Promise<boolean | void>
}

export function ProjectManagementRemoteSettingsSection({
  databaseProfiles,
  kodoProfiles,
  selectedDatabaseProfileId,
  selectedKodoProfileId,
  databaseProfileMode,
  kodoProfileMode,
  databaseDraftTestState,
  kodoDraftTestState,
  databaseDraftTested,
  kodoDraftTested,
  databaseProfileDraft,
  kodoProfileDraft,
  databaseVerification,
  kodoVerification,
  kodoVerificationProjectId,
  databaseSchemaReady,
  selectedVerificationProjectId,
  linkTargetProjectId,
  linkReady,
  bindingDirtySource,
  markDirty,
  clearDirtySource,
  onSelectedDatabaseProfileChange,
  onSelectedKodoProfileChange,
  onDatabaseProfileDraftChange,
  onKodoProfileDraftChange,
  onAddDatabaseProfile,
  onAddKodoProfile,
  onSaveDatabaseProfile,
  onDeleteDatabaseProfile,
  onSaveKodoProfile,
  onDeleteKodoProfile,
  onVerifyDatabaseProfile,
  onInitializeDatabaseSchema,
  onVerifyKodoProfile,
  onUpdateRemoteProjectLinks,
}: ProjectManagementRemoteSettingsSectionProps) {
  const databaseProfileOptions = databaseProfiles.map((profile) => ({
    label: `${profile.displayName} (${profile.redactedSummary})`,
    value: profile.id,
  }))
  const kodoProfileOptions = kodoProfiles.map((profile) => ({
    label: `${profile.displayName} (${profile.redactedSummary})`,
    value: profile.id,
  }))

  const saveDatabaseProfile = async () => {
    const saved = await onSaveDatabaseProfile()
    if (saved !== false) clearDirtySource('databaseProfileDraft')
  }

  const saveKodoProfile = async () => {
    const saved = await onSaveKodoProfile()
    if (saved !== false) clearDirtySource('kodoProfileDraft')
  }

  const updateRemoteProjectLinks = async (projectId: string) => {
    const saved = await onUpdateRemoteProjectLinks(projectId)
    if (saved !== false) clearDirtySource('remoteProjectBinding')
  }

  return (
    <RemoteProjectSettings
      databaseProfiles={databaseProfiles}
      kodoProfiles={kodoProfiles}
      selectedDatabaseProfileId={selectedDatabaseProfileId}
      selectedKodoProfileId={selectedKodoProfileId}
      databaseProfileMode={databaseProfileMode}
      kodoProfileMode={kodoProfileMode}
      databaseDraftTestState={databaseDraftTestState}
      kodoDraftTestState={kodoDraftTestState}
      databaseDraftTested={databaseDraftTested}
      kodoDraftTested={kodoDraftTested}
      databaseProfileDraft={databaseProfileDraft}
      kodoProfileDraft={kodoProfileDraft}
      databaseVerification={databaseVerification}
      kodoVerification={kodoVerification}
      kodoVerificationProjectId={kodoVerificationProjectId}
      databaseSchemaReady={databaseSchemaReady}
      databaseProfileOptions={databaseProfileOptions}
      kodoProfileOptions={kodoProfileOptions}
      selectedVerificationProjectId={selectedVerificationProjectId}
      linkTargetProjectId={linkTargetProjectId}
      linkReady={linkReady}
      onSelectedDatabaseProfileChange={(profileId) => {
        onSelectedDatabaseProfileChange(profileId)
        markDirty(bindingDirtySource)
      }}
      onSelectedKodoProfileChange={(profileId) => {
        onSelectedKodoProfileChange(profileId)
        markDirty(bindingDirtySource)
      }}
      onDatabaseProfileDraftChange={(draft) => {
        onDatabaseProfileDraftChange(draft)
        markDirty('databaseProfileDraft')
      }}
      onKodoProfileDraftChange={(draft) => {
        onKodoProfileDraftChange(draft)
        markDirty('kodoProfileDraft')
      }}
      onAddDatabaseProfile={() => {
        onAddDatabaseProfile()
        markDirty('databaseProfileDraft')
      }}
      onAddKodoProfile={() => {
        onAddKodoProfile()
        markDirty('kodoProfileDraft')
      }}
      onSaveDatabaseProfile={saveDatabaseProfile}
      onDeleteDatabaseProfile={onDeleteDatabaseProfile}
      onSaveKodoProfile={saveKodoProfile}
      onDeleteKodoProfile={onDeleteKodoProfile}
      onVerifyDatabaseProfile={onVerifyDatabaseProfile}
      onInitializeDatabaseSchema={onInitializeDatabaseSchema}
      onVerifyKodoProfile={onVerifyKodoProfile}
      onUpdateRemoteProjectLinks={updateRemoteProjectLinks}
    />
  )
}
