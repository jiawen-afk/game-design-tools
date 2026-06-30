---
name: game-design-tools-maintenance
description: Use when changing, refactoring, reviewing, testing, or extending the game-design-tools project, especially project management, local/remote storage, asset caching, workspace modules, document modules, architecture guards, and release checks.
---

# Game Design Tools Maintenance

## Overview

Preserve this repository as a set of focused workspaces with explicit boundaries. Project space is the storage boundary: the active project decides where assets, metadata, and sync state are saved. Prefer small, tested changes that strengthen the current architecture instead of pushing logic into page entries or broad shared files.

## Start Here

1. Run `git status --short --branch` and inspect relevant files before editing.
2. Read the nearest tests first; app, workspace, project-storage, and release architecture guards are split into focused `*Structure.test.ts` files, with `src/appStructure.test.ts` kept as the broad app-suite entry.
3. Keep edits inside the affected workspace unless a cross-workspace contract really changes.
4. Add or update an enforceable test before relying on prose or manual review for a new rule.
5. For project-management work, start with `currentProjectSpacePersistence.test.ts`, `projectSpaceState.test.ts`, `projectMigrationService.test.ts`, `projectAssetManager.test.ts`, `projectRemoteSyncQueue.test.ts`, and `projectAssetResourceResolver.test.ts`.

## Current Version Snapshot

As of `0.5.3`, the app is a Windows x64 Electron desktop tool with five user-facing surfaces:

- Project space: project-scoped characters, portraits, sprite sheets, voice assets, storyboard groups, shared materials, settings, project switching, remote sync status, and failed-sync retry.
- Sprite workbench: image batches, sprite sheets, video frames, matte/background removal, shared-canvas alignment, playback preview, ordering, batch Upscayl preview, side-by-side original/upscaled playback, and sprite package export. Playback upscale is mutually exclusive: input-image upscale fixes blurry matte sources, then reapplies flow 3 canvas, layout, stroke, and outline parameters without enlarging export frame size; result-image upscale enlarges composed flow 3 frames and exports the enlarged frame size.
- Image processing workbench: single-image upload, matte, crop, result preview, optional Upscayl flow, and common image export.
- Voice workbench: local VoxCPM Gradio setup, dependency checks, service control, voice generation, history management, reference cloning, and collection into project assets.
- Document knowledge workbench: project document collection, SHJ graph import, graph browsing, category filtering, node detail actions, search results, and project-scoped document persistence.

Storage behavior is now project-first:

- Local projects use a local SQLite database and local object files.
- Remote projects require both a remote DB and remote object storage. The first remote storage provider is Qiniu Kodo; DB providers are PostgreSQL and MySQL.
- Remote connection profiles are local device configuration. Do not persist or silently rewrite shared project identity with another device's profile ids.
- Remote asset lists read metadata and covers from the DB. Full resources must load through the project asset manager and fingerprint cache only when viewed or played.
- Document knowledge rows and graph links belong to the project repository layer. Local and remote repositories should share graph row mapping helpers while keeping SQLite/PostgreSQL/MySQL access in focused repository modules.
- Automatic sync is the main path. The header no longer has a permanent sync button; failed sync stays visible in the bottom-right status panel and retries from there.

## Architecture Rules

- `src/App.tsx` owns shell rendering and workspace selection. `src/appNavigation.ts` owns tool metadata, shortcuts, and editable-target checks; `src/AppWorkspaceBoundary.tsx` owns workspace loading/error recovery; `src/useCurrentProjectSpaceLabel.ts` owns the current project-space label.
- Workspace `index.tsx` files compose panels and dialogs. Do not put service calls, storage routines, payload mapping, or large render subtrees back into them.
- UI panels render and collect user input. Hooks own state, effects, workflow orchestration, and Ant Design feedback.
- `*Model.ts` files own pure logic, types, constants, validation, and payload shaping. Keep them browser-API free.
- `*Service.ts`, `*Storage.ts`, `*Actions.ts`, and collectors own IO side effects: fetch, Gradio calls, File System Access, local storage, blob reads/writes.
- Electron IPC and repository code must stay split by responsibility. Do not move domain handlers back into `electron/main.cjs`, project row/schema helpers back into broad repositories, or object/profile/repository handlers back into one IPC file.
- Top-level CSS files such as `src/styles/app.css` and workspace `workspace.css` files should import focused CSS modules. Do not rebuild monolithic style files when adding panels or states.
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
- Upscayl processing uses the bundled `upscayl-bin.exe` GPU path. The current Windows runtime supports automatic GPU selection and explicit GPU ids, but rejects CPU-style `-g -1`; do not expose CPU upscale mode unless the runtime changes and is verified.
- Sprite upscale export must not silently fall back to original frames. If input-image or result-image upscale is enabled and any visible frame lacks a current result for that selected mode, block export and tell the user to batch upscale the visible frames first.
- Keep deployment/runtime workflows shared. VoxCPM and BiRefNet setup should reuse focused desktop service runtime helpers and script fragments instead of duplicating process launch, service install, and Python runtime checks.
- When navigation metadata moves, update structure tests to assert the new source of truth. Avoid forcing `App.tsx` to keep copied home-card metadata just to satisfy an old guard.
- Large architecture tests should be split by responsibility and executed through `scripts/run-tests.mjs`; keep `npm test` as the release gate instead of maintaining one very long inline test command.
- Prefer GitHub Actions releases. Local Windows packaging is diagnostic only unless the online workflow is unavailable.

