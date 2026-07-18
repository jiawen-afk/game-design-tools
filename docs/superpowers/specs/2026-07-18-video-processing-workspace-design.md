# Video Processing Workspace Design

**Date:** 2026-07-18

**Status:** Approved

**Target application:** Game Design Tools

**Target engine:** Godot 4.6

## Summary

Add a standalone video processing workspace that prepares video assets for native playback through Godot 4.6 `VideoStreamTheora`. The workspace supports batch jobs, percentage-based or dimension-based resizing, mandatory Upscayl GPU super-resolution for enlargement, quality-oriented compression, optional target-file-size encoding, and `.ogv` export using Theora video and Vorbis audio.

The renderer manages settings and queue state. Electron owns file selection, runtime installation, media probing, child processes, temporary files, progress, cancellation, validation, and final output. Large media payloads and decoded frames never pass through renderer IPC.

## Goals

- Resize video from 25% through 400% while preserving aspect ratio.
- Let users enter either a percentage or a target width/height, with all fields kept in sync.
- Use the installed Upscayl GPU runtime for every enlargement above 100%.
- Compress with three quality presets or an optional target size in MB.
- Preserve or change frame rate without increasing it above the source rate.
- Preserve Vorbis audio at a selected bitrate or export without audio.
- Export Godot 4.6-compatible `.ogv` files.
- Process multiple imported videos through a serial, cancellable queue.
- Install and verify a pinned LGPL FFmpeg runtime on demand.
- Verify completed files before marking a task successful.

## Non-goals

- H.264, H.265/HEVC, AV1, VP9, MP4, MKV, or WebM output.
- Streaming or cloud processing.
- Concurrent GPU processing of multiple videos.
- Silent fallback from AI super-resolution to conventional scaling.
- Frame interpolation, motion smoothing, HDR preservation, alpha video, editing, trimming, subtitles, or multi-track selection in the first release.
- Claiming that Theora compression itself is AI-based. AI is used for enlargement and detail reconstruction.
- Resuming an in-progress child process after the application restarts.

## User-facing navigation

Add `video-processing` as a standalone tool and lazy-loaded workspace.

- Tool name: `视频处理工作台`
- Tool shortcut: `4`
- Project space shortcut: move from `4` to `5`
- Input label: `MP4、MOV、MKV、WebM、AVI、OGV 等常见视频`
- Output label: `Godot 4.6 可用的 OGV 视频`

The app navigation source remains `src/appNavigation.ts`. `src/App.tsx` only maps the new surface to the lazy workspace and must not absorb video workflow logic.

## Workspace architecture

Create a focused `src/components/VideoProcessingWorkspace/` workspace.

### Renderer modules

- `index.tsx`: composes panels and dialogs only.
- `VideoProcessingToolbar.tsx`: import, output directory, runtime status, installation, start-all, pause-queue, and cancel-current controls.
- `VideoProcessingSettingsPanel.tsx`: resize, compression, frame-rate, audio, and advanced Upscayl settings.
- `VideoProcessingPreviewPanel.tsx`: source playback, timestamp selection, source-frame preview, AI-frame preview, and metadata.
- `VideoProcessingQueuePanel.tsx`: task rows, phase, progress, result metrics, retry, cancel, remove, and open-output actions.
- `useVideoProcessingWorkspace.ts`: renderer orchestration and view-model composition.
- `useVideoProcessingQueue.ts`: serial queue scheduling, pause semantics, progress subscription, cancellation, and retry.
- `videoProcessingModel.ts`: pure settings, dimension, validation, naming, bitrate, job-state, and progress rules.
- `videoProcessingService.ts`: thin wrapper around the desktop API.
- Focused CSS modules imported by `video-processing-workspace.css`.

Production TS/TSX modules should remain focused and should be split before they become broad workflow files.

### Desktop API

Add `src/desktopVideoProcessingApi.ts` and extend `GameDesignToolsDesktopApi` with:

- `chooseVideoFiles()`
- `chooseVideoOutputDirectory()`
- `queryVideoRuntimeStatus()`
- `installVideoRuntime()`
- `probeVideoFile(path)`
- `createVideoFramePreview(options)`
- `startVideoProcessingJob(options)`
- `cancelVideoProcessingJob(jobId)`
- `openVideoOutput(path)` through the existing shell capability
- `onVideoRuntimeInstallProgress(listener)`
- `onVideoProcessingProgress(listener)`

