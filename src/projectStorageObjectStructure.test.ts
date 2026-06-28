import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { projectStorageIpcSources } from './appStructureTestHelpers.test'

test('project migration binds current device profiles before remote import', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementActions.ts', 'utf8')
  const migrationActionSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementMigrationAction.ts', 'utf8')
  const bindCall = migrationActionSource.indexOf('remoteDeviceBindingResolver.bindProjectToCurrentDevice(')
  const migrationCall = migrationActionSource.indexOf('migrateLocalProjectToRemote({')

  assert.notEqual(bindCall, -1)
  assert.notEqual(migrationCall, -1)
  assert.ok(bindCall < migrationCall)
  assert.match(hookSource, /usePersonalSpaceWorkspaceActions/)
  assert.match(workspaceActionsHookSource, /createProjectManagementActions/)
  assert.match(actionsSource, /createProjectManagementMigrationAction/)
})

test('remote project migration uploads objects through qiniu kodo storage', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts', 'utf8')
  const infrastructureSource = readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8')
  const kodoStorageSource = readFileSync('src/components/ProjectStorage/projectKodoObjectStorage.ts', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const projectIpcSource = projectStorageIpcSources()

  assert.doesNotMatch(hookSource, /createDesktopKodoProjectObjectStorage/)
  assert.match(infrastructureSource, /createDesktopKodoProjectObjectStorage/)
  assert.match(hookSource, /usePersonalSpaceWorkspaceActions/)
  assert.match(workspaceActionsHookSource, /remoteObjectStorage/)
  assert.doesNotMatch(hookSource, /await projectObjectStorage\.putObject\(objectKey, objectData\)/)
  assert.match(kodoStorageSource, /putProjectKodoObject/)
  assert.match(kodoStorageSource, /getProjectKodoObject/)
  assert.match(kodoStorageSource, /deleteProjectKodoObject/)
  assert.match(kodoStorageSource, /requireProfileId\(objectKey,\s*context\.projectId\)/)
  assert.match(preloadSource, /project-kodo-object:put/)
  assert.match(preloadSource, /project-kodo-object:get/)
  assert.match(projectIpcSource, /project-kodo-object:put/)
  assert.match(projectIpcSource, /project-kodo-object:get/)
  assert.match(projectIpcSource, /putKodoObject/)
  assert.match(projectIpcSource, /getKodoObject/)
})

