# Video Processing Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows Electron video-processing workspace that batch-resizes, GPU-upscales, compresses, and exports Godot 4.6-compatible OGV files.

**Architecture:** React owns validated settings, previews, and a serial queue; Electron owns native paths, runtime installation, FFprobe, FFmpeg, Upscayl processes, progress, cancellation, temporary storage, and output verification. Pure model and command-builder modules are tested independently before IPC and UI wiring.

**Tech Stack:** React 19, TypeScript 5.9, Ant Design 6, Electron 41, Node child processes, FFmpeg/FFprobe 8.1 LGPL shared build, existing Upscayl GPU runtime, Node test runner, Godot 4.6.

## Global Constraints

- Target runtime is the existing Windows x64 Electron desktop application.
- Output is always `.ogv`: Ogg container, Theora video, `yuv420p`, and zero or one Vorbis audio stream.
- Resize range is 25%–400%; width and height remain aspect-locked and normalize to positive even integers.
- Tasks above 100% must use the verified Upscayl GPU runtime; there is no silent conventional-enlargement fallback.
- Upscale mapping is 101%–200% → 2x, 201%–300% → 3x, and 301%–400% → 4x, followed by Lanczos to exact dimensions.
- Jobs run serially; a failed job does not stop later jobs.
- Constant-quality presets are Theora `-q:v 8`, `-q:v 6`, and `-q:v 4`.
- Target-size mode reserves 4% for Ogg overhead, rejects video bitrate below 128 kbps, and retries once when output exceeds target by more than 2%.
- Audio is muted or encoded as Vorbis at 64/96/128/160 kbps; default is 96 kbps.
- Target frame rate may not exceed the normalized source average frame rate.
- FFmpeg runtime is pinned to BtbN release `autobuild-2026-07-17-13-22`, asset `ffmpeg-n8.1.2-22-g94138f6973-win64-lgpl-shared-8.1.zip`, SHA-256 `fcbf0f5c58fec3e516e35ba26d81bc6cbaea09dde76bffd151fa93c0316b0b50`.
- Do not add H.264, H.265, AV1, VP9, MP4, MKV, or WebM output.
- Do not move workflow or process logic into `src/App.tsx`, workspace `index.tsx`, `electron/main.cjs`, or `electron/preload.cjs`.

---

## File Map

### Create

- `src/desktopVideoProcessingApi.ts`: renderer/Electron type contract.
- `src/components/VideoProcessingWorkspace/videoProcessingModel.ts`: pure settings, dimensions, bitrate, naming, and job-state rules.
- `src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts`: pure behavior tests.
- `src/components/VideoProcessingWorkspace/videoProcessingService.ts`: desktop API wrapper.
- `src/components/VideoProcessingWorkspace/useVideoProcessingRuntime.ts`: FFmpeg and Upscayl status/install state.
- `src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts`: serial queue orchestration.
- `src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts`: queue transition tests.
- `src/components/VideoProcessingWorkspace/useVideoProcessingWorkspace.ts`: workspace view model.
- `src/components/VideoProcessingWorkspace/VideoProcessingToolbar.tsx`: import/runtime/queue actions.
- `src/components/VideoProcessingWorkspace/VideoProcessingSettingsPanel.tsx`: resize, compression, FPS, audio, advanced settings.
- `src/components/VideoProcessingWorkspace/VideoProcessingPreviewPanel.tsx`: video and still-frame comparison.
- `src/components/VideoProcessingWorkspace/VideoProcessingQueuePanel.tsx`: task table and row actions.
- `src/components/VideoProcessingWorkspace/index.tsx`: thin composition entry.
- `src/components/VideoProcessingWorkspace/video-processing-workspace.css`: CSS import hub.
- `src/components/VideoProcessingWorkspace/video-processing-layout.css`: workspace layout.
- `src/components/VideoProcessingWorkspace/video-processing-panels.css`: panels and controls.
- `src/components/VideoProcessingWorkspace/video-processing-queue.css`: queue and progress states.
- `src/WorkspaceExitGuardContext.tsx`: lets an active workspace register an async leave guard without putting workflow logic in `App.tsx`.
- `src/videoProcessingStructure.test.ts`: workspace/navigation boundary guards.
- `src/desktopVideoProcessingIpcHandlers.test.ts`: desktop bridge structure guards.
- `electron/videoProcessingRuntime.cjs`: pinned download, checksum, staged install, and status.
- `electron/videoProcessingCommands.cjs`: pure command construction and probe/progress parsing.
- `electron/videoProcessingJobs.cjs`: process registry and pipeline lifecycle.
- `electron/videoProcessingIpcHandlers.cjs`: dialogs and IPC registration.
- `electron/videoProcessingRuntime.test.cjs`: runtime installation tests.
- `electron/videoProcessingCommands.test.cjs`: command and parsing tests.
- `electron/videoProcessingJobs.test.cjs`: cancellation, cleanup, and verification tests.
- `test-fixtures/godot-video-smoke/project.godot`: Godot smoke project.
- `test-fixtures/godot-video-smoke/video_smoke.gd`: `VideoStreamTheora` load/play smoke script.

### Modify

