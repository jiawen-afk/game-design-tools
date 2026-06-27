---
name: game-design-tools-maintenance
description: Use when changing, refactoring, reviewing, testing, or extending the game-design-tools project, especially project management, local/remote storage, asset caching, workspace modules, document modules, architecture guards, and release checks.
---

# Game Design Tools Maintenance

## Overview

Preserve this repository as a set of focused workspaces with explicit boundaries. Project space is the storage boundary: the active project decides where assets, metadata, and sync state are saved. Prefer small, tested changes that strengthen the current architecture instead of pushing logic into page entries or broad shared files.

## Start Here

1. Run `git status --short --branch` and inspect relevant files before editing.
2. Read the nearest tests first; `src/appStructure.test.ts` is the main architecture guard.
3. Keep edits inside the affected workspace unless a cross-workspace contract really changes.
4. Add or update an enforceable test before relying on prose or manual review for a new rule.
5. For project-management work, start with `currentProjectSpacePersistence.test.ts`, `projectSpaceState.test.ts`, `projectMigrationService.test.ts`, `projectAssetManager.test.ts`, `projectRemoteSyncQueue.test.ts`, and `projectAssetResourceResolver.test.ts`.

## Current Version Snapshot

As of `0.4.44`, the app is a Windows x64 Electron desktop tool with four user-facing surfaces:

- Project space: project-scoped characters, portraits, sprite sheets, voice assets, storyboard groups, shared materials, settings, project switching, remote sync status, and failed-sync retry.
- Sprite workbench: image batches, sprite sheets, video frames, matte/background removal, shared-canvas alignment, playback preview, ordering, and sprite package export.
- Image processing workbench: single-image upload, matte, crop, result preview, optional upscale flow, and common image export.
- Voice workbench: local VoxCPM Gradio setup, dependency checks, service control, voice generation, history management, reference cloning, and collection into project assets.

Storage behavior is now project-first:

- Local projects use a local SQLite database and local object files.
- Remote projects require both a remote DB and remote object storage. The first remote storage provider is Qiniu Kodo; DB providers are PostgreSQL and MySQL.
- Remote connection profiles are local device configuration. Do not persist or silently rewrite shared project identity with another device's profile ids.
- Remote asset lists read metadata and covers from the DB. Full resources must load through the project asset manager and fingerprint cache only when viewed or played.
- Automatic sync is the main path. The header no longer has a permanent sync button; failed sync stays visible in the bottom-right status panel and retries from there.

## Architecture Rules

- `src/App.tsx` owns the app shell, tool navigation, and global project-space entry. The code still uses `personal-space`/`PersonalSpaceWorkspace` names in places, but the user-facing concept is project space.
- Workspace `index.tsx` files compose panels and dialogs. Do not put service calls, storage routines, payload mapping, or large render subtrees back into them.
- UI panels render and collect user input. Hooks own state, effects, workflow orchestration, and Ant Design feedback.
- `*Model.ts` files own pure logic, types, constants, validation, and payload shaping. Keep them browser-API free.
- `*Service.ts`, `*Storage.ts`, `*Actions.ts`, and collectors own IO side effects: fetch, Gradio calls, File System Access, local storage, blob reads/writes.
- Project configuration is project-scoped, not device-scoped. Do not "repair" a missing local profile binding by silently rebinding the project to the current machine; keep the project identity stable across devices.
- Local mode uses the local database and local asset cache. Remote mode requires both remote DB and remote object storage. Treat a partially configured remote project as invalid until both sides are verified.
- Project migration is local -> remote only. Make it idempotent and safe for repeated clicks; do not assume a visible intermediate state will be enough.
- Project and `asset_groups` deletions are hard deletes. Do not reintroduce soft-delete state, restore flows, or prefixed IDs.
- Asset reads in remote mode go through the project asset manager and fingerprinted cache. Lists should show covers; full resources load on demand.
- Treat production TS/TSX files over about 300 lines as audit candidates. Split only around real responsibilities, not line count alone.
- Project management changes should be covered by the persistence and migration tests before UI polish.
- Repeated project-management controls should converge instead of copying: project cards, enable/disable state, config editors, validation prompts, and remote sync status belong in focused helpers/components once they appear in more than one place.
- Preview and storage-read logic belongs outside listing panels when it grows beyond rendering. Keep `readStoredResourceBlob`, directory handle restoration, object URL cleanup, audio playback, image modals, and sprite playback in preview-focused hooks/components.
- Drag/drop and sequential playback are interaction workflows, not plain markup. Keep storyboard voice ordering math in pure helpers and move drag state or playback queue orchestration into focused hooks when changing that behavior.
- When adding a new boundary, add a structure test that prevents the old mixed responsibility from returning.

