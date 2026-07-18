# Game Design Tools

Game Design Tools is a Windows desktop workbench for game asset production. It combines sprite preparation, image cleanup, local voice generation, and project-scoped asset management in one Electron app.

[中文文档](README.zh-CN.md)

## Current Version

- Latest published version: `0.5.1`
- Windows x64 packages are published through GitHub Releases.
- The stable auto-update channel is the `windows-x64-latest` release.

## Highlights

- **Project space**: manage characters, storyboards, shared images, sprite assets, and voice assets by project. The enabled project is the storage target for new assets and metadata.
- **Local and remote project modes**: local projects use a local SQLite database and local object files. Remote projects require both a remote database and Qiniu Kodo object storage.
- **Remote database support**: configure and verify PostgreSQL or MySQL connections, initialize project tables, and keep device profile bindings local to each computer.
- **Remote object storage**: configure and verify Qiniu Kodo profiles. Project objects are stored under project-aware object keys.
- **Remote asset cache**: remote project lists load metadata and covers from the database. Full images, sprite sheets, sprite indexes, and audio files are downloaded on demand and cached by fingerprint.
- **Automatic sync with retry**: project changes sync to remote storage automatically. Failed sync tasks stay visible in the bottom-right status panel and can be retried there.
- **Sprite workbench**: import image batches, sprite sheets, or video clips, remove backgrounds, align frames on a shared canvas, preview playback, sort frames, and export sprite packages. Flow 4 upscale is mutually exclusive: input-image upscale fixes blurry matte sources and then reapplies flow 3 canvas, layout, stroke, and outline parameters; result-image upscale enlarges the composed flow 3 frames and exports the enlarged frame size.
- **Image processing workbench**: upload a single image, key out backgrounds, crop, preview, optionally upscale with the local Upscayl runtime, and export common image formats.
- **Video Processing Workbench**: resize by percentage or target dimensions, use Upscayl GPU for enlargement, compress with Theora quality or target-size modes, and export Godot 4.6-compatible `.ogv` files.
- **Voice workbench**: connect to a local VoxCPM Gradio service, generate WAV voice assets from text, clone from reference audio, manage voice history, and collect generated audio into project space.
- **Desktop VoxCPM support**: detect Windows hardware, query dependency installation, run dependency setup, and start, stop, or restart the local VoxCPM service from the app.

## Target Platform

- Windows 10 / Windows 11
- x64
- NVIDIA GPU recommended for VoxCPM service acceleration
- GPU acceleration is used by the local Upscayl runtime for image and sprite upscale processing
- Python 3.12 is required by the VoxCPM dependency setup flow

## Install

