import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('project schema SQL has one shared source for electron and renderer wrappers', () => {
  const sharedSchemaModulePath = 'src/components/ProjectStorage/projectSchemaShared.cjs'
  const rendererSchemaModulePaths = [
    'src/components/ProjectStorage/projectSchema.ts',
    'src/components/ProjectStorage/projectSchemaAsset.ts',
    'src/components/ProjectStorage/projectSchemaCore.ts',
    'src/components/ProjectStorage/projectSchemaDocument.ts',
  ]
  const electronSchemaModulePaths = [
    'electron/projectLocalSchema.cjs',
    'electron/projectRemoteSchema.cjs',
    'electron/projectSchemaAsset.cjs',
    'electron/projectSchemaCore.cjs',
    'electron/projectSchemaDocument.cjs',
  ]

  assert.ok(existsSync(sharedSchemaModulePath), `${sharedSchemaModulePath} should exist`)
  const sharedSource = readFileSync(sharedSchemaModulePath, 'utf8')
  assert.match(sharedSource, /function createProjectSchemaSql\b/)
  assert.match(sharedSource, /function createProjectAssetSchemaSql\b/)
  assert.match(sharedSource, /function createProjectCoreSchemaSql\b/)
  assert.match(sharedSource, /function createProjectLifecycleSchemaSql\b/)
  assert.match(sharedSource, /function createProjectDocumentSchemaSql\b/)
  assert.match(sharedSource, /CREATE TABLE IF NOT EXISTS assets/)
  assert.match(sharedSource, /CREATE TABLE IF NOT EXISTS document_collections/)

  for (const path of rendererSchemaModulePaths) {
    const source = readFileSync(path, 'utf8')
    assert.match(source, /projectSchemaShared\.cjs/, `${path} should delegate to the shared schema source`)
  }
  for (const path of electronSchemaModulePaths) {
    const source = readFileSync(path, 'utf8')
    assert.match(source, /projectSchemaShared\.cjs/, `${path} should delegate to the shared schema source`)
  }

  const wrapperSources = [...rendererSchemaModulePaths, ...electronSchemaModulePaths]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
  assert.doesNotMatch(wrapperSources, /CREATE TABLE IF NOT EXISTS assets/)
  assert.doesNotMatch(wrapperSources, /CREATE TABLE IF NOT EXISTS document_collections/)
})

test('remote project repository delegates table metadata and upsert SQL helpers', () => {
  const repositorySource = readFileSync('electron/projectRemoteRepository.cjs', 'utf8')
  const sqlModulePath = 'electron/projectRemoteRepositorySql.cjs'
  const tableModulePath = 'electron/projectStorageTables.cjs'

  assert.ok(existsSync(sqlModulePath), `${sqlModulePath} should exist`)
  assert.ok(existsSync(tableModulePath), `${tableModulePath} should exist`)
  const sqlSource = readFileSync(sqlModulePath, 'utf8')
  const tableSource = readFileSync(tableModulePath, 'utf8')

  assert.match(repositorySource, /projectRemoteRepositorySql\.cjs/)
  assert.match(sqlSource, /projectStorageTables\.cjs/)
  assert.match(tableSource, /const tableDefinitions/)
  assert.match(tableSource, /const rowSetTables/)
  assert.match(sqlSource, /function buildUpsertSql/)
  assert.match(sqlSource, /function buildBulkUpsertSql/)
  assert.match(sqlSource, /async function upsertRow/)
  assert.match(sqlSource, /async function upsertRows/)
  assert.match(sqlSource, /function selectSql/)
  assert.match(sqlSource, /async function deleteProjectRows/)
  assert.doesNotMatch(sqlSource, /const tableDefinitions|const rowSetTables/)
  assert.doesNotMatch(repositorySource, /const tableDefinitions|const rowSetTables|function buildBulkUpsertSql|async function upsertRows|function selectSql|async function deleteProjectRows/)
})

