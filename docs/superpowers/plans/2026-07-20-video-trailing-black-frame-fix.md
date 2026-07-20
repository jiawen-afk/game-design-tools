# Video Trailing Black Frame Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Godot OGV export end with its final video frame by trimming an overlong Vorbis/container tail to the authoritative video duration without truncating video when audio is shorter.

**Architecture:** Extend the probe contract with a dedicated video-stream duration while preserving the existing container duration. Pass an explicit output-duration cap through conventional, AI frame-sequence, quality, two-pass, and retry encoding paths; then reject outputs whose audio/container still extends materially beyond the video stream.

**Tech Stack:** Node.js CommonJS, FFmpeg/FFprobe, Theora/Vorbis Ogg, TypeScript model contracts, Node test runner.

## Global Constraints

- Work directly on the current `master` checkout.
- Do not use FFmpeg `-shortest`; short audio must not truncate video.
- Do not delete, duplicate, replace, or synthesize the last video frame.
- Conventional processing uses the probed video-stream duration.
- GPU processing uses `actual extracted frame count / target FPS`.
- Quality mode, both target-size passes, and the target-size retry use the same duration cap.
- Duration-tail validation tolerates `max(0.05 seconds, one frame + 0.01 seconds)` and only blocks when reliable video duration exists.
- Keep FFmpeg rules in `electron/videoProcessingCommands.cjs` and orchestration in `electron/videoProcessingJobs.cjs`.

---

## File Structure

- Modify `electron/videoProcessingCommands.cjs`: derive stream duration, add `-t`, and validate trailing duration.
- Modify `electron/videoProcessingCommands.test.cjs`: cover probe precedence/fallback, command arguments, and tail validation.
- Modify `electron/videoProcessingJobs.cjs`: choose and preserve the duration cap across initial encode and retry.
- Modify `electron/videoProcessingJobs.test.cjs`: assert conventional, AI, and retry command propagation.
- Modify `src/components/VideoProcessingWorkspace/videoProcessingModel.ts`: add `videoDurationSeconds` to `VideoMediaProbe`.
- Modify `src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts`: provide a safe fallback value while probing.
- Modify `src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts`: update typed probe fixtures.
- Modify `src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts`: update typed probe fixtures.

### Task 1: Add authoritative video-stream duration to probe metadata

**Files:**
- Modify: `electron/videoProcessingCommands.test.cjs`
- Modify: `electron/videoProcessingCommands.cjs`
- Modify: `src/components/VideoProcessingWorkspace/videoProcessingModel.ts`
- Modify: `src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts`
- Modify: `src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts`
- Modify: `src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts`
- Modify: `electron/videoProcessingJobs.test.cjs`

**Interfaces:**
- Produces: `VideoMediaProbe.videoDurationSeconds: number`.
- Preserves: `VideoMediaProbe.durationSeconds` as container duration used by existing progress/size estimates.
- Consumes later: conventional encoding reads `probe.videoDurationSeconds` and falls back to `probe.durationSeconds` only for legacy/incomplete inputs.

- [ ] **Step 1: Write failing probe mapping tests**

Extend the existing mapping test with a longer container and an explicit video duration:

```js
const result = mapProbeResult({
  format: { duration: '15.070000', size: '1000000' },
  streams: [
    {
      codec_type: 'video',
      codec_name: 'h264',
      width: 1920,
      height: 1080,
      pix_fmt: 'yuv420p',
      avg_frame_rate: '27060/901',
      duration: '15.016667',
      nb_frames: '451',
    },
    { codec_type: 'audio', codec_name: 'aac', duration: '15.070000', channels: 2, sample_rate: '44100' },
  ],
}, 'D:\\media\\source.mp4')

assert.equal(result.durationSeconds, 15.07)
assert.equal(result.videoDurationSeconds, 15.016667)
```

Add a fallback case where `video.duration` is absent:

```js
const fallback = mapProbeResult({
  format: { duration: '15.07', size: '1' },
  streams: [{
    codec_type: 'video',
    codec_name: 'h264',
    width: 640,
    height: 360,
    avg_frame_rate: '30/1',
    nb_frames: '451',
  }],
}, 'D:\\media\\fallback.mp4')

assert.equal(fallback.videoDurationSeconds, 15.033333)
```

- [ ] **Step 2: Run the command test and confirm RED**

Run:

```powershell
node --test electron/videoProcessingCommands.test.cjs
```

Expected: FAIL because `videoDurationSeconds` is missing.

- [ ] **Step 3: Implement duration derivation**

In `mapProbeResult`, calculate the two duration concepts separately:

