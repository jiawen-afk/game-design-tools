import { useEffect, useState } from 'react'

import {
  createDesktopLocalProjectRepository,
  createProjectWorkspaceBootstrapper,
  readActiveProjectId,
  resolveEnabledProjectId,
} from './components/ProjectStorage'

const appProjectRepository = createDesktopLocalProjectRepository()
const appProjectBootstrapper = createProjectWorkspaceBootstrapper(appProjectRepository)

export function useCurrentProjectSpaceLabel(activeSurface: string | null) {
  const [currentProjectSpaceLabel, setCurrentProjectSpaceLabel] = useState('未启用项目空间')

  useEffect(() => {
    if (activeSurface === null) return undefined
    let alive = true

    const refreshCurrentProject = async () => {
      const activeProjectId = readActiveProjectId()

      try {
        const projects = await appProjectBootstrapper.listProjects('')
        const currentProjectId = resolveEnabledProjectId(projects, activeProjectId)
        const currentProject = projects.find((project) => project.id === currentProjectId)
        if (alive) setCurrentProjectSpaceLabel(currentProject?.name ?? '已选择项目空间')
      } catch {
        if (alive) setCurrentProjectSpaceLabel('无法读取项目空间')
      }
    }
    const handleFocus = () => {
      void refreshCurrentProject()
    }

    void refreshCurrentProject()
    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleFocus)
    return () => {
      alive = false
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleFocus)
    }
  }, [activeSurface])

  return currentProjectSpaceLabel
}
