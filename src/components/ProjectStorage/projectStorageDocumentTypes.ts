import type { ProjectMimeGroup } from './projectStorageCoreTypes'

export interface DocumentCollection {
  id: string
  project_id: string
  name: string
  description: string
  source_type: string
  status: string
  record_count: number
  node_count: number
  edge_count: number
  created_at: string
  updated_at: string
  imported_at: string | null
  metadata_json: string | null
}

export interface DocumentSource {
  id: string
  project_id: string
  collection_id: string
  role: string
  file_name: string
  mime_group: ProjectMimeGroup
  mime_type: string
  extension: string
  size_bytes: number
  hash_sha256: string | null
  encoding: string
  created_at: string
  metadata_json: string | null
}

export interface DocumentSourceContent {
  source_id: string
  project_id: string
  collection_id: string
  content_text: string
  content_encoding: string
  size_bytes: number
  hash_sha256: string | null
  created_at: string
  metadata_json: string | null
}

export interface DocumentRecord {
  id: string
  project_id: string
  collection_id: string
  source_id: string
  external_id: string
  record_type: string
  title: string
  description: string
  category_1: string | null
  category_2: string | null
  category_3: string | null
  place_path: string | null
  book_title: string | null
  chapter_title: string | null
  version_title: string | null
  usage_text: string | null
  effect_text: string | null
  source_url: string | null
  search_text: string
  created_at: string
  updated_at: string
  metadata_json: string | null
}

export interface DocumentNode {
  id: string
  project_id: string
  collection_id: string
  external_id: string
  node_type: string
  label: string
  description: string
  search_text: string
  created_at: string
  updated_at: string
  metadata_json: string | null
}

export interface DocumentEdge {
  id: string
  project_id: string
  collection_id: string
  external_id: string
  source_node_id: string
  target_node_id: string
  edge_type: string
  label: string
  weight: number
  source_kind: string
  created_at: string
  metadata_json: string | null
}

export interface DocumentNodeRecordLink {
  id: string
  project_id: string
  collection_id: string
  node_id: string
  record_id: string
  link_role: string
  created_at: string
}

export interface DocumentEdgeRecordLink {
  id: string
  project_id: string
  collection_id: string
  edge_id: string
  record_id: string
  created_at: string
}

export interface DocumentImportRun {
  id: string
  project_id: string
  collection_id: string | null
  source_type: string
  status: string
  started_at: string
  finished_at: string | null
  total_records: number
  total_nodes: number
  total_edges: number
  imported_records: number
  imported_nodes: number
  imported_edges: number
  error_message: string | null
  report_json: string | null
}

export interface DocumentGraphNode {
  id: string
  label: string
  type: string
  records: string[]
  data: Record<string, unknown>
}

export interface DocumentGraphEdge {
  id: string
  source: string
  target: string
  type: string
  label: string
  weight: number
  record_ids: string[]
  source_kind: string
}

export interface DocumentCollectionGraph {
  nodes: Record<string, DocumentGraphNode>
  edges: Record<string, DocumentGraphEdge>
}
