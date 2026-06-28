import type { Project } from '../ProjectStorage'
import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft, KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'
import type { ProjectManagementRemoteSettingsSectionProps } from './ProjectManagementRemoteSettingsSection'
import { isRemoteProjectConfigurationReady } from './projectManagementModel'
import { useProjectDetailsDraft } from './useProjectDetailsDraft'
import { useProjectManagementDirtyNavigation } from './useProjectManagementDirtyNavigation'

type ProjectProfileDraftTestState = 'untested' | 'passed' | 'failed'

type ProjectManagementRemoteSettingsProps = Omit<
  ProjectManagementRemoteSettingsSectionProps,
  'selectedVerificationProjectId' | 'linkTargetProjectId' | 'linkReady' | 'bindingDirtySource'
>

export interface UseProjectManagementPanelWorkspaceOptions {
  projects: Project[]
  selectedProjectId: string
  remoteReady: boolean
  databaseProfiles: ProjectConnectionProfileSummary[]
  kodoProfiles: ProjectConnectionProfileSummary[]
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileMode: 'create' | 'edit'
  kodoProfileMode: 'create' | 'edit'
  databaseDraftTestState: ProjectProfileDraftTestState
  kodoDraftTestState: ProjectProfileDraftTestState
  databaseDraftTested: boolean
  kodoDraftTested: boolean
  databaseProfileDraft: DatabaseProfileDraft
  kodoProfileDraft: KodoProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  kodoVerificationProjectId: string
  databaseSchemaReady: boolean
  onSelectedProjectChange: (projectId: string) => void
  onRenameProject: (projectId: string, name: string, description: string) => boolean | void | Promise<boolean | void>
  onUpdateRemoteProjectLinks: (projectId: string) => boolean | void | Promise<boolean | void>
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
  onBack: () => void
}

export function useProjectManagementPanelWorkspace({
  projects,
  selectedProjectId,
  remoteReady,
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
  onSelectedProjectChange,
  onRenameProject,
  onUpdateRemoteProjectLinks,
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
  onBack,
}: UseProjectManagementPanelWorkspaceOptions) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const dirtyNavigation = useProjectManagementDirtyNavigation({
    selectedProject,
    onBack,
    onSelectedProjectChange,
  })
  const detailsDraft = useProjectDetailsDraft({
    selectedProject,
    onRenameProject,
    markDirty: dirtyNavigation.markDirty,
    clearDirtySource: dirtyNavigation.clearDirtySource,
  })

  const remoteReadiness = {
    remoteReady,
    kodoVerificationProjectId,
    selectedDatabaseProfileId,
    selectedKodoProfileId,
  }
  const remoteReadyForSelectedProject = isRemoteProjectConfigurationReady(
    remoteReadiness,
    selectedProject?.id ?? '',
  )
  const remoteSettingsProps: ProjectManagementRemoteSettingsProps = {
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
    markDirty: dirtyNavigation.markDirty,
    clearDirtySource: dirtyNavigation.clearDirtySource,
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
  }

  return {
    ...dirtyNavigation,
    ...detailsDraft,
    remoteReadyForSelectedProject,
    remoteSettingsProps,
    selectedProject,
  }
}
