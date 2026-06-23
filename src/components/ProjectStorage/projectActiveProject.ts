import type { Project } from './projectStorageTypes'

export const activeProjectStorageKey = 'game-design-tools.project-space.active-project.v1'

export function readActiveProjectId(storage: Storage = localStorage) {
  return storage.getItem(activeProjectStorageKey)?.trim() ?? ''
}

export function writeActiveProjectId(projectId: string, storage: Storage = localStorage) {
  const normalized = projectId.trim()
  if (!normalized) {
    clearActiveProjectId(storage)
    return
  }
  storage.setItem(activeProjectStorageKey, normalized)
}

export function clearActiveProjectId(storage: Storage = localStorage) {
  storage.removeItem(activeProjectStorageKey)
}

export function resolveEnabledProjectId(projects: Project[], persistedProjectId: string) {
  if (persistedProjectId && projects.some((project) => project.id === persistedProjectId)) return persistedProjectId
  return projects.length === 1 ? projects[0]!.id : ''
}

export function mergeProjectsRemoteFirst(localProjects: Project[], remoteProjects: Project[]) {
  return [
    ...remoteProjects,
    ...localProjects.filter((project) => (
      !remoteProjects.some((remoteProject) => remoteProject.id === project.id)
    )),
  ]
}
