import type { ProjectSqlDialect } from './projectStorageTypes'

export const PROJECT_SCHEMA_TABLES = [
  'schema_migrations',
  'projects',
  'project_settings',
  'asset_groups',
  'assets',
  'characters',
  'character_asset_links',
  'storyboard_groups',
  'storyboard_voice_entries',
  'asset_relations',
  'project_migrations',
  'deleted_project_cleanup_tasks',
] as const

function boolType(dialect: ProjectSqlDialect) {
  return dialect === 'sqlite' ? 'integer' : 'boolean'
}

function jsonType(dialect: ProjectSqlDialect) {
  if (dialect === 'postgresql') return 'jsonb'
  if (dialect === 'mysql') return 'json'
  return 'text'
}

export function createProjectSchemaSql(dialect: ProjectSqlDialect): string[] {
  const boolean = boolType(dialect)
  const json = jsonType(dialect)
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
    `CREATE TABLE IF NOT EXISTS asset_groups (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      kind text not null,
      name text not null,
      starred ${boolean} not null default false,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null,
      UNIQUE (project_id, kind, name)
    )`,
    `CREATE TABLE IF NOT EXISTS assets (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      kind text not null,
      asset_subtype text not null,
      group_id text null references asset_groups(id) on delete set null,
      name text not null,
      dialogue_text text null,
      source_key text null,
      primary_resource_id text not null,
      primary_object_key text not null,
      primary_file_name text not null,
      primary_mime_group text not null,
      primary_mime_type text not null,
      primary_extension text not null,
      primary_size_bytes integer not null default 0,
      primary_hash_sha256 text null,
      sprite_index_resource_id text null,
      sprite_index_object_key text null,
      sprite_index_file_name text null,
      sprite_index_mime_type text null,
      sprite_index_size_bytes integer null,
      sprite_index_hash_sha256 text null,
      cover_resource_id text null,
      cover_object_key text null,
      cover_file_name text null,
      cover_mime_type text null,
      cover_size_bytes integer null,
      cover_hash_sha256 text null,
      sprite_frame_width integer null,
      sprite_frame_height integer null,
      sprite_sheet_width integer null,
      sprite_sheet_height integer null,
      sprite_fps integer null,
      sprite_frame_count integer null,
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, primary_object_key),
      UNIQUE (project_id, sprite_index_object_key),
      UNIQUE (project_id, cover_object_key)
    )`,
    `CREATE TABLE IF NOT EXISTS characters (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      name text not null,
      starred ${boolean} not null default false,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS character_asset_links (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      character_id text not null references characters(id) on delete cascade,
      asset_id text not null references assets(id) on delete cascade,
      column_kind text not null,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null,
      UNIQUE (character_id, asset_id, column_kind)
    )`,
    `CREATE TABLE IF NOT EXISTS storyboard_groups (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      name text not null,
      starred ${boolean} not null default false,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS storyboard_voice_entries (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      storyboard_id text not null references storyboard_groups(id) on delete cascade,
      asset_id text not null references assets(id) on delete cascade,
      character_id text null references characters(id) on delete set null,
      text text not null default '',
      start_offset_us integer not null default 0,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS asset_relations (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      source_asset_id text not null references assets(id) on delete cascade,
      target_asset_id text not null references assets(id) on delete cascade,
      relation_type text not null,
      created_at text not null,
      UNIQUE (project_id, source_asset_id, target_asset_id, relation_type)
    )`,
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
    'CREATE INDEX IF NOT EXISTS idx_asset_groups_project_kind ON asset_groups(project_id, kind)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_kind ON assets(project_id, kind)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_subtype ON assets(project_id, asset_subtype)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_group ON assets(project_id, group_id)',
    'CREATE INDEX IF NOT EXISTS idx_characters_project_sort ON characters(project_id, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_character_links_project_character ON character_asset_links(project_id, character_id, column_kind, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_storyboards_project_starred ON storyboard_groups(project_id, starred)',
    'CREATE INDEX IF NOT EXISTS idx_storyboard_voice_project_storyboard ON storyboard_voice_entries(project_id, storyboard_id, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_asset_relations_source ON asset_relations(project_id, source_asset_id)',
    'CREATE INDEX IF NOT EXISTS idx_asset_relations_target ON asset_relations(project_id, target_asset_id)',
  ].map((statement) => statement.trim())
}
