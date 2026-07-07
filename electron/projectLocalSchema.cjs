const sharedSchema = require('../src/components/ProjectStorage/projectSchemaShared.cjs')

function createProjectSchemaSql() {
  return sharedSchema.createProjectSchemaSql('sqlite', {
    includeDeviceBindings: true,
    extendedDocumentIndexes: false,
  })
}

function getTableColumns(database, tableName) {
  const result = database.exec(`PRAGMA table_info(${tableName})`)
  const rowSet = result[0]?.values ?? []
  return new Set(rowSet.map((row) => String(row[1])))
}

function applySchemaMigrations(database) {
  const assetsColumns = getTableColumns(database, 'assets')
  const statements = [
    assetsColumns.has('cover_resource_id') ? null : 'ALTER TABLE assets ADD COLUMN cover_resource_id text null',
    assetsColumns.has('cover_object_key') ? null : 'ALTER TABLE assets ADD COLUMN cover_object_key text null',
    assetsColumns.has('cover_file_name') ? null : 'ALTER TABLE assets ADD COLUMN cover_file_name text null',
    assetsColumns.has('cover_mime_type') ? null : 'ALTER TABLE assets ADD COLUMN cover_mime_type text null',
    assetsColumns.has('cover_size_bytes') ? null : 'ALTER TABLE assets ADD COLUMN cover_size_bytes integer null',
    assetsColumns.has('cover_hash_sha256') ? null : 'ALTER TABLE assets ADD COLUMN cover_hash_sha256 text null',
  ].filter(Boolean)
  for (const statement of statements) database.run(statement)
}

function initializeSchemaInDatabase(database) {
  database.run('PRAGMA foreign_keys = ON')
  for (const statement of createProjectSchemaSql()) database.run(statement)
  applySchemaMigrations(database)
}

module.exports = {
  createProjectSchemaSql,
  initializeSchemaInDatabase,
}
