# Upscayl Batch Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run sprite-frame and image-workspace batch upscaling through one Upscayl process per compatible settings group while preserving single-image preview behavior.

**Architecture:** Add a generic Electron batch IPC that writes ordered in-memory inputs to one temporary directory and validates ordered outputs. Add a tested renderer-side grouping client, then migrate image and sprite batch workflows to that client while leaving `upscaleImage` in place for single-image previews.

**Tech Stack:** Electron IPC, Node.js filesystem/process APIs, TypeScript, React hooks, Node test runner, `tsx --test`.

## Global Constraints

- Develop directly on `master`; do not create a branch or worktree.
- Keep Upscayl GPU-only behavior and the existing thread profiles `1:2:2`, `1:1:1`, and `2:2:2`.
- One batch command may contain only one output format and one normalized Upscayl options object.
- Never silently fall back to original images when an upscale result is missing.
- Preserve single-image preview behavior.
- Use TDD: every production behavior starts with a test that fails for the expected missing behavior.

---

## File Structure

- `electron/upscaylIpcHandlers.cjs`: validate batch requests, manage temporary directories, launch one Upscayl directory command, validate and return outputs, register the batch IPC handler.
- `src/desktopUpscaleApi.ts`: own public batch request/result types and API method.
- `src/desktopApi.ts`: re-export the new batch types.
- `electron/preload.cjs`: expose `upscaleImageBatch` through `upscayl:upscale-batch`.
- `src/desktopUpscaleBatchClient.ts`: group renderer candidates by format/options, call the batch API once per group, and restore original candidate order.
- `src/desktopUpscaleBatchClient.test.ts`: prove grouping, call count, and ordered mapping.
- `src/components/ImageProcessingWorkspace/imageBatchExportWorkflow.ts`: prepare multiple item-specific blobs and turn grouped desktop results into previews with complete cleanup.
- `src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts`: request all missing batch previews together for apply-all and export-all.
- `src/components/MultiFrameSpriteWorkspace/useSpriteUpscaleWorkspace.ts`: prepare all target frames and submit one compatible batch.
- `src/components/ImageProcessingWorkspace/upscaylDesktopRuntime.test.cjs`: cover Electron batch execution and cleanup.
- `src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts`: guard the preload/API bridge and image-batch use of the batch API.
- `src/components/MultiFrameSpriteWorkspace/spriteUpscaleWorkspaceStructure.test.ts`: prevent per-frame calls to `upscaleImage`.

---

### Task 1: Electron Upscayl Batch Executor

**Files:**
- Modify: `electron/upscaylIpcHandlers.cjs`
- Test: `src/components/ImageProcessingWorkspace/upscaylDesktopRuntime.test.cjs`

**Interfaces:**
- Consumes: existing `buildUpscaylArgs`, runtime paths, and injected `runCommandOutput`.
- Produces: `executeUpscaylBatch({ items, outputFormat, options, paths, tempRoot, runCommandOutput }): Promise<Array<{ id, name, data }>>` and IPC channel `upscayl:upscale-batch`.

- [ ] **Step 1: Write failing executor tests**

Add Node tests that create a real temporary root and use a fake command runner. The fake runner must assert that `-i` and `-o` point to directories, count exactly one launch for two items, inspect two unique input PNG files, and create corresponding output files. Assert results retain request order and ids. Add separate tests for duplicate ids, missing output, and cleanup after command failure.

- [ ] **Step 2: Run the executor tests and verify RED**

Run:

```powershell
node --test src/components/ImageProcessingWorkspace/upscaylDesktopRuntime.test.cjs
```

Expected: FAIL because `executeUpscaylBatch` is not exported.

- [ ] **Step 3: Implement the minimal executor**

Implement strict format normalization for `png`, `webp`, `jpg`, and `jpeg`; reject empty item lists and duplicate/blank ids. Use `fsp.mkdtemp` below an existing temp root, `input` and `output` subdirectories, and ordered names such as `item-000000.png`. Call `buildUpscaylArgs` once with the directories. After a successful exit, require every ordered output path, read it, and return `{ id, name, data }`. Remove the unique temporary root in `finally`.

Register `upscayl:upscale-batch` after the existing single-image handler. It must verify the runtime installation and delegate to `executeUpscaylBatch` using the existing Upscayl binary/models paths and image-processing temp root.

