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
  type DocumentCollectionGraph,
  type DocumentNeighbor,
  type DocumentNodeDetails,
  type DocumentNodeSearchResult,
  type DocumentRecordSearchResult,
  type Project,
  type ProjectDeviceBinding,
  type ProjectRepository,
} from '../ProjectStorage'
import { getDefaultKnowledgeBaseAdapter } from './documentKnowledgeModel'
import {
  createDefaultDocumentGraphFilter,
  filterDocumentGraph,
  focusTargetForDocumentNode,
  type DocumentDescriptionFilter,
  type DocumentGraphFilterState,
  type DocumentNodeAction,
} from './documentGraphViewModel'
import {
  importKnowledgeBaseFile,
  type KnowledgeBaseFileLike,
  type KnowledgeBaseImportProgress,
} from './documentKnowledgeImportService'
import type { DocumentWorkspaceState } from './documentWorkspaceTypes'

interface DocumentWorkspaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

const localRepository = createDesktopLocalProjectRepository()
const projectBootstrapper = createProjectWorkspaceBootstrapper(localRepository)
const defaultKnowledgeBaseName = getDefaultKnowledgeBaseAdapter()?.displayName ?? '项目知识库'
const emptyDocumentCollectionGraph: DocumentCollectionGraph = { nodes: {}, edges: {} }

export function useDocumentWorkspace(messageApi: DocumentWorkspaceMessageApi): DocumentWorkspaceState {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [collections, setCollections] = useState<DocumentCollection[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [query, setQuery] = useState('')
  const [collectionGraph, setCollectionGraph] = useState<DocumentCollectionGraph>(emptyDocumentCollectionGraph)
  const [graphFilter, setGraphFilter] = useState<DocumentGraphFilterState>(() => createDefaultDocumentGraphFilter(emptyDocumentCollectionGraph))
  const [searchDraft, setSearchDraft] = useState('')
  const [categoryTreeQuery, setCategoryTreeQuery] = useState('')
  const [nodeResults, setNodeResults] = useState<DocumentNodeSearchResult>({ items: [], total: 0 })
  const [recordResults, setRecordResults] = useState<DocumentRecordSearchResult>({ items: [], total: 0 })
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<DocumentNodeDetails | null>(null)
  const [neighbors, setNeighbors] = useState<DocumentNeighbor[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<KnowledgeBaseImportProgress | null>(null)
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
  const visibleGraph = useMemo(() => filterDocumentGraph(collectionGraph, graphFilter), [collectionGraph, graphFilter])
  const viewMode = graphFilter.focusNodeId ? 'graph' : 'list'

  const repositoryForProject = useCallback((project: Project): ProjectRepository => (
    project.mode === 'remote' ? remoteRepositoryRef.current! : localRepository
  ), [])

  const resetCollectionData = useCallback(() => {
    setCollectionGraph(emptyDocumentCollectionGraph)
    setGraphFilter(createDefaultDocumentGraphFilter(emptyDocumentCollectionGraph))
    setSearchDraft('')
    setCategoryTreeQuery('')
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
      const [nextGraph, nextNodes, nextRecords] = await Promise.all([
        repository.getDocumentCollectionGraph(project.id, collectionId),
        repository.searchDocumentNodes({ projectId: project.id, collectionId, query: queryText }),
        repository.searchDocumentRecords({ projectId: project.id, collectionId, query: queryText, limit: 8 }),
      ])
      setCollectionGraph(nextGraph)
      setGraphFilter(createDefaultDocumentGraphFilter(nextGraph))
      setSearchDraft('')
      setCategoryTreeQuery('')
      setNodeResults(nextNodes)
      setRecordResults(nextRecords)
      setSelectedNodeDetails(null)
      setNeighbors([])
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
    setImportProgress(null)
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

  const focusNode = useCallback((nodeId: string, recordId?: string) => {
    const target = focusTargetForDocumentNode(collectionGraph, visibleGraph, nodeId, recordId ?? graphFilter.focusRecordId)
    if (!target) return
    setGraphFilter((current) => ({
      ...current,
      focusNodeId: target.nodeId,
      focusRecordId: target.recordId,
    }))
  }, [collectionGraph, graphFilter.focusRecordId, visibleGraph])

  const applyNodeAction = useCallback((action: DocumentNodeAction) => {
    if (action.type === 'focus') {
      focusNode(action.nodeId, action.recordId)
      return
    }
    setGraphFilter((current) => ({
      ...current,
      focusNodeId: undefined,
      focusRecordId: undefined,
      categoryLevel: action.categoryLevel,
      categories: [action.category],
      categoryFilters: [{
        level: action.categoryLevel,
        value: action.category,
        parent: action.parent,
        grandparent: action.grandparent,
      }],
    }))
  }, [focusNode])

  const submitGraphSearch = useCallback(() => {
    setGraphFilter((current) => ({
      ...current,
      query: searchDraft.trim(),
      focusNodeId: undefined,
      focusRecordId: undefined,
    }))
  }, [searchDraft])

  const resetGraphView = useCallback(() => {
    setSearchDraft('')
    setCategoryTreeQuery('')
    setGraphFilter(createDefaultDocumentGraphFilter(collectionGraph))
  }, [collectionGraph])

  const toggleGraphNodeType = useCallback((nodeType: string) => {
    setGraphFilter((current) => {
      const nodeTypes = current.nodeTypes.includes(nodeType)
        ? current.nodeTypes.filter((item) => item !== nodeType)
        : [...current.nodeTypes, nodeType]
      return { ...current, nodeTypes }
    })
  }, [])

  const toggleGraphEdgeType = useCallback((edgeType: string) => {
    setGraphFilter((current) => {
      const edgeTypes = current.edgeTypes.includes(edgeType)
        ? current.edgeTypes.filter((item) => item !== edgeType)
        : [...current.edgeTypes, edgeType]
      return { ...current, edgeTypes }
    })
  }, [])

  const toggleGraphEntityRole = useCallback((role: string) => {
    setGraphFilter((current) => {
      const currentRoles = current.entityRoles ?? []
      const entityRoles = currentRoles.includes(role)
        ? currentRoles.filter((item) => item !== role)
        : [...currentRoles, role]
      return { ...current, entityRoles }
    })
  }, [])

  const changeDescriptionFilter = useCallback((value: DocumentDescriptionFilter) => {
    setGraphFilter((current) => ({ ...current, description: value }))
  }, [])

  const importFile = useCallback(async (file: KnowledgeBaseFileLike) => {
    if (!activeProject) {
      messageApi.warning('请先选择项目。')
      return
    }
    setImporting(true)
    setImportProgress(null)
    try {
      const repository = repositoryForProject(activeProject)
      const result = await importKnowledgeBaseFile({
        repository,
        projectId: activeProject.id,
        collectionName: selectedCollection?.name ?? defaultKnowledgeBaseName,
        file,
        onProgress: setImportProgress,
      })
      messageApi.success('知识库导入完成。')
      await loadCollectionsForProject(activeProject, result.collection.id)
    } catch (error) {
      setImportProgress({
        stage: 'failed',
        message: '导入失败',
        percent: 100,
      })
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
    refreshCollections: () => activeProject ? loadCollectionsForProject(activeProject, selectedCollectionId) : refreshProjects(),
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
