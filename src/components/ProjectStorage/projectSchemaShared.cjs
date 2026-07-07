const {
  createProjectCoreSchemaSql,
  createProjectLifecycleSchemaSql,
} = require('./projectSchemaCoreShared.cjs')
const {
  createProjectAssetSchemaIndexes,
  createProjectAssetSchemaSql,
} = require('./projectSchemaAssetShared.cjs')
const {
  createProjectDocumentSchemaIndexes,
  createProjectDocumentSchemaSql,
} = require('./projectSchemaDocumentShared.cjs')

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

function createProjectSchemaSql(dialect, options = {}) {
  const boolean = boolType(dialect)
  const json = jsonType(dialect)
  const documentContent = documentContentType(dialect)
  return [
    ...createProjectCoreSchemaSql({ json, includeDeviceBindings: options.includeDeviceBindings ?? false }),
    ...createProjectAssetSchemaSql({ boolean, json }),
    ...createProjectDocumentSchemaSql({ documentContent, json }),
    ...createProjectLifecycleSchemaSql({ json }),
    ...createProjectAssetSchemaIndexes(),
    ...createProjectDocumentSchemaIndexes({ extended: options.extendedDocumentIndexes ?? true }),
  ].map((statement) => statement.trim())
}

module.exports = {
  boolType,
  createProjectAssetSchemaIndexes,
  createProjectAssetSchemaSql,
  createProjectCoreSchemaSql,
  createProjectDocumentSchemaIndexes,
  createProjectDocumentSchemaSql,
  createProjectLifecycleSchemaSql,
  createProjectSchemaSql,
  documentContentType,
  jsonType,
}
