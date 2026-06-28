import { useMemo } from 'react'
import { Alert, Tabs } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import type { Project } from '../ProjectStorage'
import { ProjectDetailsCard } from './ProjectDetailsCard'
import { ProjectManagementCreateTab } from './ProjectManagementCreateTab'
import {
  ProjectManagementRemoteSettingsSection,
  type ProjectManagementRemoteSettingsSectionProps,
} from './ProjectManagementRemoteSettingsSection'

type ProjectManagementRemoteSettingsProps = Omit<
  ProjectManagementRemoteSettingsSectionProps,
  'selectedVerificationProjectId' | 'linkTargetProjectId' | 'linkReady' | 'bindingDirtySource'
>

interface ProjectManagementTabsProps {
  projects: Project[]
  enabledProjectId: string
  selectedProjectId: string
  selectedProject: Project | null
  activeProject: Project | null
  migratingProjectId: string
  remoteReady: boolean
  remoteReadyForSelectedProject: boolean
  projectNameDraft: string
  projectDescriptionDraft: string
  remoteSettingsProps: ProjectManagementRemoteSettingsProps
  onProjectNameDraftChange: (name: string) => void
  onProjectDescriptionDraftChange: (description: string) => void
  onEditProject: () => void
  onEnableProject: (projectId: string) => void
  onDisableProject: () => void
  onMigrateToRemote: () => void
  onDeleteProject: (projectId: string) => void | Promise<void>
  onCreateLocalProject: (name: string, description: string) => void | Promise<void>
  onCreateRemoteProject: (projectId: string, name: string, description: string) => void | Promise<void>
  onProjectTabChange: (projectId: string) => void
}

export function ProjectManagementTabs({
  projects,
  enabledProjectId,
  selectedProjectId,
  selectedProject,
  activeProject,
  migratingProjectId,
  remoteReady,
  remoteReadyForSelectedProject,
  projectNameDraft,
  projectDescriptionDraft,
  remoteSettingsProps,
  onProjectNameDraftChange,
  onProjectDescriptionDraftChange,
  onEditProject,
  onEnableProject,
  onDisableProject,
  onMigrateToRemote,
  onDeleteProject,
  onCreateLocalProject,
  onCreateRemoteProject,
  onProjectTabChange,
}: ProjectManagementTabsProps) {
  const selectedProjectMigrating = Boolean(selectedProject && migratingProjectId === selectedProject.id)
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
        onProjectNameDraftChange={onProjectNameDraftChange}
        onProjectDescriptionDraftChange={onProjectDescriptionDraftChange}
        onEditProject={onEditProject}
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
    <Tabs
      className="project-management-tabs"
      activeKey={selectedProjectId || 'create'}
      onChange={onProjectTabChange}
      items={projectTabItems}
    />
  )
}
