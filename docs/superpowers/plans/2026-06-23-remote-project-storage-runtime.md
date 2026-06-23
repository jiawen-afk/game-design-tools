# Remote Project Storage Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder remote project storage behavior with real Qiniu Kodo verification and a concrete path toward remote database persistence and local-to-remote migration.

**Architecture:** Keep secrets and network clients in Electron main-process modules. Renderer code talks only through `desktopApi.ts` and project storage interfaces. Start with narrow, testable adapters that can be exercised with injected clients, then wire the UI and migration service onto those adapters.

**Tech Stack:** Electron main process, Node CommonJS modules, `node:test`, PostgreSQL via `pg`, MySQL via `mysql2/promise`, Qiniu Kodo via SDK-backed adapter with injectable client boundary.

## Global Constraints

- Local project metadata uses SQLite semantics; current in-memory repository remains only a temporary test/dev stand-in until real local SQLite is implemented.
- Remote project creation must verify remote DB, initialize remote schema, and verify remote object storage before project creation.
- Remote DB providers are PostgreSQL and MySQL.
- Remote object storage provider for first version is Qiniu Kodo.
- First migration direction is local to remote only.
- Projects, asset groups, assets, characters, storyboards, and project asset rows use hard delete.
- All IDs have no semantic prefix.
- Assets keep `primary_resource_id` and `sprite_index_resource_id`; there is no `asset_resources` table.
- Project object keys should use the project-name based shape `objects/{project_name}/{file_mime}/{resourceId}.{extension}` once the key builder is updated.
- Tags and association notes do not exist in project storage.

---

### Task 1: Real Qiniu Kodo Verification Boundary

**Files:**
- Create: `electron/projectKodoStorage.cjs`
- Create: `src/components/ProjectStorage/projectKodoStorage.test.ts`
- Modify: `electron/main.cjs`
- Modify: `package.json`
- Modify: `src/appStructure.test.ts`

**Interfaces:**
- Produces: `verifyKodoProfile(profile, options?): Promise<{ ok: boolean; message: string; lastVerifiedAt: string | null }>`
- Produces: `normalizeKodoPayload(profile): { accessKey: string; secretKey: string; bucket: string; region: string; domain: string }`
- Consumes: existing project connection profile shape with base64 JSON payload.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ProjectStorage/projectKodoStorage.test.ts` with tests that:

- decode and validate stored Kodo profile payloads;
- reject a blank project id/project name prefix;
- call an injected Kodo client to upload a small probe object under `objects/<project>/verification/`;
- read or stat the probe object;
- delete the probe object in both success and failure paths;
- return `ok: false` with `lastVerifiedAt: null` when any remote operation fails.

Run: `npm test -- src/components/ProjectStorage/projectKodoStorage.test.ts`

Expected: FAIL because `electron/projectKodoStorage.cjs` does not exist.

- [ ] **Step 2: Implement the testable Kodo helper**

Create `electron/projectKodoStorage.cjs` with a dependency-injected client factory. The default factory uses the Qiniu SDK, while tests pass a fake client:

```js
async function verifyKodoProfile(profile, options = {}) {
  const now = options.now || (() => new Date().toISOString())
  try {
    const payload = normalizeKodoPayload(profile)
    const projectName = normalizeProjectPrefix(options.projectName || options.projectId)
    const objectKey = `objects/${projectName}/verification/${options.probeId || 'kodo_probe'}.txt`
    const client = await (options.createClient || createQiniuKodoClient)(payload)
    const body = Buffer.from('game-design-tools-kodo-verification', 'utf8')
    await client.putObject(objectKey, body, 'text/plain')
    await client.statObject(objectKey)
    await client.deleteObject(objectKey)
    return { ok: true, message: '七牛 Kodo 对象存储验证成功。', lastVerifiedAt: now() }
  } catch (error) {
    return { ok: false, message: `七牛 Kodo 验证失败：${error instanceof Error ? error.message : String(error)}`, lastVerifiedAt: null }
  }
}
```

The real SDK-backed client must perform upload/stat/delete, not only local field checks.

- [ ] **Step 3: Wire IPC**

Modify `electron/main.cjs`:

- import `verifyKodoProfile`;
- replace the existing local-only `project-profile:verify-kodo` handler;
- pass `projectId` as the verification prefix until renderer passes project name;
- update profile `lastVerifiedAt` only when `result.ok` is true;
- remove the placeholder success message that says SDK integration will happen later.

- [ ] **Step 4: Add architecture guard**

Modify `src/appStructure.test.ts` to assert:

- `electron/main.cjs` imports `projectKodoStorage.cjs`;
- `electron/main.cjs` no longer contains `实际对象写入将在 Kodo SDK 接入后执行`;
- `electron/projectKodoStorage.cjs` contains `putObject`, `statObject`, and `deleteObject`.

- [ ] **Step 5: Verify**

Run:

```powershell
npm test -- src/components/ProjectStorage/projectKodoStorage.test.ts
npm test
node --check electron/projectKodoStorage.cjs
node --check electron/main.cjs
```

Expected: all commands pass.

### Task 2: Project Object Key Builder Uses Project Name Shape

**Files:**
- Modify: `src/components/ProjectStorage/projectObjectKeys.ts`
- Modify: `src/components/ProjectStorage/projectStorageModel.ts`
- Modify: `src/components/ProjectStorage/projectStorageModel.test.ts`
- Modify: migration/collection tests that assert object keys.

**Interfaces:**
- Produces: `buildProjectObjectKey({ projectName, fileMime, resourceId, extension })`.
- Keeps backward compatibility only where existing rows already contain object keys.

- [ ] **Step 1: Update tests to the user-approved key shape**

Expected key format:

```text
objects/{project_name}/{file_mime}/{resourceId}.{extension}
```

Use sanitized project name and sanitized MIME string. MIME slash can be normalized to `_` or split into stable path parts, but tests must document the exact rule.

- [ ] **Step 2: Update implementation and all call sites**

Use project name when creating new resource fields. Do not mutate existing stored keys during ordinary reads.

- [ ] **Step 3: Verify**

Run:

```powershell
npm test -- src/components/ProjectStorage/projectStorageModel.test.ts
npm test
```

### Task 3: Remote Repository Boundary

**Files:**
- Create: `electron/projectRemoteRepository.cjs`
- Create: `src/components/ProjectStorage/projectRemoteRepository.test.ts`
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/desktopApi.ts`
- Modify: `src/components/ProjectStorage/projectSqliteRepository.ts` only if shared repository types need expansion.

