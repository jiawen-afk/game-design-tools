# Large File Dedup Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the approved three batches: Project schema duplicate logic, Voice large files, and Sprite/Image large files.

**Architecture:** Keep public contracts stable while extracting focused modules by responsibility. Add structure/model tests before production edits, then preserve behavior through wrapper compatibility and full verification.

**Tech Stack:** TypeScript, React, Ant Design, Node CJS Electron modules, `tsx --test`, `node:test`, Vite, project-local structure tests.

## Global Constraints

- Do not change user-facing behavior, copy, storage semantics, or algorithms.
- Do not add runtime dependencies.
- Keep Electron IPC and repository code split by responsibility.
- Keep UI panels presentational, hooks orchestration-focused, `*Model.ts` browser-API free, and `*Service.ts`/`*Storage.ts` responsible for IO.
- Treat non-test production TS/TSX files over about 300 lines as audit candidates and split around real responsibilities.
- Run narrow tests after each batch, then `npm test`, `npm run build`, `git diff --check`, and `git status --short --branch`.

---

### Task 1: Shared Project Schema Source

**Files:**
- Create: `src/components/ProjectStorage/projectSchemaShared.cjs`
- Modify: `src/components/ProjectStorage/projectSchema.ts`
- Modify: `src/components/ProjectStorage/projectSchemaAsset.ts`
- Modify: `src/components/ProjectStorage/projectSchemaCore.ts`
- Modify: `src/components/ProjectStorage/projectSchemaDocument.ts`
- Modify: `electron/projectRemoteSchema.cjs`
- Modify: `electron/projectSchemaAsset.cjs`
- Modify: `electron/projectSchemaCore.cjs`
- Modify: `electron/projectSchemaDocument.cjs`
- Test: `src/projectStorageSchemaStructure.test.ts`

**Interfaces:**
- Produces: `createProjectSchemaSql(booleanSql?: string): string[]`, `createProjectAssetSchemaSql(booleanSql?: string): string[]`, `createProjectLifecycleSchemaSql(): string[]`, `createProjectDocumentSchemaSql(): string[]` from `projectSchemaShared.cjs`.
- Consumes: existing TypeScript and Electron modules continue exporting their current schema functions.

- [ ] **Step 1: Add failing structure tests**

Add assertions that `projectSchemaShared.cjs` exists, Electron schema modules require it, TypeScript schema modules import/require it, and duplicate SQL bodies are not defined in both Electron and TypeScript wrappers.

Run: `npx tsx --test src/projectStorageSchemaStructure.test.ts`
Expected: FAIL because the shared schema source does not exist yet.

- [ ] **Step 2: Extract shared schema implementation**

Move the SQL arrays into `src/components/ProjectStorage/projectSchemaShared.cjs`. Preserve exact SQL output. Keep boolean SQL configurable for asset/core/project functions.

- [ ] **Step 3: Convert wrappers**

Update Electron CJS files to `require('../src/components/ProjectStorage/projectSchemaShared.cjs')` or the correct relative path. Update TypeScript files to use `createRequire(import.meta.url)` where needed so TypeScript wrappers can consume the CJS shared module without changing build configuration.

- [ ] **Step 4: Verify narrow schema tests**

Run: `npx tsx --test src/projectStorageSchemaStructure.test.ts src/components/ProjectStorage/projectSqliteRepositorySchema.test.ts src/components/ProjectStorage/projectRemoteRepository.test.ts`
Expected: PASS.

### Task 2: Voice Audio Editor Split

**Files:**
- Create: `src/components/VoiceDeploymentWorkspace/audioClipEditorViewModel.ts`
- Create: `src/components/VoiceDeploymentWorkspace/AudioClipEditorToolbar.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/AudioClipEditorTrack.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/AudioClipEditorSegments.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/AudioClipEditorMenus.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/useAudioClipImportWorkflow.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts`
- Test: `src/voiceDeploymentWorkspaceSideEffectsStructure.test.ts`
- Test: `src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts`

**Interfaces:**
- Produces: `buildAudioClipEditorViewModel(input): AudioClipEditorViewModel`, `useAudioClipImportWorkflow(options): AudioClipImportWorkflow`.
- Consumes: `AudioClipEditorPanel` keeps its exported component name and prop contract.

