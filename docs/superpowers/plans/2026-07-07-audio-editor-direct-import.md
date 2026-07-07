# Audio Editor Direct Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct drag/upload audio import to the existing `音频编辑` waveform clipping workflow.

**Architecture:** Extend the audio clip source model with imported audio, let the editor hook own imported file object URLs, and keep the panel as a thin upload/drop UI. Imported clips reuse the existing save pipeline and are inserted into voice history as generic audio records.

**Tech Stack:** React 19, Ant Design 6 Upload.Dragger, wavesurfer.js, Web Audio API, Electron IPC, TypeScript, Node `node:test`.

## Global Constraints

- Keep file object URL creation and cleanup in `useAudioClipEditorWorkspace`.
- Keep `AudioClipEditorPanel` focused on rendering and callbacks.
- Imported audio saves to `生成配音` history.
- Reject non-audio files before loading the editor.
- Do not add a new dependency.

---

### Task 1: Extend Imported Audio Model And Save Routing

**Files:**
- Modify: `src/components/VoiceDeploymentWorkspace/audioClipModel.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/audioClipModel.test.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/audioClipService.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/audioClipService.test.ts`

**Interfaces:**
- Produces:
  - `ImportedAudioClipRecord`
  - `createAudioClipSourceFromImportedFile(fileName, audioUrl): AudioClipSource`
  - `createImportedAudioClipRecord(input): VoiceGenerationRecord`

- [ ] Write failing model and service tests.
- [ ] Run focused tests and confirm they fail.
- [ ] Implement imported source and save routing.
- [ ] Run focused tests and confirm they pass.
- [ ] Commit model/service changes.

### Task 2: Add Upload/Drag UI And Hook Object URL Lifecycle

**Files:**
- Modify: `src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css`
- Modify: `src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`

**Interfaces:**
- Consumes:
  - `createAudioClipSourceFromImportedFile(fileName, audioUrl)`
- Produces:
  - `panelProps.onImportAudioFile(file): void`

- [ ] Write failing structure test for upload/drop UI and hook callback.
- [ ] Run focused test and confirm it fails.
- [ ] Implement `onImportAudioFile` in the hook with audio type validation and object URL cleanup.
- [ ] Render compact `Upload.Dragger` in the empty panel and source row.
- [ ] Run focused tests and build.
- [ ] Commit UI/hook changes.

### Task 3: Verify

**Files:**
- Modify only files required by verification failures.

- [ ] Run focused tests for audio clip model, service, editor structure, and sound/voice structure.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Browser QA desktop and mobile: open `音频编辑`, verify upload/drop zone appears and layout has no horizontal overflow.
