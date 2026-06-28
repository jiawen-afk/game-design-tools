import { useCallback, useMemo, useState } from 'react'

import type {
  DocumentCollection,
  DocumentCollectionGraph,
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchResult,
  DocumentRecordSearchResult,
  Project,
  ProjectRepository,
} from '../ProjectStorage'
import {
  createDefaultDocumentGraphFilter,
  filterDocumentGraph,
  type DocumentGraphFilterState,
} from './documentGraphViewModel'

interface DocumentCollectionWorkflowMessageApi {
  success: (content: string) => void
  error: (content: string) => void
}

interface UseDocumentCollectionWorkflowParams {
  activeProject: Project | null
  messageApi: DocumentCollectionWorkflowMessageApi
  repositoryForProject: (project: Project) => ProjectRepository
}

const emptyDocumentCollectionGraph: DocumentCollectionGraph = { nodes: {}, edges: {} }

export function useDocumentCollectionWorkflow({
  activeProject,
  messageApi,
  repositoryForProject,
}: UseDocumentCollectionWorkflowParams) {
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

  const selectedCollection = useMemo(() => (
    collections.find((collection) => collection.id === selectedCollectionId) ?? null
  ), [collections, selectedCollectionId])
  const visibleGraph = useMemo(() => filterDocumentGraph(collectionGraph, graphFilter), [collectionGraph, graphFilter])

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

  const clearCollections = useCallback(() => {
    setCollections([])
    setSelectedCollectionId('')
    resetCollectionData()
  }, [resetCollectionData])

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
  }, [messageApi, repositoryForProject, resetCollectionData])

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
    categoryTreeQuery,
    changeCollection,
    clearCollections,
    collectionGraph,
    collections,
    deleteSelectedCollection,
    graphFilter,
    loadCollectionsForProject,
    loading,
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
  }
}