- [ ] **Step 1: Add failing Voice structure tests**

Assert that editor toolbar, track, segment list, menu, and import workflow files exist; assert `AudioClipEditorPanel.tsx` no longer owns the large render subtree; assert import/drop file logic is outside `useAudioClipEditorWorkspace.ts`.

Run: `npx tsx --test src/voiceDeploymentWorkspaceSideEffectsStructure.test.ts`
Expected: FAIL because new files do not exist.

- [ ] **Step 2: Extract pure view model helpers**

Move display-only derivation such as selected region color, pending drop target labels, disabled state labels, and region display grouping into `audioClipEditorViewModel.ts`.

- [ ] **Step 3: Extract UI subcomponents**

Move toolbar controls, track rendering, segment/pending segment list, and context menus into the new TSX files. Pass narrow prop groups and callbacks.

- [ ] **Step 4: Extract import workflow hook**

Move audio file filtering, imported sound effect record construction, and direct-import orchestration from `useAudioClipEditorWorkspace.ts` into `useAudioClipImportWorkflow.ts`.

- [ ] **Step 5: Verify narrow Voice tests**

Run: `npx tsx --test src/voiceDeploymentWorkspaceSideEffectsStructure.test.ts src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts src/components/VoiceDeploymentWorkspace/scriptServiceRuntime.test.ts`
Expected: PASS.

### Task 3: Stable Audio Setup UI and CSS Split

**Files:**
- Create: `src/components/VoiceDeploymentWorkspace/SoundEffectSetupActions.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/SoundEffectSetupStatus.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/SoundEffectModelInstallPanel.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.setup.css`
- Create: `src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.studio.css`
- Create: `src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.library.css`
- Create: `src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.responsive.css`
- Modify: `src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.css`
- Test: `src/voiceDeploymentSoundStructure.test.ts`
- Test: `src/voiceDeploymentStyleStructure.test.ts`

**Interfaces:**
- Produces: setup action/status/model-install components consumed by `SoundEffectSetupPanel`.
- Consumes: existing `SoundEffectSetupPanel` props and CSS class names remain compatible.

- [ ] **Step 1: Add failing structure/style tests**

Assert setup subcomponents exist and `voiceDeployment.sound.css` imports focused modules instead of containing all sound workspace styles.

Run: `npx tsx --test src/voiceDeploymentSoundStructure.test.ts src/voiceDeploymentStyleStructure.test.ts`
Expected: FAIL because the split files do not exist.

- [ ] **Step 2: Extract setup components**

Move repeated service control buttons, command alert rendering, connection status, installed/missing model status, and install model controls into focused components.

- [ ] **Step 3: Split CSS**

Move setup, studio, library, and responsive rules into focused CSS files. Keep `voiceDeployment.sound.css` as the import hub.

- [ ] **Step 4: Verify narrow Stable Audio tests**

Run: `npx tsx --test src/voiceDeploymentSoundStructure.test.ts src/voiceDeploymentStyleStructure.test.ts src/components/VoiceDeploymentWorkspace/soundEffectModel.test.ts`
Expected: PASS.

