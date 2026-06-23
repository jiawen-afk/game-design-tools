import type { Project } from './projectStorageTypes'
import type { ProjectRepository } from './projectSqliteRepository'

export function createProjectWorkspaceBootstrapper(repository: ProjectRepository, now: () => string = () => new Date().toISOString()) {
  let pending: Promise<Project[]> | null = null

  const listProjects = async (localObjectRoot: string) => {
    if (!pending) {
      pending = (async () => {
        await repository.initializeSchema()
        const existingProjects = await repository.listProjects()
        if (existingProjects.length > 0) return existingProjects
        const created = await repository.createProject({
          name: '默认项目',
          description: '',
          localObjectRoot,
          now: now(),
        })
        return [created.project]
      })()
    }

    try {
      return await pending
    } finally {
      pending = null
    }
  }

  return { listProjects }
}
