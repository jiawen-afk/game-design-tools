import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('project management actions delegate remote migration workflow to a focused action module', () => {
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementActions.ts', 'utf8')
  const migrationActionPath = 'src/components/PersonalSpaceWorkspace/projectManagementMigrationAction.ts'

  assert.ok(existsSync(migrationActionPath), 'project management migration action should exist')
  const migrationActionSource = readFileSync(migrationActionPath, 'utf8')

  assert.match(actionsSource, /from '\.\/projectManagementMigrationAction'/)
  assert.match(actionsSource, /createProjectManagementMigrationAction\(options\)/)
  assert.doesNotMatch(actionsSource, /migrateLocalProjectToRemote/)
  assert.doesNotMatch(actionsSource, /migrationInFlightProjectIdRef\.current = migrationProjectId/)
  assert.match(migrationActionSource, /export function createProjectManagementMigrationAction/)
  assert.match(migrationActionSource, /migrateLocalProjectToRemote/)
  assert.match(migrationActionSource, /writeProjectSpaceState/)
  assert.match(migrationActionSource, /remoteDeviceBindingResolver\.bindProjectToCurrentDevice/)
})

test('project workspace routes remote migration and hard delete through project storage services', () => {
  const panelSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx', 'utf8')
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementActions.ts', 'utf8')
  const migrationActionSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementMigrationAction.ts', 'utf8')
  const storageWorkflowSource = readFileSync('src/components/PersonalSpaceWorkspace/projectStorageWorkflow.ts', 'utf8')

  assert.match(panelSource, /onMigrateToRemote/)
  assert.match(workspaceSource, /usePersonalSpaceWorkspaceActions/)
  assert.match(workspaceActionsHookSource, /createProjectManagementActions/)
  assert.match(actionsSource, /createProjectManagementMigrationAction/)
  assert.match(migrationActionSource, /migrateLocalProjectToRemote/)
  assert.match(storageWorkflowSource, /syncProjectSpaceStateToLocalProjectStorage/)
  assert.match(actionsSource, /hardDeleteProjectWithObjects/)
  assert.match(actionsSource, /localRepository: projectToDelete\?\.mode === 'remote' \? options\.localRepository : undefined/)
  assert.match(actionsSource, /projectToDelete\?\.mode === 'remote' \? options\.remoteObjectStorage : options\.localObjectStorage/)
  assert.match(actionsSource, /refreshProjectList/)
  assert.match(actionsSource, /options\.storageWorkflow\.repositoryForProject/)
  assert.doesNotMatch(workspaceSource, /await projectRepository\.deleteProject\(projectId\)/)
})

test('project migration exposes an in-progress state and blocks repeated clicks', () => {
  const panelSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx', 'utf8')
  const tabsSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementTabs.tsx', 'utf8')
  const detailsCardSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectDetailsCard.tsx', 'utf8')
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const migrationActionSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementMigrationAction.ts', 'utf8')
  const managementSurfaceSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementSurface.tsx', 'utf8')

  assert.match(panelSource, /migratingProjectId: string/)
  assert.match(tabsSource, /selectedProjectMigrating/)
  assert.match(tabsSource, /migrating=\{selectedProjectMigrating\}/)
  assert.match(detailsCardSource, /loading=\{migrating\}/)
  assert.match(detailsCardSource, /disabled=\{[^}]*migrating/)
  assert.match(detailsCardSource, /migrating \? '迁移中' : '迁移到远程'/)
  assert.match(managementSurfaceSource, /migratingProjectId=\{workspace\.migratingProjectId\}/)
  assert.match(workspaceSource, /const \[migratingProjectId, setMigratingProjectId\] = useState\(''\)/)
  assert.match(workspaceSource, /const migrationInFlightProjectIdRef = useRef\(''\)/)
  assert.match(migrationActionSource, /if \(options\.migrationInFlightProjectIdRef\.current\)/)
  assert.match(migrationActionSource, /options\.setMigratingProjectId\(migrationProjectId\)/)
  assert.match(migrationActionSource, /finally \{\s*if \(options\.migrationInFlightProjectIdRef\.current === migrationProjectId\) \{\s*options\.migrationInFlightProjectIdRef\.current = ''\s*options\.setMigratingProjectId\(''\)/)
})

test('local to remote migration persists the remote project snapshot for restart', () => {
  const migrationServiceSource = readFileSync('src/components/ProjectStorage/projectMigrationService.ts', 'utf8')
  const migrationRowsTestSource = readFileSync('src/components/ProjectStorage/projectMigrationServiceMigrationRows.test.ts', 'utf8')
  const deleteTestSource = readFileSync('src/components/ProjectStorage/projectMigrationServiceDelete.test.ts', 'utf8')

  assert.match(migrationServiceSource, /const migratedRows: LegacyProjectRows/)
  assert.match(migrationServiceSource, /await input\.remoteRepository\.importProjectRows\(migratedRows\)/)
  assert.match(migrationServiceSource, /await input\.localRepository\.importProjectRows\(migratedRows\)/)
  assert.match(migrationServiceSource, /localRepository\?: ProjectRepository/)
  assert.match(migrationServiceSource, /await input\.localRepository\.deleteProject\(input\.projectId\)/)
  assert.match(migrationRowsTestSource, /persists remote mode back to the local project snapshot/)
  assert.match(deleteTestSource, /can also remove the migrated local snapshot/)
})

test('remote project creation persists a local connection snapshot for restart', () => {
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementActions.ts', 'utf8')
  const createActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/projectManagementCreateActions.ts', 'utf8')

  assert.match(workspaceSource, /usePersonalSpaceWorkspaceActions/)
  assert.match(workspaceActionsHookSource, /createProjectManagementActions/)
  assert.match(actionsSource, /createProjectManagementCreateActions/)
  assert.match(createActionsSource, /const created = await options\.remoteRepository\.createRemoteProject/)
  assert.match(createActionsSource, /await options\.localRepository\.createRemoteProject\(\{\s*id: created\.project\.id/)
  assert.match(createActionsSource, /databaseProfileId: settingsWorkspace\.selectedDatabaseProfileId/)
  assert.match(createActionsSource, /storageProfileId: settingsWorkspace\.selectedKodoProfileId/)
  assert.doesNotMatch(createActionsSource, /databaseProfileId: created\.settings\.remote_database_profile_id/)
  assert.doesNotMatch(createActionsSource, /storageProfileId: created\.settings\.remote_storage_profile_id/)
})
