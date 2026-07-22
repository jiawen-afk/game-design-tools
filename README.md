# Game Design Tools

Game Design Tools is a Windows desktop workbench for producing and managing game assets. It combines sprite preparation, image cleanup, local voice and sound generation, video conversion, document knowledge, and project-scoped storage in one Electron app.

[中文文档](README.zh-CN.md)

## Current Version

- Latest published version: `0.7.3`
- Windows x64 packages are published through GitHub Releases.
- The stable auto-update channel is the `windows-x64-latest` Release.

## Highlights

- **Project space**: manage characters, storyboards, shared images, sprite sheets, voice assets, sound assets, and documents by project. The enabled project is the storage target for new assets and metadata.
- **Local and remote projects**: local projects use SQLite and local object files. Remote projects require PostgreSQL or MySQL plus Qiniu Kodo object storage.
- **On-demand remote assets**: lists load metadata and covers first; full resources are downloaded and cached by fingerprint when opened or played.
- **Automatic sync and recovery**: project changes sync automatically. Failed tasks remain visible in the status panel and can be retried there.
- **Sprite workbench**: import images, sprite sheets, or video clips; remove backgrounds with color keying or BiRefNet; align frames; preview animation; batch upscale; and export sprite packages.
- **Image processing workbench**: batch-manage images, crop, matte with color keying or BiRefNet, preview results, upscale with Upscayl GPU, and export common image formats.
- **Video processing workbench**: resize by percentage or target dimensions, enlarge with Upscayl GPU super-resolution, compress by quality or target size, and export OGV, WebM, or MP4 files.
- **Voice workbench**: install and control a local VoxCPM Gradio service, generate or clone WAV voices, edit clips, manage history, and collect audio into project space.
- **Sound generation**: install Stable Audio 3 locally and generate sound effects, ambience, short music, and loops with the selected model.
- **Document knowledge**: import structured knowledge, search records, browse graph relationships, and keep collections inside the active project.

## Target Platform and Runtimes

- Windows 10 or Windows 11, x64
- NVIDIA GPU recommended for VoxCPM, Stable Audio 3, BiRefNet, and Upscayl acceleration
- Python 3.12 for the local AI service setup flows
- **Upscayl GPU is required for GPU super-resolution** in the image, sprite, and video workbenches
- **FFmpeg and FFprobe** are required by the video workbench for probing, decoding, compression, and OGV/WebM/MP4 output

The app installs supported runtimes from their workbench setup controls. Upscayl files are cached under `%LOCALAPPDATA%\GameDesignTools\UpscaylRuntime`; the pinned FFmpeg/FFprobe package is verified and cached under `%LOCALAPPDATA%\GameDesignTools\VideoRuntime`. Reopening the app reuses valid local runtime files instead of downloading them again.

## Install

