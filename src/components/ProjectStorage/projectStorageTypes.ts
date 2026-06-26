export type ProjectMode = 'local' | 'remote'
export type ProjectStatus = 'active' | 'migrating' | 'migration_failed'
export type ProjectStorageProvider = 'local' | 'qiniu_kodo'
export type ProjectDatabaseProvider = 'sqlite' | 'postgresql' | 'mysql'
export type ProjectAssetKind = 'image' | 'sprite' | 'voice'
export type ProjectAssetSubtype =
  | 'generic'
  | 'portrait'
  | 'map'
  | 'effect'
  | 'character_sprite'
  | 'effect_sprite'
  | 'character_voice'
  | 'narration'
  | 'sound_effect'
export type ProjectAssetGroupKind = ProjectAssetKind
export type CharacterAssetColumnKind = 'portrait' | 'sprite' | 'voice'
export type ProjectSqlDialect = 'sqlite' | 'postgresql' | 'mysql'
export type ProjectMigrationStatus = 'pending' | 'running' | 'succeeded' | 'failed'
export type CleanupTaskStatus = 'pending' | 'succeeded' | 'failed'
export type ProjectMimeGroup = 'image' | 'audio' | 'application' | 'video' | 'text' | 'font' | 'model'

export interface Project {
  id: string
  name: string
  description: string
  mode: ProjectMode
  status: ProjectStatus
  object_key_prefix: string
  created_at: string
  updated_at: string
  metadata_json: string | null
}

export interface ProjectSettings {
  project_id: string
  storage_provider: ProjectStorageProvider
  database_provider: ProjectDatabaseProvider
  local_object_root: string | null
  remote_database_profile_id: string | null
  remote_storage_profile_id: string | null
  last_verified_at: string | null
  updated_at: string
}

export interface AssetGroup {
  id: string
  project_id: string
  kind: ProjectAssetGroupKind
  name: string
  starred: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AssetResourceFields {
  primary_resource_id: string
  primary_object_key: string
  primary_file_name: string
  primary_mime_group: ProjectMimeGroup
  primary_mime_type: string
  primary_extension: string
  primary_size_bytes: number
  primary_hash_sha256: string | null
  sprite_index_resource_id: string | null
  sprite_index_object_key: string | null
  sprite_index_file_name: string | null
  sprite_index_mime_type: string | null
  sprite_index_size_bytes: number | null
  sprite_index_hash_sha256: string | null
  cover_resource_id: string | null
  cover_object_key: string | null
  cover_file_name: string | null
  cover_mime_type: string | null
  cover_size_bytes: number | null
  cover_hash_sha256: string | null
}

export interface Asset extends AssetResourceFields {
  id: string
  project_id: string
  kind: ProjectAssetKind
  asset_subtype: ProjectAssetSubtype
  group_id: string | null
  name: string
  dialogue_text: string | null
  source_key: string | null
  sprite_frame_width: number | null
  sprite_frame_height: number | null
  sprite_sheet_width: number | null
  sprite_sheet_height: number | null
  sprite_fps: number | null
  sprite_frame_count: number | null
  created_at: string
  updated_at: string
  metadata_json: string | null
}

export interface Character {
  id: string
  project_id: string
  name: string
  starred: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CharacterAssetLink {
  id: string
  project_id: string
  character_id: string
  asset_id: string
  column_kind: CharacterAssetColumnKind
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StoryboardGroup {
  id: string
  project_id: string
  name: string
  starred: boolean
  created_at: string
  updated_at: string
}

export interface StoryboardVoiceEntry {
  id: string
  project_id: string
  storyboard_id: string
  asset_id: string
  character_id: string | null
  text: string
  start_offset_us: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AssetRelation {
  id: string
  project_id: string
  source_asset_id: string
  target_asset_id: string
  relation_type: 'effect_voice' | 'derived_from' | string
  created_at: string
}

export interface ProjectCleanupTask {
  id: string
  project_id: string
  storage_provider: ProjectStorageProvider
  object_key: string
  status: CleanupTaskStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

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
