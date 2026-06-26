import type { Dispatch, SetStateAction } from 'react'

import type { KnowledgeBaseFileLike, KnowledgeBaseImportProgress } from './documentKnowledgeImportService'
import type {
  DocumentDescriptionFilter,
  DocumentGraphFilterState,
  DocumentNodeAction,
} from './documentGraphViewModel'
import type {
  DocumentCollection,
  DocumentCollectionGraph,
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchResult,
  DocumentRecordSearchResult,
  Project,
} from '../ProjectStorage'

export interface DocumentWorkspaceState {
  activeProject: Project | null
  collections: DocumentCollection[]
  collectionGraph: DocumentCollectionGraph
  deleteSelectedCollection: () => Promise<void>
  visibleGraph: DocumentCollectionGraph
  graphFilter: DocumentGraphFilterState
  searchDraft: string
  categoryTreeQuery: string
  viewMode: 'list' | 'graph'
  importFile: (file: KnowledgeBaseFileLike) => Promise<void>
  importing: boolean
  importProgress: KnowledgeBaseImportProgress | null
  loadProjects: () => Promise<void>
  loading: boolean
  neighbors: DocumentNeighbor[]
  nodeResults: DocumentNodeSearchResult
  projects: Project[]
  query: string
  recordResults: DocumentRecordSearchResult
  refreshCollections: () => Promise<void>
  runSearch: () => Promise<void>
  searching: boolean
  selectedCollection: DocumentCollection | null
  selectedCollectionId: string
  selectedNodeDetails: DocumentNodeDetails | null
  selectedProjectId: string
  focusNode: (nodeId: string, recordId?: string) => void
  applyNodeAction: (action: DocumentNodeAction) => void
  submitGraphSearch: () => void
  resetGraphView: () => void
  setSearchDraft: Dispatch<SetStateAction<string>>
  setCategoryTreeQuery: Dispatch<SetStateAction<string>>
  setGraphFilter: Dispatch<SetStateAction<DocumentGraphFilterState>>
  toggleGraphNodeType: (nodeType: string) => void
  toggleGraphEdgeType: (edgeType: string) => void
  toggleGraphEntityRole: (role: string) => void
  changeDescriptionFilter: (value: DocumentDescriptionFilter) => void
  selectNode: (nodeId: string) => Promise<void>
  setQuery: Dispatch<SetStateAction<string>>
  changeCollection: (collectionId: string) => Promise<void>
  changeProject: (projectId: string) => Promise<void>
}