## Development Lessons

- Treat user-facing names as part of the feature. Old "personal space" copy should not reappear in UI or README when the concept is now project space.
- Verify remote behavior with the current device model. Multiple devices on one remote project are normal; never solve missing local connection config by mutating shared project rows.
- Make migration and sync idempotent. Users may click migration/sync repeatedly, close the app, reopen on another machine, or retry after network failures.
- Do not upload duplicate remote resources when a stable asset already has unchanged hash/size resources. Reuse existing rows and object keys when safe.
- Covers must stay small. Current generated covers should be lightweight WebP thumbnails; avoid full-size cover uploads.
- Keep sync recovery in the sync status surface. Auto-sync owns normal writes, failed tasks stay visible in the floating status panel, and retries happen there.
- For remote read failures, error messages should use project names, not raw ids, unless the id is the only available diagnostic.
- Prefer GitHub Actions releases. Local Windows packaging is diagnostic only unless the online workflow is unavailable.

## Module Map

- `src/components/MultiFrameSpriteWorkspace/`: sprite sheet, video frames, matte, layout, playback, export. Keep pipeline/model logic in `model.ts`, `layoutModel.ts`, `matteModel.ts`, `videoModel.ts`, `cropModel.ts`, `guideModel.ts`, `playbackModel.ts`, `imagePipeline.ts`, and `videoFramePipeline.ts`; keep state workflows in the `use*Workspace.ts` hooks.
- `src/components/ProjectStorage/`: project creation, editing, enable/disable, local -> remote migration, DB/object-storage validation, and remote sync helpers. Keep persistence and migration rules test-driven and separate from presentation.
- `src/components/VoiceDeploymentWorkspace/`: VoxCPM setup and voice generation. Keep Gradio/local service IO in `voiceDeploymentService.ts`, payload/model logic in `voiceDeploymentModel.ts`, setup in `useVoiceDeploymentSetup.ts`, generation in `useVoiceGenerationWorkflow.ts`, and personal-space collection in `voicePersonalSpaceCollector.ts` plus `useVoiceCollectLinkDialog.ts`.
- `src/components/PersonalSpaceWorkspace/`: project space. Keep aggregation in `usePersonalSpaceWorkspace.ts`, settings feedback and directory authorization in `usePersonalSpaceSettingsWorkspace.ts`, pure asset/character/storyboard/state logic in the `personalSpace*.ts` model files, and file/resource IO in storage/action files. Treat the storyboard panel, resource section panel, character panel, and `personalSpace.css` as split candidates whenever a change adds a new workflow or repeats an existing project-space control pattern.
- Future document modules should get their own workspace directory, for example `src/components/DocumentWorkspace/`, plus focused model/service/storage files. Do not fold document parsing, document preview, or document generation into project space except for collection/linking workflows.

## Common Playbooks