Download a Windows x64 package from the [GitHub Releases page](https://github.com/jiawen-afk/game-design-tools/releases):

- `Game Design Tools-{version}-x64-setup.exe`: installer
- `Game Design Tools-{version}-x64-portable.exe`: portable app
- `Game Design Tools-{version}-x64-win.zip`: zipped desktop app

## First Run

1. Open **Project Space** and authorize a local resource directory.
2. Use the default local project, or create a local or remote project in project management.
3. For a remote project, configure and verify both:
   - a PostgreSQL or MySQL database profile;
   - a Qiniu Kodo object-storage profile.
4. Initialize the remote database schema before creating or migrating a remote project.
5. Enable one project to make it the current storage target.

Remote connection profiles stay local to each device. Shared project rows and objects remain in the configured remote database and object storage.

## Workspaces

- **Project Space**: characters, portraits, sprite sheets, voice and sound assets, storyboards, shared materials, settings, remote sync state, and project switching.
- **Sprite Workbench**: upload and split sources, color-key or BiRefNet matting, shared-canvas alignment, stroke/outline composition, playback, ordering, batch Upscayl preview, and sprite export.
- **Image Processing Workbench**: per-image settings, crop, color-key or BiRefNet matting, Upscayl GPU processing, preview, and export.
- **Video Processing Workbench**: serial batch resize, GPU super-resolution, format-aware compression, optional audio, frame-rate control, remembered output directory, native Godot 4.6 OGV export, plus WebM and MP4 delivery formats.
- **Voice Workbench**: VoxCPM setup, local Gradio service control, voice generation and cloning, audio editing, Stable Audio 3 sound generation, history, and project collection.
- **Document Knowledge Workbench**: project-scoped collection, SHJ graph import, search, category filtering, graph browsing, and node details.

## AI and Media Runtime Setup

- **Upscayl GPU**: install it from the relevant workbench before running upscale jobs. GPU selection, model, tile size, thread profile, and TTA options are available where supported.
- **BiRefNet**: install dependencies and the `ZhengPeng7/BiRefNet_HR-matting` model from the matting setup panel, then start the local service.
- **VoxCPM**: select a VoxCPM model, install the local service dependencies, and control the Gradio service from the voice workbench.
- **Stable Audio 3**: choose a model, accept the model repository terms on Hugging Face when required, install dependencies, and start the local generation service.
- **FFmpeg/FFprobe**: install the pinned, checksum-verified LGPL shared build from the video toolbar. Installation retries approved mirrors and replaces the runtime atomically after verification.

## Godot 4.6 Video Workflow

The default and Godot-native format is an Ogg container with Theora `yuv420p` video and optional Vorbis audio. The workbench can also export WebM with VP9/Opus and MP4 with OpenH264/AAC for browsers, conventional players, and asset exchange. Godot 4.6 native `VideoStreamPlayer` playback should continue to use OGV; WebM and MP4 require a separate playback integration.

1. Open **Video Processing Workbench** with tool shortcut `4`.
2. Install the pinned FFmpeg/FFprobe runtime.
3. Install **Upscayl GPU** before enabling GPU super-resolution.
4. Import one or more videos and choose an output directory. The video workbench remembers the most recently authorized directory.
5. Choose OGV, WebM, or MP4, then configure resize percentage or dimensions, compression mode, target FPS, audio mode, and optional advanced Upscayl settings.
6. Start the queue. Jobs run serially; a failed item does not prevent later items from running.
7. For native Godot playback, add the generated `.ogv` file to a Godot 4.6 project and assign it to `VideoStreamPlayer.stream`.

Theora is less compression-efficient than VP9 or H.264 at comparable visual quality, but it remains the direct Godot option. Every output format is checked for its expected container, video/audio codecs, resolution, frame rate, stream count, and excessive audio/container tails before publication.

An optional headless smoke project is included at `test-fixtures/godot-video-smoke`. Copy a generated file to `test-fixtures/godot-video-smoke/sample.ogv`, then run:

```powershell
godot --headless --path test-fixtures/godot-video-smoke --script res://video_smoke.gd --quit-after 120 -- res://sample.ogv
```

The smoke test succeeds only when Godot loads the file as `VideoStreamTheora` and `VideoStreamPlayer` starts playback.

## Project Storage Model

- Local mode uses a local SQLite project database and local object files.
- Remote mode requires a remote database plus Qiniu Kodo.
- Local-to-remote migration is supported; remote-to-local migration is not.
- Project, character, storyboard, asset, and asset-group deletion is permanent.
- Remote full-resource reads go through the project asset manager and fingerprint cache.

## Third-Party Software

The app's **About** dialog lists the major desktop/media runtimes, AI models and services, direct application libraries, and build tools used by this project. Each entry includes its purpose, project page, and applicable license links. The complete npm dependency graph remains available through `package.json`, `package-lock.json`, and the packages' own metadata.

Code licenses and model-weight licenses are not interchangeable. In particular, Stable Audio 3 inference code is MIT licensed, while its model weights use the Stability AI Community License and may include additional Gemma terms. Review the linked terms before downloading or distributing model assets.

The bundled video runtime is a pinned LGPL shared FFmpeg build and includes the codec implementations used by the workbench, including libvpx, Opus, and OpenH264. Software licenses do not settle codec patent questions: anyone distributing or commercially using H.264/AAC, H.265/HEVC, or other patent-encumbered codecs must evaluate obligations for their own product and jurisdictions. Game Design Tools does not output H.265.

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

Artifacts are written to `../game-design-tools-windows-x64`. Local packaging is diagnostic; public releases should be built by GitHub Actions.

## Release Process

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

After the workflow succeeds, verify the versioned Release, `windows-x64-latest`, and its `latest.yml` updater metadata.

## Project Structure

- `src/components/MultiFrameSpriteWorkspace`: sprite upload, video frames, matte, layout, playback, batch upscale, and export
- `src/components/ImageProcessingWorkspace`: batch image cleanup, crop, matte, upscale, preview, and export
- `src/components/VideoProcessingWorkspace`: video resize, GPU super-resolution, compression, serial queue, output-directory persistence, verification, and OGV/WebM/MP4 export
- `src/components/VoiceDeploymentWorkspace`: VoxCPM, audio editing, Stable Audio 3, history, and project collection
- `src/components/DocumentWorkspace`: project document collection, graph import, browsing, filtering, search, and node actions
- `src/components/PersonalSpaceWorkspace`: project space UI, project management, assets, settings, and remote sync state
- `src/components/ProjectStorage`: local/remote repositories, object storage, migration, asset cache, and document persistence
- `electron`: desktop shell, IPC handlers, runtimes, local SQLite, remote databases, Qiniu Kodo, and hardened preload bridge
- `scripts`: Windows deployment/service scripts for VoxCPM, BiRefNet, Stable Audio 3, and image encoders

## Verification

Before publishing or claiming completion, run:

```powershell
npm test
npm run build
git diff --check
```

## Repository

GitHub: https://github.com/jiawen-afk/game-design-tools
