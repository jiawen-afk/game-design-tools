export type ProjectMode = 'local' | 'remote'
export type ProjectStatus = 'active' | 'migrating' | 'migration_failed'
export type ProjectStorageProvider = 'local' | 'qiniu_kodo'
export type ProjectDatabaseProvider = 'sqlite' | 'postgresql' | 'mysql'
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