- `src/desktopApi.ts`: compose and re-export `DesktopVideoProcessingApi`.
- `src/appNavigation.ts`: add tool id/metadata, shortcut 4, and move project space to 5.
- `src/App.tsx`: lazy-load and select the workspace, update shortcut legend/icon.
- `electron/preload.cjs`: expose typed video IPC calls and progress listeners.
- `electron/main.cjs`: register focused video handlers and terminate active jobs at shutdown.
- `package.json`: add focused tests to `test:files`.
- `README.md`: document the workspace, Godot output, and runtime installation.

---

### Task 1: Pure Video Settings and Job Model

**Files:**
- Create: `src/components/VideoProcessingWorkspace/videoProcessingModel.ts`
- Create: `src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `VideoProcessingSettings`, `VideoMediaProbe`, `VideoProcessingJob`, `defaultVideoProcessingSettings`, `deriveResizeFromPercent`, `deriveResizeFromWidth`, `deriveResizeFromHeight`, `getUpscaleScaleForPercent`, `calculateTargetVideoBitrateKbps`, `buildVideoOutputName`, `validateVideoProcessingSettings`, `videoJobReducer`.
- Consumes: no application modules.

- [ ] **Step 1: Write failing resize, bitrate, naming, and reducer tests**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildVideoOutputName,
  calculateTargetVideoBitrateKbps,
  deriveResizeFromHeight,
  deriveResizeFromPercent,
  deriveResizeFromWidth,
  getUpscaleScaleForPercent,
  videoJobReducer,
} from './videoProcessingModel'

test('resize fields remain aspect locked and even', () => {
  assert.deepEqual(deriveResizeFromPercent(1920, 1080, 150), { percent: 150, width: 2880, height: 1620 })
  assert.deepEqual(deriveResizeFromWidth(1920, 1080, 1001), { percent: 52.19, width: 1002, height: 564 })
  assert.deepEqual(deriveResizeFromHeight(1920, 1080, 721), { percent: 66.85, width: 1284, height: 722 })
})

test('upscale mapping follows approved boundaries', () => {
  assert.equal(getUpscaleScaleForPercent(100), null)
  assert.equal(getUpscaleScaleForPercent(101), 2)
  assert.equal(getUpscaleScaleForPercent(200), 2)
  assert.equal(getUpscaleScaleForPercent(201), 3)
  assert.equal(getUpscaleScaleForPercent(301), 4)
  assert.equal(getUpscaleScaleForPercent(400), 4)
})

test('target bitrate reserves overhead and audio', () => {
  assert.equal(calculateTargetVideoBitrateKbps({ targetMb: 10, durationSeconds: 60, audioKbps: 96 }), 1246)
  assert.throws(
    () => calculateTargetVideoBitrateKbps({ targetMb: 1, durationSeconds: 60, audioKbps: 160 }),
    /目标文件大小过小/,
  )
})

test('output names are safe and never imply another codec', () => {
  assert.equal(buildVideoOutputName('boss:intro.mp4', 150, { mode: 'quality', preset: 'balanced' }), 'boss_intro_150pct_balanced.ogv')
  assert.equal(buildVideoOutputName('intro.mov', 50, { mode: 'target-size', targetMb: 8.5 }), 'intro_50pct_target-8.5mb.ogv')
})

test('failed jobs can retry without mutating the previous attempt', () => {
  const failed = { id: 'a', phase: 'failed', progress: 42, error: 'encode failed' } as const
  const retried = videoJobReducer(failed, { type: 'retry', nextId: 'b' })
  assert.deepEqual(retried, { id: 'b', phase: 'queued', progress: 0, error: '' })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx tsx --test src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts`

Expected: FAIL because `videoProcessingModel.ts` does not exist.

- [ ] **Step 3: Implement the pure model**

