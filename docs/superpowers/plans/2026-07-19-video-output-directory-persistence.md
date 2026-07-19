# Video Output Directory Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the video workspace's last selected OGV output directory across complete desktop-app restarts while preserving the native-dialog output-path authorization boundary.

**Architecture:** Add a focused Electron preference/session module that atomically stores one device-local directory, validates it on restore, and owns the session allow-list. Wire the session through video IPC, then expose a typed getter and hydrate the existing renderer queue hook.

**Tech Stack:** Electron IPC, Node.js CommonJS filesystem APIs, TypeScript, React hooks, Node test runner, `tsx --test`.

## Global Constraints

- Develop directly on `master`; do not create a branch or worktree.
- Persist only one video-workspace output directory below Electron `userData`.
- Do not use renderer `localStorage` or project configuration.
- Do not expose an IPC that authorizes an arbitrary renderer-provided path.
- Invalid saved paths restore as `null`; existing-but-unwritable paths remain covered by job preflight checks.
- Canceling the directory picker must preserve the remembered directory.
- Use TDD before every production behavior change.

---

## File Structure

- `electron/videoOutputDirectoryPreference.cjs`: versioned JSON persistence, directory validation, atomic replacement, and restored-session authorization.
- `electron/videoOutputDirectoryPreference.test.cjs`: real temporary-filesystem tests for persistence and invalid-state cleanup.
- `electron/videoProcessingIpcHandlers.cjs`: getter IPC, picker default path, persistence after selection, and restored allow-list use.
- `src/desktopVideoProcessingApi.ts`: typed getter contract.
- `electron/preload.cjs`: getter IPC bridge.
- `src/components/VideoProcessingWorkspace/videoProcessingService.ts`: renderer service wrapper.
- `src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts`: startup hydration with unmount/selection race protection.
- `src/desktopVideoProcessingIpcHandlers.test.ts`: bridge and handler structure guards.
- `src/videoProcessingStructure.test.ts`: video-workspace-only hydration and no-`localStorage` guard.

---

### Task 1: Device-Local Output Directory Preference Session

**Files:**
- Create: `electron/videoOutputDirectoryPreference.cjs`
- Create: `electron/videoOutputDirectoryPreference.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `app.getPath('userData')` and native directory paths.
- Produces: `loadVideoOutputDirectoryPreference(app)`, `saveVideoOutputDirectoryPreference(app, directoryPath)`, and `createVideoOutputDirectorySession(app)` with `restore()`, `remember(path)`, `get()`, and `selectedOutputDirectories`.

- [ ] **Step 1: Write failing preference tests**

Use a real temporary directory and an app stub whose `getPath('userData')` returns that directory. Tests must assert:

```javascript
const session = createVideoOutputDirectorySession(app)
assert.equal(await session.restore(), null)

const selected = await session.remember(outputDirectory)
assert.deepEqual(selected, { name: path.basename(outputDirectory), path: path.resolve(outputDirectory) })
assert.equal(session.selectedOutputDirectories.has(path.resolve(outputDirectory)), true)

const restored = createVideoOutputDirectorySession(app)
assert.deepEqual(await restored.restore(), selected)
assert.equal(restored.selectedOutputDirectories.has(selected.path), true)
```

Add separate tests that malformed JSON, blank paths, missing paths, and regular-file paths restore as `null`. Verify a second `remember()` atomically replaces the first value and a canceled/no-op flow cannot mutate the stored value because only `remember()` writes.

- [ ] **Step 2: Run tests and verify RED**

```powershell
node --test electron/videoOutputDirectoryPreference.test.cjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement preference persistence and session authorization**

Store this exact shape:

```json
{
  "version": 1,
  "outputDirectory": "D:\\exports"
}
```

Resolve paths with `path.resolve`, require `stat.isDirectory()`, and return `{ name: path.basename(resolved), path: resolved }`. Invalid reads remove the preference file with `fsp.rm(..., { force: true })` and return `null`. Saving writes a unique sibling temporary file, renames it over the preference path, and removes a leftover temporary file in `finally`.

`createVideoOutputDirectorySession` starts one cached restoration promise. Valid restored and remembered paths enter `selectedOutputDirectories`; `remember()` persists before updating the session value.

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2. Expected: all preference tests pass.

- [ ] **Step 5: Register the new test in the release suite and commit**

Add a focused `test:video-output-directory` script and chain it from `npm test`, following the existing focused Upscayl test pattern.

```powershell
git add electron/videoOutputDirectoryPreference.cjs electron/videoOutputDirectoryPreference.test.cjs package.json
git commit -m "feat: persist video output directory"
```

---

### Task 2: Electron IPC Restore and Safe Reauthorization

