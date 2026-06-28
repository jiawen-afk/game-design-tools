import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space workspace delegates resource IO and filesystem side effects', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts', 'utf8')
  const settingsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8')
  const assetActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetActions.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.ts', 'utf8')
  const resourceSectionsSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceSections.tsx', 'utf8')

  assert.match(hookSource, /from '\.\/usePersonalSpaceWorkspaceActions'/)
  assert.match(workspaceActionsHookSource, /from '\.\/personalSpaceAssetActions'/)
  assert.match(assetActionsSource, /from '\.\/personalSpaceResourceActions'/)
  assert.match(settingsHookSource, /pickPersonalSpaceDirectory/)
  assert.match(assetActionsSource, /deleteAssetWithOptionalResources/)
  assert.match(assetActionsSource, /applyAssetDeleteResult/)
  assert.doesNotMatch(hookSource, /from '\.\/personalSpaceResourceActions'/)
  assert.doesNotMatch(hookSource, /createCommonResourceAssetForUpload/)
  assert.doesNotMatch(hookSource, /deleteAssetWithOptionalResources/)
  assert.doesNotMatch(hookSource, /file\.name\.toLowerCase\(\)\.endsWith\('\\.png'\)/)
  assert.doesNotMatch(hookSource, /file\.name\.toLowerCase\(\) === 'index\.json'/)
  assert.doesNotMatch(hookSource, /enableProject,\s*enableProject,/)
  assert.doesNotMatch(source, /from '\.\/personalSpaceResourceActions'/)
  assert.doesNotMatch(source, /pickPersonalSpaceDirectory/)
  assert.doesNotMatch(source, /createCommonResourceAssetForUpload/)
  assert.doesNotMatch(source, /deleteAssetWithOptionalResources/)
  assert.doesNotMatch(source, /function supportsDirectoryPicker/)
  assert.doesNotMatch(source, /function downloadJsonFile/)
  assert.doesNotMatch(source, /function pickDirectoryHandle/)
  assert.doesNotMatch(source, /URL\.createObjectURL\(file\)/)
  assert.doesNotMatch(source, /writeAssetResourcesToDirectory/)
  assert.doesNotMatch(source, /writeJsonFileToDirectory/)
  assert.doesNotMatch(source, /deleteStoredResourceFiles/)
  assert.doesNotMatch(actionsSource, /showDirectoryPicker/)
  assert.doesNotMatch(actionsSource, /saveFile/)
  assert.match(actionsSource, /URL\.createObjectURL/)
  assert.match(actionsSource, /writeAssetResourcesToDirectory/)
  assert.doesNotMatch(actionsSource, /writeBlobFileToDirectory/)
  assert.doesNotMatch(actionsSource, /readStoredResourceBlob/)
  assert.match(actionsSource, /storageResourcePaths/)
  assert.match(actionsSource, /deleteStoredResourceFiles/)
  assert.match(resourceSectionsSource, /import type \{[^}]*PersonalResourceSectionConfig[^}]*\} from '\.\/personalSpaceModel'/)
  assert.doesNotMatch(resourceSectionsSource, /export interface PersonalResourceSectionConfig/)
})

test('personal space file storage delegates directory handle persistence to a focused module', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceFileStorage.ts', 'utf8')
  const handleStorePath = 'src/components/PersonalSpaceWorkspace/personalSpaceDirectoryHandleStore.ts'

  assert.ok(existsSync(handleStorePath), 'personal space directory handle store should exist')
  const handleStoreSource = readFileSync(handleStorePath, 'utf8')

  assert.match(source, /from '\.\/personalSpaceDirectoryHandleStore'/)
  assert.doesNotMatch(source, /let currentPersonalSpaceDirectoryHandle/)
  assert.doesNotMatch(source, /localStorage\.getItem/)
  assert.doesNotMatch(source, /restoreNativePersonalSpaceDirectoryHandle/)
  assert.match(handleStoreSource, /setPersonalSpaceDirectoryHandle/)
  assert.match(handleStoreSource, /persistPersonalSpaceDirectoryHandle/)
  assert.match(handleStoreSource, /loadPersistedPersonalSpaceDirectoryHandle/)
  assert.match(handleStoreSource, /restoreNativePersonalSpaceDirectoryHandle/)
})

test('personal space file storage delegates memory directory handles and file ops', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceFileStorage.ts', 'utf8')
  const memoryPath = 'src/components/PersonalSpaceWorkspace/personalSpaceMemoryFileStorage.ts'
  const opsPath = 'src/components/PersonalSpaceWorkspace/personalSpaceDirectoryFileOps.ts'

  assert.ok(existsSync(memoryPath), 'personal space memory file storage should exist')
  assert.ok(existsSync(opsPath), 'personal space directory file ops should exist')
  const memorySource = readFileSync(memoryPath, 'utf8')
  const opsSource = readFileSync(opsPath, 'utf8')

  assert.match(source, /from '\.\/personalSpaceMemoryFileStorage'/)
  assert.match(source, /from '\.\/personalSpaceDirectoryFileOps'/)
  assert.doesNotMatch(source, /class Memory(WritableFileStream|FileHandle|DirectoryHandle)/)
  assert.match(memorySource, /class MemoryDirectoryHandle/)
  assert.match(memorySource, /createMemoryDirectoryHandle/)
  assert.match(opsSource, /function sanitizePathPart/)
  assert.match(opsSource, /function ensureDirectory/)
  assert.match(opsSource, /function writeFile/)
})

test('personal space file storage keeps desktop-native adapters isolated', () => {
  const storageSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceFileStorage.ts', 'utf8')
  const nativeStoragePath = 'src/components/PersonalSpaceWorkspace/personalSpaceNativeFileStorage.ts'

  assert.ok(existsSync(nativeStoragePath), 'desktop-native personal space adapter should be isolated')
  const nativeStorageSource = readFileSync(nativeStoragePath, 'utf8')

  assert.match(storageSource, /from '\.\/personalSpaceNativeFileStorage'/)
  assert.match(nativeStorageSource, /class NativeDirectoryHandle/)
  assert.match(nativeStorageSource, /class NativeFileHandle/)
  assert.match(nativeStorageSource, /class NativeWritableFileStream/)
  assert.doesNotMatch(storageSource, /class NativeDirectoryHandle/)
  assert.doesNotMatch(storageSource, /class NativeFileHandle/)
  assert.doesNotMatch(storageSource, /class NativeWritableFileStream/)
})
