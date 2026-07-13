# Image Processing Per-Image Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve a complete independent processing profile for every image and only synchronize profiles after “全部应用预览”.

**Architecture:** Add a browser-free settings model, store settings on each batch item, and let the workspace capture/restore the active profile. Batch preview and export consume each item’s profile rather than the active panel’s global values.

**Tech Stack:** React 19 hooks, TypeScript, Node test runner through `tsx`, Vite.

## Global Constraints

- Preserve all existing uncommitted AI matting and status-layout changes.
- Do not commit this work unless the user explicitly asks.
- Use proportional crop mapping for images with different dimensions.
- Keep pure rules in model files and browser/resource cleanup in hooks and workflows.

---

### Task 1: Per-image settings model

**Files:**
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingBatchModel.ts`
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingBatchModel.test.ts`
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingModel.ts`

**Interfaces:**
- Consumes: `MatteParams`, `MatteMode`, `ImageExportEncodingSettings`, `ImageExportBackgroundSettings`, `UpscaleOptions`, `RectSize`.
- Produces: `ImageProcessingBatchSettings`, `createDefaultImageProcessingBatchSettings`, `cloneImageProcessingBatchSettings`, `mapImageProcessingBatchSettingsToSize`, and per-item export-name derivation.

- [ ] **Step 1: Write failing model tests**

Add tests proving cloned profiles do not share nested values, independent profiles remain distinct, apply-all maps `{ x, y, width, height }` proportionally, and mixed encodings derive the correct extensions.

- [ ] **Step 2: Run the model test and verify RED**

Run: `npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingBatchModel.test.ts`

Expected: FAIL because the profile APIs do not exist.

- [ ] **Step 3: Implement the pure profile APIs**

Create normalized defaults, deep clone the matte key color and upscale/export objects, map crop with `mapCropBoxToImageSize`, and derive each filename from its own encoding.

- [ ] **Step 4: Run the model test and verify GREEN**

Run: `npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingBatchModel.test.ts`

Expected: all tests pass.

### Task 2: Capture and restore active image profiles

**Files:**
- Modify: `src/components/ImageProcessingWorkspace/useImageSourceWorkspace.ts`
- Modify: `src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts`
- Modify: `src/components/ImageProcessingWorkspace/useImageExportSettingsWorkspace.ts`
- Modify: `src/components/ImageProcessingWorkspace/useImageUpscaleWorkflow.ts`
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts`

**Interfaces:**
- Consumes: settings model APIs from Task 1.
- Produces: batch items with `settings`, an atomic active-profile restore callback, and apply-all profile synchronization.

- [ ] **Step 1: Verify the existing scale-reset regression test is RED**

Run: `npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts`

Expected: FAIL because `clearUpscalePreview` still uses `exportScaleSnapshotRef.current ?? 1`.

- [ ] **Step 2: Fix preview cleanup without changing upload/reset defaults**

Restore export scale only when `exportScaleSnapshotRef.current !== null`; keep explicit `setExportScale(1)` in initial upload and full workspace reset.

- [ ] **Step 3: Wire profile creation, capture, restore, and apply-all**

Expose focused restore setters from export and upscale hooks. Save the active profile before changing IDs, restore the target after clearing transient previews, and update every item after “全部应用预览”.

- [ ] **Step 4: Run focused tests**

Run: `npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingBatchModel.test.ts src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts`

Expected: all tests pass.

### Task 3: Per-item batch preview and export

**Files:**
- Modify: `src/components/ImageProcessingWorkspace/imageBatchExportWorkflow.ts`
- Modify: `src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts`
- Modify: `src/components/ImageProcessingWorkspace/imageProcessingBatchModel.test.ts`

**Interfaces:**
- Consumes: `ImageProcessingBatchItem.settings`.
- Produces: per-item matte/crop/scale/upscale/background/encoding processing for previews and exports.

- [ ] **Step 1: Add failing tests for per-item signatures and filenames**

Prove settings changes invalidate only the corresponding preview signature and mixed output formats retain unique names with each item’s own extension.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingBatchModel.test.ts`

Expected: FAIL until per-item helpers are implemented.

- [ ] **Step 3: Update batch workflows**

Prepare, upscale, encode, and name each item from its stored profile. Keep active single-image export behavior unchanged and clean temporary previews in `finally` blocks.

- [ ] **Step 4: Run release gates**

Run: `npm test`

Run: `npm run build`

Run: `git diff --check`

Expected: zero test/build failures and no whitespace errors.

### Task 4: Final review

**Files:**
- Review: all modified files under `src/components/ImageProcessingWorkspace/`
- Review: `docs/superpowers/specs/2026-07-13-image-processing-per-image-settings-design.md`

**Interfaces:**
- Consumes: completed implementation and verification output.
- Produces: a concise handoff without committing.

- [ ] **Step 1: Inspect diff and status**

Run: `git diff --stat` and `git status --short --branch`.

- [ ] **Step 2: Check requirement coverage**

Confirm independent profiles, explicit apply-all synchronization, proportional crop mapping, per-item export, transient preview cleanup, and preservation of AI matting changes.

- [ ] **Step 3: Report verified results**

List changed behavior, verification commands, and remaining uncommitted state.
