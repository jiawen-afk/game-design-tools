import sharedSchema from './projectSchemaShared.cjs'

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

export function createProjectCoreSchemaSql(options: ProjectCoreSchemaSqlOptions) {
  return sharedSchema.createProjectCoreSchemaSql(options)
}

export function createProjectLifecycleSchemaSql(options: ProjectCoreSchemaSqlOptions) {
  return sharedSchema.createProjectLifecycleSchemaSql(options)
}
