import sharedSchema from './projectSchemaShared.cjs'
import { PROJECT_ASSET_SCHEMA_TABLES } from './projectSchemaAsset'
import {
  PROJECT_CORE_SCHEMA_TABLES,
  PROJECT_LIFECYCLE_SCHEMA_TABLES,
} from './projectSchemaCore'
import { PROJECT_DOCUMENT_SCHEMA_TABLES } from './projectSchemaDocument'
import type { ProjectSqlDialect } from './projectStorageTypes'

export const PROJECT_SCHEMA_TABLES = [
  ...PROJECT_CORE_SCHEMA_TABLES,
  ...PROJECT_ASSET_SCHEMA_TABLES,
  ...PROJECT_DOCUMENT_SCHEMA_TABLES,
  ...PROJECT_LIFECYCLE_SCHEMA_TABLES,
] as const

export function createProjectSchemaSql(dialect: ProjectSqlDialect): string[] {
  return sharedSchema.createProjectSchemaSql(dialect)
}