```js
const containerDurationSeconds = Number(payload?.format?.duration || video.duration || 0)
const averageFps = parseRational(video.avg_frame_rate) || parseRational(video.r_frame_rate)
const streamDurationSeconds = Number(video.duration || 0)
const frameCount = Number(video.nb_frames || 0)
const derivedFrameDuration = frameCount > 0 && averageFps > 0 ? frameCount / averageFps : 0
const videoDurationSeconds = streamDurationSeconds > 0
  ? streamDurationSeconds
  : derivedFrameDuration > 0
    ? roundTo(derivedFrameDuration, 6)
    : containerDurationSeconds
```

Return both values, guarding non-finite/negative inputs:

```js
durationSeconds: Number.isFinite(containerDurationSeconds) && containerDurationSeconds > 0
  ? containerDurationSeconds
  : 0,
videoDurationSeconds: Number.isFinite(videoDurationSeconds) && videoDurationSeconds > 0
  ? videoDurationSeconds
  : 0,
```

- [ ] **Step 4: Update the renderer contract and fixtures**

Add this required field to `VideoMediaProbe`:

```ts
videoDurationSeconds: number
```

Set `videoDurationSeconds: 0` in `fallbackProbe`. Add `videoDurationSeconds` beside `durationSeconds` in the typed test probes and in the CommonJS `sourceProbe` helper.

- [ ] **Step 5: Run focused tests and build type-check**

Run:

```powershell
node --test electron/videoProcessingCommands.test.cjs electron/videoProcessingJobs.test.cjs
npx tsc -b --pretty false
```

Expected: both commands exit `0`.

- [ ] **Step 6: Commit probe metadata**

```powershell
git add electron/videoProcessingCommands.cjs electron/videoProcessingCommands.test.cjs electron/videoProcessingJobs.test.cjs src/components/VideoProcessingWorkspace/videoProcessingModel.ts src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts src/components/VideoProcessingWorkspace/videoProcessingModel.test.ts src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts
git commit -m "fix: track authoritative video stream duration"
```

### Task 2: Cap every encode path at the video duration

**Files:**
- Modify: `electron/videoProcessingCommands.test.cjs`
- Modify: `electron/videoProcessingCommands.cjs`
- Modify: `electron/videoProcessingJobs.test.cjs`
- Modify: `electron/videoProcessingJobs.cjs`

**Interfaces:**
- Consumes: `videoInput.outputDurationSeconds: number`.
- Produces: `buildTheoraEncodeArgs({ outputDurationSeconds })` adds `-t` followed by the formatted numeric duration and never adds `-shortest`.
- Produces internally: pipeline result `{ bitrateKbps: number | null, videoInput: object }`, reused by target-size retry.

- [ ] **Step 1: Write failing command-builder tests**

Add `outputDurationSeconds: 15.016667` to the standard and AI encode fixtures and assert:

```js
assert.deepEqual(args.slice(args.indexOf('-t'), args.indexOf('-t') + 2), ['-t', '15.017'])
assert.equal(args.includes('-shortest'), false)
```

Add the same option to pass one and assert `-t` is present before the `NUL` output. The shared builder makes pass two inherit the same behavior.

- [ ] **Step 2: Run command tests and confirm RED**

Run:

```powershell
node --test electron/videoProcessingCommands.test.cjs
```

Expected: FAIL because `buildTheoraEncodeArgs` does not emit `-t`.

- [ ] **Step 3: Add the output cap to FFmpeg arguments**

After video/audio codec arguments and before progress/output arguments, add:

```js
const outputDurationSeconds = Number(options.outputDurationSeconds)
if (Number.isFinite(outputDurationSeconds) && outputDurationSeconds > 0) {
  args.push('-t', formatNumber(outputDurationSeconds))
}
```

Do not add `-shortest`.

- [ ] **Step 4: Write failing job-orchestration assertions**

In the conventional job test, inspect its OGV encode call:

```js
const conventionalEncode = calls.find((call) => call.args.at(-1).endsWith('.ogv'))
assert.deepEqual(
  conventionalEncode.args.slice(conventionalEncode.args.indexOf('-t'), conventionalEncode.args.indexOf('-t') + 2),
  ['-t', '2'],
)
```

In the AI job test, two extracted frames at 2 FPS must cap at one second:

```js
const aiEncode = calls.find((call) => call.args.at(-1).endsWith('.ogv'))
assert.deepEqual(aiEncode.args.slice(aiEncode.args.indexOf('-t'), aiEncode.args.indexOf('-t') + 2), ['-t', '1'])
```

In the target-size retry test, collect every pass-two call and assert each contains `['-t', '2']`.

- [ ] **Step 5: Run job tests and confirm RED**

Run:

```powershell
node --test electron/videoProcessingJobs.test.cjs
```

Expected: FAIL because job orchestration does not pass `outputDurationSeconds`.

- [ ] **Step 6: Preserve one video input contract through initial encode and retry**

Construct conventional input as:

```js
const videoInput = {
  inputPath: job.options.inputPath,
  outputDurationSeconds: job.options.probe.videoDurationSeconds || job.options.probe.durationSeconds,
}
```

