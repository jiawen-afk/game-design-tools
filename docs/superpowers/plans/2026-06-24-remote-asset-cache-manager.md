# Remote Asset Cache Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project asset manager that caches remote project assets in an internal local cache and routes preview, playback, export, upload, migration, and delete flows through it.

**Architecture:** Keep `ProjectObjectStorage` as transport-only. Add `ProjectAssetCacheStorage` for app-internal cache persistence and `ProjectAssetManager` for local/remote lifecycle decisions. Keep legacy resolver APIs while adding asset-ref based cache-aware APIs for gradual integration.

**Tech Stack:** TypeScript, React, Electron IPC/CommonJS modules, Node test runner via `tsx --test`, filesystem cache in Electron app data.

## Global Constraints

- Cache location is app internal cache directory.
- Freshness source is project database fingerprint fields only.
- Do not Kodo stat before preview/playback in the first version.
- Cleanup only hard delete asset/project cache cleanup in the first version.
- Central architecture is `ProjectAssetManager` wrapping object storage and cache storage.
- Follow existing `ProjectStorage` and `PersonalSpaceWorkspace` boundaries.
- Use tests before implementation changes.

---

### Task 1: Core Asset Manager And Memory Cache

**Files:**
- Create: `src/components/ProjectStorage/projectAssetCacheStorage.ts`
- Create: `src/components/ProjectStorage/projectAssetManager.ts`
- Create: `src/components/ProjectStorage/projectAssetManager.test.ts`
- Modify: `src/components/ProjectStorage/index.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ProjectAssetResourceRef`, `ProjectAssetManager`, `ProjectAssetCacheStorage`, `createProjectAssetFingerprint`, `createProjectAssetManager`, `createMemoryProjectAssetCacheStorage`.
- Consumes: `ProjectObjectStorage`, `ProjectMode`.

- [ ] **Step 1: Write failing tests**

Add tests for fingerprint selection, cache hit, miss download, stale replacement, stale download failure, upload caching, local bypass, delete cache, and concurrent remote download dedupe.

- [ ] **Step 2: Verify tests fail**

Run: `npx tsx --test src/components/ProjectStorage/projectAssetManager.test.ts`
Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement manager and memory cache**

Create the interfaces and minimal implementations needed by tests.

- [ ] **Step 4: Verify tests pass**

Run: `npx tsx --test src/components/ProjectStorage/projectAssetManager.test.ts`
Expected: PASS.

### Task 2: Electron Cache Persistence

**Files:**
- Create: `electron/projectAssetCacheStorage.cjs`
- Create: `src/components/ProjectStorage/projectAssetCacheStorage.test.ts`
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/desktopApi.ts`
- Modify: `src/components/ProjectStorage/projectAssetCacheStorage.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ProjectAssetResourceRef`, `ProjectAssetCacheStorage`.
- Produces: desktop cache IPC methods and filesystem-backed cache storage.

- [ ] **Step 1: Write failing filesystem cache tests**

Test metadata match, metadata mismatch, path traversal rejection, and project cache deletion.

- [ ] **Step 2: Verify tests fail**

Run: `npx tsx --test src/components/ProjectStorage/projectAssetCacheStorage.test.ts`
Expected: FAIL because Electron cache module does not exist.

- [ ] **Step 3: Implement filesystem cache and desktop bridge**

Add CommonJS storage module, IPC handlers, preload exposure, desktop API types, and renderer desktop cache wrapper.

- [ ] **Step 4: Verify tests pass**

Run: `npx tsx --test src/components/ProjectStorage/projectAssetCacheStorage.test.ts`
Expected: PASS.

### Task 3: Resolver And Read Path Integration

**Files:**
- Modify: `src/components/PersonalSpaceWorkspace/projectAssetResourceResolver.ts`
- Modify: `src/components/PersonalSpaceWorkspace/projectAssetResourceResolver.test.ts`
- Modify: `src/components/PersonalSpaceWorkspace/storyboardPlaybackSources.ts`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalAssetPreview.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.ts`

**Interfaces:**
- Consumes: `ProjectAssetManager`, `ProjectAssetResourceRef`.
- Produces: cache-aware resource resolution for preview, playback, and export.

- [ ] **Step 1: Write failing resolver tests**

Test that a resource ref uses manager, legacy object keys still work, and source resolution creates object URLs from manager blobs.

- [ ] **Step 2: Verify tests fail**

Run: `npx tsx --test src/components/PersonalSpaceWorkspace/projectAssetResourceResolver.test.ts`
Expected: FAIL for missing manager support.

- [ ] **Step 3: Implement resolver integration**

Add ref-aware read/source APIs and thread manager through playback/export/preview call signatures.

- [ ] **Step 4: Verify tests pass**

Run: `npx tsx --test src/components/PersonalSpaceWorkspace/projectAssetResourceResolver.test.ts`
Expected: PASS.

### Task 4: Workspace Composition, Upload, Migration, Delete

**Files:**
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts`
- Modify: `src/components/ProjectStorage/projectMigrationService.ts`
- Modify: `src/components/ProjectStorage/projectMigrationService.test.ts`
- Modify: `src/appStructure.test.ts`

**Interfaces:**
- Consumes: `ProjectAssetManager`.
- Produces: active project manager composition and lifecycle cleanup.

- [ ] **Step 1: Write failing migration/delete tests**

Test remote migration caches uploaded resources and project delete calls cache cleanup.

- [ ] **Step 2: Verify tests fail**

Run: `npx tsx --test src/components/ProjectStorage/projectMigrationService.test.ts`
Expected: FAIL for missing manager/cache integration.

- [ ] **Step 3: Implement service integration**

Add optional asset manager parameters to sync/migration/delete services and wire workspace composition to pass the manager.

- [ ] **Step 4: Verify tests pass**

Run: `npx tsx --test src/components/ProjectStorage/projectMigrationService.test.ts`
Expected: PASS.

### Task 5: List Rendering Guard And Full Verification

**Files:**
- Modify: `src/components/PersonalSpaceWorkspace/PersonalAssetPreview.tsx`
- Modify: `src/appStructure.test.ts`

**Interfaces:**
- Consumes: manager-integrated preview APIs.
- Produces: render-time behavior that avoids eager remote full asset download where possible.

- [ ] **Step 1: Add structure tests**

Assert remote read paths use `ProjectAssetManager` and `ProjectObjectStorage` remains transport-only.

- [ ] **Step 2: Run focused structure tests**

Run: `npx tsx --test src/appStructure.test.ts`
Expected: PASS after implementation.

- [ ] **Step 3: Run full verification**

Run:
```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: all tests and build pass, diff check clean.
