import type { ReactNode } from 'react'

import { ProjectManagementPanel } from './ProjectManagementPanel'
import type { usePersonalSpaceWorkspace } from './usePersonalSpaceWorkspace'

type PersonalSpaceWorkspaceState = ReturnType<typeof usePersonalSpaceWorkspace>

interface ProjectManagementSurfaceProps {
  workspace: PersonalSpaceWorkspaceState
  contextHolder: ReactNode
}

export function ProjectManagementSurface({ workspace, contextHolder }: ProjectManagementSurfaceProps) {
  return (
    <section className="personal-space" aria-labelledby="project-management-title">
      {contextHolder}
      <ProjectManagementPanel
        projects={workspace.projects}
        enabledProjectId={workspace.enabledProjectId}
        selectedProjectId={workspace.selectedManagementProjectId}
        activeProject={workspace.activeProject}
        migratingProjectId={workspace.migratingProjectId}
        remoteReady={workspace.remoteReady}
        databaseProfiles={workspace.databaseProfiles}
        kodoProfiles={workspace.kodoProfiles}
        selectedDatabaseProfileId={workspace.selectedDatabaseProfileId}
        selectedKodoProfileId={workspace.selectedKodoProfileId}
        databaseProfileMode={workspace.databaseProfileMode}
        kodoProfileMode={workspace.kodoProfileMode}
        databaseDraftTestState={workspace.databaseDraftTestState}
        kodoDraftTestState={workspace.kodoDraftTestState}
        databaseDraftTested={workspace.databaseDraftTested}
        kodoDraftTested={workspace.kodoDraftTested}
        databaseProfileDraft={workspace.databaseProfileDraft}
        kodoProfileDraft={workspace.kodoProfileDraft}
        databaseVerification={workspace.databaseVerification}
        kodoVerification={workspace.kodoVerification}
        kodoVerificationProjectId={workspace.kodoVerificationProjectId}
        databaseSchemaReady={workspace.databaseSchemaReady}
        onSelectedProjectChange={workspace.setSelectedManagementProjectId}
        onCreateLocalProject={workspace.createLocalProject}
        onCreateRemoteProject={workspace.createRemoteProject}
        onRenameProject={workspace.renameProject}
        onUpdateRemoteProjectLinks={workspace.updateRemoteProjectLinks}
        onDeleteProject={workspace.deleteProject}
        onEnableProject={workspace.enableProject}
        onDisableProject={workspace.disableActiveProject}
        onMigrateToRemote={() => void workspace.migrateActiveProjectToRemote()}
        onSelectedDatabaseProfileChange={workspace.setSelectedDatabaseProfileId}
        onSelectedKodoProfileChange={workspace.setSelectedKodoProfileId}
        onDatabaseProfileDraftChange={workspace.setDatabaseProfileDraft}
        onKodoProfileDraftChange={workspace.setKodoProfileDraft}
        onAddDatabaseProfile={workspace.addDatabaseProfile}
        onAddKodoProfile={workspace.addKodoProfile}
        onSaveDatabaseProfile={workspace.saveDatabaseProfile}
        onDeleteDatabaseProfile={() => void workspace.deleteDatabaseProfile()}
        onSaveKodoProfile={workspace.saveKodoProfile}
        onDeleteKodoProfile={() => void workspace.deleteKodoProfile()}
        onVerifyDatabaseProfile={() => void workspace.verifyDatabaseProfile()}
        onInitializeDatabaseSchema={() => void workspace.initializeDatabaseSchema()}
        onVerifyKodoProfile={(projectId) => void workspace.verifyKodoProfile(projectId)}
        onBack={workspace.closeProjectManagement}
      />
    </section>
  )
}
