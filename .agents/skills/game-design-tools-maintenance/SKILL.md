---
name: game-design-tools-maintenance
description: Use when changing, refactoring, reviewing, testing, or extending the game-design-tools project, especially workspace modules, App.tsx navigation, appStructure.test.ts architecture guards, personal space, VoxCPM voice workflows, sprite/video/matte/layout pipelines, deployment scripts, or production build checks.
---

# Game Design Tools Maintenance

## Overview

Preserve this repository as a set of focused workspaces with explicit boundaries. Prefer small, tested changes that strengthen the existing architecture instead of adding logic to page entries or broad shared files.

## Start Here

1. Run `git status --short --branch` and inspect relevant files before editing.
2. Read the nearest tests first; `src/appStructure.test.ts` is the main architecture guard.
3. Keep edits inside the affected workspace unless a cross-workspace contract really changes.
4. Add or update an enforceable test before relying on prose or manual review for a new rule.

## Architecture Rules

- `src/App.tsx` owns the app shell, tool navigation, and global personal-space entry. Personal space is a cross-tool surface, not a tool-list item.
- Workspace `index.tsx` files compose panels and dialogs. Do not put service calls, storage routines, payload mapping, or large render subtrees back into them.
- UI panels render and collect user input. Hooks own state, effects, workflow orchestration, and Ant Design feedback.
- `*Model.ts` files own pure logic, types, constants, validation, and payload shaping. Keep them browser-API free.
- `*Service.ts`, `*Storage.ts`, `*Actions.ts`, and collectors own IO side effects: fetch, Gradio calls, File System Access, local storage, blob reads/writes.
- Treat production TS/TSX files over about 300 lines as audit candidates. Split only around real responsibilities, not line count alone.
- Personal space panels are current growth hotspots. When touching `PersonalStoryboardPanel.tsx`, `PersonalResourceSections.tsx`, or `PersonalCharacterPanel.tsx`, look for a nearby extraction before adding more state, modals, drag/drop, preview, filter, or create/rename UI.
- Repeated personal-space controls should converge instead of copying: searchable "recent 20 + keyword + only starred" filters, create/rename popovers, asset picker modals, group action rows, and stored-resource previews should live in focused helpers/components once they appear in two modules.
- Preview and storage-read logic belongs outside listing panels when it grows beyond rendering. Keep `readStoredResourceBlob`, directory handle restoration, object URL cleanup, audio playback, image modals, and sprite playback in preview-focused hooks/components.
- Drag/drop and sequential playback are interaction workflows, not plain markup. Keep storyboard voice ordering math in pure helpers and move drag state or playback queue orchestration into focused hooks when changing that behavior.
- When adding a new boundary, add a structure test that prevents the old mixed responsibility from returning.

## Module Map

- `src/components/MultiFrameSpriteWorkspace/`: sprite sheet, video frames, matte, layout, playback, export. Keep pipeline/model logic in `model.ts`, `layoutModel.ts`, `matteModel.ts`, `videoModel.ts`, `cropModel.ts`, `guideModel.ts`, `playbackModel.ts`, `imagePipeline.ts`, and `videoFramePipeline.ts`; keep state workflows in the `use*Workspace.ts` hooks.
- `src/components/VoiceDeploymentWorkspace/`: VoxCPM setup and voice generation. Keep Gradio/local service IO in `voiceDeploymentService.ts`, payload/model logic in `voiceDeploymentModel.ts`, setup in `useVoiceDeploymentSetup.ts`, generation in `useVoiceGenerationWorkflow.ts`, and personal-space collection in `voicePersonalSpaceCollector.ts` plus `useVoiceCollectLinkDialog.ts`.
- `src/components/PersonalSpaceWorkspace/`: global asset space. Keep aggregation in `usePersonalSpaceWorkspace.ts`, settings feedback and directory authorization in `usePersonalSpaceSettingsWorkspace.ts`, pure asset/character/storyboard/state logic in the `personalSpace*.ts` model files, and file/resource IO in storage/action files. Treat the storyboard panel, resource section panel, character panel, and `personalSpace.css` as split candidates whenever a change adds a new workflow or repeats an existing personal-space control pattern.

## Common Playbooks

- Adding a tool: update `App.tsx`, add a workspace directory with an entry file, panels, hooks, models, and tests. Do not make personal space a numbered tool shortcut.
- Changing personal space: write model/storage tests first when behavior changes. Keep `地图素材`, `特效素材`, and `配音素材` managed as distinct resource sections.
- Refactoring personal space: start with `PersonalStoryboardPanel.tsx`, `PersonalResourceSections.tsx`, `PersonalCharacterPanel.tsx`, `usePersonalSpaceWorkspace.ts`, and `personalSpace.css`. Prefer extracting one workflow at a time: asset preview, storyboard playback, storyboard drag/drop, asset picker modal, resource group controls, or shared recent/starred filter controls.
- Changing voice workflows: test payload/default/history behavior in `voiceDeploymentModel.test.ts`; keep fetch and Gradio event parsing in the service layer; keep "收藏到个人空间" and association flows connected through the collector/link dialog.
- Changing sprite/video/matte/layout workflows: keep UI panels thin, keep math and transformation rules in pure models, and test model-level behavior before wiring UI.
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
