const {
  createProjectAssetSchemaIndexes,
  createProjectAssetSchemaSql,
} = require('./projectSchemaAsset.cjs')
const {
  createProjectCoreSchemaSql,
  createProjectLifecycleSchemaSql,
} = require('./projectSchemaCore.cjs')
const {
  createProjectDocumentSchemaIndexes,
  createProjectDocumentSchemaSql,
} = require('./projectSchemaDocument.cjs')

function createProjectRemoteSchemaSql(dialect) {
  if (dialect === 'postgresql') return createProjectSchemaSql('postgresql')
  if (dialect !== 'mysql') throw new Error('初始化表结构仅支持 PostgreSQL 或 MySQL。')

  return createProjectSchemaSql('mysql').map((statement) => statement
    .replace(/\b(id|version|project_id|group_id|character_id|asset_id|storyboard_id|source_asset_id|target_asset_id|collection_id|source_id|node_id|edge_id|record_id)\s+text\s+primary\s+key/gi, '$1 varchar(64) primary key')
    .replace(/\b(id|version|project_id|group_id|character_id|asset_id|storyboard_id|source_asset_id|target_asset_id|collection_id|source_id|node_id|edge_id|record_id|source_node_id|target_node_id|primary_resource_id|sprite_index_resource_id|cover_resource_id|remote_database_profile_id|remote_storage_profile_id)\s+text\b/gi, '$1 varchar(64)')
    .replace(/\b(kind|mode|status|storage_provider|database_provider|asset_subtype|column_kind|relation_type|from_mode|to_mode|storage_provider|primary_mime_group|primary_extension|sprite_index_mime_type|cover_mime_type|source_type|record_type|node_type|edge_type|source_kind|role|mime_group|extension|encoding|link_role)\s+text\b/gi, '$1 varchar(64)')
    .replace(/\b(name|display_name|primary_file_name|sprite_index_file_name|cover_file_name|primary_mime_type|primary_hash_sha256|sprite_index_hash_sha256|cover_hash_sha256|file_name|mime_type|hash_sha256|external_id|title|label|category_1|category_2|category_3|book_title|chapter_title|version_title)\s+text\b/gi, '$1 varchar(255)')
    .replace(/\b(object_key_prefix|primary_object_key|sprite_index_object_key|cover_object_key|object_key|source_key|local_object_root|error_message|place_path|source_url)\s+text\b/gi, '$1 varchar(512)')
    .replace(/\b(created_at|updated_at|applied_at|last_verified_at|started_at|finished_at|imported_at)\s+text\b/gi, '$1 varchar(32)')
    .replace(/\b(description|dialogue_text|text|checksum|search_text|usage_text|effect_text)\s+text\b/gi, '$1 varchar(2048)')
    .replace(/\bCREATE INDEX IF NOT EXISTS\b/gi, 'CREATE INDEX')
  )
}

function createProjectRemoteSchemaMigrationSql(dialect) {
  if (dialect === 'postgresql') {
    return [
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_resource_id text null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_object_key text null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_file_name text null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_mime_type text null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_size_bytes integer null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_hash_sha256 text null',
    ]
  }
  if (dialect === 'mysql') {
    return [
      'ALTER TABLE assets ADD COLUMN cover_resource_id varchar(64) null',
      'ALTER TABLE assets ADD COLUMN cover_object_key varchar(512) null',
      'ALTER TABLE assets ADD COLUMN cover_file_name varchar(255) null',
      'ALTER TABLE assets ADD COLUMN cover_mime_type varchar(64) null',
      'ALTER TABLE assets ADD COLUMN cover_size_bytes integer null',
      'ALTER TABLE assets ADD COLUMN cover_hash_sha256 varchar(255) null',
    ]
  }
  throw new Error('初始化表结构仅支持 PostgreSQL 或 MySQL。')
}

function boolType(dialect) {
  return dialect === 'sqlite' ? 'integer' : 'boolean'
}

function jsonType(dialect) {
  if (dialect === 'postgresql') return 'jsonb'
  if (dialect === 'mysql') return 'json'
  return 'text'
}

function documentContentType(dialect) {
  return dialect === 'mysql' ? 'longtext' : 'text'
}

function createProjectSchemaSql(dialect) {
  const boolean = boolType(dialect)
  const json = jsonType(dialect)
  const documentContent = documentContentType(dialect)
  return [
    ...createProjectCoreSchemaSql({ json }),
    ...createProjectAssetSchemaSql({ boolean, json }),
    ...createProjectDocumentSchemaSql({ documentContent, json }),
    ...createProjectLifecycleSchemaSql({ json }),
    ...createProjectAssetSchemaIndexes(),
    ...createProjectDocumentSchemaIndexes(),
  ].map((statement) => statement.trim())
}

module.exports = {
  createProjectRemoteSchemaSql,
  createProjectRemoteSchemaMigrationSql,
}
