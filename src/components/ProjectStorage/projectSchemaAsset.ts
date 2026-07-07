import sharedSchema from './projectSchemaShared.cjs'

export const PROJECT_ASSET_SCHEMA_TABLES = [
  'asset_groups',
  'assets',
  'characters',
  'character_asset_links',
  'storyboard_groups',
  'storyboard_voice_entries',
  'asset_relations',
] as const

interface ProjectAssetSchemaSqlOptions {
  boolean: string
  json: string
}

export function createProjectAssetSchemaSql(options: ProjectAssetSchemaSqlOptions) {
  return sharedSchema.createProjectAssetSchemaSql(options)
}

export function createProjectAssetSchemaIndexes() {
  return sharedSchema.createProjectAssetSchemaIndexes()
}
