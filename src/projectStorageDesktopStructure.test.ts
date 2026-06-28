import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  packageJsonSource,
  projectStorageIpcSources,
  readSources,
} from './appStructureTestHelpers.test'

test('desktop boundary exposes remote project profile storage and verification channels', () => {
  const desktopApiSource = readFileSync('src/desktopApi.ts', 'utf8')
  const desktopProjectProfileApiSource = readFileSync('src/desktopProjectProfileApi.ts', 'utf8')
  const desktopProjectRepositoryApiSource = readFileSync('src/desktopProjectRepositoryApi.ts', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const projectIpcSource = projectStorageIpcSources()
  const profileStoreSource = readFileSync('electron/projectConnectionProfileStore.cjs', 'utf8')
  const packageSource = packageJsonSource()

  assert.match(packageSource, /projectRemoteProfiles\.test\.ts/)
  assert.match(packageSource, /projectRemoteDatabase\.test\.ts/)
  assert.match(packageSource, /projectKodoStorage\.test\.ts/)
  assert.match(packageSource, /projectRemoteRepository\.test\.ts/)
  assert.match(packageSource, /projectRemoteRepositoryProxy\.test\.ts/)
  assert.match(packageSource, /"qiniu"/)
  assert.match(desktopApiSource, /ProjectConnectionProfileSummary/)
  assert.match(desktopApiSource, /ProjectConnectionVerificationResult/)
  assert.match(desktopProjectProfileApiSource, /listProjectConnectionProfiles/)
  assert.match(desktopProjectProfileApiSource, /saveProjectConnectionProfile/)
  assert.match(desktopProjectProfileApiSource, /deleteProjectConnectionProfile/)
  assert.match(desktopProjectProfileApiSource, /verifyProjectDatabaseProfile/)
  assert.match(desktopProjectProfileApiSource, /initializeProjectDatabaseSchema/)
  assert.match(desktopProjectProfileApiSource, /verifyProjectKodoProfile/)
  assert.match(preloadSource, /project-profile:list/)
  assert.match(preloadSource, /project-profile:save/)
  assert.match(preloadSource, /project-profile:delete/)
  assert.match(preloadSource, /project-profile:verify-database/)
  assert.match(preloadSource, /project-profile:initialize-database-schema/)
  assert.match(preloadSource, /project-profile:verify-kodo/)
  assert.match(mainSource, /registerProjectStorageIpcHandlers/)
  assert.match(projectIpcSource, /project-connection-profiles\.json/)
  assert.match(projectIpcSource, /projectRemoteDatabase\.cjs/)
  assert.match(projectIpcSource, /projectKodoStorage\.cjs/)
  assert.match(projectIpcSource, /projectRemoteRepository\.cjs/)
  assert.match(projectIpcSource, /verifyRemoteDatabaseProfile/)
  assert.match(projectIpcSource, /initializeRemoteDatabaseSchema/)
  assert.match(projectIpcSource, /verifyKodoProfile/)
  assert.match(projectIpcSource, /project-remote-repository:create-project/)
  assert.match(preloadSource, /project-remote-repository:create-project/)
  assert.match(desktopProjectRepositoryApiSource, /createRemoteProject/)
  assert.match(profileStoreSource, /encryptedPayload/)
  assert.match(profileStoreSource, /redactedSummary/)
  assert.match(projectIpcSource, /projectConnectionProfileStore\.cjs/)
  assert.doesNotMatch(mainSource, /function readProjectConnectionProfiles/)
  assert.doesNotMatch(mainSource, /function writeProjectConnectionProfiles/)
  assert.doesNotMatch(mainSource, /function redactProjectProfileInput/)
  assert.doesNotMatch(mainSource, /readProjectConnectionProfiles\(/)
  assert.doesNotMatch(mainSource, /writeProjectConnectionProfiles\(/)
  assert.match(profileStoreSource, /createProjectConnectionProfileStore/)
  assert.match(profileStoreSource, /markVerified/)
  assert.match(profileStoreSource, /markSchemaInitialized/)
  assert.doesNotMatch(mainSource, /本地格式验证，实际连接将在数据库驱动接入后执行/)
  assert.doesNotMatch(mainSource, /初始化已排入第一版连接流程/)
  assert.doesNotMatch(mainSource, /实际对象写入将在 Kodo SDK 接入后执行/)
  assert.doesNotMatch(mainSource, /return .*password/)
  assert.doesNotMatch(mainSource, /return .*secretKey/)
})

test('desktop api facade delegates domain contracts to focused modules', () => {
  const facadePath = 'src/desktopApi.ts'
  const domainPaths = [
    'src/desktopFileSystemApi.ts',
    'src/desktopAppUpdateApi.ts',
    'src/desktopSystemApi.ts',
    'src/desktopVoiceRuntimeApi.ts',
    'src/desktopBirefnetApi.ts',
    'src/desktopUpscaleApi.ts',
    'src/desktopProjectProfileApi.ts',
    'src/desktopProjectRepositoryApi.ts',
    'src/desktopProjectObjectApi.ts',
  ]

  for (const path of domainPaths) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  const facadeSource = readFileSync(facadePath, 'utf8')
  const domainSource = readSources(domainPaths)

  for (const path of domainPaths) {
    const moduleName = path.replace(/^src\//, './').replace(/\.ts$/, '')
    assert.match(facadeSource, new RegExp(`from '${moduleName}'`))
  }

  assert.match(facadeSource, /interface GameDesignToolsDesktopApi extends[\s\S]*DesktopFileSystemApi/)
  assert.match(facadeSource, /DesktopProjectRepositoryApi/)
  assert.match(facadeSource, /gameDesignToolsDesktop/)
  assert.match(facadeSource, /getDesktopApi/)
  assert.doesNotMatch(facadeSource, /export interface Desktop(?:DirectoryInfo|VoxcpmSetupOptions|BirefnetSetupOptions|UpscaleRuntimeStatus|ProjectObjectReadResult)\b/)
  assert.doesNotMatch(facadeSource, /selectPersonalSpaceDirectory\(\)|queryUpscaleStatus\(\)|createRemoteProject\(/)

  assert.match(domainSource, /export interface DesktopFileSystemApi/)
  assert.match(domainSource, /export interface DesktopAppUpdateApi/)
  assert.match(domainSource, /export interface DesktopSystemApi/)
  assert.match(domainSource, /export interface DesktopVoiceRuntimeApi/)
  assert.match(domainSource, /export interface DesktopBirefnetApi/)
  assert.match(domainSource, /export interface DesktopUpscaleApi/)
  assert.match(domainSource, /export interface DesktopProjectProfileApi/)
  assert.match(domainSource, /export interface DesktopProjectRepositoryApi/)
  assert.match(domainSource, /export interface DesktopProjectObjectApi/)
})

test('electron main delegates project storage IPC handlers to a focused module', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const projectIpcSource = projectStorageIpcSources()

  assert.match(mainSource, /registerProjectStorageIpcHandlers/)
  assert.doesNotMatch(mainSource, /project-profile:list/)
  assert.doesNotMatch(mainSource, /project-local-repository:initialize/)
  assert.doesNotMatch(mainSource, /project-remote-repository:create-project/)
  assert.doesNotMatch(mainSource, /project-kodo-object:put/)
  assert.doesNotMatch(mainSource, /project-asset-cache:get/)
  assert.match(projectIpcSource, /project-profile:list/)
  assert.match(projectIpcSource, /project-local-repository:initialize/)
  assert.match(projectIpcSource, /project-remote-repository:create-project/)
  assert.match(projectIpcSource, /project-kodo-object:put/)
  assert.match(projectIpcSource, /project-asset-cache:get/)
})

test('project storage IPC facade delegates channel groups to focused modules', () => {
  const projectIpcSource = readFileSync('electron/projectStorageIpcHandlers.cjs', 'utf8')
  const modulePaths = [
    'electron/projectStorageIpcContext.cjs',
    'electron/projectProfileIpcHandlers.cjs',
    'electron/projectLocalRepositoryIpcHandlers.cjs',
    'electron/projectRemoteRepositoryIpcHandlers.cjs',
    'electron/projectObjectIpcHandlers.cjs',
  ]

  for (const path of modulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  for (const moduleName of [
    'projectProfileIpcHandlers.cjs',
    'projectLocalRepositoryIpcHandlers.cjs',
    'projectRemoteRepositoryIpcHandlers.cjs',
    'projectObjectIpcHandlers.cjs',
  ]) {
    assert.match(projectIpcSource, new RegExp(`require\\('\\./${moduleName}'\\)`))
  }

  assert.match(projectIpcSource, /registerProjectProfileIpcHandlers/)
  assert.match(projectIpcSource, /registerProjectLocalRepositoryIpcHandlers/)
  assert.match(projectIpcSource, /registerProjectRemoteRepositoryIpcHandlers/)
  assert.match(projectIpcSource, /registerProjectObjectIpcHandlers/)
  assert.doesNotMatch(projectIpcSource, /ipcMain\.handle\('project-(profile|local-repository|remote-repository|local-object|asset-cache|kodo-object):/)
  assert.doesNotMatch(projectIpcSource, /verifyRemoteDatabaseProfile|verifyKodoProfile|createRemoteProjectRepository|createLocalProjectRepository|createLocalProjectObjectStorage|createProjectAssetCacheStorage|putKodoObject/)
})

test('desktop binary IPC payloads are converted through a shared helper', () => {
  const packageSource = packageJsonSource()
  const helperSource = readFileSync('src/desktopBinaryData.ts', 'utf8')
  const sources = [
    readFileSync('src/components/ProjectStorage/projectAssetCacheStorage.ts', 'utf8'),
    readFileSync('src/components/ProjectStorage/projectKodoObjectStorage.ts', 'utf8'),
    readFileSync('src/components/ProjectStorage/projectLocalObjectStorage.ts', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceNativeFileStorage.ts', 'utf8'),
    readFileSync('src/components/ImageProcessingWorkspace/useImageUpscaleWorkflow.ts', 'utf8'),
  ]

  assert.match(packageSource, /desktopBinaryData\.test\.ts/)
  assert.match(helperSource, /copyDesktopBinaryData/)
  assert.match(helperSource, /blobFromDesktopBinaryData/)
  for (const source of sources) {
    assert.match(source, /blobFromDesktopBinaryData/)
    assert.doesNotMatch(source, /instanceof ArrayBuffer\s*\?/)
  }
})
