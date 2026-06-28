import {
  PROJECT_ASSET_SCHEMA_TABLES,
  createProjectAssetSchemaIndexes,
  createProjectAssetSchemaSql,
} from './projectSchemaAsset'
import {
  PROJECT_CORE_SCHEMA_TABLES,
  PROJECT_LIFECYCLE_SCHEMA_TABLES,
  createProjectCoreSchemaSql,
  createProjectLifecycleSchemaSql,
} from './projectSchemaCore'
import {
  PROJECT_DOCUMENT_SCHEMA_TABLES,
  createProjectDocumentSchemaIndexes,
  createProjectDocumentSchemaSql,
} from './projectSchemaDocument'
import type { ProjectSqlDialect } from './projectStorageTypes'

export const PROJECT_SCHEMA_TABLES = [
  ...PROJECT_CORE_SCHEMA_TABLES,
  ...PROJECT_ASSET_SCHEMA_TABLES,
  ...PROJECT_DOCUMENT_SCHEMA_TABLES,
  ...PROJECT_LIFECYCLE_SCHEMA_TABLES,
] as const

function boolType(dialect: ProjectSqlDialect) {
  return dialect === 'sqlite' ? 'integer' : 'boolean'
}

function jsonType(dialect: ProjectSqlDialect) {
  if (dialect === 'postgresql') return 'jsonb'
  if (dialect === 'mysql') return 'json'
  return 'text'
}

function documentContentType(dialect: ProjectSqlDialect) {
  return dialect === 'mysql' ? 'longtext' : 'text'
}

export function createProjectSchemaSql(dialect: ProjectSqlDialect): string[] {
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
