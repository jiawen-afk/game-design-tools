import { useCallback, useMemo, useRef, useState } from 'react'

import { getDesktopApi } from '../../desktopApi'
import {
  createDesktopLocalProjectRepository,
  createDesktopRemoteProjectRepository,
  createProjectWorkspaceBootstrapper,
  readActiveProjectId,
  resolveEnabledProjectId,
  writeActiveProjectId,
  type Project,
  type ProjectDeviceBinding,
  type ProjectRepository,
} from '../ProjectStorage'
import { getDefaultKnowledgeBaseAdapter } from './documentKnowledgeModel'
import { useDocumentCollectionWorkflow } from './useDocumentCollectionWorkflow'
import { useDocumentGraphInteractions } from './useDocumentGraphInteractions'
import { useDocumentImportWorkflow } from './useDocumentImportWorkflow'
import type { DocumentWorkspaceState } from './documentWorkspaceTypes'

interface DocumentWorkspaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

const localRepository = createDesktopLocalProjectRepository()
const projectBootstrapper = createProjectWorkspaceBootstrapper(localRepository)
const defaultKnowledgeBaseName = getDefaultKnowledgeBaseAdapter()?.displayName ?? '项目知识库'

export function useDocumentWorkspace(messageApi: DocumentWorkspaceMessageApi): DocumentWorkspaceState {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectLoading, setProjectLoading] = useState(false)
  const deviceBindingsRef = useRef<Record<string, ProjectDeviceBinding>>({})
  const remoteRepositoryRef = useRef<ProjectRepository | null>(null)

  if (!remoteRepositoryRef.current) {
    remoteRepositoryRef.current = createDesktopRemoteProjectRepository((projectId) => (
      projectId ? deviceBindingsRef.current[projectId]?.databaseProfileId ?? '' : ''
    ))
  }

  const activeProject = useMemo(() => (
    projects.find((project) => project.id === selectedProjectId) ?? null
  ), [projects, selectedProjectId])

  const repositoryForProject = useCallback((project: Project): ProjectRepository => (
    project.mode === 'remote' ? remoteRepositoryRef.current! : localRepository
  ), [])

  const {
    categoryTreeQuery,
    changeCollection,
    clearCollections,
    collectionGraph,
    collections,
    deleteSelectedCollection,
    graphFilter,
    loadCollectionsForProject,
    loading: collectionLoading,
    neighbors,
    nodeResults,
    query,
    recordResults,
    runSearch,
    searching,
    searchDraft,
    selectNode,
    selectedCollection,
    selectedCollectionId,
    selectedNodeDetails,
    setCategoryTreeQuery,
    setGraphFilter,
    setQuery,
    setSearchDraft,
    visibleGraph,
  } = useDocumentCollectionWorkflow({
    activeProject,
    messageApi,
    repositoryForProject,
  })

  const loading = projectLoading || collectionLoading
  const viewMode = graphFilter.focusNodeId ? 'graph' : 'list'

  const refreshProjects = useCallback(async () => {
    setProjectLoading(true)
    try {
      const [nextProjects, nextBindings] = await Promise.all([
        projectBootstrapper.listProjects(''),
        getDesktopApi()?.listProjectDeviceBindings() ?? Promise.resolve({}),
      ])
      deviceBindingsRef.current = nextBindings
      setProjects(nextProjects)
      const persistedProjectId = readActiveProjectId()
      const nextProjectId = resolveEnabledProjectId(nextProjects, selectedProjectId || persistedProjectId)
      setSelectedProjectId(nextProjectId)
      const nextProject = nextProjects.find((project) => project.id === nextProjectId)
      if (nextProject) {
        await loadCollectionsForProject(nextProject)
      } else {
        clearCollections()
      }
    } catch (error) {
      messageApi.error(`读取项目失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setProjectLoading(false)
    }
  }, [clearCollections, loadCollectionsForProject, messageApi, selectedProjectId])

  const {
    clearImportProgress,
    importFile,
    importing,
    importProgress,
  } = useDocumentImportWorkflow({
    activeProject,
    selectedCollection,
    defaultCollectionName: defaultKnowledgeBaseName,
    repositoryForProject,
    loadCollectionsForProject,
    messageApi,
  })

  const changeProject = useCallback(async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    setSelectedProjectId(projectId)
    writeActiveProjectId(projectId)
    clearImportProgress()
    if (project) {
      await loadCollectionsForProject(project)
    } else {
      clearCollections()
    }
  }, [clearCollections, clearImportProgress, loadCollectionsForProject, projects])

  const {
    applyNodeAction,
    changeDescriptionFilter,
    focusNode,
    resetGraphView,
    submitGraphSearch,
    toggleGraphEdgeType,
    toggleGraphEntityRole,
    toggleGraphNodeType,
  } = useDocumentGraphInteractions({
    collectionGraph,
    visibleGraph,
    graphFilter,
    setGraphFilter,
    searchDraft,
    setSearchDraft,
    setCategoryTreeQuery,
  })

  const refreshCollections = useCallback(async () => {
    if (activeProject) {
      await loadCollectionsForProject(activeProject, selectedCollectionId)
      return
    }
    await refreshProjects()
  }, [activeProject, loadCollectionsForProject, refreshProjects, selectedCollectionId])

  return {
    activeProject,
    applyNodeAction,
    categoryTreeQuery,
    changeDescriptionFilter,
    collections,
    collectionGraph,
    deleteSelectedCollection,
    focusNode,
    graphFilter,
    importFile,
    importing,
    importProgress,
    loadProjects: refreshProjects,
    loading,
    neighbors,
    nodeResults,
    projects,
    query,
    recordResults,
    refreshCollections,
    resetGraphView,
    runSearch,
    searching,
    searchDraft,
    selectedCollection,
    selectedCollectionId,
    selectedNodeDetails,
    selectedProjectId,
    selectNode,
    setCategoryTreeQuery,
    setGraphFilter,
    setQuery,
    setSearchDraft,
    submitGraphSearch,
    toggleGraphEdgeType,
    toggleGraphEntityRole,
    toggleGraphNodeType,
    viewMode,
    visibleGraph,
    changeCollection,
    changeProject,
  }
}
