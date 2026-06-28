import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { packageJsonSource } from './appStructureTestHelpers.test'

test('personal space workspace delegates remote device binding resolution', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const infrastructureSource = readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8')
  const bindingSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteDeviceBinding.ts', 'utf8')
  const packageSource = packageJsonSource()

  assert.match(hookSource, /useProjectStorageInfrastructure/)
  assert.doesNotMatch(hookSource, /from '\.\/projectRemoteDeviceBinding'/)
  assert.doesNotMatch(hookSource, /createProjectRemoteDeviceBindingResolver/)
  assert.match(infrastructureSource, /from '\.\/projectRemoteDeviceBinding'/)
  assert.match(infrastructureSource, /createProjectRemoteDeviceBindingResolver/)
  assert.doesNotMatch(hookSource, /readProjectDeviceBinding/)
  assert.doesNotMatch(hookSource, /writeProjectDeviceBinding/)
  assert.doesNotMatch(hookSource, /function objectProjectNameFromPrefix/)
  assert.doesNotMatch(hookSource, /const objectProjectNameFromPrefix/)
  assert.match(bindingSource, /readProjectDeviceBinding/)
  assert.match(bindingSource, /writeProjectDeviceBinding/)
  assert.match(bindingSource, /objectProjectNameFromPrefix/)
  assert.match(packageSource, /projectRemoteDeviceBinding\.test\.ts/)
  assert.match(packageSource, /projectDeviceBindings\.test\.ts/)
})

