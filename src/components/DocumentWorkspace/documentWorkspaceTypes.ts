import type { Dispatch, SetStateAction } from 'react'

import type { DocumentGraphView } from './documentKnowledgeModel'
import type { KnowledgeBaseFileLike } from './documentKnowledgeImportService'
import type {
  DocumentCollection,
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchResult,
  DocumentRecordSearchResult,
  DocumentSource,
  Project,
} from '../ProjectStorage'

export interface DocumentWorkspaceState {
  activeProject: Project | null
  collections: DocumentCollection[]
  deleteSelectedCollection: () => Promise<void>
  graphView: DocumentGraphView
  importFile: (file: KnowledgeBaseFileLike) => Promise<void>
  importing: boolean
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
  selectNode: (nodeId: string) => Promise<void>
  setQuery: Dispatch<SetStateAction<string>>
  sources: DocumentSource[]
  changeCollection: (collectionId: string) => Promise<void>
  changeProject: (projectId: string) => Promise<void>
}