test('project asset previews resolve provider object keys through asset manager', () => {
  const previewSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalAssetPreview.tsx', 'utf8')
  const spritePreviewIndexHookPath = 'src/components/PersonalSpaceWorkspace/useSpritePreviewIndex.ts'
  const spritePreviewIndexHookSource = existsSync(spritePreviewIndexHookPath) ? readFileSync(spritePreviewIndexHookPath, 'utf8') : ''
  const storyboardPlaybackSource = readFileSync('src/components/PersonalSpaceWorkspace/storyboardPlaybackSources.ts', 'utf8')
  const resourceActionSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.ts', 'utf8')
  const storyboardExportActionSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceStoryboardExportActions.ts', 'utf8')
  const storyboardZipResourcesSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceStoryboardZipResources.ts', 'utf8')
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx', 'utf8')
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')

  assert.match(previewSource, /useStoredResourcePreviewSource/)
  assert.match(previewSource, /useStoredAssetCoverSource/)
  assert.match(previewSource, /enabled: shouldLoadFullSource/)
  assert.match(previewSource, /asset\.kind === 'voice'[\s\S]*audioPlaying/)
  assert.match(previewSource, /asset\.kind === 'sprite'[\s\S]*spriteOpen/)
  assert.match(previewSource, /imageOpen/)
  assert.ok(existsSync(spritePreviewIndexHookPath), 'sprite preview index hook should exist')
  assert.match(previewSource, /from '\.\/useSpritePreviewIndex'/)
  assert.doesNotMatch(previewSource, /function useSpritePreviewIndex/)
  assert.doesNotMatch(previewSource, /fetch\(indexSource\)/)
  assert.match(spritePreviewIndexHookSource, /export function useSpritePreviewIndex/)
  assert.match(spritePreviewIndexHookSource, /useStoredResourcePreviewSource/)
  assert.match(spritePreviewIndexHookSource, /fetch\(indexSource\)/)
  assert.match(storyboardPlaybackSource, /resolveProjectAssetResourceSource/)
  assert.match(storyboardPlaybackSource, /projectAssetManager/)
  assert.match(resourceActionSource, /personalSpaceStoryboardExportActions/)
  assert.doesNotMatch(resourceActionSource, /readProjectAssetResourceBlob/)
  assert.match(storyboardExportActionSource, /personalSpaceStoryboardZipBuilders/)
  assert.match(storyboardZipResourcesSource, /readProjectAssetResourceBlob/)
  assert.match(storyboardZipResourcesSource, /projectAssetManager/)
  assert.match(workspaceSource, /projectObjectStorage=\{workspace\.projectObjectStorage\}/)
  assert.match(workspaceSource, /projectAssetManager=\{workspace\.projectAssetManager\}/)
  assert.match(hookSource, /useProjectStorageInfrastructure/)
  assert.doesNotMatch(hookSource, /createProjectAssetManager/)
  assert.doesNotMatch(hookSource, /createDesktopProjectAssetCacheStorage/)
  assert.match(readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8'), /createProjectAssetManager/)
  assert.match(readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8'), /createDesktopProjectAssetCacheStorage/)
  assert.doesNotMatch(previewSource, /fetch\(asset\.resourcePaths/)
})

test('project asset cache storage is exposed through electron without polluting object transport', () => {
  const indexSource = readFileSync('src/components/ProjectStorage/index.ts', 'utf8')
  const managerSource = readFileSync('src/components/ProjectStorage/projectAssetManager.ts', 'utf8')
  const objectStorageSource = readFileSync('src/components/ProjectStorage/projectObjectStorage.ts', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const projectIpcSource = projectStorageIpcSources()

  assert.match(indexSource, /projectAssetManager/)
  assert.match(managerSource, /ProjectAssetManager/)
  assert.match(managerSource, /ProjectAssetCacheStorage/)
  assert.match(preloadSource, /project-asset-cache:get/)
  assert.match(preloadSource, /project-asset-cache:put/)
  assert.match(preloadSource, /project-asset-cache:delete-resource/)
  assert.match(preloadSource, /project-asset-cache:delete-project/)
  assert.match(projectIpcSource, /createProjectAssetCacheStorage/)
  assert.match(projectIpcSource, /resolveProjectAssetCacheRootPath/)
  assert.doesNotMatch(objectStorageSource, /ProjectAssetManager/)
  assert.doesNotMatch(objectStorageSource, /ProjectAssetCacheStorage/)
})

test('project object storage providers share batch delete failure collection', () => {
  const objectStorageSource = readFileSync('src/components/ProjectStorage/projectObjectStorage.ts', 'utf8')
  const localObjectStorageSource = readFileSync('src/components/ProjectStorage/projectLocalObjectStorage.ts', 'utf8')
  const kodoObjectStorageSource = readFileSync('src/components/ProjectStorage/projectKodoObjectStorage.ts', 'utf8')

  assert.match(objectStorageSource, /function deleteProjectObjectsIndividually/)
  assert.match(localObjectStorageSource, /deleteProjectObjectsIndividually/)
  assert.match(kodoObjectStorageSource, /deleteProjectObjectsIndividually/)
  assert.doesNotMatch(localObjectStorageSource, /const failed: ProjectObjectDeleteResult\['failed'\]/)
  assert.doesNotMatch(kodoObjectStorageSource, /const failed: ProjectObjectDeleteResult\['failed'\]/)
})

test('legacy project migration delegates asset resource row mapping', () => {
  const migrationSource = readFileSync('src/components/ProjectStorage/projectLegacyMigration.ts', 'utf8')
  const assetMigrationSource = readFileSync('src/components/ProjectStorage/projectLegacyAssetMigration.ts', 'utf8')

  assert.match(migrationSource, /migrateLegacyAssetsToProjectRows/)
  assert.match(assetMigrationSource, /migrateLegacyAssetsToProjectRows/)
  assert.match(assetMigrationSource, /createAssetResourceFields/)
  assert.match(assetMigrationSource, /resourceIdFromProjectObjectKey/)
  assert.doesNotMatch(migrationSource, /function mimeTypeForAsset/)
  assert.doesNotMatch(migrationSource, /function findPrimaryPath/)
  assert.doesNotMatch(migrationSource, /function findSpriteIndexPath/)
  assert.doesNotMatch(migrationSource, /function objectKeyResourceId/)
  assert.doesNotMatch(migrationSource, /createAssetResourceFields/)
})

test('legacy project migration delegates personal space restore mapping', () => {
  const migrationSource = readFileSync('src/components/ProjectStorage/projectLegacyMigration.ts', 'utf8')
  const restoreModulePath = 'src/components/ProjectStorage/projectLegacyRestore.ts'

  assert.ok(existsSync(restoreModulePath), `${restoreModulePath} should exist`)
  const restoreSource = readFileSync(restoreModulePath, 'utf8')

  assert.match(migrationSource, /projectLegacyRestore/)
  assert.match(migrationSource, /restoreProjectRowsToPersonalSpaceState/)
  assert.match(restoreSource, /export function restoreProjectRowsToPersonalSpaceState\b/)
  assert.match(restoreSource, /defaultPersonalSpaceState/)
  for (const helperName of [
    'groupNameById',
    'restoreAssetGroups',
    'restoreStarredAssetGroups',
    'restoreAssets',
    'restoreCharacters',
    'restoreStoryboardGroups',
  ]) {
    assert.match(restoreSource, new RegExp(`function ${helperName}\\b`))
    assert.doesNotMatch(migrationSource, new RegExp(`function ${helperName}\\b`))
  }
  assert.doesNotMatch(migrationSource, /defaultPersonalSpaceState/)
})

test('project object key parsing helpers are shared by migration and resource IO paths', () => {
  const storageModelSource = readFileSync('src/components/ProjectStorage/projectStorageModel.ts', 'utf8')
  const objectKeysSource = readFileSync('src/components/ProjectStorage/projectObjectKeys.ts', 'utf8')
  const assetMigrationSource = readFileSync('src/components/ProjectStorage/projectLegacyAssetMigration.ts', 'utf8')
  const assetObjectWriterSource = readFileSync('src/components/ProjectStorage/projectAssetObjectWriter.ts', 'utf8')
  const resolverSource = readFileSync('src/components/PersonalSpaceWorkspace/projectAssetResourceResolver.ts', 'utf8')

  assert.match(objectKeysSource, /isProjectObjectKey/)
  assert.match(objectKeysSource, /resourceIdFromProjectObjectKey/)
  assert.match(storageModelSource, /resourceIdFromProjectObjectKey/)
  for (const source of [assetMigrationSource, assetObjectWriterSource, resolverSource]) {
    assert.match(source, /isProjectObjectKey/)
    assert.doesNotMatch(source, /function isProjectObjectKey/)
    assert.doesNotMatch(source, /function objectKeyResourceId/)
  }
  assert.match(assetMigrationSource, /fileNameFromProjectObjectKey/)
  assert.match(assetMigrationSource, /resourceIdFromProjectObjectKey/)
  assert.match(resolverSource, /resourceIdFromProjectObjectKey/)
})

test('qiniu kodo verification performs remote object operations before succeeding', () => {
  const source = readFileSync('electron/projectKodoStorage.cjs', 'utf8')

  assert.match(source, /createQiniuKodoClient/)
  assert.match(source, /qiniu/)
  assert.match(source, /putObject/)
  assert.match(source, /getObject/)
  assert.match(source, /statObject/)
  assert.match(source, /deleteObject/)
  assert.match(source, /formUploader\.put/)
  assert.match(source, /privateDownloadUrl/)
  assert.match(source, /bucketManager\.stat/)
  assert.match(source, /bucketManager\.delete/)
  assert.doesNotMatch(source, /本地格式验证/)
})

test('project storage boundaries keep database and object storage out of workspace entries', () => {
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const projectResourcesSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceProjectResources.ts', 'utf8')
  const infrastructureSource = readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8')
  const workflowSource = readFileSync('src/components/PersonalSpaceWorkspace/projectStorageWorkflow.ts', 'utf8')
  const projectStorageSource = readFileSync('src/components/ProjectStorage/projectAssetCollectionService.ts', 'utf8')

  assert.doesNotMatch(workspaceSource, /projectSqliteRepository/)
  assert.doesNotMatch(workspaceSource, /projectLocalObjectStorage/)
  assert.match(hookSource, /useProjectStorageInfrastructure/)
  assert.doesNotMatch(hookSource, /projectAssetCollectionService|createProjectAssetFromCollection|createDesktopLocalProjectRepository/)
  assert.doesNotMatch(hookSource, /from '\.\/projectStorageWorkflow'/)
  assert.doesNotMatch(hookSource, /createProjectStorageWorkflow/)
  assert.match(infrastructureSource, /from '\.\/projectStorageWorkflow'/)
  assert.match(infrastructureSource, /createProjectStorageWorkflow/)
  assert.doesNotMatch(hookSource, /const findProjectRepository =/)
  assert.doesNotMatch(hookSource, /const projectReadOptionsForActiveProject =/)
  assert.doesNotMatch(hookSource, /activeProject\?\.mode === 'remote'/)
  assert.doesNotMatch(hookSource, /projectObjectStorage: activeProjectObjectStorage/)
  assert.doesNotMatch(hookSource, /projectStorageWorkflow\.objectStorageForProject\(activeProject\)/)
  assert.doesNotMatch(hookSource, /projectStorageWorkflow\.projectReadOptionsForProject/)
  assert.match(projectResourcesSource, /projectStorageWorkflow\.objectStorageForProject\(activeProject\)/)
  assert.match(projectResourcesSource, /projectStorageWorkflow\.projectReadOptionsForProject\(activeProject\)/)
  assert.doesNotMatch(hookSource, /syncProjectSpaceStateToLocalProjectStorage\(\{/)
  assert.match(workflowSource, /syncProjectSpaceStateToLocalProjectStorage/)
  assert.match(workflowSource, /projectReadOptionsForProject/)
  assert.match(workflowSource, /repositoryForProject/)
  assert.match(projectStorageSource, /createProjectAssetFromCollection/)
})

test('project migration service delegates asset resource IO to focused modules', () => {
  const serviceSource = readFileSync('src/components/ProjectStorage/projectMigrationService.ts', 'utf8')
  const modulePaths = [
    'src/components/ProjectStorage/projectAssetResourceRefs.ts',
    'src/components/ProjectStorage/projectAssetObjectWriter.ts',
    'src/components/ProjectStorage/projectMigrationObjectUploader.ts',
  ]

  for (const path of modulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  for (const moduleName of [
    'projectAssetResourceRefs',
    'projectAssetObjectWriter',
    'projectMigrationObjectUploader',
  ]) {
    assert.match(serviceSource, new RegExp(`from './${moduleName}'`))
  }

  assert.doesNotMatch(serviceSource, /readStoredResourceBlob|crypto\.subtle|fetch\(/)
  assert.doesNotMatch(serviceSource, /function\s+(buildAssetResourceRef|listAssetObjectKeys|readAssetResourceBlob|writeAssetObjects|uploadAssetResource)\b/)
})

test('project asset object writer delegates per-resource role synchronization', () => {
  const writerSource = readFileSync('src/components/ProjectStorage/projectAssetObjectWriter.ts', 'utf8')
  const writeAssetObjectsBody = writerSource.match(/export async function writeAssetObjects[\s\S]*?^}/m)?.[0] ?? ''

  assert.match(writerSource, /interface AssetResourceSyncPlan/)
  assert.match(writerSource, /async function syncAssetResourceObject/)

  for (const role of ['primary', 'sprite_index', 'cover']) {
    assert.match(writerSource, new RegExp(`role: '${role}'`))
  }
  assert.match(writeAssetObjectsBody, /for \(const plan of assetResourceSyncPlans\)/)
  assert.match(writeAssetObjectsBody, /syncAssetResourceObject\(input, asset, sourceAsset, reusableExistingAsset, plan\)/)

  assert.doesNotMatch(writeAssetObjectsBody, /readAssetResourceBlob/)
  assert.doesNotMatch(writeAssetObjectsBody, /readAssetCoverBlob/)
  assert.doesNotMatch(writeAssetObjectsBody, /copyAssetResourceFields/)
  assert.doesNotMatch(writeAssetObjectsBody, /isProjectObjectKey/)
})

test('project asset object writer delegates pure resource metadata rules', () => {
  const writerSource = readFileSync('src/components/ProjectStorage/projectAssetObjectWriter.ts', 'utf8')
  const metadataPath = 'src/components/ProjectStorage/projectAssetResourceMetadata.ts'

  assert.ok(existsSync(metadataPath), `${metadataPath} should exist`)

  const metadataSource = readFileSync(metadataPath, 'utf8')

  assert.match(writerSource, /from '\.\/projectAssetResourceMetadata'/)
  for (const helperName of [
    'assetHashForRole',
    'assetSizeForRole',
    'copyAssetResourceFields',
    'setAssetResourceBlobMetadata',
    'resourceMatchesExistingBlob',
  ]) {
    assert.match(metadataSource, new RegExp(`function ${helperName}\\b`))
    assert.doesNotMatch(writerSource, new RegExp(`function ${helperName}\\b`))
  }
})