IPC payloads contain paths, settings, metadata, task ids, and progress only. They do not contain entire video files or decoded frame collections.

### Electron modules

- `electron/videoProcessingIpcHandlers.cjs`: IPC registration and request validation.
- `electron/videoProcessingRuntime.cjs`: pinned runtime manifest, download, checksum, extraction, and status.
- `electron/videoProcessingCommands.cjs`: pure FFmpeg, FFprobe, and Upscayl command construction.
- `electron/videoProcessingJobs.cjs`: active-process registry, pipeline execution, progress, cancellation, verification, and cleanup.

`electron/main.cjs` only wires the new handler registration. All processes use `spawn(command, args)` with argument arrays and `windowsHide: true`; media paths are never interpolated into shell strings.

## Runtime installation

FFmpeg is installed on demand to:

`%LOCALAPPDATA%\GameDesignTools\VideoRuntime`

The runtime manifest pins an LGPL-compatible Windows x64 shared FFmpeg build and records:

- FFmpeg version
- download URL and mirror URLs
- archive SHA-256
- expected `ffmpeg.exe`, `ffprobe.exe`, shared libraries, and license files
- installed manifest version

Installation downloads to a temporary file, reports byte progress, verifies SHA-256 before extraction, extracts to a staging directory, verifies both executables with `-version`, and atomically replaces the active runtime. A failed installation leaves the previous verified runtime intact.

The About/license surface and packaged notices identify the FFmpeg build and its LGPL terms. No GPL-only encoders such as x264 or x265 are required by this feature.

Upscayl continues to use the existing `%LOCALAPPDATA%\GameDesignTools\UpscaylRuntime` installation and existing model/GPU settings. The video workspace must reuse that runtime contract instead of introducing a second copy.

## Import and media probing

Batch import uses an Electron open-file dialog with multiselect. FFprobe extracts:

- container and format name
- duration
- file size
- video codec, width, height, pixel format, average frame rate, and nominal frame rate
- whether an audio stream exists, plus its codec, channel count, sample rate, and bitrate when available

Unsupported or unreadable files remain visible as failed imports with a specific error. Valid files are added to the queue with a snapshot of the current default settings.

Variable-frame-rate sources are normalized to a constant output rate. The default is the rounded source average frame rate, clamped to a minimum of 1 fps and a maximum of the source average. Users may select or enter a lower target rate but may not request a rate above the source.

## Resize model

### Input behavior

- Allowed percentage: 25% through 400%, inclusive.
- Default: 100%.
- Aspect ratio is always locked in the first release.
- Editing percentage recalculates width and height.
- Editing width recalculates percentage and height.
- Editing height recalculates percentage and width.
- The last directly edited field is authoritative; the other fields display the normalized result.
- Final width and height are positive even integers. Odd results round to the nearest even integer, with a minimum of 2 pixels.

For batch jobs, each task owns its settings. Editing one selected task does not mutate other tasks. `应用到全部待处理任务` explicitly copies the selected task's settings to queued tasks only; running and completed tasks are unchanged.

### Scaling behavior

- 25%–100%: FFmpeg Lanczos scaling; Upscayl is not invoked.
- 101%–200%: Upscayl 2x, followed by Lanczos to the exact target.
- 201%–300%: Upscayl 3x, followed by Lanczos to the exact target.
- 301%–400%: Upscayl 4x, followed by Lanczos to the exact target.

Any task above 100% is invalid until a verified Upscayl GPU runtime and selected model are available. If Upscayl fails, the task fails. The application never silently substitutes ordinary enlargement.

When a lower target frame rate is selected, frame-rate reduction occurs before frame extraction and AI processing so discarded frames do not consume GPU time.

## Processing pipelines

### Conventional resize pipeline: 25%–100%

1. Probe and validate the input.
2. Confirm output-directory writability and available disk space.
3. Run one-pass constant-quality encoding or target-size two-pass encoding.
4. Apply Lanczos scaling and constant-frame-rate normalization in FFmpeg.
5. Encode Theora video and optional Vorbis audio into Ogg.
6. Verify the completed file.
7. Atomically move the verified temporary output to its final name.

### AI enlargement pipeline: 101%–400%

1. Probe and validate the input and both runtimes.
2. Preflight free disk space using a conservative decoded-frame estimate.
3. Decode the selected frame rate to sequential lossless PNG frames.
4. Run Upscayl over frames serially with the selected 2x, 3x, or 4x scale.
5. Encode the upscaled image sequence, applying Lanczos to the exact target dimensions.
6. Read audio from the original input and encode it to Vorbis unless muted.
7. Use constant-quality or target-size two-pass Theora encoding.
8. Verify the completed file.
9. Atomically move it to the output directory and remove all temporary frames.