- Adding a tool: update `App.tsx`, add a workspace directory with an entry file, panels, hooks, models, and tests. Do not make personal space a numbered tool shortcut.
- Changing project management: update the persistence and migration tests first. Keep the current-project switcher, project cards, and the project management page as the entry point for project-level storage changes.
- Changing remote configuration: validate the DB and object storage together. Saving should update the existing config entry; a new config needs an explicit add action.
- Changing personal space: write model/storage tests first when behavior changes. Keep `地图素材`, `特效素材`, and `配音素材` managed as distinct resource sections.
- Refactoring personal space: start with `PersonalStoryboardPanel.tsx`, `PersonalResourceSections.tsx`, `PersonalCharacterPanel.tsx`, `usePersonalSpaceWorkspace.ts`, and `personalSpace.css`. Prefer extracting one workflow at a time: asset preview, storyboard playback, storyboard drag/drop, asset picker modal, resource group controls, or shared recent/starred filter controls.
- Changing voice workflows: test payload/default/history behavior in `voiceDeploymentModel.test.ts`; keep fetch and Gradio event parsing in the service layer; keep "收藏到个人空间" and association flows connected through the collector/link dialog.
- Changing sprite/video/matte/layout workflows: keep UI panels thin, keep math and transformation rules in pure models, and test model-level behavior before wiring UI.
- Changing project asset caching: keep remote fetch, cache selection, and invalidation in `ProjectAssetManager`-style helpers. Fingerprint/sha changes should force a fresh download; list views should not eagerly download payloads.
- Adding a document module: define the document asset type, resource rows, generated artifacts, and preview/cache strategy before UI work. If documents become project assets, route persistence through `ProjectStorage` and project asset manager instead of introducing a parallel storage path.
- Changing deployment scripts: preserve Windows and macOS/Linux paths, Python/VoxCPM checks, service-manager behavior, and the Vite build copy to `/scripts`.
- Publishing a Windows release: prefer the GitHub Actions workflow over local `electron-builder`. Bump `package.json` and `package-lock.json`, run `npm test`, `npm run build`, and `git diff --check`, then commit, push `master`, create/push the version tag, and let `.github/workflows/windows-release.yml` build online. The `master` push updates the stable updater release `windows-x64-latest`; a plain `vX.Y.Z` tag does not auto-trigger the workflow because the tag trigger only matches `v*-windows-x64*`. To create the versioned Release, dispatch the workflow explicitly:

```powershell
git push origin master
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin vX.Y.Z
gh workflow run windows-release.yml --repo jiawen-afk/game-design-tools --ref master -f tag=vX.Y.Z
gh run watch <run-id> --repo jiawen-afk/game-design-tools --exit-status
```

After the workflow succeeds, verify both release targets before claiming the release is available:

```powershell
gh release view vX.Y.Z --repo jiawen-afk/game-design-tools
gh release view windows-x64-latest --repo jiawen-afk/game-design-tools
(Invoke-RestMethod "https://github.com/jiawen-afk/game-design-tools/releases/download/windows-x64-latest/latest.yml") -split "`n" | Select-Object -First 12
```

`latest.yml` must show the new `version:` and hyphenated asset names such as `Game-Design-Tools-X.Y.Z-x64-setup.exe`. Local `npm run desktop:build:win` is only a fallback diagnostic; do not manually publish stale local artifacts when the workflow can build and upload the Release.

## Document Module Preparation

When adding document-related features, keep the first version deliberately aligned with existing project storage:

- Model documents as project assets or project-linked records only after deciding what the primary resource is: source document, parsed text, rendered pages, extracted images, generated document, or all of these.
- Store heavyweight files as object resources; store searchable metadata, relationships, render status, and generation settings in the project database.
- Use stable resource ids and content fingerprints. Remote mode should cache rendered previews and downloaded source files the same way image, sprite, and audio resources are cached.
- Separate document parsing/rendering IO from UI. Use `*Service.ts` for file parsing or generation, `*Model.ts` for payload/state mapping, and focused preview components for page rendering.
- If document content can be associated with characters, storyboards, or assets, represent those as explicit project relations. Do not bring back removed tags or notes as a shortcut.
- Add schema tests before introducing new DB tables or fields. Include PostgreSQL, MySQL, and SQLite considerations when the change affects project storage.

## Verification

For behavior changes, prefer the smallest relevant test first, then run the full gate:

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Use the in-app browser for meaningful frontend changes after the dev server is running. Check the affected viewport and interaction, not only build output.

## Self-Iteration

Update this skill when repeated review feedback, new workspace boundaries, new required commands, or recurring mistakes appear. Prefer adding `appStructure.test.ts` or model tests for enforceable rules, then update this document so future agents understand why the guard exists.
