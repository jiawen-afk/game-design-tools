# Project Space Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make project space open to the asset workbench by default, move project creation/switching/activation into a dedicated project management page, and make all workbench state target the enabled project.

**Architecture:** Add small project-storage model helpers for active project persistence and remote project creation, then add a project-scoped personal-space state store. Keep `PersonalSpaceWorkspace/index.tsx` as composition only: it switches between the workbench and the new project management page, while `usePersonalSpaceWorkspace.ts` owns state, activation, creation, migration, and persistence workflows.

**Tech Stack:** React 19, TypeScript, Ant Design 6, Node `tsx --test`, existing in-memory project repository boundary.

## Global Constraints

- Project space workbench modules are `角色`, `剧情编排`, `素材`, and `设置`.
- Project management is opened by a `切换项目空间` button, not by the first workbench tab.
- A project tab click only views or edits that project.
- A project card `启用` switch is the only action that changes the storage target.
- Active project id is persisted locally.
- If there is no persisted active project and exactly one project exists, that project is enabled automatically.
- Existing personal-space data migrates only into the default project.
- New projects start empty.
- Remote project creation is blocked until remote DB verification, DB schema initialization, and Qiniu Kodo verification all succeed.
- First version only supports local-to-remote migration.
- Keep repository and object-storage implementation details out of workspace entry components.
- Follow existing product UI: restrained colors, standard Ant Design controls, compact task-first layout.

---

### Task 1: Active Project And Remote Project Repository Boundary

**Files:**
- Create: `src/components/ProjectStorage/projectActiveProject.test.ts`
- Create: `src/components/ProjectStorage/projectActiveProject.ts`
- Modify: `src/components/ProjectStorage/projectSqliteRepository.ts`
- Modify: `src/components/ProjectStorage/projectSqliteRepository.test.ts`
- Modify: `src/components/ProjectStorage/index.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `activeProjectStorageKey: string`
- Produces: `readActiveProjectId(storage?: Storage): string`
- Produces: `writeActiveProjectId(projectId: string, storage?: Storage): void`
- Produces: `clearActiveProjectId(storage?: Storage): void`
- Produces: `resolveEnabledProjectId(projects: Project[], persistedProjectId: string): string`
- Produces: `CreateRemoteProjectInput` and `ProjectRepository.createRemoteProject(input)`

- [ ] **Step 1: Write failing active-project model tests**

Add `src/components/ProjectStorage/projectActiveProject.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  activeProjectStorageKey,
  clearActiveProjectId,
  readActiveProjectId,
  resolveEnabledProjectId,
  writeActiveProjectId,
} from './projectActiveProject'
import type { Project } from './projectStorageTypes'

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

const project = (id: string): Project => ({
  id,
  name: id,
  description: '',
  mode: 'local',
  status: 'active',
  object_key_prefix: `objects/${id}`,
  created_at: '2026-06-23T00:00:00.000Z',
  updated_at: '2026-06-23T00:00:00.000Z',
  metadata_json: null,
})

test('active project id persists locally and can be cleared', () => {
  const storage = createMemoryStorage()

  writeActiveProjectId('p1', storage)
  assert.equal(storage.getItem(activeProjectStorageKey), 'p1')
  assert.equal(readActiveProjectId(storage), 'p1')

  clearActiveProjectId(storage)
  assert.equal(readActiveProjectId(storage), '')
})

test('enabled project resolution prefers persisted id and auto-enables only single project fallback', () => {
  assert.equal(resolveEnabledProjectId([project('p1')], ''), 'p1')
  assert.equal(resolveEnabledProjectId([project('p1'), project('p2')], ''), '')
  assert.equal(resolveEnabledProjectId([project('p1'), project('p2')], 'p2'), 'p2')
  assert.equal(resolveEnabledProjectId([project('p1'), project('p2')], 'missing'), '')
})
```

- [ ] **Step 2: Run active-project test to verify it fails**

Run: `npx tsx --test src/components/ProjectStorage/projectActiveProject.test.ts`

Expected: FAIL because `projectActiveProject.ts` does not exist.

- [ ] **Step 3: Implement active-project model**

Create `src/components/ProjectStorage/projectActiveProject.ts`:

```ts
import type { Project } from './projectStorageTypes'

export const activeProjectStorageKey = 'game-design-tools.project-space.active-project.v1'

