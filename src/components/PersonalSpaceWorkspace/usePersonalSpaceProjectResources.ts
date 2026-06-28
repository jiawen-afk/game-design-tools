import type { Project } from '../ProjectStorage'
import type { createProjectStorageWorkflow } from './projectStorageWorkflow'

type ProjectStorageWorkflow = ReturnType<typeof createProjectStorageWorkflow>

interface UsePersonalSpaceProjectResourcesOptions {
  projects: Project[]
  activeProjectId: string
  getActiveProjectId: () => string
  projectStorageWorkflow: ProjectStorageWorkflow
  refreshActiveProjectState: () => Promise<boolean>
  changeActiveModule: (key: string) => boolean
}

export function usePersonalSpaceProjectResources(options: UsePersonalSpaceProjectResourcesOptions) {
  const {
    activeProjectId,
    changeActiveModule,
    getActiveProjectId,
    projectStorageWorkflow,
    projects,
    refreshActiveProjectState,
  } = options
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const activeProjectStorage = projectStorageWorkflow.objectStorageForProject(activeProject)
  const projectResourceReadOptions = projectStorageWorkflow.projectReadOptionsForProject(activeProject)
  const getProjectResourceReadOptions = () => (
    projectStorageWorkflow.projectReadOptionsForProject(
      projects.find((project) => project.id === getActiveProjectId()),
    )
  )

  const refreshActiveProjectData = async () => {
    await refreshActiveProjectState()
  }
  const changeActiveModuleAndRefresh = (key: string) => {
    const changed = changeActiveModule(key)
    if (changed && key !== 'settings') {
      void refreshActiveProjectState()
    }
  }

  return {
    activeProject,
    activeProjectStorage,
    changeActiveModuleAndRefresh,
    getProjectResourceReadOptions,
    projectResourceReadOptions,
    refreshActiveProjectData,
  }
}