Download the Windows x64 package from the [GitHub Releases page](https://github.com/jiawen-afk/game-design-tools/releases), then choose one artifact:

- `Game Design Tools-{version}-x64-setup.exe`: installer with Start Menu and desktop shortcut options
- `Game Design Tools-{version}-x64-portable.exe`: portable app
- `Game Design Tools-{version}-x64-win.zip`: zipped desktop app

## First Run

1. Open **Project Space** and authorize a local resource directory.
2. Use the default local project, or open project management to create a new local or remote project.
3. For a remote project, configure and verify both:
   - PostgreSQL or MySQL database profile
   - Qiniu Kodo object storage profile
4. Initialize the remote database schema before creating or migrating a remote project.
5. Use the **Enable** switch on a project card to make it the active storage target.

Remote projects are designed for multiple devices. Database and Kodo connection profiles are stored locally per device; project data itself stays shared in the remote database and object storage.

## Workspaces

- **Project Space**: role assets, portraits, sprite sheets, voice assets, storyboard groups, shared materials, project settings, and project switching.
- **Sprite Workbench**: background removal, frame alignment, sprite sheet preview, frame ordering, side-by-side original/upscaled playback, mutually exclusive input-image or result-image batch upscale, and original or upscaled export.
- **Image Processing Workbench**: single-image cleanup, crop, matte, optional Upscayl upscale flow, and export.
- **Video Processing Workbench**: serial batch resize, GPU super-resolution, Theora compression, Vorbis or muted audio, and native Godot 4.6 OGV export.
- **Voice Workbench**: VoxCPM setup, local Gradio service control, voice generation, history, and collection into project assets.

## Godot 4.6 Video Workflow

The video workspace always writes an Ogg container with Theora video in `yuv420p` and optional Vorbis audio. It intentionally does not produce H.264, H.265, AV1, VP9, MP4, MKV, or WebM output, because the target is Godot 4.6 native `VideoStreamTheora` playback.

1. Open **Video Processing Workbench** from tool shortcut `4`.
2. Install the pinned FFmpeg runtime from the toolbar.
3. Install **Upscayl GPU** before using any enlargement above 100%. Enlargement never falls back silently to conventional scaling.
4. Import one or more videos and choose the output directory.
5. Configure the resize percentage or dimensions, compression mode, target FPS, and audio mode.
6. Start the queue. Tasks run serially and a failed item does not stop later items.
7. Add the generated `.ogv` file to a Godot 4.6 project and assign it to `VideoStreamPlayer.stream`.

Theora is less compression-efficient than modern codecs at comparable visual quality. This workflow prioritizes direct Godot 4.6 compatibility and predictable local playback over the smallest possible file.

An optional headless smoke project is included at `test-fixtures/godot-video-smoke`. Copy a generated file to `test-fixtures/godot-video-smoke/sample.ogv`, then run:

```powershell
godot --headless --path test-fixtures/godot-video-smoke --script res://video_smoke.gd --quit-after 120 -- res://sample.ogv
```

The smoke test succeeds only when Godot loads the file as `VideoStreamTheora` and `VideoStreamPlayer` starts playback.

## Project Storage Model

- Local mode uses a local SQLite project database and local object files.
- Remote mode requires a remote database plus Qiniu Kodo.
- Local to remote migration is supported. Remote to local migration is not supported in the first version.
- Project, character, storyboard, asset, and asset group deletion is hard delete.
- Remote asset reads go through the project asset manager and cache. List views should not eagerly download full resources.

## Local Development

```powershell
npm install
npm test
npm run build
npm run desktop:dev
```

## Build Windows Packages Locally

```powershell
npm run desktop:build:win
```

Artifacts are written to:

```text
../game-design-tools-windows-x64
```

Local packaging is mainly useful for diagnostics. Public releases should be built by GitHub Actions.

## Release Process

Preferred release flow:

```powershell
npm test
npm run build
git diff --check
git push origin master
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin vX.Y.Z
gh workflow run windows-release.yml --repo jiawen-afk/game-design-tools --ref master -f tag=vX.Y.Z
gh run watch <run-id> --repo jiawen-afk/game-design-tools --exit-status
```

After the workflow succeeds, verify:

```powershell
gh release view vX.Y.Z --repo jiawen-afk/game-design-tools
gh release view windows-x64-latest --repo jiawen-afk/game-design-tools
(Invoke-RestMethod "https://github.com/jiawen-afk/game-design-tools/releases/download/windows-x64-latest/latest.yml") -split "`n" | Select-Object -First 12
```

`latest.yml` must point to the published version.

## Project Structure

- `src/components/MultiFrameSpriteWorkspace`: sprite sheet, video frame, matte, layout, playback, batch upscale preview, and export workflows
- `src/components/ImageProcessingWorkspace`: single-image cleanup, crop, matte, upscale, and export workflows
- `src/components/VideoProcessingWorkspace`: batch video resize, Upscayl GPU preview, Theora compression, serial queue, and Godot OGV export workflow
- `src/components/VoiceDeploymentWorkspace`: VoxCPM setup, service control, voice generation, history, and project collection workflows
- `src/components/PersonalSpaceWorkspace`: project space UI, project management, characters, storyboards, materials, settings, remote sync status, and project data orchestration
- `src/components/ProjectStorage`: project database models, local and remote repositories, object storage, migration, asset cache, and project asset manager
- `electron`: desktop shell, IPC handlers, local SQLite bridge, remote database bridge, Qiniu Kodo bridge, and hardened preload bridge
- `scripts`: Windows VoxCPM deployment and service scripts

## Verification

Before publishing or claiming a change is complete, run:

```powershell
npm test
npm run build
git diff --check
```

## Repository

GitHub: https://github.com/jiawen-afk/game-design-tools
