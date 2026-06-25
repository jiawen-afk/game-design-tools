import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Modal, Tabs } from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
} from '@ant-design/icons'

import type { Project } from '../ProjectStorage'
import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft, KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'
import { ProjectDetailsCard } from './ProjectDetailsCard'
import { ProjectManagementCreateTab } from './ProjectManagementCreateTab'
import { ProjectManagementRemoteSettingsSection } from './ProjectManagementRemoteSettingsSection'
import {
  useProjectManagementDirtyNavigation,
} from './useProjectManagementDirtyNavigation'
import { isRemoteProjectConfigurationReady } from './projectManagementModel'

interface ProjectManagementPanelProps {
  projects: Project[]
  enabledProjectId: string
  selectedProjectId: string
  activeProject: Project | null
  migratingProjectId: string
  remoteReady: boolean
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
  onSelectedProjectChange: (projectId: string) => void
  onCreateLocalProject: (name: string, description: string) => void | Promise<void>
  onCreateRemoteProject: (projectId: string, name: string, description: string) => void | Promise<void>
  onRenameProject: (projectId: string, name: string, description: string) => boolean | void | Promise<boolean | void>
  onUpdateRemoteProjectLinks: (projectId: string) => boolean | void | Promise<boolean | void>
  onDeleteProject: (projectId: string) => void | Promise<void>
  onEnableProject: (projectId: string) => void
  onDisableProject: () => void
  onMigrateToRemote: () => void
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

export function ProjectManagementPanel({
  projects,
  enabledProjectId,
  selectedProjectId,
  activeProject,
  migratingProjectId,
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
  onCreateLocalProject,
  onCreateRemoteProject,
  onRenameProject,
  onUpdateRemoteProjectLinks,
  onDeleteProject,
  onEnableProject,
  onDisableProject,
  onMigrateToRemote,
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
}: ProjectManagementPanelProps) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const [projectNameDraft, setProjectNameDraft] = useState(selectedProject?.name ?? '')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState(selectedProject?.description ?? '')
  const {
    cancelDiscardChanges,
    clearDirtySource,
    confirmDiscardChanges,
    leaveConfirmOpen,
    markDirty,
    pendingProjectTabId,
    requestBackToWorkbench,
    requestProjectTabChange,
  } = useProjectManagementDirtyNavigation({
    selectedProject,
    onBack,
    onSelectedProjectChange,
  })

  useEffect(() => {
    setProjectNameDraft(selectedProject?.name ?? '')
    setProjectDescriptionDraft(selectedProject?.description ?? '')
  }, [selectedProject])

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
  const selectedProjectMigrating = Boolean(selectedProject && migratingProjectId === selectedProject.id)
  const remoteSettingsProps = {
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
  }

  const editProject = async () => {
    if (!selectedProject || !projectNameDraft.trim()) return
    const saved = await onRenameProject(selectedProject.id, projectNameDraft, projectDescriptionDraft)
    if (saved !== false) clearDirtySource('projectDetails')
  }

  const createTab = (
    <ProjectManagementCreateTab
      activeProject={activeProject}
      enabledProjectId={enabledProjectId}
      remoteReady={remoteReady}
      remoteSettingsProps={remoteSettingsProps}
      onCreateLocalProject={onCreateLocalProject}
      onCreateRemoteProject={onCreateRemoteProject}
    />
  )

  const projectTabContent = selectedProject ? (
    <div className="project-create-grid">
      <ProjectDetailsCard
        project={selectedProject}
        enabledProjectId={enabledProjectId}
        projectNameDraft={projectNameDraft}
        projectDescriptionDraft={projectDescriptionDraft}
        migrating={selectedProjectMigrating}
        remoteReadyForSelectedProject={remoteReadyForSelectedProject}
        onProjectNameDraftChange={(name) => {
          setProjectNameDraft(name)
          markDirty('projectDetails')
        }}
        onProjectDescriptionDraftChange={(description) => {
          setProjectDescriptionDraft(description)
          markDirty('projectDetails')
        }}
        onEditProject={() => void editProject()}
        onEnableProject={onEnableProject}
        onDisableProject={onDisableProject}
        onMigrateToRemote={onMigrateToRemote}
        onDeleteProject={(projectId) => void onDeleteProject(projectId)}
      />

      {(selectedProject.mode === 'local' || selectedProject.mode === 'remote') && (
        <ProjectManagementRemoteSettingsSection
          {...remoteSettingsProps}
          selectedVerificationProjectId={selectedProject.id}
          linkTargetProjectId={selectedProject.mode === 'remote' ? selectedProject.id : ''}
          linkReady={selectedProject.mode === 'remote' && remoteReadyForSelectedProject}
          bindingDirtySource="remoteProjectBinding"
        />
      )}
    </div>
  ) : (
    <Alert type="info" showIcon title="请选择一个项目，或使用左侧 + 创建项目。" />
  )

  const projectTabItems = useMemo(() => [
    {
      key: 'create',
      label: <PlusOutlined aria-label="创建项目" />,
      children: createTab,
    },
    ...projects.map((project) => ({
      key: project.id,
      label: project.name,
      children: projectTabContent,
    })),
  ], [projects, createTab, projectTabContent])

  return (
    <section className="project-management-page" aria-label="项目管理">
      <div className="project-management-head">
        <div>
          <p className="kicker">项目空间</p>
          <h2 id="project-management-title">项目管理</h2>
          <p>项目标签只用于查看和编辑，卡片里的启用开关决定当前数据写入目标。</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={requestBackToWorkbench}>返回工作台</Button>
      </div>
      <Tabs
        className="project-management-tabs"
        activeKey={selectedProjectId || 'create'}
        onChange={requestProjectTabChange}
        items={projectTabItems}
      />
      <Modal
        open={leaveConfirmOpen}
        title="有未保存的项目管理更改"
        okText="放弃更改"
        cancelText="继续编辑"
        okButtonProps={{ danger: true }}
        onOk={confirmDiscardChanges}
        onCancel={cancelDiscardChanges}
      >
        <p>{pendingProjectTabId ? '切换项目标签会丢弃当前项目管理页尚未保存的更改。' : '返回工作台会丢弃当前项目管理页尚未保存的更改。'}</p>
      </Modal>
    </section>
  )
}
