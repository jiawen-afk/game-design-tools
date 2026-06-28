import { Button, Modal } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

import type { Project } from '../ProjectStorage'
import { ProjectManagementTabs } from './ProjectManagementTabs'
import {
  type UseProjectManagementPanelWorkspaceOptions,
  useProjectManagementPanelWorkspace,
} from './useProjectManagementPanelWorkspace'

interface ProjectManagementPanelProps extends UseProjectManagementPanelWorkspaceOptions {
  enabledProjectId: string
  activeProject: Project | null
  migratingProjectId: string
  onCreateLocalProject: (name: string, description: string) => void | Promise<void>
  onCreateRemoteProject: (projectId: string, name: string, description: string) => void | Promise<void>
  onDeleteProject: (projectId: string) => void | Promise<void>
  onEnableProject: (projectId: string) => void
  onDisableProject: () => void
  onMigrateToRemote: () => void
}

export function ProjectManagementPanel(props: ProjectManagementPanelProps) {
  const {
    projects,
    enabledProjectId,
    selectedProjectId,
    activeProject,
    migratingProjectId,
    remoteReady,
    onCreateLocalProject,
    onCreateRemoteProject,
    onDeleteProject,
    onEnableProject,
    onDisableProject,
    onMigrateToRemote,
  } = props
  const {
    cancelDiscardChanges,
    confirmDiscardChanges,
    editProject,
    leaveConfirmOpen,
    pendingProjectTabId,
    projectDescriptionDraft,
    projectNameDraft,
    remoteReadyForSelectedProject,
    remoteSettingsProps,
    requestBackToWorkbench,
    requestProjectTabChange,
    selectedProject,
    updateProjectDescriptionDraft,
    updateProjectNameDraft,
  } = useProjectManagementPanelWorkspace(props)

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
      <ProjectManagementTabs
        projects={projects}
        enabledProjectId={enabledProjectId}
        selectedProjectId={selectedProjectId}
        selectedProject={selectedProject}
        activeProject={activeProject}
        migratingProjectId={migratingProjectId}
        remoteReady={remoteReady}
        remoteReadyForSelectedProject={remoteReadyForSelectedProject}
        projectNameDraft={projectNameDraft}
        projectDescriptionDraft={projectDescriptionDraft}
        remoteSettingsProps={remoteSettingsProps}
        onProjectNameDraftChange={updateProjectNameDraft}
        onProjectDescriptionDraftChange={updateProjectDescriptionDraft}
        onEditProject={() => void editProject()}
        onEnableProject={onEnableProject}
        onDisableProject={onDisableProject}
        onMigrateToRemote={onMigrateToRemote}
        onDeleteProject={onDeleteProject}
        onCreateLocalProject={onCreateLocalProject}
        onCreateRemoteProject={onCreateRemoteProject}
        onProjectTabChange={requestProjectTabChange}
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
