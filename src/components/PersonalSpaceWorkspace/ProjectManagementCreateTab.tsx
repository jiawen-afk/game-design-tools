import { useState } from 'react'

import { createProjectId, type Project } from '../ProjectStorage'
import { ProjectCreateCard } from './ProjectCreateCard'
import {
  ProjectManagementRemoteSettingsSection,
  type ProjectManagementRemoteSettingsSectionProps,
} from './ProjectManagementRemoteSettingsSection'
import { isRemoteProjectConfigurationReady } from './projectManagementModel'

type ProjectManagementCreateRemoteSettingsProps = Omit<
  ProjectManagementRemoteSettingsSectionProps,
  'selectedVerificationProjectId' | 'linkTargetProjectId' | 'linkReady' | 'bindingDirtySource'
>

interface ProjectManagementCreateTabProps {
  activeProject: Project | null
  enabledProjectId: string
  remoteReady: boolean
  remoteSettingsProps: ProjectManagementCreateRemoteSettingsProps
  onCreateLocalProject: (name: string, description: string) => void | Promise<void>
  onCreateRemoteProject: (projectId: string, name: string, description: string) => void | Promise<void>
}

export function ProjectManagementCreateTab({
  activeProject,
  enabledProjectId,
  remoteReady,
  remoteSettingsProps,
  onCreateLocalProject,
  onCreateRemoteProject,
}: ProjectManagementCreateTabProps) {
  const [createMode, setCreateMode] = useState<'local' | 'remote'>('local')
  const [remoteCreationProjectId, setRemoteCreationProjectId] = useState(() => createProjectId())
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')

  const selectedRemoteVerificationProjectId = createMode === 'remote'
    ? remoteCreationProjectId
    : activeProject?.id || enabledProjectId
  const remoteReadyForCreation = isRemoteProjectConfigurationReady(
    {
      remoteReady,
      kodoVerificationProjectId: remoteSettingsProps.kodoVerificationProjectId,
      selectedDatabaseProfileId: remoteSettingsProps.selectedDatabaseProfileId,
      selectedKodoProfileId: remoteSettingsProps.selectedKodoProfileId,
    },
    remoteCreationProjectId,
  )
  const remoteReadinessText = remoteReady ? '远程 DB + 七牛 Kodo 已就绪' : '必须完成 DB 验证、初始化表结构和 Kodo 验证'

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
    remoteSettingsProps.clearDirtySource('projectCreation')
  }

  return (
    <div className="project-create-grid">
      <ProjectCreateCard
        createMode={createMode}
        projectName={newProjectName}
        projectDescription={newProjectDescription}
        remoteReadyForCreation={remoteReadyForCreation}
        remoteReadinessText={remoteReadinessText}
        onCreateModeChange={(mode) => {
          setCreateMode(mode)
          remoteSettingsProps.markDirty('projectCreation')
        }}
        onProjectNameChange={(name) => {
          setNewProjectName(name)
          remoteSettingsProps.markDirty('projectCreation')
        }}
        onProjectDescriptionChange={(description) => {
          setNewProjectDescription(description)
          remoteSettingsProps.markDirty('projectCreation')
        }}
        onCreateProject={() => void createProject()}
      />

      {createMode === 'remote' && (
        <ProjectManagementRemoteSettingsSection
          {...remoteSettingsProps}
          selectedVerificationProjectId={selectedRemoteVerificationProjectId}
          linkTargetProjectId=""
          linkReady={false}
          bindingDirtySource="projectCreation"
        />
      )}
    </div>
  )
}