```ts
export type VideoQualityPreset = 'high' | 'balanced' | 'extreme'
export type VideoJobPhase = 'checking' | 'queued' | 'probing' | 'decoding' | 'upscaling' | 'encoding-pass-1' | 'encoding-pass-2' | 'encoding' | 'verifying' | 'completed' | 'failed' | 'canceled'

export interface VideoMediaProbe {
  path: string
  name: string
  size: number
  durationSeconds: number
  width: number
  height: number
  averageFps: number
  videoCodec: string
  pixelFormat: string
  hasAudio: boolean
  audioCodec: string
  audioChannels: number
  audioSampleRate: number
}

export interface VideoProcessingSettings {
  percent: number
  width: number
  height: number
  qualityMode: 'quality' | 'target-size'
  qualityPreset: VideoQualityPreset
  targetMb: number | null
  targetFps: number
  audioMode: 'vorbis' | 'mute'
  audioKbps: 64 | 96 | 128 | 160
  upscaylModel: string
  gpuId: string
  tileSize: number
  ttaMode: boolean
  threadProfile: 'balanced' | 'low-memory' | 'throughput'
}

export interface VideoProcessingJob {
  id: string
  input: VideoMediaProbe
  settings: VideoProcessingSettings
  phase: VideoJobPhase
  progress: number
  message: string
  error: string
  outputPath: string
  outputSize: number
}

export const THEORA_QUALITY = { high: 8, balanced: 6, extreme: 4 } as const

export function normalizeEvenDimension(value: number) {
  const rounded = Math.max(2, Math.round(Number.isFinite(value) ? value : 2))
  return rounded % 2 === 0 ? rounded : rounded + 1
}

function roundedPercent(value: number) {
  return Math.round(Math.min(400, Math.max(25, value)) * 100) / 100
}

export function deriveResizeFromPercent(sourceWidth: number, sourceHeight: number, percent: number) {
  const normalizedPercent = roundedPercent(percent)
  return {
    percent: normalizedPercent,
    width: normalizeEvenDimension(sourceWidth * normalizedPercent / 100),
    height: normalizeEvenDimension(sourceHeight * normalizedPercent / 100),
  }
}

export function deriveResizeFromWidth(sourceWidth: number, sourceHeight: number, width: number) {
  const normalizedWidth = normalizeEvenDimension(width)
  return deriveResizeFromPercent(sourceWidth, sourceHeight, normalizedWidth / sourceWidth * 100)
}

export function deriveResizeFromHeight(sourceWidth: number, sourceHeight: number, height: number) {
  const normalizedHeight = normalizeEvenDimension(height)
  return deriveResizeFromPercent(sourceWidth, sourceHeight, normalizedHeight / sourceHeight * 100)
}

export function getUpscaleScaleForPercent(percent: number): 2 | 3 | 4 | null {
  if (percent <= 100) return null
  if (percent <= 200) return 2
  if (percent <= 300) return 3
  return 4
}

export function calculateTargetVideoBitrateKbps(input: { targetMb: number; durationSeconds: number; audioKbps: number }) {
  const usableBits = input.targetMb * 1024 * 1024 * 8 * 0.96
  const totalKbps = Math.floor(usableBits / input.durationSeconds / 1000)
  const videoKbps = totalKbps - input.audioKbps
  if (videoKbps < 128) throw new Error('目标文件大小过小，视频码率将低于 128 kbps。')
  return videoKbps
}
```

Add `defaultVideoProcessingSettings(probe)`, `validateVideoProcessingSettings(probe, settings, runtime)`, `resolveCollisionFreeOutputPath`, and reducer transitions for progress, complete, fail, cancel, retry, and queued-settings replacement. Keep all functions browser- and Electron-free.

- [ ] **Step 4: Run focused tests**

Run: `npx tsx --test src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Register the test and commit**

```powershell
git add package.json src/components/VideoProcessingWorkspace/videoProcessingModel.ts src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts
git commit -m "feat: add video processing model"
```

### Task 2: Desktop API Contract, Navigation, and Boundary Guards

**Files:**
- Create: `src/desktopVideoProcessingApi.ts`
- Create: `src/videoProcessingStructure.test.ts`
- Create: `src/desktopVideoProcessingIpcHandlers.test.ts`
- Modify: `src/desktopApi.ts`
- Modify: `src/appNavigation.ts`
- Modify: `src/App.tsx`
- Modify: `electron/preload.cjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `VideoProcessingSettings`, `VideoMediaProbe`, `VideoJobPhase` from Task 1.
- Produces: `DesktopVideoProcessingApi`, `DesktopVideoRuntimeStatus`, `DesktopVideoProcessingProgress`, navigation id `video-processing`.

- [ ] **Step 1: Write failing structure tests**

```ts
test('video processing is a first-class lazy workspace', () => {
  const app = readFileSync('src/App.tsx', 'utf8')
  const navigation = readFileSync('src/appNavigation.ts', 'utf8')
  assert.match(navigation, /'video-processing'/)
  assert.match(navigation, /视频处理工作台/)
  assert.match(navigation, /personalSpaceShortcut = '5'/)
  assert.match(app, /lazy\(\(\) => import\('\.\/components\/VideoProcessingWorkspace'\)\)/)
  assert.match(app, /activeSurface === 'video-processing'/)
})

test('video desktop bridge is typed and delegates through focused IPC', () => {
  const preload = readFileSync('electron/preload.cjs', 'utf8')
  const desktopApi = readFileSync('src/desktopApi.ts', 'utf8')
  assert.match(preload, /queryVideoRuntimeStatus/)
  assert.match(preload, /video-processing:progress/)
  assert.match(desktopApi, /DesktopVideoProcessingApi/)
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npx tsx --test src/videoProcessingStructure.test.ts src/desktopVideoProcessingIpcHandlers.test.ts`

Expected: FAIL because the workspace id and API do not exist.

- [ ] **Step 3: Define the desktop API**