test('remote project profile ids stay local and shared settings are not used as device bindings', () => {
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const infrastructureSource = readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8')
  const bindingSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteDeviceBinding.ts', 'utf8')

  assert.match(workspaceSource, /useProjectStorageInfrastructure/)
  assert.doesNotMatch(workspaceSource, /settingsWorkspaceRef\.current\.databaseProfiles/)
  assert.doesNotMatch(workspaceSource, /settingsWorkspaceRef\.current\.kodoProfiles/)
  assert.match(infrastructureSource, /getDatabaseProfileIds: \(\) => settingsWorkspaceRef\.current\.databaseProfiles\.map\(\(profile\) => profile\.id\)/)
  assert.match(infrastructureSource, /getStorageProfileIds: \(\) => settingsWorkspaceRef\.current\.kodoProfiles\.map\(\(profile\) => profile\.id\)/)
  assert.match(bindingSource, /function findAvailableProfileId\(profileId: string \| null, availableProfileIds: string\[\]\)/)
  assert.match(bindingSource, /availableProfileIds\.includes\(profileId\)/)
  assert.match(bindingSource, /const databaseProfileIdForProject = \(projectId: string\)/)
  assert.match(bindingSource, /const storageProfileIdForProject = \(projectId: string\)/)
  assert.match(bindingSource, /databaseProfileIdForProject\(projectId\)/)
  assert.match(bindingSource, /storageProfileIdForProject\(projectId\)/)
  assert.doesNotMatch(bindingSource, /remote_database_profile_id/)
  assert.doesNotMatch(bindingSource, /remote_storage_profile_id/)
  assert.doesNotMatch(workspaceSource, /findAvailableDatabaseProfileId\(settings\.remote_database_profile_id\)/)
  assert.doesNotMatch(workspaceSource, /findAvailableStorageProfileId\(settings\.remote_storage_profile_id\)/)
  assert.doesNotMatch(workspaceSource, /findAvailableDatabaseProfileId\(remoteProjectSettingsByIdRef\.current\[projectId\]\?\.remote_database_profile_id/)
  assert.doesNotMatch(workspaceSource, /findAvailableStorageProfileId\(remoteProjectSettingsByIdRef\.current\[projectId\]\?\.remote_storage_profile_id/)
  assert.doesNotMatch(workspaceSource, /remoteProjectSettingsByIdRef\.current\[projectId\]\?\.remote_database_profile_id \|\| settingsWorkspace\.selectedDatabaseProfileId/)
  assert.doesNotMatch(workspaceSource, /remoteProjectSettingsByIdRef\.current\[projectId\]\?\.remote_storage_profile_id : ''\) \|\|\s*settingsWorkspace\.selectedKodoProfileId/)
})

test('remote project current-device bindings stay local to each installation', () => {
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts', 'utf8')
  const infrastructureSource = readFileSync('src/components/PersonalSpaceWorkspace/useProjectStorageInfrastructure.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementActions.ts', 'utf8')
  const bindingsSource = readFileSync('src/components/ProjectStorage/projectDeviceBindings.ts', 'utf8')
  const resolverSource = readFileSync('src/components/PersonalSpaceWorkspace/projectRemoteDeviceBinding.ts', 'utf8')

  assert.match(bindingsSource, /project-space\.device-bindings\.v1/)
  assert.match(bindingsSource, /hydrateProjectDeviceBindingsFromLocalPersistence/)
  assert.match(bindingsSource, /writeProjectDeviceBindingToLocalPersistence/)
  assert.match(infrastructureSource, /remoteDeviceBindingResolver\.hydrateCurrentDeviceBindings\(\)/)
  assert.match(resolverSource, /readProjectDeviceBinding\(projectId, options\.storage\)/)
  assert.match(resolverSource, /writeProjectDeviceBindingToLocalPersistence/)
  assert.match(workspaceSource, /usePersonalSpaceWorkspaceActions/)
  assert.match(workspaceActionsHookSource, /createProjectManagementActions/)
  assert.match(actionsSource, /remoteDeviceBindingResolver\.bindProjectToCurrentDevice\(\s*projectId,\s*settingsWorkspace\.selectedDatabaseProfileId,\s*settingsWorkspace\.selectedKodoProfileId/s)
  assert.match(actionsSource, /remoteDeviceBindingResolver\.clearProjectFromCurrentDevice\(projectId\)/)
})

test('remote project connection rebinding and sync errors use current device context', () => {
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementActions.ts', 'utf8')
  const remoteSyncSource = readFileSync('src/components/PersonalSpaceWorkspace/useProjectRemoteSync.ts', 'utf8')

  assert.match(workspaceSource, /usePersonalSpaceWorkspaceActions/)
  assert.match(workspaceActionsHookSource, /createProjectManagementActions/)
  assert.match(actionsSource, /const updated = await options\.remoteRepository\.updateProject\(projectId, input\)/)
  assert.match(remoteSyncSource, /const errorMessage = formatRemoteProjectReadError\(error, project\)/)
  assert.match(remoteSyncSource, /messageApi\.warning\(`同步远程项目失败：\$\{errorMessage\}`\)/)
  assert.match(remoteSyncSource, /messageApi\.warning\(`同步项目空间失败：\$\{errorMessage\}`\)/)
  assert.doesNotMatch(remoteSyncSource, /messageApi\.warning\(`同步远程项目失败：\$\{String\(error\)\}`\)/)
  assert.doesNotMatch(remoteSyncSource, /messageApi\.warning\(`同步项目空间失败：\$\{error instanceof Error \? error\.message : String\(error\)\}`\)/)
})

test('personal space workspace delegates selected project remote profile binding', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const bindingSource = readFileSync('src/components/PersonalSpaceWorkspace/useSelectedProjectRemoteProfileBinding.ts', 'utf8')

  assert.match(hookSource, /from '\.\/useSelectedProjectRemoteProfileBinding'/)
  assert.match(hookSource, /useSelectedProjectRemoteProfileBinding/)
  assert.doesNotMatch(hookSource, /currentDeviceBindingForProject/)
  assert.doesNotMatch(hookSource, /setSelectedDatabaseProfileId/)
  assert.doesNotMatch(hookSource, /setSelectedKodoProfileId/)
  assert.match(bindingSource, /ensureRemoteProjectSettings/)
  assert.match(bindingSource, /currentDeviceBindingForProject/)
  assert.match(bindingSource, /setSelectedDatabaseProfileId/)
  assert.match(bindingSource, /setSelectedKodoProfileId/)
})
