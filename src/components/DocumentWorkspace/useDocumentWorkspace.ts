import { useCallback, useMemo, useRef, useState } from 'react'

import { getDesktopApi } from '../../desktopApi'
import {
  createDesktopLocalProjectRepository,
  createDesktopRemoteProjectRepository,
  createProjectWorkspaceBootstrapper,
  readActiveProjectId,
  resolveEnabledProjectId,
  writeActiveProjectId,
  type DocumentCollection,
  type DocumentNeighbor,
  type DocumentNodeDetails,
  type DocumentNodeSearchResult,
  type DocumentRecordSearchResult,
  type DocumentSource,
  type Project,
  type ProjectDeviceBinding,
  type ProjectRepository,
} from '../ProjectStorage'
import { buildDocumentGraphView } from './documentKnowledgeModel'
import { importKnowledgeBaseFile, type KnowledgeBaseFileLike } from './documentKnowledgeImportService'
import { shjGraphImportAdapter } from './shjGraphImportAdapter'

interface DocumentWorkspaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

const localRepository = createDesktopLocalProjectRepository()
const projectBootstrapper = createProjectWorkspaceBootstrapper(localRepository)

export function useDocumentWorkspace(messageApi: DocumentWorkspaceMessageApi) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [collections, setCollections] = useState<DocumentCollection[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [sources, setSources] = useState<DocumentSource[]>([])
  const [query, setQuery] = useState('')
  const [nodeResults, setNodeResults] = useState<DocumentNodeSearchResult>({ items: [], total: 0 })
  const [recordResults, setRecordResults] = useState<DocumentRecordSearchResult>({ items: [], total: 0 })
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<DocumentNodeDetails | null>(null)
  const [neighbors, setNeighbors] = useState<DocumentNeighbor[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
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
  const selectedCollection = useMemo(() => (
    collections.find((collection) => collection.id === selectedCollectionId) ?? null
  ), [collections, selectedCollectionId])
  const graphView = useMemo(() => {
    const nodes = selectedNodeDetails
      ? [selectedNodeDetails.node, ...neighbors.map((neighbor) => neighbor.node)]
      : nodeResults.items
    const edges = selectedNodeDetails ? neighbors.map((neighbor) => neighbor.edge) : []
    return buildDocumentGraphView({
      nodes,
      edges,
      selectedNodeId: selectedNodeDetails?.node.id ?? null,
      width: 860,
      height: 460,
      maxNodes: 60,
    })
  }, [neighbors, nodeResults.items, selectedNodeDetails])

  const repositoryForProject = useCallback((project: Project): ProjectRepository => (
    project.mode === 'remote' ? remoteRepositoryRef.current! : localRepository
  ), [])

  const resetCollectionData = useCallback(() => {
    setSources([])
    setNodeResults({ items: [], total: 0 })
    setRecordResults({ items: [], total: 0 })
    setSelectedNodeDetails(null)
    setNeighbors([])
  }, [])

  const loadNodeSelection = useCallback(async (project: Project, nodeId: string) => {
    const repository = repositoryForProject(project)
    const [details, nextNeighbors] = await Promise.all([
      repository.getDocumentNode(project.id, nodeId),
      repository.listDocumentNeighbors(project.id, nodeId),
    ])
    setSelectedNodeDetails(details)
    setNeighbors(nextNeighbors)
  }, [repositoryForProject])

  const loadCollectionContent = useCallback(async (
    project: Project,
    collectionId: string,
    queryText: string,
  ) => {
    if (!collectionId) {
      resetCollectionData()
      return
    }
    setSearching(true)
    try {
      const repository = repositoryForProject(project)
      const [nextSources, nextNodes, nextRecords] = await Promise.all([
        repository.listDocumentSources(project.id, collectionId),
        repository.searchDocumentNodes({ projectId: project.id, collectionId, query: queryText }),
        repository.searchDocumentRecords({ projectId: project.id, collectionId, query: queryText, limit: 8 }),
      ])
      setSources(nextSources)
      setNodeResults(nextNodes)
      setRecordResults(nextRecords)
      const nextNodeId = nextNodes.items[0]?.id
      if (nextNodeId) {
        await loadNodeSelection(project, nextNodeId)
      } else {
        setSelectedNodeDetails(null)
        setNeighbors([])
      }
    } catch (error) {
      messageApi.error(`读取知识库失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSearching(false)
    }
  }, [loadNodeSelection, messageApi, repositoryForProject, resetCollectionData])

  const loadCollectionsForProject = useCallback(async (
    project: Project,
    preferredCollectionId?: string,
    queryText = query,
  ) => {
    setLoading(true)
    try {
      const repository = repositoryForProject(project)
      const nextCollections = await repository.listDocumentCollections(project.id)
      setCollections(nextCollections)
      const nextCollectionId = preferredCollectionId && nextCollections.some((collection) => collection.id === preferredCollectionId)
        ? preferredCollectionId
        : nextCollections[0]?.id ?? ''
      setSelectedCollectionId(nextCollectionId)
      if (nextCollectionId) {
        await loadCollectionContent(project, nextCollectionId, queryText)
      } else {
        resetCollectionData()
      }
    } catch (error) {
      messageApi.error(`读取知识库集合失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [loadCollectionContent, messageApi, query, repositoryForProject, resetCollectionData])

  const refreshProjects = useCallback(async () => {
    setLoading(true)
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
        setCollections([])
        setSelectedCollectionId('')
        resetCollectionData()
      }
    } catch (error) {
      messageApi.error(`读取项目失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [loadCollectionsForProject, messageApi, resetCollectionData, selectedProjectId])

  const changeProject = useCallback(async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    setSelectedProjectId(projectId)
    writeActiveProjectId(projectId)
    if (project) await loadCollectionsForProject(project)
  }, [loadCollectionsForProject, projects])

  const changeCollection = useCallback(async (collectionId: string) => {
    setSelectedCollectionId(collectionId)
    if (activeProject) await loadCollectionContent(activeProject, collectionId, query)
  }, [activeProject, loadCollectionContent, query])

  const runSearch = useCallback(async () => {
    if (!activeProject || !selectedCollectionId) return
    await loadCollectionContent(activeProject, selectedCollectionId, query)
  }, [activeProject, loadCollectionContent, query, selectedCollectionId])

  const selectNode = useCallback(async (nodeId: string) => {
    if (!activeProject) return
    await loadNodeSelection(activeProject, nodeId)
  }, [activeProject, loadNodeSelection])

  const importFile = useCallback(async (file: KnowledgeBaseFileLike) => {
    if (!activeProject) {
      messageApi.warning('请先选择项目。')
      return
    }
    setImporting(true)
    try {
      const repository = repositoryForProject(activeProject)
      const result = await importKnowledgeBaseFile({
        repository,
        projectId: activeProject.id,
        collectionName: selectedCollection?.name ?? shjGraphImportAdapter.displayName,
        file,
      })
      messageApi.success('知识库导入完成。')
      await loadCollectionsForProject(activeProject, result.collection.id)
    } catch (error) {
      messageApi.error(`导入失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setImporting(false)
    }
  }, [activeProject, loadCollectionsForProject, messageApi, repositoryForProject, selectedCollection])

  const deleteSelectedCollection = useCallback(async () => {
    if (!activeProject || !selectedCollection) return
    setLoading(true)
    try {
      await repositoryForProject(activeProject).deleteDocumentCollection(activeProject.id, selectedCollection.id)
      messageApi.success('知识库集合已删除。')
      await loadCollectionsForProject(activeProject)
    } catch (error) {
      messageApi.error(`删除失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [activeProject, loadCollectionsForProject, messageApi, repositoryForProject, selectedCollection])

  return {
    activeProject,
    collections,
    deleteSelectedCollection,
    graphView,
    importFile,
    importing,
    loadProjects: refreshProjects,
    loading,
    neighbors,
    nodeResults,
    projects,
    query,
    recordResults,
    refreshCollections: () => activeProject ? loadCollectionsForProject(activeProject, selectedCollectionId) : refreshProjects(),
    runSearch,
    searching,
    selectedCollection,
    selectedCollectionId,
    selectedNodeDetails,
    selectedProjectId,
    selectNode,
    setQuery,
    sources,
    changeCollection,
    changeProject,
  }
}
