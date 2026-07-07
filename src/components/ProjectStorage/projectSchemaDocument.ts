import sharedSchema from './projectSchemaShared.cjs'

export const PROJECT_DOCUMENT_SCHEMA_TABLES = [
  'document_collections',
  'document_sources',
  'document_source_contents',
  'document_records',
  'document_nodes',
  'document_edges',
  'document_node_record_links',
  'document_edge_record_links',
  'document_import_runs',
] as const

interface ProjectDocumentSchemaSqlOptions {
  documentContent: string
  json: string
}

export function createProjectDocumentSchemaSql(options: ProjectDocumentSchemaSqlOptions) {
  return sharedSchema.createProjectDocumentSchemaSql(options)
}

export function createProjectDocumentSchemaIndexes() {
  return sharedSchema.createProjectDocumentSchemaIndexes()
}
