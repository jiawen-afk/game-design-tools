import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { projectStorageIpcSources, readSources } from './appStructureTestHelpers.test'

test('remote profile editing requires tested drafts and preserves blank secrets', () => {
  const panelSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx', 'utf8')
  const tabsSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementTabs.tsx', 'utf8')
  const remoteSettingsSectionSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementRemoteSettingsSection.tsx', 'utf8')
  const remoteSettingsSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectRemoteSettingsPanel.tsx', 'utf8')
  const remoteDatabaseSettingsSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectRemoteDatabaseSettingsPanel.tsx', 'utf8')
  const remoteKodoSettingsSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectRemoteKodoSettingsPanel.tsx', 'utf8')
  const remoteProfileSaveButtonSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectRemoteProfileSaveButton.tsx', 'utf8')
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8')
  const remoteProfilesHookSource = readFileSync('src/components/PersonalSpaceWorkspace/useRemoteConnectionProfilesWorkspace.ts', 'utf8')
  const remoteProfileDetailsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/useRemoteConnectionProfileDetails.ts', 'utf8')
  const remoteDraftModelSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileDraftModel.ts', 'utf8')
  const remoteWorkspaceModelSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileWorkspaceModel.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileActions.ts', 'utf8')
  const saveActionsSource = existsSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileSaveActions.ts')
    ? readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileSaveActions.ts', 'utf8')
    : ''
  const desktopProjectProfileApiSource = readFileSync('src/desktopProjectProfileApi.ts', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const projectIpcSource = projectStorageIpcSources()
  const profileMetadataSource = readFileSync('src/components/ProjectStorage/projectProfileMetadata.ts', 'utf8')

  assert.doesNotMatch(panelSource, /ProjectManagementRemoteSettingsSection/)
  assert.match(tabsSource, /ProjectManagementRemoteSettingsSection/)
  assert.match(remoteSettingsSectionSource, /ProjectRemoteSettingsPanel/)
  assert.match(remoteSettingsSource, /ProjectRemoteDatabaseSettingsPanel/)
  assert.match(remoteSettingsSource, /ProjectRemoteKodoSettingsPanel/)
  assert.match(remoteDatabaseSettingsSource, /添加数据库配置/)
  assert.match(remoteKodoSettingsSource, /添加 Kodo 配置/)
  assert.match(remoteDatabaseSettingsSource, /留空表示不修改密码/)
  assert.match(remoteKodoSettingsSource, /留空表示不修改 Secret Key/)
  assert.doesNotMatch(remoteDatabaseSettingsSource, /测试失败，仍然保存/)
  assert.doesNotMatch(remoteKodoSettingsSource, /测试失败，仍然保存/)
  assert.match(remoteProfileSaveButtonSource, /测试失败，仍然保存/)
  assert.match(remoteDatabaseSettingsSource, /tested=\{databaseDraftTested\}/)
  assert.match(remoteKodoSettingsSource, /tested=\{kodoDraftTested\}/)
  assert.match(remoteProfileSaveButtonSource, /disabled=\{!tested\}/)
  assert.match(hookSource, /useRemoteConnectionProfilesWorkspace/)
  assert.match(remoteProfilesHookSource, /databaseProfileMode/)
  assert.match(remoteProfilesHookSource, /kodoProfileMode/)
  assert.match(remoteProfileDetailsHookSource, /getProjectConnectionProfile/)
  assert.match(remoteWorkspaceModelSource, /getRemoteProfileDraftStatus/)
  assert.match(remoteProfilesHookSource, /createInitialDatabaseProfileDraft/)
  assert.match(remoteProfilesHookSource, /createInitialKodoProfileDraft/)
  assert.match(remoteDraftModelSource, /function createInitialDatabaseProfileDraft/)
  assert.match(remoteDraftModelSource, /function createInitialKodoProfileDraft/)
  assert.doesNotMatch(remoteProfilesHookSource, /const initialDatabaseProfileDraft/)
  assert.doesNotMatch(remoteProfilesHookSource, /const initialKodoProfileDraft/)
  assert.match(saveActionsSource, /createDatabaseProfileSaveInput/)
  assert.match(saveActionsSource, /createKodoProfileSaveInput/)
  assert.match(desktopProjectProfileApiSource, /getProjectConnectionProfile\(profileId: string\)/)
  assert.match(preloadSource, /getProjectConnectionProfile: \(profileId\) => invoke\('project-profile:get', profileId\)/)
  assert.match(projectIpcSource, /ipcMain\.handle\('project-profile:get'/)
  assert.match(projectIpcSource, /mergeProjectProfilePayload/)
  assert.match(profileMetadataSource, /shouldKeepDatabaseSchemaInitialization/)
  assert.match(remoteProfilesHookSource, /previousDatabaseProfileDraftRef/)
  assert.doesNotMatch(remoteProfilesHookSource, /schemaInitializedAt: shouldKeepDatabaseSchemaInitialization/)
  assert.doesNotMatch(remoteProfilesHookSource, /databaseDraftTestState !== 'untested'/)
  assert.doesNotMatch(remoteProfilesHookSource, /kodoDraftTestState !== 'untested'/)
  assert.doesNotMatch(remoteProfilesHookSource, /schemaInitializedAt: databaseVerification\?\.ok \? \(selectedDatabaseProfile\?\.schemaInitializedAt \?\? null\) : null/)
})

test('personal space settings hook delegates remote profile actions', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8')
  const remoteProfilesHookSource = readFileSync('src/components/PersonalSpaceWorkspace/useRemoteConnectionProfilesWorkspace.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileActions.ts', 'utf8')
  const actionSources = readSources([
    'src/components/PersonalSpaceWorkspace/projectRemoteProfileActions.ts',
    'src/components/PersonalSpaceWorkspace/projectRemoteProfileDeleteActions.ts',
    'src/components/PersonalSpaceWorkspace/projectRemoteProfileSaveActions.ts',
    'src/components/PersonalSpaceWorkspace/projectRemoteProfileVerificationActions.ts',
  ].filter((path) => existsSync(path)))

  assert.match(hookSource, /useRemoteConnectionProfilesWorkspace/)
  assert.match(remoteProfilesHookSource, /createProjectRemoteProfileActions/)
  assert.match(actionsSource, /export function createProjectRemoteProfileActions/)
  assert.match(actionSources, /saveDatabaseProfile/)
  assert.match(actionSources, /deleteDatabaseProfile/)
  assert.match(actionSources, /verifyDatabaseProfile/)
  assert.match(actionSources, /initializeDatabaseSchema/)
  assert.match(actionSources, /saveKodoProfile/)
  assert.match(actionSources, /deleteKodoProfile/)
  assert.match(actionSources, /verifyKodoProfile/)
  assert.doesNotMatch(remoteProfilesHookSource, /const refreshProjectConnectionProfiles = async/)
  assert.doesNotMatch(remoteProfilesHookSource, /const saveDatabaseProfile = async/)
  assert.doesNotMatch(remoteProfilesHookSource, /const deleteDatabaseProfile = async/)
  assert.doesNotMatch(remoteProfilesHookSource, /const saveKodoProfile = async/)
  assert.doesNotMatch(remoteProfilesHookSource, /const deleteKodoProfile = async/)
  assert.doesNotMatch(remoteProfilesHookSource, /const verifyDatabaseProfile = async/)
  assert.doesNotMatch(remoteProfilesHookSource, /const initializeDatabaseSchema = async/)
  assert.doesNotMatch(remoteProfilesHookSource, /const verifyKodoProfile = async/)
})

test('project remote profile actions delegate repeated action guards', () => {
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileActions.ts', 'utf8')
  const helperSource = readSources([
    'src/components/PersonalSpaceWorkspace/projectRemoteProfileDeleteActions.ts',
    'src/components/PersonalSpaceWorkspace/projectRemoteProfileSaveActions.ts',
    'src/components/PersonalSpaceWorkspace/projectRemoteProfileVerificationActions.ts',
  ].filter((path) => existsSync(path)))
  const guardPath = 'src/components/PersonalSpaceWorkspace/projectRemoteProfileActionGuards.ts'

  assert.ok(existsSync(guardPath), `${guardPath} should exist`)
  const guardSource = readFileSync(guardPath, 'utf8')

  assert.doesNotMatch(actionsSource, /from '\.\/projectRemoteProfileActionGuards'/)
  assert.match(helperSource, /from '\.\/projectRemoteProfileActionGuards'/)
  assert.match(helperSource, /getDesktopApiForRemoteProfileAction/)
  assert.doesNotMatch(actionsSource, /import \{ getDesktopApi \} from '\.\.\/\.\.\/desktopApi'/)
  assert.doesNotMatch(actionsSource, /errors\.length > 0/)
  assert.doesNotMatch(actionsSource, /if \(!desktopApi/)
  assert.match(guardSource, /export function getDesktopApiForRemoteProfileAction/)
  assert.match(guardSource, /getDesktopApi\(\)/)
  assert.match(guardSource, /validationErrors/)
  assert.match(guardSource, /draftTested/)
})

test('project remote profile actions delegate profile list refresh', () => {
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileActions.ts', 'utf8')
  const refreshPath = 'src/components/PersonalSpaceWorkspace/projectRemoteProfileRefreshActions.ts'

  assert.ok(existsSync(refreshPath), `${refreshPath} should exist`)
  const refreshSource = readFileSync(refreshPath, 'utf8')

  assert.match(actionsSource, /from '\.\/projectRemoteProfileRefreshActions'/)
  assert.match(actionsSource, /refreshProjectConnectionProfiles/)
  assert.doesNotMatch(actionsSource, /listProjectConnectionProfiles/)
  assert.match(refreshSource, /export async function refreshProjectConnectionProfiles/)
  assert.match(refreshSource, /listProjectConnectionProfiles\('database'\)/)
  assert.match(refreshSource, /listProjectConnectionProfiles\('qiniu_kodo'\)/)
})

test('project remote profile actions delegate delete workflows', () => {
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileActions.ts', 'utf8')
  const deletePath = 'src/components/PersonalSpaceWorkspace/projectRemoteProfileDeleteActions.ts'

  assert.ok(existsSync(deletePath), `${deletePath} should exist`)
  const deleteSource = readFileSync(deletePath, 'utf8')

  assert.match(actionsSource, /from '\.\/projectRemoteProfileDeleteActions'/)
  assert.match(actionsSource, /createProjectRemoteProfileDeleteActions/)
  assert.doesNotMatch(actionsSource, /deleteProjectConnectionProfile/)
  assert.doesNotMatch(actionsSource, /createInitialDatabaseProfileDraft/)
  assert.doesNotMatch(actionsSource, /createInitialKodoProfileDraft/)
  assert.match(deleteSource, /export function createProjectRemoteProfileDeleteActions/)
  assert.match(deleteSource, /deleteProjectConnectionProfile/)
  assert.match(deleteSource, /createInitialDatabaseProfileDraft/)
  assert.match(deleteSource, /createInitialKodoProfileDraft/)
})

test('project remote profile actions delegate save workflows', () => {
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileActions.ts', 'utf8')
  const savePath = 'src/components/PersonalSpaceWorkspace/projectRemoteProfileSaveActions.ts'
  const typesPath = 'src/components/PersonalSpaceWorkspace/projectRemoteProfileActionTypes.ts'

  assert.ok(existsSync(savePath), `${savePath} should exist`)
  assert.ok(existsSync(typesPath), `${typesPath} should exist`)
  const saveSource = readFileSync(savePath, 'utf8')
  const typesSource = readFileSync(typesPath, 'utf8')

  assert.match(actionsSource, /from '\.\/projectRemoteProfileSaveActions'/)
  assert.match(actionsSource, /createProjectRemoteProfileSaveActions/)
  assert.match(actionsSource, /\.\.\.saveActions/)
  assert.doesNotMatch(actionsSource, /saveProjectConnectionProfile/)
  assert.doesNotMatch(actionsSource, /createDatabaseProfileSaveInput/)
  assert.doesNotMatch(actionsSource, /createKodoProfileSaveInput/)
  assert.match(saveSource, /export function createProjectRemoteProfileSaveActions/)
  assert.match(saveSource, /saveProjectConnectionProfile/)
  assert.match(saveSource, /createDatabaseProfileSaveInput/)
  assert.match(saveSource, /createKodoProfileSaveInput/)
  assert.match(saveSource, /ProjectRemoteProfileActionsOptions/)
  assert.match(typesSource, /export interface ProjectRemoteProfileActionsOptions/)
})

test('project remote profile actions delegate verification workflows', () => {
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileActions.ts', 'utf8')
  const verificationPath = 'src/components/PersonalSpaceWorkspace/projectRemoteProfileVerificationActions.ts'

  assert.ok(existsSync(verificationPath), `${verificationPath} should exist`)
  const verificationSource = readFileSync(verificationPath, 'utf8')

  assert.match(actionsSource, /from '\.\/projectRemoteProfileVerificationActions'/)
  assert.match(actionsSource, /createProjectRemoteProfileVerificationActions/)
  assert.match(actionsSource, /\.\.\.verificationActions/)
  assert.doesNotMatch(actionsSource, /verifyProjectDatabaseProfileDraft/)
  assert.doesNotMatch(actionsSource, /initializeProjectDatabaseSchema/)
  assert.doesNotMatch(actionsSource, /verifyProjectKodoProfileDraft/)
  assert.match(verificationSource, /export function createProjectRemoteProfileVerificationActions/)
  assert.match(verificationSource, /verifyProjectDatabaseProfileDraft/)
  assert.match(verificationSource, /initializeProjectDatabaseSchema/)
  assert.match(verificationSource, /verifyProjectKodoProfileDraft/)
})

test('remote connection profiles hook delegates readiness and draft status derivation', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/useRemoteConnectionProfilesWorkspace.ts', 'utf8')
  const modelPath = 'src/components/PersonalSpaceWorkspace/projectRemoteProfileWorkspaceModel.ts'

  assert.ok(existsSync(modelPath), `${modelPath} should exist`)
  const modelSource = readFileSync(modelPath, 'utf8')

  assert.match(hookSource, /from '\.\/projectRemoteProfileWorkspaceModel'/)
  assert.match(hookSource, /getRemoteConnectionProfileWorkspaceStatus/)
  assert.doesNotMatch(hookSource, /const databaseReady = Boolean/)
  assert.doesNotMatch(hookSource, /const kodoReady = Boolean/)
  assert.doesNotMatch(hookSource, /const remoteReady =/)
  assert.doesNotMatch(hookSource, /getRemoteProfileDraftStatus/)
  assert.match(modelSource, /export function getRemoteConnectionProfileWorkspaceStatus/)
  assert.match(modelSource, /getRemoteProfileDraftStatus/)
  assert.doesNotMatch(modelSource, /use(State|Effect|Ref)/)
  assert.doesNotMatch(modelSource, /getDesktopApi/)
})

test('remote connection profiles hook delegates selected profile detail loading', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/useRemoteConnectionProfilesWorkspace.ts', 'utf8')
  const detailHookPath = 'src/components/PersonalSpaceWorkspace/useRemoteConnectionProfileDetails.ts'

  assert.ok(existsSync(detailHookPath), `${detailHookPath} should exist`)
  const detailHookSource = readFileSync(detailHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/useRemoteConnectionProfileDetails'/)
  assert.match(hookSource, /useRemoteConnectionProfileDetails\(/)
  assert.doesNotMatch(hookSource, /getProjectConnectionProfile/)
  assert.doesNotMatch(hookSource, /createEditableDatabaseProfileDraft/)
  assert.doesNotMatch(hookSource, /createEditableKodoProfileDraft/)
  assert.match(detailHookSource, /export function useRemoteConnectionProfileDetails/)
  assert.match(detailHookSource, /getProjectConnectionProfile/)
  assert.match(detailHookSource, /createEditableDatabaseProfileDraft/)
  assert.match(detailHookSource, /createEditableKodoProfileDraft/)
  assert.match(detailHookSource, /skipNextDatabaseProfileLoadRef/)
  assert.match(detailHookSource, /skipNextKodoProfileLoadRef/)
  assert.match(detailHookSource, /无法读取远程数据库配置详情/)
  assert.match(detailHookSource, /无法读取七牛 Kodo 配置详情/)
})

test('remote connection profiles hook delegates profile list bootstrap loading', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/useRemoteConnectionProfilesWorkspace.ts', 'utf8')
  const listHookPath = 'src/components/PersonalSpaceWorkspace/useRemoteConnectionProfileLists.ts'

  assert.ok(existsSync(listHookPath), `${listHookPath} should exist`)
  const listHookSource = readFileSync(listHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/useRemoteConnectionProfileLists'/)
  assert.match(hookSource, /useRemoteConnectionProfileLists\(/)
  assert.doesNotMatch(hookSource, /getDesktopApi/)
  assert.doesNotMatch(hookSource, /listProjectConnectionProfiles/)
  assert.match(listHookSource, /export function useRemoteConnectionProfileLists/)
  assert.match(listHookSource, /getDesktopApi/)
  assert.match(listHookSource, /listProjectConnectionProfiles\('database'\)/)
  assert.match(listHookSource, /listProjectConnectionProfiles\('qiniu_kodo'\)/)
  assert.match(listHookSource, /setSelectedDatabaseProfileId\(\(current\) => current \|\| nextDatabaseProfiles\[0\]\?\.id \|\| ''\)/)
  assert.match(listHookSource, /setSelectedKodoProfileId\(\(current\) => current \|\| nextKodoProfiles\[0\]\?\.id \|\| ''\)/)
})

test('personal space settings hook delegates remote connection profile lifecycle to a focused hook', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8')
  const connectionSource = readFileSync('src/components/PersonalSpaceWorkspace/useRemoteConnectionProfilesWorkspace.ts', 'utf8')
  const connectionModelSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteProfileWorkspaceModel.ts', 'utf8')

  assert.match(hookSource, /from '\.\/useRemoteConnectionProfilesWorkspace'/)
  assert.match(hookSource, /useRemoteConnectionProfilesWorkspace/)
  assert.match(hookSource, /loadPersistedPersonalSpaceDirectoryHandle/)
  assert.match(hookSource, /pickPersonalSpaceDirectory/)
  assert.match(hookSource, /setPersonalSpaceDirectoryHandle/)
  assert.doesNotMatch(hookSource, /createProjectRemoteProfileActions/)
  assert.doesNotMatch(hookSource, /getRemoteProfileDraftStatus/)
  assert.doesNotMatch(connectionSource, /loadPersistedPersonalSpaceDirectoryHandle/)
  assert.doesNotMatch(connectionSource, /pickPersonalSpaceDirectory/)
  assert.match(connectionSource, /createProjectRemoteProfileActions/)
  assert.match(connectionModelSource, /getRemoteProfileDraftStatus/)
})