### Task 4: Sprite Layout Model Split

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/layoutPointerModel.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/layoutPreviewModel.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/layoutPresetModel.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/layoutResizeModel.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/layoutModel.ts`
- Test: `src/spriteWorkspaceLayoutStructure.test.ts`
- Test: `src/components/MultiFrameSpriteWorkspace/layoutModel.test.ts`
- Test: `src/components/MultiFrameSpriteWorkspace/layoutRatioModel.test.ts`

**Interfaces:**
- Produces: focused layout model functions while `layoutModel.ts` re-exports the existing public API for compatibility.
- Consumes: existing workspace imports can remain unchanged unless a local file already imports a more focused model.

- [ ] **Step 1: Add failing layout structure tests**

Assert focused layout model files exist and `layoutModel.ts` is a compatibility/export layer rather than the owner of pointer, preview, preset, and resize logic.

Run: `npx tsx --test src/spriteWorkspaceLayoutStructure.test.ts`
Expected: FAIL because focused model files do not exist.

- [ ] **Step 2: Move pointer and preview helpers**

Move `computePointerCanvasDelta`, `shouldStopLayoutDragFromPointer`, `getLayoutFramePreviewUrl`, `addSilhouettePreviewLayers`, and `getLayoutFrameSilhouettePreviewLayers`.

- [ ] **Step 3: Move ratio/preset helpers**

Move `computeRatioSize`, `applyCanvasRatioToFrameLayouts`, `updatePresetFrameLayout`, and `applyLayoutPresetToFrames`.

- [ ] **Step 4: Move resize helpers**

Move `computeWheelResize`, `computeWheelFrameResize`, `getWheelScalingButtonLabel`, `axisDelta`, and `computeHandleResize`.

- [ ] **Step 5: Verify narrow layout tests**

Run: `npx tsx --test src/spriteWorkspaceLayoutStructure.test.ts src/components/MultiFrameSpriteWorkspace/layoutModel.test.ts src/components/MultiFrameSpriteWorkspace/layoutRatioModel.test.ts src/components/MultiFrameSpriteWorkspace/layoutInteractionModel.test.ts`
Expected: PASS.

### Task 5: Image Export Workflow Split

**Files:**
- Create: `src/components/ImageProcessingWorkspace/imageExportBatchPreviewWorkflow.ts`
- Create: `src/components/ImageProcessingWorkspace/imageExportPrepareWorkflow.ts`
- Create: `src/components/ImageProcessingWorkspace/imageExportSingleWorkflow.ts`
- Create: `src/components/ImageProcessingWorkspace/imageExportBatchWorkflow.ts`
- Modify: `src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts`
- Test: `src/components/ImageProcessingWorkspace/imageProcessingWorkflowStructure.test.ts`
- Test: `src/components/ImageProcessingWorkspace/imageProcessingExportModel.test.ts`
- Test: `src/components/ImageProcessingWorkspace/imageProcessingPipeline.test.ts`

**Interfaces:**
- Produces: focused image export workflow helpers consumed by `useImageExportWorkflow`.
- Consumes: `useImageExportWorkflow(options): ImageExportWorkflow` public hook contract remains stable for `useImageProcessingWorkspace.ts`.

- [ ] **Step 1: Add failing image workflow structure tests**

Assert batch preview, prepare, single export, and batch export workflow files exist and `useImageExportWorkflow.ts` delegates to them.

Run: `npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingWorkflowStructure.test.ts`
Expected: FAIL because focused workflow files do not exist.

- [ ] **Step 2: Extract batch preview lifecycle**

Move preview signature, revoke, prepare, and cleanup behavior into `imageExportBatchPreviewWorkflow.ts`.

- [ ] **Step 3: Extract export preparation**

Move source/matte/crop/export option preparation into `imageExportPrepareWorkflow.ts`.

- [ ] **Step 4: Extract single and batch export commands**

Move command handlers for single export and batch export into focused workflow modules that receive explicit dependencies.

- [ ] **Step 5: Verify narrow image tests**

Run: `npx tsx --test src/components/ImageProcessingWorkspace/imageProcessingWorkflowStructure.test.ts src/components/ImageProcessingWorkspace/imageProcessingExportModel.test.ts src/components/ImageProcessingWorkspace/imageProcessingPipeline.test.ts src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`
Expected: PASS.

### Task 6: Final Audit and Release Gate

**Files:**
- Modify tests only if final audit finds stale structure assertions.

**Interfaces:**
- Produces: evidence that all three approved goals are complete.
- Consumes: current worktree after Tasks 1-5.

- [ ] **Step 1: Audit large files and duplicate logic**

Run the non-test line-count scan and duplicate normalized-function scan. Expected: no approved target remains an un-split large mixed-responsibility file, and no same-logic schema SQL copies remain across Electron and TypeScript wrappers.

- [ ] **Step 2: Run full tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Run whitespace diff check**

Run: `git diff --check`
Expected: no output and exit code 0.

- [ ] **Step 5: Inspect final status**

Run: `git status --short --branch`
Expected: only intentional refactor files are changed.

## Self-Review

Spec coverage: Tasks 1-6 cover the three approved batches and final verification.

Placeholder scan: No placeholders remain; every task names exact files, commands, and expected outcomes.

Type consistency: Public compatibility exports keep existing function and hook names stable while new files own focused responsibilities.