export function readActiveProjectId(storage: Storage = localStorage) {
  return storage.getItem(activeProjectStorageKey)?.trim() ?? ''
}

export function writeActiveProjectId(projectId: string, storage: Storage = localStorage) {
  const normalized = projectId.trim()
  if (!normalized) {
    clearActiveProjectId(storage)
    return
  }
  storage.setItem(activeProjectStorageKey, normalized)
}

export function clearActiveProjectId(storage: Storage = localStorage) {
  storage.removeItem(activeProjectStorageKey)
}

export function resolveEnabledProjectId(projects: Project[], persistedProjectId: string) {
  if (persistedProjectId && projects.some((project) => project.id === persistedProjectId)) return persistedProjectId
  return projects.length === 1 ? projects[0]!.id : ''
}
```

- [ ] **Step 4: Add remote project repository tests**

Append to `src/components/ProjectStorage/projectSqliteRepository.test.ts`:

```ts
test('local project repository creates remote projects only with remote settings', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createRemoteProject({
    id: 'remote-p1',
    name: '远程项目',
    description: '团队资产',
    databaseProvider: 'mysql',
    databaseProfileId: 'db1',
    storageProfileId: 'kodo1',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(created.project.id, 'remote-p1')
  assert.equal(created.project.mode, 'remote')
  assert.equal(created.project.object_key_prefix, 'objects/remote-p1')
  assert.equal(created.settings.storage_provider, 'qiniu_kodo')
  assert.equal(created.settings.database_provider, 'mysql')
  assert.equal(created.settings.local_object_root, null)
  assert.equal(created.settings.remote_database_profile_id, 'db1')
  assert.equal(created.settings.remote_storage_profile_id, 'kodo1')
})
```

- [ ] **Step 5: Run repository test to verify remote creation fails**

Run: `npx tsx --test src/components/ProjectStorage/projectSqliteRepository.test.ts`

Expected: FAIL because `createRemoteProject` is not defined.

- [ ] **Step 6: Implement `createRemoteProject`**

Modify `src/components/ProjectStorage/projectSqliteRepository.ts`:

```ts
export interface CreateRemoteProjectInput {
  id?: string
  name: string
  description: string
  databaseProvider: Extract<ProjectDatabaseProvider, 'postgresql' | 'mysql'>
  databaseProfileId: string
  storageProfileId: string
  now: string
}

export interface ProjectRepository {
  initializeSchema(): Promise<void>
  createProject(input: CreateLocalProjectInput): Promise<ProjectWithSettings>
  createRemoteProject(input: CreateRemoteProjectInput): Promise<ProjectWithSettings>
  updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectWithSettings | null>
  listProjects(): Promise<Project[]>
  getProject(projectId: string): Promise<ProjectWithSettings | null>
  importProjectRows(rows: LegacyProjectRows): Promise<void>
  exportProjectRows(projectId: string): Promise<LegacyProjectRows | null>
  listAssets(projectId: string): Promise<Asset[]>
  deleteProject(projectId: string): Promise<void>
}
```

Add the method to `MemoryProjectRepository` using `input.id ?? createProjectId()`, `mode: 'remote'`, `storage_provider: 'qiniu_kodo'`, `database_provider: input.databaseProvider`, `local_object_root: null`, `remote_database_profile_id: input.databaseProfileId`, and `remote_storage_profile_id: input.storageProfileId`.

- [ ] **Step 7: Export active project helpers and add package test**

Modify `src/components/ProjectStorage/index.ts`:

```ts
export * from './projectActiveProject'
```

Modify `package.json` test script to include:

```text
src/components/ProjectStorage/projectActiveProject.test.ts
```

- [ ] **Step 8: Run Task 1 tests**

Run: `npx tsx --test src/components/ProjectStorage/projectActiveProject.test.ts src/components/ProjectStorage/projectSqliteRepository.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

```powershell
git add package.json src/components/ProjectStorage/projectActiveProject.test.ts src/components/ProjectStorage/projectActiveProject.ts src/components/ProjectStorage/projectSqliteRepository.test.ts src/components/ProjectStorage/projectSqliteRepository.ts src/components/ProjectStorage/index.ts
git commit -m "feat: add active project storage boundary"
```

### Task 2: Project-Scoped Workbench State Store

**Files:**
- Create: `src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts`
- Create: `src/components/PersonalSpaceWorkspace/projectSpaceState.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceModel.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `PersonalSpaceState`, `clonePersonalSpaceState`, `defaultPersonalSpaceState`
- Produces: `projectSpaceStatesStorageKey: string`
- Produces: `readProjectSpaceState(projectId: string, options?: ProjectSpaceStateReadOptions): PersonalSpaceState`
- Produces: `writeProjectSpaceState(projectId: string, state: PersonalSpaceState, storage?: Storage): void`
- Produces: `hasProjectSpaceState(projectId: string, storage?: Storage): boolean`

- [ ] **Step 1: Write failing project-state tests**

Add `src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { createPersonalSpaceAsset, defaultPersonalSpaceState } from './personalSpaceModel'
import {
  hasProjectSpaceState,
  projectSpaceStatesStorageKey,
  readProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

test('project space state stores independent workbench data per project', () => {
  const storage = createMemoryStorage()
  const p1Asset = createPersonalSpaceAsset({ kind: 'voice', name: 'p1.wav' })
  const p2Asset = createPersonalSpaceAsset({ kind: 'voice', name: 'p2.wav' })

  writeProjectSpaceState('p1', { ...defaultPersonalSpaceState, assets: [p1Asset] }, storage)
  writeProjectSpaceState('p2', { ...defaultPersonalSpaceState, assets: [p2Asset] }, storage)

  assert.equal(JSON.parse(storage.getItem(projectSpaceStatesStorageKey)!).p1.assets.length, 1)
  assert.deepEqual(readProjectSpaceState('p1', { storage }).assets.map((asset) => asset.name), ['p1.wav'])
  assert.deepEqual(readProjectSpaceState('p2', { storage }).assets.map((asset) => asset.name), ['p2.wav'])
})

test('project space state uses fallback only for the first read of an unstored project', () => {
  const storage = createMemoryStorage()
  const fallbackAsset = createPersonalSpaceAsset({ kind: 'voice', name: 'legacy.wav' })

  assert.equal(hasProjectSpaceState('p1', storage), false)
  assert.deepEqual(
    readProjectSpaceState('p1', {
      storage,
      fallbackState: { ...defaultPersonalSpaceState, assets: [fallbackAsset] },
    }).assets.map((asset) => asset.name),
    ['legacy.wav'],
  )

  writeProjectSpaceState('p1', defaultPersonalSpaceState, storage)
  assert.equal(hasProjectSpaceState('p1', storage), true)
  assert.deepEqual(
    readProjectSpaceState('p1', {
      storage,
      fallbackState: { ...defaultPersonalSpaceState, assets: [fallbackAsset] },
    }).assets,
    [],
  )
})
```

- [ ] **Step 2: Run project-state test to verify it fails**

Run: `npx tsx --test src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts`

Expected: FAIL because `projectSpaceState.ts` does not exist.

- [ ] **Step 3: Implement project-state store**

Create `src/components/PersonalSpaceWorkspace/projectSpaceState.ts`:

```ts
import type { PersonalSpaceState } from './personalSpaceModel'
import { clonePersonalSpaceState, defaultPersonalSpaceState } from './personalSpaceState'

export const projectSpaceStatesStorageKey = 'game-design-tools.project-space.states.v1'

export interface ProjectSpaceStateReadOptions {
  storage?: Storage
  fallbackState?: PersonalSpaceState
}

type StoredProjectStates = Record<string, PersonalSpaceState>

function readStoredProjectStates(storage: Storage): StoredProjectStates {
  try {
    const raw = storage.getItem(projectSpaceStatesStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStoredProjectStates(states: StoredProjectStates, storage: Storage) {
  storage.setItem(projectSpaceStatesStorageKey, JSON.stringify(states))
}

export function hasProjectSpaceState(projectId: string, storage: Storage = localStorage) {
  return Boolean(projectId && readStoredProjectStates(storage)[projectId])
}

export function readProjectSpaceState(projectId: string, options: ProjectSpaceStateReadOptions = {}) {
  const storage = options.storage ?? localStorage
  const stored = projectId ? readStoredProjectStates(storage)[projectId] : null
  if (stored) return clonePersonalSpaceState(stored)
  return clonePersonalSpaceState(options.fallbackState ?? defaultPersonalSpaceState)
}

export function writeProjectSpaceState(projectId: string, state: PersonalSpaceState, storage: Storage = localStorage) {
  if (!projectId) return
  const states = readStoredProjectStates(storage)
  states[projectId] = clonePersonalSpaceState(state)
  writeStoredProjectStates(states, storage)
}
```

- [ ] **Step 4: Export project-state helpers**

Modify `src/components/PersonalSpaceWorkspace/personalSpaceModel.ts`:

```ts
export {
  hasProjectSpaceState,
  projectSpaceStatesStorageKey,
  readProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'
```

- [ ] **Step 5: Add package test and run Task 2 tests**

Modify `package.json` test script to include:

```text
src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts
```

Run: `npx tsx --test src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add package.json src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts src/components/PersonalSpaceWorkspace/projectSpaceState.ts src/components/PersonalSpaceWorkspace/personalSpaceModel.ts
git commit -m "feat: add project scoped workspace state"
```

### Task 3: Project Management Workflows In Hook

**Files:**
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts`
- Modify: `src/components/ProjectStorage/projectWorkspaceBootstrap.test.ts`
- Modify: `src/components/ProjectStorage/projectWorkspaceBootstrap.ts`

**Interfaces:**
- Consumes: Task 1 active project helpers and Task 2 project state store
- Produces from hook: `workspacePage`, `openProjectManagement`, `closeProjectManagement`
- Produces from hook: `enabledProjectId`, `enableProject`, `disableActiveProject`
- Produces from hook: `createRemoteProject`
- Produces from hook: `selectedManagementProjectId`, `setSelectedManagementProjectId`

- [ ] **Step 1: Add bootstrap behavior test**

Append to `src/components/ProjectStorage/projectWorkspaceBootstrap.test.ts`:

```ts
test('project workspace bootstrap returns existing projects without creating another default', async () => {
  const repository = createMemoryProjectRepository()
  await repository.createProject({
    name: '已有项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-23T00:00:00.000Z',
  })
  const bootstrapper = createProjectWorkspaceBootstrapper(repository, () => '2026-06-24T00:00:00.000Z')

  const projects = await bootstrapper.listProjects('D:\\GameAssets')

  assert.deepEqual(projects.map((project) => project.name), ['已有项目'])
})
```

- [ ] **Step 2: Run bootstrap tests**

Run: `npx tsx --test src/components/ProjectStorage/projectWorkspaceBootstrap.test.ts`

Expected: PASS. This guards current behavior before hook work.

- [ ] **Step 3: Update hook imports and state**

Modify `src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts` to import:

```ts
  clearActiveProjectId,
  createProjectId,
  readActiveProjectId,
  resolveEnabledProjectId,
  writeActiveProjectId,
```

from `../ProjectStorage`, and:

```ts
  hasProjectSpaceState,
  readProjectSpaceState,
  writeProjectSpaceState,
```

from `./projectSpaceState`.

Add state:

```ts
type ProjectSpacePage = 'workbench' | 'management'
const [workspacePage, setWorkspacePage] = useState<ProjectSpacePage>('workbench')
const [selectedManagementProjectId, setSelectedManagementProjectId] = useState('')
const spaceRef = useRef(space)
const activeProjectIdRef = useRef('')
```

Keep refs current after `space` or `activeProjectId` changes.

- [ ] **Step 4: Replace project initialization with persisted enabled project resolution**

Inside `initializeProjects`, after listing projects, call:

```ts
const enabledProjectId = resolveEnabledProjectId(nextProjects, readActiveProjectId())
setProjects(nextProjects)
setActiveProjectId(enabledProjectId)
setSelectedManagementProjectId(enabledProjectId || nextProjects[0]?.id || '')
activeProjectIdRef.current = enabledProjectId
if (enabledProjectId) {
  if (!hasProjectSpaceState(enabledProjectId)) {
    writeProjectSpaceState(enabledProjectId, readPersonalSpaceState())
  }
  setSpace(readProjectSpaceState(enabledProjectId))
  writeActiveProjectId(enabledProjectId)
}
```

This migrates legacy personal-space state only into the default enabled project on first use.

- [ ] **Step 5: Persist current project state on workbench changes**

Replace the old `writePersonalSpaceState(space)` effect with:

```ts
useEffect(() => {
  spaceRef.current = space
  if (activeProjectIdRef.current) {
    writeProjectSpaceState(activeProjectIdRef.current, space)
  }
}, [space])
```

- [ ] **Step 6: Implement explicit enable and disable actions**

Add:

```ts
const enableProject = (projectId: string) => {
  if (activeProjectIdRef.current) writeProjectSpaceState(activeProjectIdRef.current, spaceRef.current)
  const nextSpace = readProjectSpaceState(projectId)
  activeProjectIdRef.current = projectId
  setActiveProjectId(projectId)
  setSpace(nextSpace)
  writeActiveProjectId(projectId)
  void messageApi.success('已启用项目')
}

const disableActiveProject = () => {
  if (activeProjectIdRef.current) writeProjectSpaceState(activeProjectIdRef.current, spaceRef.current)
  activeProjectIdRef.current = ''
  setActiveProjectId('')
  setSpace(defaultPersonalSpaceState)
  clearActiveProjectId()
  void messageApi.warning('已取消启用项目')
}
```

- [ ] **Step 7: Update create, delete, migrate, and navigation workflows**

Use these rules:

- `createLocalProject`: create empty local project, refresh list, auto-enable only when it becomes the only project, select its management tab.
- `createRemoteProject`: require `settingsWorkspace.remoteReady`, `selectedDatabaseProfileId`, and `selectedKodoProfileId`; call `remoteProjectRepository.createRemoteProject`; write empty project state; refresh list; auto-enable only when it becomes the only project.
- `deleteProject`: after hard delete, if deleted project was enabled, clear persisted active id and select fallback using `resolveEnabledProjectId`.
- `migrateActiveProjectToRemote`: after success, keep the same enabled id and reload project list.
- `openProjectManagement`: set `workspacePage` to `management` and select enabled project or first project.
- `closeProjectManagement`: set `workspacePage` to `workbench`.

- [ ] **Step 8: Return new hook fields**

Return:

```ts
workspacePage,
openProjectManagement,
closeProjectManagement,
enabledProjectId: activeProjectId,
enableProject,
disableActiveProject,
selectedManagementProjectId,
setSelectedManagementProjectId,
createRemoteProject,
```

Keep `activeProject` as the enabled project.

- [ ] **Step 9: Run focused TypeScript-facing tests**

Run: `npx tsx --test src/components/ProjectStorage/projectWorkspaceBootstrap.test.ts src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit Task 3**

```powershell
git add src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts src/components/ProjectStorage/projectWorkspaceBootstrap.test.ts src/components/ProjectStorage/projectWorkspaceBootstrap.ts
git commit -m "feat: add project activation workflow"
```

### Task 4: Project Management Page UI

**Files:**
- Create: `src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/index.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpace.css`
- Modify: `src/appStructure.test.ts`

**Interfaces:**
- Consumes hook fields from Task 3
- Produces project management page with leading `+` tab, project cards, enable switch, local migration action, and remote creation gating

- [ ] **Step 1: Write failing structure tests**

Update `src/appStructure.test.ts`:

```ts
test('project space workbench shows current project control and opens separate management page', () => {
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const managementSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx', 'utf8')

  assert.match(workspaceSource, /workspace\.workspacePage === 'management'/)
  assert.match(workspaceSource, /切换项目空间/)
  assert.match(workspaceSource, /当前项目/)
  assert.doesNotMatch(workspaceSource, /className="project-selector"/)
  assert.match(managementSource, /items=\{projectTabItems\}/)
  assert.match(managementSource, /key: 'create'/)
  assert.match(managementSource, /启用/)
  assert.match(managementSource, /迁移到远程/)
})
```

Update the existing `app shell exposes project space instead of personal space copy` test so it no longer expects `projectSelector` in `index.tsx`, and expects `ProjectManagementPanel`.

- [ ] **Step 2: Run structure test to verify it fails**

Run: `npx tsx --test src/appStructure.test.ts`

Expected: FAIL because `ProjectManagementPanel.tsx` does not exist and the workbench still has a selector.

- [ ] **Step 3: Create `ProjectManagementPanel.tsx`**

Implement a component with:

- `Tabs` where first item has `key: 'create'` and `label: <PlusOutlined />`.
- Create tab fields: name, description, segmented mode `local | remote`.
- Local create button calls `onCreateLocalProject`.
- Remote create area reuses the existing DB and Kodo profile controls and disables `创建远程项目` unless `remoteReady`.
- Project tabs render a card for selected project with editable name/description, mode tags, `Switch` for enabled state, delete popconfirm, and local-only migrate button.

Use Ant Design components already used in the workspace: `Alert`, `Button`, `Input`, `InputNumber`, `Popconfirm`, `Segmented`, `Select`, `Space`, `Switch`, `Tabs`, `Tag`.

- [ ] **Step 4: Simplify `PersonalSettingsPanel.tsx`**

Remove project create/edit/delete and remote DB/Kodo sections from `PersonalSettingsPanel`. Keep only:

- Resource storage directory.
- Delete resources with content checkbox.
- Save settings button.
- Directory authorization alert.

Props should be limited to storage directory and directory settings callbacks.

- [ ] **Step 5: Update `index.tsx` composition**

Import `Button` and `ProjectManagementPanel`.

If `workspace.workspacePage === 'management'`, render:

```tsx
<ProjectManagementPanel
  projects={workspace.projects}
  enabledProjectId={workspace.enabledProjectId}
  selectedProjectId={workspace.selectedManagementProjectId}
  activeProject={workspace.activeProject}
  remoteReady={workspace.remoteReady}
  databaseProfiles={workspace.databaseProfiles}
  kodoProfiles={workspace.kodoProfiles}
  selectedDatabaseProfileId={workspace.selectedDatabaseProfileId}
  selectedKodoProfileId={workspace.selectedKodoProfileId}
  databaseProfileDraft={workspace.databaseProfileDraft}
  kodoProfileDraft={workspace.kodoProfileDraft}
  databaseVerification={workspace.databaseVerification}
  kodoVerification={workspace.kodoVerification}
  onSelectedProjectChange={workspace.setSelectedManagementProjectId}
  onCreateLocalProject={workspace.createLocalProject}
  onCreateRemoteProject={workspace.createRemoteProject}
  onRenameProject={workspace.renameProject}
  onDeleteProject={workspace.deleteProject}
  onEnableProject={workspace.enableProject}
  onDisableProject={workspace.disableActiveProject}
  onMigrateToRemote={() => void workspace.migrateActiveProjectToRemote()}
  onSelectedDatabaseProfileChange={workspace.setSelectedDatabaseProfileId}
  onSelectedKodoProfileChange={workspace.setSelectedKodoProfileId}
  onDatabaseProfileDraftChange={workspace.setDatabaseProfileDraft}
  onKodoProfileDraftChange={workspace.setKodoProfileDraft}
  onSaveDatabaseProfile={() => void workspace.saveDatabaseProfile()}
  onSaveKodoProfile={() => void workspace.saveKodoProfile()}
  onVerifyDatabaseProfile={() => void workspace.verifyDatabaseProfile()}
  onInitializeDatabaseSchema={() => void workspace.initializeDatabaseSchema()}
  onVerifyKodoProfile={(projectId) => void workspace.verifyKodoProfile(projectId)}
  onBack={workspace.closeProjectManagement}
/>
```

Otherwise render the workbench with:

- Existing `角色`, `剧情编排`, `素材`, `设置` tabs.
- Header status area showing `当前项目`, project name, mode tag, directory tag, and `切换项目空间`.
- Data tabs disabled when there is no enabled project or no authorized directory.

- [ ] **Step 6: Add CSS for management page**

Add restrained product UI classes:

- `.project-management-page`
- `.project-management-head`
- `.project-management-tabs`
- `.project-card`
- `.project-card-head`
- `.project-create-grid`
- `.project-current-control`

Use existing borders, `var(--radius-panel)`, `var(--radius-control)`, and `var(--color-line)`.

- [ ] **Step 7: Run structure test**

Run: `npx tsx --test src/appStructure.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit Task 4**

```powershell
git add src/appStructure.test.ts src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx src/components/PersonalSpaceWorkspace/index.tsx src/components/PersonalSpaceWorkspace/personalSpace.css
git commit -m "feat: add project management page"
```

### Task 5: Final Verification And PR Update

**Files:**
- No production files expected unless final verification reveals a specific issue.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: build exits 0.

- [ ] **Step 3: Run whitespace check**

Run: `git diff --check`

Expected: no whitespace errors. CRLF warnings are acceptable.

- [ ] **Step 4: Inspect final status**

Run: `git status --short --branch`

Expected: only the two intentional untracked reference docs remain:

```text
?? docs/current-version-reference.md
?? docs/superpowers/plans/2026-06-23-project-storage-architecture.md
```

- [ ] **Step 5: Push branch**

Run: `git push`

Expected: `codex/project-storage-architecture` updates the existing PR branch.
