import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space workspace delegates page state and resource workflow', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookPath = 'src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts'
  const workspaceActionsHookSource = existsSync(workspaceActionsHookPath) ? readFileSync(workspaceActionsHookPath, 'utf8') : ''
  const lifecycleSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceLifecycle.ts', 'utf8')
  const sessionActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceProjectSessionActions.ts', 'utf8')
  const activationActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceProjectActivationActions.ts', 'utf8')
  const assetActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetActions.ts', 'utf8')
  const modelSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const derivedSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceDerivedState.ts', 'utf8')

  assert.match(source, /from '\.\/usePersonalSpaceWorkspace'/)
  assert.match(source, /usePersonalSpaceWorkspace/)
  assert.doesNotMatch(source, /useState/)
  assert.doesNotMatch(source, /useEffect/)
  assert.doesNotMatch(source, /readPersonalSpaceState/)
  assert.doesNotMatch(source, /writePersonalSpaceState/)
  assert.doesNotMatch(source, /pickPersonalSpaceDirectory/)
  assert.doesNotMatch(source, /createCommonResourceAssetForUpload/)
  assert.doesNotMatch(source, /deleteAssetWithOptionalResources/)
  assert.match(hookSource, /useState/)
  assert.doesNotMatch(hookSource, /useEffect\(/)
  assert.match(hookSource, /usePersonalSpaceWorkspaceLifecycle/)
  assert.match(lifecycleSource, /useEffect/)
  assert.match(hookSource, /activeModule/)
  assert.match(hookSource, /setActiveModule/)
  assert.match(hookSource, /changeActiveModule/)
  assert.match(lifecycleSource, /directoryHandleChecked/)
  assert.match(lifecycleSource, /setActiveModule\('settings'\)/)
  assert.match(hookSource, /readPersonalSpaceState/)
  assert.match(hookSource, /writeProjectSpaceState/)
  assert.match(hookSource, /createPersonalSpaceProjectSessionActions/)
  assert.match(sessionActionsSource, /createPersonalSpaceProjectActivationActions/)
  assert.doesNotMatch(sessionActionsSource, /readProjectSpaceState/)
  assert.match(activationActionsSource, /readProjectSpaceState/)
  assert.match(sessionActionsSource, /readActiveProjectId/)
  assert.doesNotMatch(sessionActionsSource, /writeActiveProjectId/)
  assert.match(activationActionsSource, /writeActiveProjectId/)
  assert.match(hookSource, /usePersonalSpaceSettingsWorkspace/)
  assert.match(hookSource, /const projectStorage = useProjectStorageInfrastructure\(settingsWorkspace\)/)
  assert.match(hookSource, /usePersonalSpaceWorkspaceActions/)
  assert.match(hookSource, /projectStorage,\s*\n/)
  assert.doesNotMatch(hookSource, /projectStorage:\s*\{/)
  assert.match(workspaceActionsHookSource, /createPersonalSpaceAssetActions/)
  assert.match(assetActionsSource, /uploadCharacterPortrait/)
  assert.match(assetActionsSource, /uploadCommonResource/)
  assert.match(workspaceActionsHookSource, /assetActions/)
  assert.match(workspaceActionsHookSource, /createPersonalSpaceDerivedState/)
  assert.doesNotMatch(hookSource, /const resourceSections = \[/)
  assert.match(modelSource, /from '\.\/personalSpaceDerivedState'/)
  assert.match(derivedSource, /export function createPersonalSpaceDerivedState/)
  assert.match(derivedSource, /resourceSections/)
})

test('personal space workspace keeps action groups instead of flattening every action in the hook', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookPath = 'src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts'
  const workspaceActionsHookSource = existsSync(workspaceActionsHookPath) ? readFileSync(workspaceActionsHookPath, 'utf8') : ''

  assert.ok(existsSync(workspaceActionsHookPath), 'workspace actions hook should exist')
  assert.match(hookSource, /usePersonalSpaceWorkspaceActions/)
  assert.doesNotMatch(hookSource, /createProjectManagementActions/)
  assert.doesNotMatch(hookSource, /createPersonalSpaceEditActions/)
  assert.doesNotMatch(hookSource, /createPersonalSpaceAssetActions/)
  assert.match(workspaceActionsHookSource, /const projectManagementActions = createProjectManagementActions/)
  assert.match(workspaceActionsHookSource, /const editActions = createPersonalSpaceEditActions/)
  assert.match(workspaceActionsHookSource, /const assetActions = createPersonalSpaceAssetActions/)
  assert.match(workspaceActionsHookSource, /createCharacterInSpace: editActions\.createCharacter/)
  assert.match(workspaceActionsHookSource, /createStoryboardInSpace: editActions\.createStoryboard/)
  assert.match(hookSource, /\.\.\.projectManagementActions/)
  assert.match(hookSource, /\.\.\.editActions/)
  assert.match(hookSource, /\.\.\.assetActions/)
  assert.doesNotMatch(hookSource, /const \{\s*createLocalProject,/)
  assert.doesNotMatch(hookSource, /const \{\s*renameCharacter,/)
  assert.doesNotMatch(hookSource, /const \{\s*deleteAsset,/)
})

test('personal space workspace delegates active project resource derivation to a focused hook', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const projectResourcesPath = 'src/components/PersonalSpaceWorkspace/usePersonalSpaceProjectResources.ts'

  assert.ok(existsSync(projectResourcesPath), 'active project resource hook should exist')
  const projectResourcesSource = readFileSync(projectResourcesPath, 'utf8')

  assert.match(hookSource, /usePersonalSpaceProjectResources/)
  assert.doesNotMatch(hookSource, /const activeProject = projects\.find/)
  assert.doesNotMatch(hookSource, /projectStorageWorkflow\.objectStorageForProject\(activeProject\)/)
  assert.doesNotMatch(hookSource, /projectStorageWorkflow\.projectReadOptionsForProject/)
  assert.match(projectResourcesSource, /export function usePersonalSpaceProjectResources/)
  assert.match(projectResourcesSource, /const activeProject = projects\.find/)
  assert.match(projectResourcesSource, /projectStorageWorkflow\.objectStorageForProject\(activeProject\)/)
  assert.match(projectResourcesSource, /projectStorageWorkflow\.projectReadOptionsForProject\(activeProject\)/)
  assert.match(projectResourcesSource, /getProjectResourceReadOptions/)
  assert.match(projectResourcesSource, /refreshActiveProjectData/)
  assert.match(projectResourcesSource, /changeActiveModuleAndRefresh/)
})

test('personal space workspace delegates creation name drafts to a focused hook', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const workspaceActionsHookPath = 'src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspaceActions.ts'
  const workspaceActionsHookSource = existsSync(workspaceActionsHookPath) ? readFileSync(workspaceActionsHookPath, 'utf8') : ''
  const creationHookPath = 'src/components/PersonalSpaceWorkspace/usePersonalSpaceCreationDrafts.ts'

  assert.ok(existsSync(workspaceActionsHookPath), 'workspace actions hook should exist')
  assert.ok(existsSync(creationHookPath), 'creation draft hook should exist')
  const creationHookSource = readFileSync(creationHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/usePersonalSpaceWorkspaceActions'/)
  assert.match(workspaceActionsHookSource, /from '\.\/usePersonalSpaceCreationDrafts'/)
  assert.match(workspaceActionsHookSource, /usePersonalSpaceCreationDrafts\(/)
  assert.doesNotMatch(hookSource, /const \[newCharacterName, setNewCharacterName\] = useState\(''\)/)
  assert.doesNotMatch(hookSource, /const \[newStoryboardName, setNewStoryboardName\] = useState\(''\)/)
  assert.match(creationHookSource, /export function usePersonalSpaceCreationDrafts/)
  assert.match(creationHookSource, /createCharacterInSpace\(newCharacterName\)/)
  assert.match(creationHookSource, /setNewCharacterName\(''\)/)
  assert.match(creationHookSource, /createStoryboardInSpace\(newStoryboardName\)/)
  assert.match(creationHookSource, /setNewStoryboardName\(''\)/)
})

test('personal space workspace delegates empty project state construction', () => {
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const sessionActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceProjectSessionActions.ts', 'utf8')
  const activationActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceProjectActivationActions.ts', 'utf8')
  const projectStateSource = readFileSync('src/components/PersonalSpaceWorkspace/projectSpaceState.ts', 'utf8')
  const projectStateTestSource = readFileSync('src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts', 'utf8')

  assert.match(hookSource, /createPersonalSpaceProjectSessionActions/)
  assert.doesNotMatch(sessionActionsSource, /createEmptyProjectSpaceState/)
  assert.doesNotMatch(sessionActionsSource, /from '\.\/projectSpaceState'/)
  assert.match(activationActionsSource, /createEmptyProjectSpaceState/)
  assert.match(activationActionsSource, /from '\.\/projectSpaceState'/)
  assert.doesNotMatch(hookSource, /function createEmptyProjectSpaceState/)
  assert.doesNotMatch(hookSource, /defaultPersonalSpaceState/)
  assert.match(projectStateSource, /export function createEmptyProjectSpaceState/)
  assert.match(projectStateTestSource, /empty project space state clones defaults/)
})
