# Sprite Additive Matte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add flow 2 black-to-alpha additive post-processing for selected regions and selected frames in the multi-frame sprite workbench.

**Architecture:** Keep additive behavior in focused model, pipeline, hook, and panel files under `src/components/MultiFrameSpriteWorkspace/`. The post-process writes a new `matteUrl` and increments `matteRevision`, so existing flow 3 composition and export refresh without a parallel output path.

**Tech Stack:** React, TypeScript, Ant Design, browser canvas APIs, Node test runner with `tsx --test`.

## Global Constraints

- Keep edits inside `src/components/MultiFrameSpriteWorkspace/` unless shared exports are required.
- Keep browser/canvas work out of `MatteWorkspacePanel.tsx`.
- Use focused model tests before implementation.
- Use existing Ant Design controls and product UI density.
- Preserve existing transparent pixels and leave pixels outside the selected mask unchanged.

---

### Task 1: Add Pure Additive Model

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/additiveBlendModel.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/additiveBlendModel.test.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/model.ts`
- Test: `src/components/MultiFrameSpriteWorkspace/additiveBlendModel.test.ts`

**Interfaces:**
- Produces: `parseFrameRangeSelection(input: string, frameCount: number): AdditiveFrameRangeParseResult`
- Produces: `resolveAdditiveTargetFrameIds(input: AdditiveTargetFrameInput): AdditiveTargetFrameResult`
- Produces: `computeAdditiveBlackToAlphaPixel(input: AdditivePixelInput): AdditivePixelOutput`

- [ ] Write failing tests for frame target resolution, frame range parsing, empty custom selection, and black-to-alpha pixel conversion.
- [ ] Run `npx tsx --test src/components/MultiFrameSpriteWorkspace/additiveBlendModel.test.ts` and confirm missing exports fail.
- [ ] Implement the model with clamped threshold and strength.
- [ ] Export the helpers through `model.ts`.
- [ ] Re-run the additive model test and confirm it passes.

### Task 2: Add Canvas Pipeline

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/spriteAdditiveBlendPipeline.ts`
- Test: `src/components/MultiFrameSpriteWorkspace/matteWorkspaceStructure.test.ts`

**Interfaces:**
- Consumes: `computeAdditiveBlackToAlphaPixel`
- Produces: `applyAdditiveBlendToImage(sourceUrl: string, options: AdditiveBlendImageOptions): Promise<{ url: string; width: number; height: number }>`

- [ ] Add a structure test that requires `spriteAdditiveBlendPipeline.ts` and forbids additive canvas processing inside `MatteWorkspacePanel.tsx`.
- [ ] Run `npx tsx --test src/components/MultiFrameSpriteWorkspace/matteWorkspaceStructure.test.ts` and confirm it fails.
- [ ] Implement the pipeline using `loadImage`, `canvasToBlob`, `getImageData`, and normalized mask rectangles.
- [ ] Re-run the structure test and the additive model test.

### Task 3: Add Hook Workflow

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/useAdditiveBlendWorkspace.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts`
- Test: `src/components/MultiFrameSpriteWorkspace/matteWorkspaceStructure.test.ts`

**Interfaces:**
- Consumes: `applyAdditiveBlendToImage`
- Produces from `useMattePipeline`: `additiveBlend` view model with `applyToFrames`, `processingFrameIds`, and per-group UI helpers.

- [ ] Extend the structure test to require `useAdditiveBlendWorkspace` in `useMattePipeline.ts`.
- [ ] Run the structure test and confirm it fails.
- [ ] Implement the hook to skip frames without `matteUrl`, update `matteUrl`, increment `matteRevision`, revoke replaced URLs, and show Ant Design messages.
- [ ] Wire `useMattePipeline` to return `additiveBlend`.
- [ ] Re-run the structure test.

### Task 4: Add Flow 2 UI

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/AdditiveBlendPanel.tsx`
- Modify: `src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx`
- Modify: `src/components/MultiFrameSpriteWorkspace/index.tsx`
- Test: `src/components/MultiFrameSpriteWorkspace/matteWorkspaceStructure.test.ts`

**Interfaces:**
- Consumes: `additiveBlend` from `useMattePipeline`
- Produces: flow 2 UI controls for `加色去黑`, `当前帧`, `本组全部帧`, `自定义选择`, range input, and apply action.

- [ ] Add a structure test that requires `MatteWorkspacePanel.tsx` to import `AdditiveBlendPanel`.
- [ ] Run the structure test and confirm it fails.
- [ ] Implement `AdditiveBlendPanel.tsx` with compact controls, inline custom frame chooser, range input, and a simple normalized rectangular mask mode for the first implementation.
- [ ] Render `AdditiveBlendPanel` below each `MatteFrameCard`.
- [ ] Pass the `additiveBlend` view model from `index.tsx`.
- [ ] Re-run focused tests.

### Task 5: Verify

**Files:**
- No new files.

**Interfaces:**
- Consumes all previous tasks.

- [ ] Run `npx tsx --test src/components/MultiFrameSpriteWorkspace/additiveBlendModel.test.ts src/components/MultiFrameSpriteWorkspace/matteWorkspaceStructure.test.ts`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Run `git status --short --branch`.