```ts
export interface DesktopVideoRuntimeStatus {
  installed: boolean
  version: string
  path: string
  ffmpegPath: string
  ffprobePath: string
  message: string
}

export interface DesktopVideoProcessingProgress {
  jobId: string
  phase: VideoJobPhase
  completed: number
  total: number
  percent: number
  message: string
}

export interface DesktopVideoProcessingApi {
  chooseVideoFiles(): Promise<Array<{ name: string; path: string; size: number }>>
  chooseVideoOutputDirectory(): Promise<{ name: string; path: string } | null>
  queryVideoRuntimeStatus(): Promise<DesktopVideoRuntimeStatus>
  installVideoRuntime(): Promise<DesktopVideoRuntimeStatus>
  probeVideoFile(filePath: string): Promise<VideoMediaProbe>
  createVideoFramePreview(options: DesktopVideoFramePreviewOptions): Promise<DesktopVideoFramePreviewResult>
  startVideoProcessingJob(options: DesktopVideoProcessingJobOptions): Promise<DesktopVideoProcessingResult>
  cancelVideoProcessingJob(jobId: string): Promise<boolean>
  onVideoRuntimeInstallProgress(listener: (progress: DesktopVideoRuntimeInstallProgress) => void): () => void
  onVideoProcessingProgress(listener: (progress: DesktopVideoProcessingProgress) => void): () => void
}
```

- [ ] **Step 4: Wire types, preload methods, and navigation**

Expose these exact channels:

```js
chooseVideoFiles: () => invoke('video-processing:choose-files'),
chooseVideoOutputDirectory: () => invoke('video-processing:choose-output-directory'),
queryVideoRuntimeStatus: () => invoke('video-processing:runtime-status'),
installVideoRuntime: () => invoke('video-processing:install-runtime'),
probeVideoFile: (filePath) => invoke('video-processing:probe', filePath),
createVideoFramePreview: (options) => invoke('video-processing:preview', options),
startVideoProcessingJob: (options) => invoke('video-processing:start', options),
cancelVideoProcessingJob: (jobId) => invoke('video-processing:cancel', jobId),
onVideoRuntimeInstallProgress: (listener) => on('video-processing:runtime-progress', listener),
onVideoProcessingProgress: (listener) => on('video-processing:progress', listener),
```

Add tool metadata with shortcut `4`, change `personalSpaceShortcut` to `5`, lazy-load the future workspace, and add the video label to the home shortcut legend. Create only a temporary thin workspace entry that renders `视频处理工作台`; Task 7 replaces its body.

- [ ] **Step 5: Run tests and build**

Run: `npx tsx --test src/videoProcessingStructure.test.ts src/desktopVideoProcessingIpcHandlers.test.ts src/appShellHomeStructure.test.ts`

Expected: PASS after updating older exact-union and shortcut expectations.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/desktopVideoProcessingApi.ts src/desktopApi.ts src/appNavigation.ts src/App.tsx electron/preload.cjs src/videoProcessingStructure.test.ts src/desktopVideoProcessingIpcHandlers.test.ts src/appShellHomeStructure.test.ts package.json src/components/VideoProcessingWorkspace/index.tsx
git commit -m "feat: register video processing workspace"
```

### Task 3: Pinned FFmpeg Runtime Installer

**Files:**
- Create: `electron/videoProcessingRuntime.cjs`
- Create: `electron/videoProcessingRuntime.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `VIDEO_RUNTIME_MANIFEST`, `resolveVideoRuntimePaths(app)`, `getVideoRuntimeStatus(app)`, `installVideoRuntime(options)`.
- Consumes: `yauzl` for ZIP extraction and injected `downloadFile`, `hashFile`, and `runCommandOutput` dependencies for tests.

- [ ] **Step 1: Write failing installer tests**

```js
test('video runtime manifest pins an LGPL shared FFmpeg build', () => {
  assert.equal(VIDEO_RUNTIME_MANIFEST.version, '8.1.2-22-g94138f6973')
  assert.equal(VIDEO_RUNTIME_MANIFEST.sha256, 'fcbf0f5c58fec3e516e35ba26d81bc6cbaea09dde76bffd151fa93c0316b0b50')
  assert.match(VIDEO_RUNTIME_MANIFEST.url, /autobuild-2026-07-17-13-22/)
  assert.match(VIDEO_RUNTIME_MANIFEST.assetName, /win64-lgpl-shared/)
})

test('checksum failure preserves the active runtime', async () => {
  const result = await installVideoRuntime({
    app: fakeApp(tempDir),
    downloadFile: async (_url, target) => fs.writeFileSync(target, 'bad archive'),
    hashFile: async () => 'wrong',
    extractZip: async () => { throw new Error('must not extract') },
  })
  assert.equal(result.installed, false)
  assert.equal(fs.readFileSync(existingFfmpeg, 'utf8'), 'existing')
  assert.match(result.message, /校验失败/)
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test electron/videoProcessingRuntime.test.cjs`

Expected: FAIL because the runtime module does not exist.

- [ ] **Step 3: Implement manifest, paths, status, and staged install**

```js
const VIDEO_RUNTIME_MANIFEST = Object.freeze({
  version: '8.1.2-22-g94138f6973',
  releaseTag: 'autobuild-2026-07-17-13-22',
  assetName: 'ffmpeg-n8.1.2-22-g94138f6973-win64-lgpl-shared-8.1.zip',
  url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-07-17-13-22/ffmpeg-n8.1.2-22-g94138f6973-win64-lgpl-shared-8.1.zip',
  sha256: 'fcbf0f5c58fec3e516e35ba26d81bc6cbaea09dde76bffd151fa93c0316b0b50',
})

function resolveVideoRuntimePaths(app) {
  const runtimeDir = path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'GameDesignTools', 'VideoRuntime')
  return {
    runtimeDir,
    stagingDir: `${runtimeDir}.staging`,
    ffmpegPath: path.join(runtimeDir, 'bin', 'ffmpeg.exe'),
    ffprobePath: path.join(runtimeDir, 'bin', 'ffprobe.exe'),
    manifestPath: path.join(runtimeDir, 'runtime-manifest.json'),
  }
}
```