- [ ] **Step 4: Run executor tests and verify GREEN**

Run the command from Step 2. Expected: all Upscayl runtime tests pass with one launch observed for the two-item case.

- [ ] **Step 5: Commit the executor**

```powershell
git add electron/upscaylIpcHandlers.cjs src/components/ImageProcessingWorkspace/upscaylDesktopRuntime.test.cjs
git commit -m "feat: add Upscayl batch executor"
```

---

### Task 2: Desktop Batch Bridge and Grouping Client

**Files:**
- Modify: `src/desktopUpscaleApi.ts`
- Modify: `src/desktopApi.ts`
- Modify: `electron/preload.cjs`
- Create: `src/desktopUpscaleBatchClient.ts`
- Create: `src/desktopUpscaleBatchClient.test.ts`
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts`

**Interfaces:**
- Consumes: `DesktopUpscaleApi` and `DesktopUpscaleOptions`.
- Produces: `DesktopUpscaleBatchItem`, `DesktopUpscaleImageBatchOptions`, `DesktopUpscaleImageBatchResult`, `DesktopUpscaleApi.upscaleImageBatch`, and `executeUpscaleBatchCandidates<T>()`.

- [ ] **Step 1: Write failing grouping and bridge tests**

Define candidate fixtures with identical options, a changed thread profile, and a changed output format. The wished-for API is:

```typescript
const results = await executeUpscaleBatchCandidates(api, [
  { value: 'a', inputName: 'a.png', outputFormat: 'png', data: firstBuffer, options: balanced },
  { value: 'b', inputName: 'b.png', outputFormat: 'png', data: secondBuffer, options: balanced },
  { value: 'c', inputName: 'c.webp', outputFormat: 'webp', data: thirdBuffer, options: throughput },
])
```

Assert two desktop calls, two items in the first call, one item in the second call, exact thread profiles, and output values restored as `['a', 'b', 'c']` even if fake API results are returned in reverse group order. Extend the focused structure test to require `upscaleImageBatch` in the TypeScript interface and preload channel.

- [ ] **Step 2: Run grouping and structure tests and verify RED**

```powershell
npx tsx --test src/desktopUpscaleBatchClient.test.ts src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts
```

Expected: FAIL because the batch types, client, and preload method do not exist.

- [ ] **Step 3: Implement types, bridge, and grouping**

Add ordered batch item/result interfaces with stable ids. Add:

```typescript
upscaleImageBatch(options: DesktopUpscaleImageBatchOptions): Promise<DesktopUpscaleImageBatchResult[]>
```

Expose it in preload with `invoke('upscayl:upscale-batch', options)` and re-export all new types from `desktopApi.ts`.

Implement a stable compatibility key from output format plus `model`, `scale`, `tileSize`, `ttaMode`, `gpuId`, and `threadProfile`. `executeUpscaleBatchCandidates` assigns internal ids by original index, performs one awaited call per compatibility group, rejects missing/duplicate result ids, and returns candidate/result pairs in original input order.

- [ ] **Step 4: Run grouping and structure tests and verify GREEN**

Run the command from Step 2. Expected: both focused test files pass.

- [ ] **Step 5: Commit the bridge and client**

```powershell
git add electron/preload.cjs src/desktopUpscaleApi.ts src/desktopApi.ts src/desktopUpscaleBatchClient.ts src/desktopUpscaleBatchClient.test.ts src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts
git commit -m "feat: expose grouped Upscayl batches"
```

---

### Task 3: Image Workspace Batch Migration

**Files:**
- Modify: `src/components/ImageProcessingWorkspace/imageBatchExportWorkflow.ts`
- Modify: `src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts`
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts`

**Interfaces:**
- Consumes: `executeUpscaleBatchCandidates`, existing `prepareImageBatchExport`, encoding/background helpers, and batch operation ids.
- Produces: `createImageBatchUpscalePreviews({ items, prepareBatchExport, upscaleRuntimeStatus }): Promise<Array<{ item, preview }>>`.

- [ ] **Step 1: Write failing image workflow structure tests**

Require the batch export workflow to call `executeUpscaleBatchCandidates`; require `useImageExportWorkflow` to request previews through the plural `createImageBatchUpscalePreviews`; reject the singular per-item helper and any `api.upscaleImage(` call in the batch workflow.

- [ ] **Step 2: Run the focused image test and verify RED**

