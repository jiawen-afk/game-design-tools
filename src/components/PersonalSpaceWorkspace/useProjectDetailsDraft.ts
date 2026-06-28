import { useEffect, useState } from 'react'

import type { Project } from '../ProjectStorage'
import type { ProjectManagementDirtySource } from './projectManagementDirtyModel'

interface UseProjectDetailsDraftOptions {
  selectedProject: Project | null
  onRenameProject: (projectId: string, name: string, description: string) => boolean | void | Promise<boolean | void>
  markDirty: (source: ProjectManagementDirtySource) => void
  clearDirtySource: (source: ProjectManagementDirtySource) => void
}

export function useProjectDetailsDraft({
  selectedProject,
  onRenameProject,
  markDirty,
  clearDirtySource,
}: UseProjectDetailsDraftOptions) {
  const [projectNameDraft, setProjectNameDraft] = useState(selectedProject?.name ?? '')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState(selectedProject?.description ?? '')

  useEffect(() => {
    setProjectNameDraft(selectedProject?.name ?? '')
    setProjectDescriptionDraft(selectedProject?.description ?? '')
  }, [selectedProject])

  const updateProjectNameDraft = (name: string) => {
    setProjectNameDraft(name)
    markDirty('projectDetails')
  }

  const updateProjectDescriptionDraft = (description: string) => {
    setProjectDescriptionDraft(description)
    markDirty('projectDetails')
  }

  const editProject = async () => {
    if (!selectedProject || !projectNameDraft.trim()) return
    const saved = await onRenameProject(selectedProject.id, projectNameDraft, projectDescriptionDraft)
    if (saved !== false) clearDirtySource('projectDetails')
  }

  return {
    editProject,
    projectDescriptionDraft,
    projectNameDraft,
    updateProjectDescriptionDraft,
    updateProjectNameDraft,
  }
}