## Module Map

- `src/components/MultiFrameSpriteWorkspace/`: sprite sheet, video frames, matte, layout, playback, AI matting setup, batch upscale preview, export, and project collection. Keep pure rules in focused model files such as `layout*Model.ts`, `matte*Model.ts`, `spriteSheetModel.ts`, `frameCompositionModel.ts`, `playbackModel.ts`, and `spriteUpscaleModel.ts`; keep browser/canvas/blob work in pipeline files and `use*Workspace.ts` hooks.
- `src/components/ProjectStorage/`: project creation, editing, enable/disable, local -> remote migration, DB/object-storage validation, remote sync helpers, document repositories, and document graph persistence. Keep schema, row mapping, repository contracts, profile validation, object upload, and migration/sync phases in focused files.
- `src/components/VoiceDeploymentWorkspace/`: VoxCPM setup and voice generation. Keep Gradio/local service IO in `voiceDeploymentService.ts`, payload/model logic in `voiceDeploymentModel.ts` and `voiceHardwareModel.ts`, setup in `useVoiceDeploymentSetup.ts`, generation in `useVoiceGenerationWorkflow.ts`, history in `useVoiceRecordLibrary.ts`, and project-space collection in `voicePersonalSpaceCollector.ts` plus collect-link helpers.
- `src/components/PersonalSpaceWorkspace/`: project space. Keep aggregation in `usePersonalSpaceWorkspace.ts`, cross-cutting action creation in `usePersonalSpaceWorkspaceActions.ts`, project startup in lifecycle/state loader helpers, project-management orchestration in focused panel hooks/actions, pure asset/character/storyboard/state logic in `personalSpace*.ts` model files, and file/resource IO in storage/action files. Keep `personalSpace.css` as an import hub for focused CSS modules.
- `src/components/DocumentWorkspace/`: document knowledge. Keep graph/category/filter/focus/node-action rules in focused `documentGraph*Model.ts` files, SHJ import conversion and validation in `shjGraph*` helpers, collection/import workflows in hooks, and graph/browser/search presentation in dedicated panels. Do not fold document graph logic into project space UI.
- `src/components/DesktopServiceRuntime/`: shared setup terminal and service-command workflow for desktop-only runtimes. Reuse it for VoxCPM and BiRefNet style services.
- `electron/`: keep main process wiring thin. IPC handlers, service clients, local/remote schema, row shaping, document queries, object storage handlers, and repository runners belong in focused modules.

## Common Playbooks

- Adding a tool: update `src/appNavigation.ts`, add or lazy-load the workspace in `App.tsx`, add a workspace directory with an entry file, panels, hooks, models, and focused structure/model tests. Do not make project space a numbered tool shortcut.
- Changing the app shell: update the focused app shell/navigation/error-boundary tests instead of growing `src/appStructure.test.ts`.
- Changing project management: update the persistence and migration tests first. Keep the current-project switcher, project cards, and the project management page as the entry point for project-level storage changes.
- Changing remote configuration: validate the DB and object storage together. Saving should update the existing config entry; a new config needs an explicit add action.
- Changing personal space: write model/storage tests first when behavior changes. Keep `地图素材`, `特效素材`, and `配音素材` managed as distinct resource sections.
- Refactoring personal space: start with `PersonalStoryboardPanel.tsx`, `StoryboardGroupCard.tsx`, `PersonalResourceSections.tsx`, `ProjectManagementPanel.tsx`, `usePersonalSpaceWorkspace.ts`, and the focused `personalSpace.*.css` files. Prefer extracting one workflow at a time: asset preview, storyboard playback, storyboard drag/drop, asset picker modal, resource group controls, project-management tabs, or shared recent/starred filter controls.
- Changing voice workflows: test payload/default/history behavior in `voiceDeploymentModel.test.ts`; keep fetch and Gradio event parsing in the service layer; keep "收藏到项目空间" and association flows connected through the collector/link dialog.
- Changing sprite/video/matte/layout/playback/upscale workflows: keep UI panels thin, keep math and transformation rules in pure models, and test model-level behavior before wiring UI.
- Changing project asset caching: keep remote fetch, cache selection, and invalidation in `ProjectAssetManager`-style helpers. Fingerprint/sha changes should force a fresh download; list views should not eagerly download payloads.
- Changing document knowledge: update graph/category/filter/import model tests first. Route persistence through `ProjectStorage` document repositories and shared graph row helpers; avoid a parallel browser-only storage path.
- Changing deployment scripts: preserve Windows paths, Python/VoxCPM/BiRefNet checks, service-manager behavior, common script fragments, and the Vite build copy to `/scripts`.
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

## Document Knowledge Rules

When changing document-related features, keep them aligned with project storage:

- Model documents as project-linked records with explicit graph node/link/category rows. If source files or rendered previews become heavyweight resources, store them as object resources with stable ids and fingerprints.
- Store searchable metadata, graph relationships, render/import status, and generation settings in the project database.
- Separate document parsing/import/rendering IO from UI. Use `*Service.ts` for file parsing or generation, `*Model.ts` for payload/state mapping, `shjGraph*` helpers for SHJ import boundaries, and focused preview/browser components for presentation.
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