```powershell
npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts
```

Expected: FAIL because the image batch code still calls the single-image API per item.

- [ ] **Step 3: Implement plural preview preparation**

For every requested item, run its existing matte/crop/export preparation and retain its cleanup callback. Convert original blobs to batch candidates using each item’s output format and Upscayl options. Execute all candidates through the grouping client. Create original/upscaled object URLs and preview dimensions for every returned pair. On any failure, revoke every newly created URL; always run every preparation cleanup callback.

- [ ] **Step 4: Migrate apply-all and export-all**

In `applyAllPreviews`, request every upscale-enabled target in one plural call, then perform the existing signature and operation-id checks before committing the returned previews.

In `exportAllImages`, first determine which upscale-enabled items have no current preview, generate all missing previews in one plural call, place them in a temporary map, then run the existing ordered encoding loop. Revoke only the temporary previews in `finally`; keep stored previews untouched.

- [ ] **Step 5: Run the focused image test and TypeScript build**

```powershell
npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts src/desktopUpscaleBatchClient.test.ts
npm run build
```

Expected: focused tests pass and TypeScript/Vite build exits 0.

- [ ] **Step 6: Commit the image migration**

```powershell
git add src/components/ImageProcessingWorkspace/imageBatchExportWorkflow.ts src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts
git commit -m "perf: batch image workspace upscaling"
```

---

### Task 4: Sprite Workspace Batch Migration

**Files:**
- Modify: `src/components/MultiFrameSpriteWorkspace/useSpriteUpscaleWorkspace.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/spriteUpscaleWorkspaceStructure.test.ts`

**Interfaces:**
- Consumes: `executeUpscaleBatchCandidates`, current target-frame selection, composition, progress, and result storage.
- Produces: one compatible desktop batch call per `runBatchUpscale` invocation.

- [ ] **Step 1: Write the failing sprite structure test**

Require `useSpriteUpscaleWorkspace.ts` to import and call `executeUpscaleBatchCandidates`. Assert the source does not contain `api.upscaleImage(` and no longer awaits a desktop upscale call inside the frame-preparation loop.

- [ ] **Step 2: Run the sprite test and verify RED**

```powershell
npx tsx --test src/components/MultiFrameSpriteWorkspace/spriteUpscaleWorkspaceStructure.test.ts
```

Expected: FAIL because the hook currently calls `api.upscaleImage` once per frame.

- [ ] **Step 3: Implement sprite batching**

Fetch and convert every target input to an `ArrayBuffer`, create candidates with PNG output and the shared current options, then call `executeUpscaleBatchCandidates` once. Process returned results in target order. Preserve input-mode recomposition, output-mode dimensions, URL revocation on composition failure, result signatures, and completed progress updates.

- [ ] **Step 4: Run sprite and shared client tests and verify GREEN**

```powershell
npx tsx --test src/components/MultiFrameSpriteWorkspace/spriteUpscaleWorkspaceStructure.test.ts src/desktopUpscaleBatchClient.test.ts
npm run build
```

Expected: focused tests and build pass.

- [ ] **Step 5: Commit the sprite migration**

```powershell
git add src/components/MultiFrameSpriteWorkspace/useSpriteUpscaleWorkspace.ts src/components/MultiFrameSpriteWorkspace/spriteUpscaleWorkspaceStructure.test.ts
git commit -m "perf: batch sprite workspace upscaling"
```

---

### Task 5: Release-Gate Verification

**Files:**
- Verify all files changed in Tasks 1–4.

**Interfaces:**
- Consumes: complete implementation.
- Produces: fresh evidence for tests, build, formatting, and repository state.

- [ ] **Step 1: Run all tests**

```powershell
npm test
```

Expected: exit 0 with no failed tests.

- [ ] **Step 2: Run the production build**

```powershell
npm run build
```

Expected: TypeScript and Vite exit 0.

- [ ] **Step 3: Check patch formatting and status**

```powershell
git diff --check
git status --short --branch
```

Expected: no whitespace errors; `master` contains only the intentional commits and is ahead of `origin/master`.

- [ ] **Step 4: Review the final diff against the design success criteria**

Confirm the Electron executor launches once per request, renderer grouping uses every compatibility field, sprite batching has one compatible request, image batching uses plural requests, single-image preview remains on `upscaleImage`, and missing output fails rather than falling back.