**Interfaces:**
- Produces IPC-backed operations for project rows: create/update/list/get/delete/import/export/listAssets.
- Uses `projectRemoteDatabase.cjs` connection helpers or equivalent shared connection configuration.

- [ ] **Step 1: Write tests with fake PostgreSQL/MySQL executors**

Tests verify generated SQL and parameter mapping for project/settings/assets rows without requiring a live DB.

- [ ] **Step 2: Implement repository module**

Implement remote CRUD as Electron main-process functions. Renderer must not import `pg` or `mysql2`.

- [ ] **Step 3: Wire renderer proxy**

Create a renderer repository proxy that implements the existing `ProjectRepository` interface by calling desktop APIs.

- [ ] **Step 4: Verify**

Run repository tests, `npm test`, `npm run build`, and `node --check` for touched Electron modules.

### Task 4: Real Local-to-Remote Migration

**Files:**
- Modify: `src/components/ProjectStorage/projectMigrationService.ts`
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts`
- Add/modify migration tests.

**Interfaces:**
- Consumes: local repository export rows.
- Consumes: remote repository import rows.
- Consumes: source object storage and remote Kodo object storage.

- [ ] **Step 1: Make migration tests prove remote writes**

Tests should fail if migration reads and writes the same memory object storage instance.

- [ ] **Step 2: Implement real object copy**

Read local objects and upload them through the remote object storage adapter. Import rows into the remote DB only after all required objects upload successfully.

- [ ] **Step 3: Verify local remains local on failure**

If any upload or remote import fails, the source project remains local and active.

### Task 5: Collection Path Targets Active Project Storage

**Files:**
- Modify: `voicePersonalSpaceCollector.ts`
- Modify: `useSpriteExport.ts`
- Modify: `useMattePipeline.ts`
- Modify: project collection service/tests.

**Interfaces:**
- Workspaces submit collection inputs to a project-aware service.
- Service writes metadata to active project repository and blobs to active project object storage.

- [ ] **Step 1: Add failing tests for remote active project collection**

Tests verify a voice/sprite/matte collection writes object data to remote storage and metadata to the remote repository when the active project is remote.

- [ ] **Step 2: Implement storage target resolution**

Use active project settings to choose local or remote adapters. Keep UI copy as “收藏到项目空间”.

- [ ] **Step 3: Verify**

Run project storage tests, voice collector tests, sprite tests, full test suite, and build.

### Task 6: Final Verification

Run:

```powershell
npm test
npm run build
node --check electron/main.cjs
node --check electron/projectRemoteDatabase.cjs
node --check electron/projectKodoStorage.cjs
git diff --check
git status --short --branch
```

Expected:

- all tests pass;
- build succeeds;
- Electron modules parse;
- diff check has no whitespace errors;
- git status contains only intentional project storage changes.