Installation must download to staging, stream byte progress, calculate SHA-256, extract with path-traversal protection, locate the archive's single top-level directory, normalize it to `bin/`, run both executables with `-version`, write the installed manifest, and rename staging only after verification.

- [ ] **Step 4: Run runtime tests**

Run: `node --test electron/videoProcessingRuntime.test.cjs`

Expected: PASS for manifest, installed status, checksum rejection, path traversal rejection, staged replacement, and previous-runtime preservation.

- [ ] **Step 5: Commit**

```powershell
git add electron/videoProcessingRuntime.cjs electron/videoProcessingRuntime.test.cjs package.json
git commit -m "feat: add pinned video runtime installer"
```

### Task 4: FFprobe Mapping and Native Command Builders

**Files:**
- Create: `electron/videoProcessingCommands.cjs`
- Create: `electron/videoProcessingCommands.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildProbeArgs`, `mapProbeResult`, `buildPreviewArgs`, `buildDecodeFramesArgs`, `buildTheoraEncodeArgs`, `parseFfmpegProgress`, `verifyGodotOgvProbe`.
- Consumes: normalized job options from Task 1 and runtime executable paths from Task 3.

- [ ] **Step 1: Write failing command tests**

```js
test('standard OGV encode uses Theora, yuv420p, Lanczos, and Vorbis', () => {
  const args = buildTheoraEncodeArgs({
    inputPath: 'D:\\视频\\intro.mp4', outputPath: 'D:\\输出\\intro.ogv',
    width: 1280, height: 720, fps: 30, quality: 6, muted: false, audioKbps: 96,
  })
  assert.deepEqual(args.slice(0, 2), ['-y', '-i'])
  assert.ok(args.includes('libtheora'))
  assert.ok(args.includes('yuv420p'))
  assert.ok(args.includes('scale=1280:720:flags=lanczos,fps=30'))
  assert.ok(args.includes('libvorbis'))
  assert.ok(args.includes('96k'))
  assert.equal(args.at(-1), 'D:\\输出\\intro.ogv')
})

test('Godot verifier rejects the wrong codec', () => {
  assert.throws(() => verifyGodotOgvProbe({ format: { format_name: 'ogg' }, streams: [{ codec_type: 'video', codec_name: 'vp9', pix_fmt: 'yuv420p', width: 1280, height: 720 }] }, { width: 1280, height: 720, fps: 30, muted: true }), /Theora/)
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test electron/videoProcessingCommands.test.cjs`

Expected: FAIL because the command module does not exist.

- [ ] **Step 3: Implement deterministic argument builders**

Use `-progress pipe:1 -nostats` for every long-running FFmpeg operation. Constant-quality mode uses `-c:v libtheora -q:v <4|6|8> -pix_fmt yuv420p`. Target-size mode uses `-b:v <kbps>k -pass <1|2> -passlogfile <job path>`. Muted output uses `-an`; audio output uses `-c:a libvorbis -b:a <kbps>k -ac 2`.

`mapProbeResult` must select the first video stream and first audio stream, parse rational frame rates safely, and return a serializable `VideoMediaProbe`. `verifyGodotOgvProbe` must check the exact output contract from the spec.

- [ ] **Step 4: Run tests**

Run: `node --test electron/videoProcessingCommands.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add electron/videoProcessingCommands.cjs electron/videoProcessingCommands.test.cjs package.json
git commit -m "feat: build Godot OGV processing commands"
```

### Task 5: Native Job Runner, Progress, Cancellation, and Cleanup

**Files:**
- Create: `electron/videoProcessingJobs.cjs`
- Create: `electron/videoProcessingJobs.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `createVideoProcessingJobManager(dependencies)` with `start(options)`, `cancel(jobId)`, `shutdown()`, `cleanupAbandonedTempDirs()`.
- Consumes: runtime paths from Task 3, command builders from Task 4, existing `buildUpscaylArgs` from `electron/upscaylIpcHandlers.cjs`.

- [ ] **Step 1: Write failing lifecycle tests**

```js
test('cancel terminates the active process tree and cleans temp files', async () => {
  const killed = []
  const removed = []
  const manager = createVideoProcessingJobManager({
    spawnProcess: () => fakeLongProcess(42),
    killProcessTree: async (pid) => killed.push(pid),
    removePath: async (value) => removed.push(value),
    emitProgress: () => {},
  })
  const pending = manager.start(validJob({ jobId: 'job-1' }))
  await manager.cancel('job-1')
  await assert.rejects(pending, /已取消/)
  assert.deepEqual(killed, [42])
  assert.equal(removed.length, 1)
})