GPU concurrency is one frame and job concurrency is one video. This favors stability and predictable VRAM use over throughput.

### Disk-space preflight

The AI pipeline estimates worst-case temporary use as:

`frameCount × ((sourceWidth × sourceHeight × 4) + (upscaleWidth × upscaleHeight × 4)) × 1.10`

It adds the requested target file size when present, otherwise 10% of the source size with a minimum output allowance of 256 MB. The task is blocked when free space is below the estimate plus a 1 GB safety reserve. The estimate is intentionally conservative because PNG compression varies by content.

## Compression settings

### Constant-quality mode

When target MB is empty, use Theora constant-quality encoding:

| Preset | FFmpeg Theora quality | Intent |
| --- | ---: | --- |
| High quality | `-q:v 8` | Visually conservative game cinematics |
| Balanced | `-q:v 6` | Default size/quality tradeoff |
| Extreme compression | `-q:v 4` | Small files with visible loss allowed |

The preset names and descriptions disclose that Theora is an older, Godot-compatible codec and cannot match H.265 or AV1 compression efficiency.

### Target-size mode

When target MB is set:

- Allowed value: positive number with at most two decimal places.
- Reserve 4% of the requested bytes for Ogg overhead.
- Subtract the selected audio bitrate multiplied by duration when audio is enabled.
- Compute the remaining video bitrate and reject values below 128 kbps.
- Run Theora two-pass encoding.
- If the result exceeds the target by more than 2%, retry once with bitrate adjusted by `oldBitrate × targetBytes / actualBytes × 0.98`.
- A result smaller than the target is valid; the target is a ceiling, not a requirement to add padding.

The UI shows an estimate before processing and actual size and compression ratio afterward.

## Audio and frame-rate settings

- Audio modes: preserve as Vorbis or mute.
- If the source has no audio stream, mute is selected and audio controls are disabled.
- Supported Vorbis bitrate choices: 64, 96, 128, and 160 kbps.
- Default audio bitrate: 96 kbps.
- Default frame rate: normalized source average frame rate.
- Target frame rate must be between 1 fps and the normalized source rate.
- Frame-rate reduction uses deterministic FFmpeg filtering and does not interpolate frames.

## Godot 4.6 output contract

Every successful output must satisfy:

- extension: `.ogv`
- container detected by FFprobe: Ogg
- video codec: Theora
- pixel format: `yuv420p`
- positive even output dimensions equal to the normalized target
- constant frame rate equal to the normalized target rate
- zero audio streams when muted, otherwise one Vorbis audio stream
- no subtitle, attachment, or extra video streams

The final file is designed for assignment to Godot 4.6 `VideoStreamPlayer.stream` as a `VideoStreamTheora` resource without a third-party playback extension.

## Preview behavior

The selected source plays in the right-side preview. A timestamp control selects a representative frame. `生成 AI 预览` extracts only that frame and runs the same Upscayl scale and final Lanczos resize used by the full job.

The preview panel compares source and processed still frames and displays:

- source and target dimensions
- source and target frame rate
- AI scale stage
- estimated target size or quality preset
- audio mode and bitrate

Preview results are cached by input fingerprint, timestamp, dimensions, model, scale, and Upscayl advanced settings. Changing any relevant setting invalidates the preview. Preview generation never starts automatically because it consumes GPU time.

## Queue and job state

Jobs move through explicit phases:

- `checking`
- `queued`
- `probing`
- `decoding`
- `upscaling`
- `encoding-pass-1`
- `encoding-pass-2`
- `encoding`
- `verifying`
- `completed`
- `failed`
- `canceled`

Only one job runs at a time. `暂停排队` prevents the next queued task from starting but does not suspend the active native process. Canceling an active job terminates its FFmpeg or Upscayl process tree, marks the task canceled, cleans its temporary directory, and continues with the next queued job unless the queue is paused.

A failed task does not stop later tasks. Retry creates a new queued attempt with the same input and settings. Completed tasks cannot be mutated; users duplicate or requeue them to process with different settings.

Progress is phase-aware:

- download progress: bytes received
- decoding and encoding: FFmpeg `-progress pipe:1` timestamps divided by duration
- upscaling: completed frames divided by total frames
- verifying: indeterminate short phase