test('project storage table metadata is grouped by storage domain', () => {
  const tableModulePath = 'electron/projectStorageTables.cjs'
  const coreModulePath = 'electron/projectStorageCoreTables.cjs'
  const assetModulePath = 'electron/projectStorageAssetTables.cjs'
  const documentModulePath = 'electron/projectStorageDocumentTables.cjs'

  assert.ok(existsSync(tableModulePath), `${tableModulePath} should exist`)
  assert.ok(existsSync(coreModulePath), `${coreModulePath} should exist`)
  assert.ok(existsSync(assetModulePath), `${assetModulePath} should exist`)
  assert.ok(existsSync(documentModulePath), `${documentModulePath} should exist`)
  const tableSource = readFileSync(tableModulePath, 'utf8')
  const coreSource = readFileSync(coreModulePath, 'utf8')
  const assetSource = readFileSync(assetModulePath, 'utf8')
  const documentSource = readFileSync(documentModulePath, 'utf8')

  assert.match(tableSource, /projectStorageCoreTables\.cjs/)
  assert.match(tableSource, /projectStorageAssetTables\.cjs/)
  assert.match(tableSource, /projectStorageDocumentTables\.cjs/)
  assert.match(coreSource, /projects:\s*\{/)
  assert.match(coreSource, /project_settings:\s*\{/)
  assert.match(coreSource, /deleted_project_cleanup_tasks:\s*\{/)
  assert.match(assetSource, /asset_groups:\s*\{/)
  assert.match(assetSource, /assets:\s*\{/)
  assert.match(assetSource, /storyboard_voice_entries:\s*\{/)
  assert.match(documentSource, /document_collections:\s*\{/)
  assert.match(documentSource, /document_import_runs:\s*\{/)
  assert.doesNotMatch(tableSource, /projects:\s*\{|assets:\s*\{|document_collections:\s*\{/)
})

test('local project repository delegates sqlite schema creation to a focused module', () => {
  const repositorySource = readFileSync('electron/projectLocalRepository.cjs', 'utf8')
  const schemaModulePath = 'electron/projectLocalSchema.cjs'
  const coreSchemaModulePath = 'electron/projectSchemaCore.cjs'
  const assetSchemaModulePath = 'electron/projectSchemaAsset.cjs'
  const documentSchemaModulePath = 'electron/projectSchemaDocument.cjs'
  const sharedSchemaModulePath = 'src/components/ProjectStorage/projectSchemaShared.cjs'

  assert.ok(existsSync(schemaModulePath), `${schemaModulePath} should exist`)
  assert.ok(existsSync(coreSchemaModulePath), `${coreSchemaModulePath} should exist`)
  assert.ok(existsSync(assetSchemaModulePath), `${assetSchemaModulePath} should exist`)
  assert.ok(existsSync(documentSchemaModulePath), `${documentSchemaModulePath} should exist`)
  assert.ok(existsSync(sharedSchemaModulePath), `${sharedSchemaModulePath} should exist`)
  const schemaSource = readFileSync(schemaModulePath, 'utf8')
  const coreSchemaSource = readFileSync(coreSchemaModulePath, 'utf8')
  const assetSchemaSource = readFileSync(assetSchemaModulePath, 'utf8')
  const documentSchemaSource = readFileSync(documentSchemaModulePath, 'utf8')
  const sharedSchemaSource = readFileSync(sharedSchemaModulePath, 'utf8')

  assert.match(repositorySource, /projectLocalSchema\.cjs/)
  assert.match(schemaSource, /function createProjectSchemaSql\b/)
  assert.match(schemaSource, /function initializeSchemaInDatabase\b/)
  assert.match(schemaSource, /projectSchemaShared\.cjs/)
  assert.doesNotMatch(schemaSource, /projectSchemaCore\.cjs|projectSchemaAsset\.cjs|projectSchemaDocument\.cjs/)
  assert.match(coreSchemaSource, /function createProjectCoreSchemaSql\b/)
  assert.match(coreSchemaSource, /function createProjectLifecycleSchemaSql\b/)
  assert.match(assetSchemaSource, /function createProjectAssetSchemaSql\b/)
  assert.match(assetSchemaSource, /function createProjectAssetSchemaIndexes\b/)
  assert.match(documentSchemaSource, /function createProjectDocumentSchemaSql\b/)
  assert.match(documentSchemaSource, /function createProjectDocumentSchemaIndexes\b/)
  assert.match(sharedSchemaSource, /includeDeviceBindings/)
  assert.match(schemaSource, /ALTER TABLE assets ADD COLUMN cover_resource_id/)
  assert.doesNotMatch(schemaSource, /CREATE TABLE IF NOT EXISTS assets|CREATE TABLE IF NOT EXISTS document_collections/)

  for (const functionName of [
    'boolType',
    'jsonType',
    'createProjectSchemaSql',
    'getTableColumns',
    'applySchemaMigrations',
    'initializeSchemaInDatabase',
  ]) {
    assert.doesNotMatch(repositorySource, new RegExp(`function ${functionName}\\b`))
  }
})

test('renderer project schema delegates concrete table groups to focused modules', () => {
  const schemaModulePath = 'src/components/ProjectStorage/projectSchema.ts'
  const coreSchemaModulePath = 'src/components/ProjectStorage/projectSchemaCore.ts'
  const assetSchemaModulePath = 'src/components/ProjectStorage/projectSchemaAsset.ts'
  const documentSchemaModulePath = 'src/components/ProjectStorage/projectSchemaDocument.ts'

  assert.ok(existsSync(coreSchemaModulePath), `${coreSchemaModulePath} should exist`)
  assert.ok(existsSync(assetSchemaModulePath), `${assetSchemaModulePath} should exist`)
  assert.ok(existsSync(documentSchemaModulePath), `${documentSchemaModulePath} should exist`)

  const schemaSource = readFileSync(schemaModulePath, 'utf8')
  const coreSchemaSource = readFileSync(coreSchemaModulePath, 'utf8')
  const assetSchemaSource = readFileSync(assetSchemaModulePath, 'utf8')
  const documentSchemaSource = readFileSync(documentSchemaModulePath, 'utf8')

  assert.match(schemaSource, /from '\.\/projectSchemaCore'/)
  assert.match(schemaSource, /from '\.\/projectSchemaAsset'/)
  assert.match(schemaSource, /from '\.\/projectSchemaDocument'/)
  assert.match(schemaSource, /PROJECT_CORE_SCHEMA_TABLES/)
  assert.match(schemaSource, /PROJECT_LIFECYCLE_SCHEMA_TABLES/)
  assert.match(schemaSource, /PROJECT_ASSET_SCHEMA_TABLES/)
  assert.match(schemaSource, /PROJECT_DOCUMENT_SCHEMA_TABLES/)
  assert.match(coreSchemaSource, /export function createProjectCoreSchemaSql\b/)
  assert.match(coreSchemaSource, /export function createProjectLifecycleSchemaSql\b/)
  assert.match(assetSchemaSource, /export function createProjectAssetSchemaSql\b/)
  assert.match(assetSchemaSource, /export function createProjectAssetSchemaIndexes\b/)
  assert.match(documentSchemaSource, /export function createProjectDocumentSchemaSql\b/)
  assert.match(documentSchemaSource, /export function createProjectDocumentSchemaIndexes\b/)
  assert.doesNotMatch(schemaSource, /CREATE TABLE IF NOT EXISTS assets|CREATE TABLE IF NOT EXISTS document_collections/)
  assert.doesNotMatch(schemaSource, /idx_assets_project_kind|idx_document_collections_project_status/)
})

test('project storage types are grouped by storage domain', () => {
  const typeEntryPath = 'src/components/ProjectStorage/projectStorageTypes.ts'
  const coreTypePath = 'src/components/ProjectStorage/projectStorageCoreTypes.ts'
  const assetTypePath = 'src/components/ProjectStorage/projectStorageAssetTypes.ts'
  const documentTypePath = 'src/components/ProjectStorage/projectStorageDocumentTypes.ts'

  assert.ok(existsSync(coreTypePath), `${coreTypePath} should exist`)
  assert.ok(existsSync(assetTypePath), `${assetTypePath} should exist`)
  assert.ok(existsSync(documentTypePath), `${documentTypePath} should exist`)

  const entrySource = readFileSync(typeEntryPath, 'utf8')
  const coreTypeSource = readFileSync(coreTypePath, 'utf8')
  const assetTypeSource = readFileSync(assetTypePath, 'utf8')
  const documentTypeSource = readFileSync(documentTypePath, 'utf8')

  assert.match(entrySource, /from '\.\/projectStorageCoreTypes'/)
  assert.match(entrySource, /from '\.\/projectStorageAssetTypes'/)
  assert.match(entrySource, /from '\.\/projectStorageDocumentTypes'/)
  assert.doesNotMatch(entrySource, /^export (?:interface|type (?!\{))/m)
  assert.match(coreTypeSource, /export interface Project\b/)
  assert.match(coreTypeSource, /export interface ProjectSettings\b/)
  assert.match(coreTypeSource, /export interface ProjectCleanupTask\b/)
  assert.match(assetTypeSource, /export interface Asset\b/)
  assert.match(assetTypeSource, /export interface Character\b/)
  assert.match(assetTypeSource, /export interface StoryboardVoiceEntry\b/)
  assert.match(documentTypeSource, /export interface DocumentCollection\b/)
  assert.match(documentTypeSource, /export interface DocumentCollectionGraph\b/)
  assert.doesNotMatch(coreTypeSource, /DocumentCollection|export interface Asset\b/)
  assert.doesNotMatch(assetTypeSource, /DocumentCollection/)
  assert.doesNotMatch(documentTypeSource, /export interface Asset\b|StoryboardVoiceEntry/)
})

test('remote project database delegates schema SQL generation to a focused module', () => {
  const databaseSource = readFileSync('electron/projectRemoteDatabase.cjs', 'utf8')
  const repositorySource = readFileSync('electron/projectRemoteRepository.cjs', 'utf8')
  const schemaModulePath = 'electron/projectRemoteSchema.cjs'
  const coreSchemaModulePath = 'electron/projectSchemaCore.cjs'
  const assetSchemaModulePath = 'electron/projectSchemaAsset.cjs'
  const documentSchemaModulePath = 'electron/projectSchemaDocument.cjs'

  assert.ok(existsSync(schemaModulePath), `${schemaModulePath} should exist`)
  assert.ok(existsSync(coreSchemaModulePath), `${coreSchemaModulePath} should exist`)
  assert.ok(existsSync(assetSchemaModulePath), `${assetSchemaModulePath} should exist`)
  assert.ok(existsSync(documentSchemaModulePath), `${documentSchemaModulePath} should exist`)
  const schemaSource = readFileSync(schemaModulePath, 'utf8')
  const coreSchemaSource = readFileSync(coreSchemaModulePath, 'utf8')
  const assetSchemaSource = readFileSync(assetSchemaModulePath, 'utf8')
  const documentSchemaSource = readFileSync(documentSchemaModulePath, 'utf8')

  assert.match(databaseSource, /projectRemoteSchema\.cjs/)
  assert.match(repositorySource, /projectRemoteSchema\.cjs/)
  assert.match(schemaSource, /function createProjectRemoteSchemaSql\b/)
  assert.match(schemaSource, /function createProjectRemoteSchemaMigrationSql\b/)
  assert.match(schemaSource, /function createProjectSchemaSql\b/)
  assert.match(schemaSource, /function documentContentType\b/)
  assert.match(schemaSource, /projectSchemaShared\.cjs/)
  assert.doesNotMatch(schemaSource, /projectSchemaCore\.cjs|projectSchemaAsset\.cjs|projectSchemaDocument\.cjs/)
  assert.match(coreSchemaSource, /function createProjectCoreSchemaSql\b/)
  assert.match(coreSchemaSource, /function createProjectLifecycleSchemaSql\b/)
  assert.match(assetSchemaSource, /function createProjectAssetSchemaSql\b/)
  assert.match(assetSchemaSource, /function createProjectAssetSchemaIndexes\b/)
  assert.match(documentSchemaSource, /function createProjectDocumentSchemaSql\b/)
  assert.match(documentSchemaSource, /function createProjectDocumentSchemaIndexes\b/)
  assert.doesNotMatch(coreSchemaSource, /CREATE TABLE IF NOT EXISTS projects/)
  assert.doesNotMatch(assetSchemaSource, /CREATE TABLE IF NOT EXISTS assets/)
  assert.doesNotMatch(documentSchemaSource, /CREATE TABLE IF NOT EXISTS document_collections/)
  assert.doesNotMatch(schemaSource, /CREATE TABLE IF NOT EXISTS assets|CREATE TABLE IF NOT EXISTS document_collections/)
  assert.doesNotMatch(databaseSource, /function createProjectSchemaSql\b|function documentContentType\b/)
  assert.doesNotMatch(repositorySource, /createProjectRemoteSchemaSql,\s*createProjectRemoteSchemaMigrationSql,\s*normalizeDatabasePayload/)
})