Construct AI input after collecting frames as:

```js
const videoInput = {
  framePattern: framePaths.upscaledPattern,
  audioInputPath: options.inputPath,
  outputDurationSeconds: sourceFrames.length / options.settings.targetFps,
}
```

Make both pipeline functions return:

```js
return {
  bitrateKbps: await encodeOutput(job, runtime, videoInput, temporaryOutputPath),
  videoInput,
}
```

In `start`, keep this pipeline result and pass its exact `videoInput` and `bitrateKbps` to `retryTargetSizeIfNeeded`. Remove the separately reconstructed video input so retries cannot lose the duration cap.

- [ ] **Step 7: Run command and job tests GREEN**

Run:

```powershell
node --test electron/videoProcessingCommands.test.cjs electron/videoProcessingJobs.test.cjs
```

Expected: all focused tests pass.

- [ ] **Step 8: Commit duration-capped encoding**

```powershell
git add electron/videoProcessingCommands.cjs electron/videoProcessingCommands.test.cjs electron/videoProcessingJobs.cjs electron/videoProcessingJobs.test.cjs
git commit -m "fix: cap OGV output at video duration"
```

### Task 3: Reject outputs with a material audio/container tail

**Files:**
- Modify: `electron/videoProcessingCommands.test.cjs`
- Modify: `electron/videoProcessingCommands.cjs`

**Interfaces:**
- Consumes: FFprobe `video.duration`, `video.nb_frames`, audio `duration`, format `duration`, and verified FPS.
- Produces: a verification error only when reliable video duration exists and the maximum trailing duration exceeds the allowed tolerance.

- [ ] **Step 1: Add the failing real-world tail test**

Add a probe matching the observed export:

```js
assert.throws(() => verifyGodotOgvProbe({
  format: { format_name: 'ogg', duration: '15.069751', size: '11755213' },
  streams: [
    {
      codec_type: 'video', codec_name: 'theora', pix_fmt: 'yuv420p',
      width: 960, height: 540, r_frame_rate: '30033/1000', avg_frame_rate: '30/1',
      duration: '15.016815', nb_frames: '451',
    },
    { codec_type: 'audio', codec_name: 'vorbis', duration: '15.069751' },
  ],
}, { width: 960, height: 540, fps: 30.033, muted: false }), /音频或容器尾部超过视频/)
```

Add an accepted rounding case where format/audio end `0.04` seconds after a 30 FPS video, and a case with missing video duration metadata that preserves existing verification behavior.

- [ ] **Step 2: Run command tests and confirm RED**

Run:

```powershell
node --test electron/videoProcessingCommands.test.cjs
```

Expected: FAIL because trailing duration is not checked.

- [ ] **Step 3: Implement bounded tail verification**

After FPS and stream validation, derive durations:

```js
const videoDurationSeconds = Number(video.duration || 0) > 0
  ? Number(video.duration)
  : Number(video.nb_frames || 0) > 0 && fps > 0
    ? Number(video.nb_frames) / fps
    : 0
const audioDurationSeconds = Math.max(0, ...audioStreams.map((stream) => Number(stream.duration || 0)))
const containerDurationSeconds = Math.max(0, Number(payload?.format?.duration || 0))
const tailDurationSeconds = Math.max(audioDurationSeconds, containerDurationSeconds) - videoDurationSeconds
const tailToleranceSeconds = Math.max(0.05, 1 / fps + 0.01)
```

When `videoDurationSeconds > 0` and the tail exceeds tolerance, throw an error containing video, audio, container, tail, and tolerance values. Add `videoDurationSeconds` to the successful verification result while preserving `durationSeconds` as container duration.

- [ ] **Step 4: Run focused tests GREEN**

Run:

```powershell
node --test electron/videoProcessingCommands.test.cjs electron/videoProcessingJobs.test.cjs
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit verification defense**

```powershell
git add electron/videoProcessingCommands.cjs electron/videoProcessingCommands.test.cjs
git commit -m "fix: reject trailing OGV audio tails"
```

### Task 4: Full verification and final integration

**Files:**
- Verify: all files changed since `7eea53d`.

**Interfaces:**
- Produces: a clean `master` with the tested black-tail fix committed locally.

- [ ] **Step 1: Run the complete project gate**

Run:

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: tests and build exit `0`, diff check is empty, and the worktree is clean with `master` only ahead of `origin/master` by the intended commits.

- [ ] **Step 2: Review the final diff against the design**

Run:

```powershell
git diff --check origin/master...HEAD
git diff --stat origin/master...HEAD
git log --oneline origin/master..HEAD
```

Expected: changes remain limited to the design/plan, video command/model/job code, and their focused tests; no UI, queue lifecycle, Upscayl implementation, or unrelated files changed.