**Files:**
- Modify: `electron/videoProcessingIpcHandlers.cjs`
- Modify: `src/desktopVideoProcessingApi.ts`
- Modify: `electron/preload.cjs`
- Modify: `src/desktopVideoProcessingIpcHandlers.test.ts`

**Interfaces:**
- Consumes: `createVideoOutputDirectorySession(app)` from Task 1.
- Produces: `DesktopVideoProcessingApi.getVideoOutputDirectory(): Promise<DesktopVideoDirectoryInfo | null>` and IPC channel `video-processing:get-output-directory`.

- [ ] **Step 1: Write failing bridge and handler tests**

Extend structure tests to require:

```typescript
getVideoOutputDirectory(): Promise<DesktopVideoDirectoryInfo | null>
```

and preload mapping:

```javascript
getVideoOutputDirectory: () => invoke('video-processing:get-output-directory')
```

Require `videoProcessingIpcHandlers.cjs` to create the focused session, expose the getter, await restoration before the picker and job start, pass `defaultPath: rememberedDirectory?.path`, call `session.remember(selectedPath)` after selection, and pass `session.selectedOutputDirectories` into `normalizeVideoStartOptions`.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
npx tsx --test src/desktopVideoProcessingIpcHandlers.test.ts
```

Expected: FAIL because the typed getter, preload bridge, and focused session wiring are absent.

- [ ] **Step 3: Wire the output-directory session into video IPC**

Replace the local `new Set()` with `createVideoOutputDirectorySession(app)`. Add:

```javascript
ipcMain.handle('video-processing:get-output-directory', async () => outputDirectorySession.restore())
```

In the picker, await `restore()`, add its path as `defaultPath` when present, and call `remember(selectedPath)` only after a non-canceled native selection. In `video-processing:start`, await `restore()` before normalization and pass the session's allow-list.

Add the desktop API method and preload mapping exactly as tested.

- [ ] **Step 4: Run focused tests and Task 1 tests**

```powershell
npx tsx --test src/desktopVideoProcessingIpcHandlers.test.ts
node --test electron/videoOutputDirectoryPreference.test.cjs
```

Expected: both commands pass.

- [ ] **Step 5: Commit the IPC bridge**

```powershell
git add electron/videoProcessingIpcHandlers.cjs electron/preload.cjs src/desktopVideoProcessingApi.ts src/desktopVideoProcessingIpcHandlers.test.ts
git commit -m "feat: restore video output directory"
```

---

### Task 3: Video Workspace Startup Hydration

**Files:**
- Modify: `src/components/VideoProcessingWorkspace/videoProcessingService.ts`
- Modify: `src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts`
- Modify: `src/videoProcessingStructure.test.ts`

**Interfaces:**
- Consumes: `DesktopVideoProcessingApi.getVideoOutputDirectory()` from Task 2.
- Produces: video workspace `outputDirectory` initialized from the valid remembered main-process preference.

- [ ] **Step 1: Write failing workspace structure tests**

Require the service wrapper:

```typescript
getVideoOutputDirectory: () => requireVideoDesktopApi().getVideoOutputDirectory()
```

Require `useVideoProcessingQueue` to run a mount effect that awaits the getter, sets the returned directory only while mounted and while no newer directory selection has begun, and ignores restoration errors. Assert neither the service nor queue hook contains `localStorage`.

- [ ] **Step 2: Run workspace tests and verify RED**

```powershell
npx tsx --test src/videoProcessingStructure.test.ts
```

Expected: FAIL because startup hydration is absent.

- [ ] **Step 3: Implement service and queue hydration**

Add the service method. In the queue hook, add an `outputDirectorySelectionIdRef`. The mount effect captures the current id, calls the getter, and updates state only when mounted, the returned directory is non-null, and the id is unchanged. `chooseOutputDirectory` increments the id before opening the native picker so a late restore cannot overwrite a newer selection.

Do not display a startup toast on restore failure. Existing `startAll` behavior remains: it opens the picker only when `outputDirectory` is still null.

- [ ] **Step 4: Run focused tests and build**

```powershell
npx tsx --test src/videoProcessingStructure.test.ts src/desktopVideoProcessingIpcHandlers.test.ts
npm run build
```

Expected: focused tests and production build pass.

- [ ] **Step 5: Run the release gate**

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: all tests and build pass, no whitespace errors, and only the intended Task 3 files remain pending.

- [ ] **Step 6: Commit renderer hydration**

```powershell
git add src/components/VideoProcessingWorkspace/videoProcessingService.ts src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts src/videoProcessingStructure.test.ts
git commit -m "feat: hydrate video output directory"
```
