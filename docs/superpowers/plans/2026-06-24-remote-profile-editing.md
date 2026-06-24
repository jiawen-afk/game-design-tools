# Remote Profile Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement tested editing and saving behavior for remote database and Kodo connection profiles, then publish the next release.

**Architecture:** Keep validation and secret merge rules in `projectRemoteProfiles.ts`. Add a desktop profile detail bridge that returns editable drafts with secrets blank. Keep UI state in the personal-space settings hook and keep the panel focused on controls and confirmation prompts.

**Tech Stack:** React, Ant Design, Electron IPC, Node test runner, TypeScript, electron-builder, GitHub Releases.

## Global Constraints

- Saving a changed profile requires testing the draft first.
- Failed tests require explicit confirmation before saving.
- Existing database password and Kodo Secret Key are preserved when their edit fields are empty.
- New database and Kodo profiles still require password and Secret Key.
- Existing project-storage architecture boundaries remain intact.

---

### Task 1: Profile Model Rules

**Files:**
- Modify: `src/components/ProjectStorage/projectRemoteProfiles.ts`
- Test: `src/components/ProjectStorage/projectRemoteProfiles.test.ts`

**Interfaces:**
- Produces: `validateDatabaseProfileInput(input, options?)`, `validateKodoProfileInput(input, options?)`, `createEditableDatabaseProfileDraft(payload)`, `createEditableKodoProfileDraft(payload)`, `mergeDatabaseProfilePayload(draft, existing?)`, `mergeKodoProfilePayload(draft, existing?)`.

- [ ] Write failing tests for create-time required secrets, edit-time blank secrets, editable draft redaction, and merge preservation.
- [ ] Run the focused test and verify it fails for missing exported helpers.
- [ ] Implement the helpers in `projectRemoteProfiles.ts`.
- [ ] Run the focused test and verify it passes.

### Task 2: Desktop Profile Bridge

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/desktopApi.ts`
- Test: `src/appStructure.test.ts`

**Interfaces:**
- Produces: `getProjectConnectionProfile(profileId)` on `gameDesignToolsDesktop`, backed by `project-profile:get`.

- [ ] Write failing structure tests for the new bridge and the secret-preserving save path.
- [ ] Run `npm test -- src/appStructure.test.ts` equivalent focused command and verify failure.
- [ ] Add IPC handler, preload bridge, and renderer API type.
- [ ] Update profile save handling to merge existing secrets when an id is provided.
- [ ] Run the structure test and verify it passes.

### Task 3: Remote Settings UI State

**Files:**
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts`
- Modify: `src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx`
- Test: `src/appStructure.test.ts`

**Interfaces:**
- Consumes: desktop profile detail bridge and model validation helpers.
- Produces: add-profile controls, dirty/test state, failed-test confirmation save flow.

- [ ] Write failing structure tests for add buttons, helper text, save disabled until tested, and failed-test confirm copy.
- [ ] Run the structure test and verify failure.
- [ ] Load editable drafts when selecting existing profiles.
- [ ] Add draft status state and reset it on edits.
- [ ] Save directly after successful verification and show confirmation after failed verification.
- [ ] Run the structure test and focused profile tests.

### Task 4: Release

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `v0.4.1` release and updated `windows-x64-latest` channel.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Bump version to `0.4.1`.
- [ ] Commit and push.
- [ ] Run `npm run desktop:build:win`.
- [ ] Create `v0.4.1` GitHub Release and update `windows-x64-latest`.
