import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Modal, Tabs } from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
} from '@ant-design/icons'

import { createProjectId, type Project } from '../ProjectStorage'
import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft, KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'
import {
  clearProjectManagementDirtySource,
  createCleanProjectManagementDirtyState,
  hasProjectManagementUnsavedChanges,
  markProjectManagementDirty,
  projectManagementDirtySignature,
  type ProjectManagementDirtySource,
} from './projectManagementDirtyModel'
import { ProjectCreateCard } from './ProjectCreateCard'
import { ProjectDetailsCard } from './ProjectDetailsCard'
import { RemoteProjectSettings } from './ProjectRemoteSettingsPanel'

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
  const [createMode, setCreateMode] = useState<'local' | 'remote'>('local')
  const [remoteCreationProjectId, setRemoteCreationProjectId] = useState(() => createProjectId())
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [dirtyState, setDirtyState] = useState(() => createCleanProjectManagementDirtyState())
  const [ignoredDirtySignature, setIgnoredDirtySignature] = useState('')
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [pendingProjectTabId, setPendingProjectTabId] = useState('')
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const [projectNameDraft, setProjectNameDraft] = useState(selectedProject?.name ?? '')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState(selectedProject?.description ?? '')
  const hasUnsavedChanges = hasProjectManagementUnsavedChanges(dirtyState)
  const dirtySignature = projectManagementDirtySignature(dirtyState)
  const shouldWarnUnsavedChanges = hasUnsavedChanges && dirtySignature !== ignoredDirtySignature

  useEffect(() => {
    setProjectNameDraft(selectedProject?.name ?? '')
    setProjectDescriptionDraft(selectedProject?.description ?? '')
    setDirtyState((current) => clearProjectManagementDirtySource(current, 'projectDetails'))
    setDirtyState((current) => clearProjectManagementDirtySource(current, 'remoteProjectBinding'))
    setIgnoredDirtySignature('')
  }, [selectedProject])

  useEffect(() => {
    if (!shouldWarnUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [shouldWarnUnsavedChanges])

  const markDirty = (source: ProjectManagementDirtySource) => {
    setIgnoredDirtySignature('')
    setDirtyState((current) => markProjectManagementDirty(current, source))
  }

  const clearDirtySource = (source: ProjectManagementDirtySource) => {
    setDirtyState((current) => clearProjectManagementDirtySource(current, source))
  }

  const resetAllDirtySources = () => {
    setDirtyState(createCleanProjectManagementDirtyState())
    setIgnoredDirtySignature('')
  }

  const requestBackToWorkbench = () => {
    if (!shouldWarnUnsavedChanges) {
      onBack()
      return
    }
    setPendingProjectTabId('')
    setLeaveConfirmOpen(true)
  }

  const discardChangesAndBack = () => {
    setLeaveConfirmOpen(false)
    setIgnoredDirtySignature(dirtySignature)
    onBack()
  }

  const requestProjectTabChange = (projectId: string) => {
    if (!shouldWarnUnsavedChanges) {
      resetAllDirtySources()
      onSelectedProjectChange(projectId)
      return
    }
    setPendingProjectTabId(projectId)
    setLeaveConfirmOpen(true)
  }

  const confirmDiscardAndSwitchTab = () => {
    setLeaveConfirmOpen(false)
    resetAllDirtySources()
    onSelectedProjectChange(pendingProjectTabId)
    setPendingProjectTabId('')
  }

  const confirmDiscardChanges = () => {
    if (pendingProjectTabId) {
      confirmDiscardAndSwitchTab()
      return
    }
    discardChangesAndBack()
  }

  const databaseProfileOptions = databaseProfiles.map((profile) => ({
    label: `${profile.displayName} (${profile.redactedSummary})`,
    value: profile.id,
  }))
  const kodoProfileOptions = kodoProfiles.map((profile) => ({
    label: `${profile.displayName} (${profile.redactedSummary})`,
    value: profile.id,
  }))
  const selectedRemoteVerificationProjectId = createMode === 'remote'
    ? remoteCreationProjectId
    : selectedProject?.id || activeProject?.id || enabledProjectId
  const remoteReadyForCreation = remoteReady && kodoVerificationProjectId === remoteCreationProjectId
  const remoteReadyForSelectedProject = Boolean(selectedProject && remoteReady && kodoVerificationProjectId === selectedProject.id)
  const remoteReadinessText = remoteReady ? '远程 DB + 七牛 Kodo 已就绪' : '必须完成 DB 验证、初始化表结构和 Kodo 验证'
  const selectedProjectMigrating = Boolean(selectedProject && migratingProjectId === selectedProject.id)

  const createProject = async () => {
    const name = newProjectName.trim()
    if (!name) return
    if (createMode === 'remote') {
      if (!remoteReadyForCreation) return
      await onCreateRemoteProject(remoteCreationProjectId, name, newProjectDescription)
      setRemoteCreationProjectId(createProjectId())
    } else {
      await onCreateLocalProject(name, newProjectDescription)
    }
    setNewProjectName('')
    setNewProjectDescription('')
    clearDirtySource('projectCreation')
  }

  const editProject = async () => {
    if (!selectedProject || !projectNameDraft.trim()) return
    const saved = await onRenameProject(selectedProject.id, projectNameDraft, projectDescriptionDraft)
    if (saved !== false) clearDirtySource('projectDetails')
  }

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

  const createTab = (
    <div className="project-create-grid">
      <ProjectCreateCard
        createMode={createMode}
        projectName={newProjectName}
        projectDescription={newProjectDescription}
        remoteReadyForCreation={remoteReadyForCreation}
        remoteReadinessText={remoteReadinessText}
        onCreateModeChange={(mode) => {
          setCreateMode(mode)
          markDirty('projectCreation')
        }}
        onProjectNameChange={(name) => {
          setNewProjectName(name)
          markDirty('projectCreation')
        }}
        onProjectDescriptionChange={(description) => {
          setNewProjectDescription(description)
          markDirty('projectCreation')
        }}
        onCreateProject={() => void createProject()}
      />

      {createMode === 'remote' && (
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
          selectedVerificationProjectId={selectedRemoteVerificationProjectId}
          linkTargetProjectId=""
          linkReady={false}
          onSelectedDatabaseProfileChange={(profileId) => {
            onSelectedDatabaseProfileChange(profileId)
            markDirty('databaseProfileDraft')
          }}
          onSelectedKodoProfileChange={(profileId) => {
            onSelectedKodoProfileChange(profileId)
            markDirty('kodoProfileDraft')
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
      )}
    </div>
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
          selectedVerificationProjectId={selectedProject.id}
          linkTargetProjectId={selectedProject.mode === 'remote' ? selectedProject.id : ''}
          linkReady={selectedProject.mode === 'remote' && remoteReadyForSelectedProject}
          onSelectedDatabaseProfileChange={(profileId) => {
            onSelectedDatabaseProfileChange(profileId)
            markDirty('remoteProjectBinding')
          }}
          onSelectedKodoProfileChange={(profileId) => {
            onSelectedKodoProfileChange(profileId)
            markDirty('remoteProjectBinding')
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
        onCancel={() => {
          setLeaveConfirmOpen(false)
          setPendingProjectTabId('')
        }}
      >
        <p>{pendingProjectTabId ? '切换项目标签会丢弃当前项目管理页尚未保存的更改。' : '返回工作台会丢弃当前项目管理页尚未保存的更改。'}</p>
      </Modal>
    </section>
  )
}