test('a verified output is moved atomically and reported complete', async () => {
  const phases = []
  const manager = createVideoProcessingJobManager(fakeSuccessfulDependencies(phases))
  const result = await manager.start(validJob({ jobId: 'job-2', percent: 50 }))
  assert.equal(result.outputPath.endsWith('.ogv'), true)
  assert.equal(phases.at(-1), 'completed')
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test electron/videoProcessingJobs.test.cjs`

Expected: FAIL because the manager does not exist.

- [ ] **Step 3: Implement the process registry and pipelines**

```js
function createVideoProcessingJobManager(dependencies) {
  const activeJobs = new Map()

  async function cancel(jobId) {
    const active = activeJobs.get(jobId)
    if (!active) return false
    active.canceled = true
    if (active.pid) await dependencies.killProcessTree(active.pid)
    return true
  }

  async function shutdown() {
    await Promise.all([...activeJobs.keys()].map(cancel))
  }

  return { start, cancel, shutdown, cleanupAbandonedTempDirs }
}
```

`start` must enforce one active native job, allocate `%LOCALAPPDATA%\GameDesignTools\Temp\VideoProcessing\<jobId>`, preflight disk space, select conventional or AI pipeline, emit phase-aware progress, retry target-size overflow once, verify with FFprobe, resolve a collision-free final path, move atomically, and clean in `finally`.

The AI path decodes PNG frames at target FPS, processes them one at a time through Upscayl, then encodes the numbered output sequence while reading audio from the original input. The manager records the currently active PID before awaiting each process.

- [ ] **Step 4: Run lifecycle tests**

Run: `node --test electron/videoProcessingJobs.test.cjs electron/videoProcessingCommands.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add electron/videoProcessingJobs.cjs electron/videoProcessingJobs.test.cjs package.json
git commit -m "feat: run cancellable video processing jobs"
```

### Task 6: Focused IPC Handlers and Desktop Bridge

**Files:**
- Create: `electron/videoProcessingIpcHandlers.cjs`
- Modify: `electron/main.cjs`
- Modify: `src/desktopVideoProcessingIpcHandlers.test.ts`

**Interfaces:**
- Produces: `registerVideoProcessingIpcHandlers(options)` returning `{ shutdown, cleanupAbandonedTempDirs }`.
- Consumes: runtime functions from Task 3, probe/preview commands from Task 4, job manager from Task 5.

- [ ] **Step 1: Strengthen the failing IPC structure test**

```ts
assert.ok(existsSync('electron/videoProcessingIpcHandlers.cjs'))
assert.match(main, /registerVideoProcessingIpcHandlers/)
assert.doesNotMatch(main, /video-processing:start/)
assert.match(handler, /video-processing:choose-files/)
assert.match(handler, /video-processing:choose-output-directory/)
assert.match(handler, /video-processing:runtime-status/)
assert.match(handler, /video-processing:install-runtime/)
assert.match(handler, /video-processing:probe/)
assert.match(handler, /video-processing:preview/)
assert.match(handler, /video-processing:start/)
assert.match(handler, /video-processing:cancel/)
assert.doesNotMatch(handler, /Buffer\.from\(options\.data/)
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npx tsx --test src/desktopVideoProcessingIpcHandlers.test.ts`

Expected: FAIL because the handler is absent.

- [ ] **Step 3: Implement dialogs, validation, events, and wiring**

The input dialog uses `properties: ['openFile', 'multiSelections']` and filters common videos. The output dialog uses `openDirectory`. Every path is normalized and checked before passing to FFprobe or jobs. Progress callbacks send only to non-destroyed `BrowserWindow` instances.

```js
const videoProcessing = registerVideoProcessingIpcHandlers({
  app, BrowserWindow, dialog, ipcMain, resolveUnpackedPath, runCommandOutput,
})

app.whenReady().then(() => {
  void videoProcessing.cleanupAbandonedTempDirs()
})

app.on('before-quit', () => {
  void videoProcessing.shutdown()
})
```

- [ ] **Step 4: Run bridge tests**

Run: `npx tsx --test src/desktopVideoProcessingIpcHandlers.test.ts src/appDesktopIpcStructure.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add electron/videoProcessingIpcHandlers.cjs electron/main.cjs src/desktopVideoProcessingIpcHandlers.test.ts
git commit -m "feat: expose video processing IPC"
```

### Task 7: Renderer Runtime and Serial Queue

**Files:**
- Create: `src/components/VideoProcessingWorkspace/videoProcessingService.ts`
- Create: `src/components/VideoProcessingWorkspace/useVideoProcessingRuntime.ts`
- Create: `src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts`
- Create: `src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `useVideoProcessingRuntime()`, `useVideoProcessingQueue(options)`.
- Consumes: Task 1 model and Task 2 desktop API.

- [ ] **Step 1: Write failing serial-queue tests around an extracted pure scheduler**

```ts
test('queue continues after a failed middle task', async () => {
  const calls: string[] = []
  const run = async (id: string) => {
    calls.push(id)
    if (id === 'b') throw new Error('failed')
  }
  const result = await drainVideoQueue(['a', 'b', 'c'], run)
  assert.deepEqual(calls, ['a', 'b', 'c'])
  assert.deepEqual(result.map((item) => item.phase), ['completed', 'failed', 'completed'])
})

test('paused queue does not start the next task', async () => {
  const result = await nextRunnableVideoJob([{ id: 'a', phase: 'queued' }], true)
  assert.equal(result, null)
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npx tsx --test src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts`

Expected: FAIL because queue helpers do not exist.

- [ ] **Step 3: Implement service, runtime hook, and queue hook**

The runtime hook mirrors `useUpscaleRuntime`: query on mount, subscribe/unsubscribe to install progress, install with Ant Design messages, and expose both FFmpeg and existing Upscayl status.

The queue hook must:

- snapshot settings per imported task;
- probe imports serially;
- run exactly one task;
- map desktop progress by `jobId`;
- continue after failure;
- pause before the next job;
- cancel active through IPC;
- retry as a new id;
- apply settings only to queued tasks;
- revoke preview URLs on removal/unmount.

- [ ] **Step 4: Run queue tests and build**

Run: `npx tsx --test src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/VideoProcessingWorkspace/videoProcessingService.ts src/components/VideoProcessingWorkspace/useVideoProcessingRuntime.ts src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts package.json
git commit -m "feat: orchestrate video processing queue"
```

### Task 8: Workspace Settings, Preview, Queue, and Styling

**Files:**
- Create: `src/components/VideoProcessingWorkspace/useVideoProcessingWorkspace.ts`
- Create: `src/components/VideoProcessingWorkspace/VideoProcessingToolbar.tsx`
- Create: `src/components/VideoProcessingWorkspace/VideoProcessingSettingsPanel.tsx`
- Create: `src/components/VideoProcessingWorkspace/VideoProcessingPreviewPanel.tsx`
- Create: `src/components/VideoProcessingWorkspace/VideoProcessingQueuePanel.tsx`
- Create: `src/components/VideoProcessingWorkspace/video-processing-workspace.css`
- Create: `src/components/VideoProcessingWorkspace/video-processing-layout.css`
- Create: `src/components/VideoProcessingWorkspace/video-processing-panels.css`
- Create: `src/components/VideoProcessingWorkspace/video-processing-queue.css`
- Create: `src/WorkspaceExitGuardContext.tsx`
- Modify: `src/components/VideoProcessingWorkspace/index.tsx`
- Modify: `src/App.tsx`
- Modify: `src/videoProcessingStructure.test.ts`

**Interfaces:**
- Produces: complete `VideoProcessingWorkspace` UI.
- Consumes: hooks from Task 7 and model types from Task 1.

- [ ] **Step 1: Add failing structure assertions for focused panels**

```ts
for (const file of [
  'VideoProcessingToolbar.tsx',
  'VideoProcessingSettingsPanel.tsx',
  'VideoProcessingPreviewPanel.tsx',
  'VideoProcessingQueuePanel.tsx',
  'useVideoProcessingWorkspace.ts',
]) assert.ok(existsSync(`src/components/VideoProcessingWorkspace/${file}`))

assert.doesNotMatch(indexSource, /getDesktopApi|ipcRenderer|spawn\(/)
assert.match(indexSource, /VideoProcessingToolbar/)
assert.match(indexSource, /VideoProcessingSettingsPanel/)
assert.match(indexSource, /VideoProcessingPreviewPanel/)
assert.match(indexSource, /VideoProcessingQueuePanel/)
```

- [ ] **Step 2: Run the structure test and verify failure**

Run: `npx tsx --test src/videoProcessingStructure.test.ts`

Expected: FAIL because the focused UI files do not exist.

- [ ] **Step 3: Build the view model and panels**

The entry remains composition-only:

```tsx
export default function VideoProcessingWorkspace() {
  const workspace = useVideoProcessingWorkspace()
  return (
    <div className="video-processing-workspace">
      <VideoProcessingToolbar workspace={workspace} />
      <div className="video-processing-main">
        <VideoProcessingSettingsPanel workspace={workspace} />
        <VideoProcessingPreviewPanel workspace={workspace} />
      </div>
      <VideoProcessingQueuePanel workspace={workspace} />
    </div>
  )
}
```

The settings panel exposes percentage, width, height, quality preset, target MB, FPS, audio mode/bitrate, and collapsed Upscayl model/GPU/tile/TTA/thread settings. Disable all mutable fields for running/completed jobs. Show inline validation from `validateVideoProcessingSettings`.

The preview panel uses a file URL returned by the desktop preview API, never reads the source video into renderer memory, generates AI preview only on explicit click, and shows source/target facts.

The queue panel renders every required phase in Chinese, uses a progress bar, and exposes retry/cancel/remove/open-directory actions according to phase.

Register a leave guard while active or queued jobs exist:

```tsx
export const WorkspaceExitGuardContext = createContext<((guard: (() => Promise<boolean>) | null) => void) | null>(null)

export function useWorkspaceExitGuard(guard: (() => Promise<boolean>) | null) {
  const register = useContext(WorkspaceExitGuardContext)
  useEffect(() => {
    register?.(guard)
    return () => register?.(null)
  }, [guard, register])
}
```

`App.tsx` routes Escape, back, tool, and project-space navigation through one `requestActiveSurface(next)` callback. When a guard returns false it keeps the current surface. The video guard uses an Ant Design confirmation; confirmation awaits `cancelAndClearQueue()` before returning true.

- [ ] **Step 4: Add responsive, focused styles**

Use a two-column desktop layout with a 360–420px settings column and flexible preview; collapse to one column below 1100px. Keep queue rows usable at the app's 1600×1000 default window and allow horizontal scrolling rather than compressing metadata to unreadable widths.

- [ ] **Step 5: Run structure tests and build**

Run: `npx tsx --test src/videoProcessingStructure.test.ts src/appShellHomeStructure.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/VideoProcessingWorkspace src/videoProcessingStructure.test.ts
git commit -m "feat: build video processing workspace UI"
```

### Task 9: Integration Fixtures, Godot Smoke Test, and Documentation

**Files:**
- Create: `test-fixtures/godot-video-smoke/project.godot`
- Create: `test-fixtures/godot-video-smoke/video_smoke.gd`
- Modify: `README.md`
- Modify: `src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts`
- Modify: `electron/videoProcessingJobs.test.cjs`

**Interfaces:**
- Consumes: completed OGV output from Tasks 5–8.
- Produces: reproducible manual/optional Godot smoke command and user documentation.

- [ ] **Step 1: Add the Godot headless smoke project**

```gdscript
extends SceneTree

func _initialize() -> void:
    var args := OS.get_cmdline_user_args()
    if args.is_empty():
        push_error("Pass a res:// OGV path after --")
        quit(1)
        return
    var path := args[0]
    var stream := load(path)
    if not stream is VideoStreamTheora:
        push_error("Expected VideoStreamTheora: %s" % path)
        quit(1)
        return
    var player := VideoStreamPlayer.new()
    root.add_child(player)
    player.stream = stream
    player.play()
    await process_frame
    if not player.is_playing():
        push_error("VideoStreamPlayer did not start")
        quit(1)
        return
    quit(0)
```

- [ ] **Step 2: Add integration assertions with injected fake binaries**

Cover 50% conventional output, 150% AI command sequence, three quality presets, target-size retry, muted/no-audio input, reduced FPS, failed-middle-task continuation, cancellation cleanup, and strict OGV verification. Tests use temporary directories and fake spawn dependencies; `npm test` must not require a GPU or downloaded runtime.

- [ ] **Step 3: Document installation and Godot usage**

README instructions must state:

1. Open 视频处理工作台.
2. Install the pinned FFmpeg runtime.
3. Install Upscayl GPU before any enlargement above 100%.
4. Import videos and select the output directory.
5. Configure resize, compression, FPS, and audio.
6. Process the queue.
7. Add the `.ogv` file to Godot 4.6 and assign it to `VideoStreamPlayer.stream`.

Also disclose Theora's lower compression efficiency relative to modern codecs and that the feature intentionally prioritizes native Godot compatibility.

- [ ] **Step 4: Run focused tests and optional Godot smoke**

Run: `node --test electron/videoProcessingRuntime.test.cjs electron/videoProcessingCommands.test.cjs electron/videoProcessingJobs.test.cjs`

Expected: PASS.

Run when Godot 4.6 and a generated fixture are available:

```powershell
godot --headless --path test-fixtures/godot-video-smoke --quit-after 120 -- res://sample.ogv
```

Expected: exit code 0.

- [ ] **Step 5: Commit**

```powershell
git add README.md test-fixtures/godot-video-smoke src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts electron/videoProcessingJobs.test.cjs
git commit -m "test: verify Godot OGV video workflow"
```

### Task 10: Desktop QA and Release Gate

**Files:**
- Modify only files required by failures found in this task.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified feature ready for review.

- [ ] **Step 1: Run the complete automated gate**

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: all tests pass, Vite build succeeds, no whitespace errors, and only intended changes are present.

- [ ] **Step 2: Run Electron UI QA**

Run: `npm run desktop:dev`

Verify at the default 1600×1000 window:

- tool shortcut 4 opens 视频处理工作台;
- project space shortcut 5 still works;
- runtime installation reports progress and verified status;
- batch import/probe works with non-ASCII paths;
- fields synchronize and show even target dimensions;
- 50% and 150% tasks complete;
- target MB and all quality presets build valid commands;
- cancel cleans the active task and continues the queue;
- completed output opens in Explorer;
- leaving with active/queued work prompts, then cancels and cleans before navigation.

- [ ] **Step 3: Run the Godot 4.6 playback smoke**

Copy a completed output to `test-fixtures/godot-video-smoke/sample.ogv`, run the headless command from Task 9, and then open the minimal project interactively if headless playback cannot initialize the platform video backend.

Expected: Godot recognizes `VideoStreamTheora`, `VideoStreamPlayer` starts, and no decoder/import error is logged.

- [ ] **Step 4: Re-run the gate after QA fixes**

Run: `npm test`, `npm run build`, `git diff --check`.

Expected: PASS.

- [ ] **Step 5: Commit final QA fixes**

```powershell
git add -A
git commit -m "fix: harden Godot video processing workflow"
```

Skip this commit only when `git status --short` is empty after all verification.