## Output and collision behavior

Users choose one output directory for the queue. Default names follow:

`<source-base>_<percentage>pct_<preset>.ogv`

Target-size jobs use `target-<MB>mb` instead of the preset. Unsafe filename characters are normalized. Existing files are never overwritten; the application appends `-2`, `-3`, and so on.

Encoding writes to a job-specific temporary output. Only a verified file is moved to the chosen directory. A completed row exposes the final size, compression ratio, processing duration, media parameters, and `打开输出目录`.

## Error handling and recovery

- Missing FFmpeg blocks every task and links to runtime installation.
- Missing Upscayl blocks tasks above 100% and links to the existing Upscayl installation flow.
- Invalid settings are shown next to the responsible field and prevent queue start.
- Import, probe, disk, decode, upscale, encode, verify, cancel, and move failures have distinct messages.
- A failed runtime update preserves the previous verified runtime.
- Application startup removes abandoned video-processing temporary directories older than 24 hours.
- Leaving the workspace while a task is active or queued opens a confirmation. Staying preserves the queue; confirming departure cancels the active process, clears pending tasks, waits for cleanup, and then navigates away. The first release does not continue video jobs in the background after the workspace unmounts.
- Application shutdown attempts to terminate active video-processing child processes and clean the active temporary directory.
- Jobs are held in renderer memory for the first release. Restarting the app does not restore or resume the queue.

## Testing strategy

### Pure model tests

- Percentage and dimension synchronization.
- Locked aspect ratio and even-dimension normalization.
- 25%, 100%, 101%, 200%, 201%, 300%, 301%, and 400% boundaries.
- Upscayl 2x/3x/4x selection.
- Quality preset mapping.
- Target-size bitrate math, overhead, audio subtraction, minimum bitrate, and retry adjustment.
- Frame-rate clamping and no-audio defaults.
- Output naming and collision suffixes.
- Queue state transitions, pause, cancel, failure continuation, and retry.

### Electron tests

- FFmpeg, FFprobe, and Upscayl argument construction with spaces and non-ASCII paths.
- Pinned runtime manifest, checksum failure, staged installation, and preservation of an existing runtime.
- FFprobe response mapping.
- FFmpeg progress parsing.
- Active-process registration and process-tree cancellation.
- Temporary-directory cleanup on success, failure, and cancel.
- Output verification rejects wrong container, codec, pixel format, dimensions, frame rate, or audio codec.

Process-heavy tests inject fake spawn and filesystem dependencies. The ordinary unit suite does not require an installed FFmpeg or GPU.

### Structure tests

- Navigation metadata remains in `appNavigation.ts`.
- `App.tsx` lazy-loads the workspace without video service logic.
- Renderer panels do not import Electron modules.
- The workspace hook orchestrates through the service and desktop API.
- Electron main only registers the focused IPC handler.
- Command, runtime, and job responsibilities remain split.
- Large media bytes and frame arrays do not cross IPC.

### Integration acceptance

Use short fixtures to verify:

1. 50% Lanczos reduction to OGV.
2. 150% Upscayl enlargement and exact final dimensions.
3. All three constant-quality presets.
4. Target-MB two-pass encoding and size ceiling.
5. Vorbis audio, muted output, and input without audio.
6. Lower target frame rate.
7. A failed middle task followed by a successful task.
8. Active cancellation with no temporary-frame residue.
9. FFprobe reports Ogg, Theora, `yuv420p`, correct dimensions/frame rate, and optional Vorbis.
10. A minimal Godot 4.6 project loads the result as `VideoStreamTheora` in `VideoStreamPlayer` and completes a playback smoke test.

### Release verification

Run:

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Then run the packaged Electron app with an installed FFmpeg runtime and Upscayl GPU runtime, process a mixed batch, inspect progress/cancel/retry behavior, and import at least one completed result into Godot 4.6.

## Success criteria

- Users can import multiple common video files and process them serially.
- Percentage and explicit dimensions remain synchronized and produce exact even output dimensions.
- Every enlargement above 100% uses Upscayl GPU or fails explicitly.
- Constant-quality and target-size modes both produce verified `.ogv` files.
- Audio and frame-rate options behave as specified.
- Completed outputs load and play through Godot 4.6 `VideoStreamPlayer` without an external codec plugin.
- Cancellation and failures do not leave active child processes or unbounded temporary files.
- Existing image, sprite, voice, project, and document workspaces continue to pass their tests and build unchanged.
