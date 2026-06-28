export const PROJECT_CORE_SCHEMA_TABLES = [
  'schema_migrations',
  'projects',
  'project_settings',
] as const

export const PROJECT_LIFECYCLE_SCHEMA_TABLES = [
  'project_migrations',
  'deleted_project_cleanup_tasks',
] as const

interface ProjectCoreSchemaSqlOptions {
  json: string
}

export function createProjectCoreSchemaSql({ json }: ProjectCoreSchemaSqlOptions) {
  return [
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version text primary key,
      applied_at text not null,
      checksum text null
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id text primary key,
      name text not null,
      description text not null default '',
      mode text not null,
      status text not null,
      object_key_prefix text not null,
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null
    )`,
    `CREATE TABLE IF NOT EXISTS project_settings (
      project_id text primary key references projects(id) on delete cascade,
      storage_provider text not null,
      database_provider text not null,
      local_object_root text null,
      remote_database_profile_id text null,
      remote_storage_profile_id text null,
      last_verified_at text null,
      updated_at text not null
    )`,
  ]
}

export function createProjectLifecycleSchemaSql({ json }: ProjectCoreSchemaSqlOptions) {
  return [
    `CREATE TABLE IF NOT EXISTS project_migrations (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      from_mode text not null,
      to_mode text not null,
      status text not null,
      started_at text null,
      finished_at text null,
      total_assets integer not null default 0,
      total_objects integer not null default 0,
      uploaded_objects integer not null default 0,
      error_message text null,
      report_json ${json} null
    )`,
    `CREATE TABLE IF NOT EXISTS deleted_project_cleanup_tasks (
      id text primary key,
      project_id text not null,
      storage_provider text not null,
      object_key text not null,
      status text not null,
      error_message text null,
      created_at text not null,
      updated_at text not null
    )`,
  ]
}
