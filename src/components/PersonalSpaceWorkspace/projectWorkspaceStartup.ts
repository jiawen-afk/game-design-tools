import { mergeProjectsRemoteFirst, type Project, type ProjectRepository } from '../ProjectStorage'

export interface ProjectCatalogResult {
  projects: Project[]
  remoteError: unknown | null
}

export async function listProjectCatalogWithRemoteFallback(
  localRepository: Pick<ProjectRepository, 'listProjects'>,
  remoteRepository: Pick<ProjectRepository, 'listProjects'>,
): Promise<ProjectCatalogResult> {
  const localProjects = await localRepository.listProjects()
  try {
    const remoteProjects = await remoteRepository.listProjects()
    return {
      projects: mergeProjectsRemoteFirst(localProjects, remoteProjects),
      remoteError: null,
    }
  } catch (error) {
    return {
      projects: localProjects,
      remoteError: error,
    }
  }
}
