# Video Output Frame-Rate Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop valid constant-frame-rate Theora outputs from being rejected because FFprobe's statistical average differs from their correct declared playback rate.

**Architecture:** Keep the generated OGV verification boundary in `videoProcessingCommands.cjs`. Select the declared `r_frame_rate` as the authoritative metric, fall back to `avg_frame_rate` only when the declared rational is invalid, and include both raw and parsed values in genuine mismatch errors.

**Tech Stack:** Node.js CommonJS, FFprobe JSON metadata, Node test runner.

## Global Constraints

- Develop directly on `master`; do not create a branch or worktree.
- Do not change FFmpeg frame extraction or Theora encoding commands.
- Do not change input-media probing, which must continue to prefer `avg_frame_rate` for variable-frame-rate sources.
- Keep the existing `0.02 fps` absolute tolerance.
- A genuinely wrong declared playback rate must remain blocking.
- Use TDD and verify the regression test fails before changing production code.

---

### Task 1: Select the Correct OGV Playback Rate

**Files:**
- Modify: `electron/videoProcessingCommands.cjs:153-189`
- Test: `electron/videoProcessingCommands.test.cjs:144-169`

**Interfaces:**
- Consumes: FFprobe video stream fields `r_frame_rate` and `avg_frame_rate`, plus `expected.fps`.
- Produces: unchanged `verifyGodotOgvProbe(payload, expected)` return shape, with `fps` set to the selected verification rate and diagnostic mismatch errors.

- [ ] **Step 1: Add failing declared-rate regression tests**

Add these focused cases:

```javascript
test('Godot verifier uses declared CFR when statistical average drifts', () => {
  const result = verifyGodotOgvProbe({
    format: { format_name: 'ogg' },
    streams: [{
      codec_type: 'video', codec_name: 'theora', pix_fmt: 'yuv420p', width: 1280, height: 720,
      r_frame_rate: '1497/50', avg_frame_rate: '359/12',
    }],
  }, { width: 1280, height: 720, fps: 29.94, muted: true })
  assert.equal(result.fps, 29.94)
})

test('Godot verifier rejects a wrong declared CFR even when average matches', () => {
  assert.throws(() => verifyGodotOgvProbe({
    format: { format_name: 'ogg' },
    streams: [{
      codec_type: 'video', codec_name: 'theora', pix_fmt: 'yuv420p', width: 1280, height: 720,
      r_frame_rate: '25/1', avg_frame_rate: '30/1',
    }],
  }, { width: 1280, height: 720, fps: 30, muted: true }), /目标=30.*声明=25.*平均=30.*判定=声明帧率/)
})

test('Godot verifier falls back to average FPS when declared rate is unavailable', () => {
  const result = verifyGodotOgvProbe({
    format: { format_name: 'ogg' },
    streams: [{
      codec_type: 'video', codec_name: 'theora', pix_fmt: 'yuv420p', width: 1280, height: 720,
      r_frame_rate: '0/0', avg_frame_rate: '30067/1000',
    }],
  }, { width: 1280, height: 720, fps: 30.067, muted: true })
  assert.equal(result.fps, 30.067)
})
```

Also add a both-rates-invalid case that expects a diagnostic mismatch error containing the two raw rational values.

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
node --test electron/videoProcessingCommands.test.cjs
```

Expected: the declared-rate drift case fails because the current implementation selects `avg_frame_rate`; the wrong-declared-rate case passes incorrectly or lacks the required diagnostic message.

- [ ] **Step 3: Implement declared-first selection and diagnostics**

Replace the current rate selection with:

```javascript
const declaredFps = parseRational(video.r_frame_rate)
const averageFps = parseRational(video.avg_frame_rate)
const usingDeclaredFps = declaredFps > 0
const fps = usingDeclaredFps ? declaredFps : averageFps
const targetFps = Number(expected.fps)
if (!fps || Math.abs(fps - targetFps) > 0.02) {
  const metric = usingDeclaredFps ? '声明帧率' : '平均帧率兜底'
  throw new Error(
    `输出帧率与目标帧率不一致：目标=${targetFps}，` +
    `声明=${declaredFps || 0} (${String(video.r_frame_rate || '缺失')})，` +
    `平均=${averageFps || 0} (${String(video.avg_frame_rate || '缺失')})，判定=${metric}。`,
  )
}
```

Return the selected `fps` exactly as before. Leave all container, codec, pixel-format, resolution, audio, and extra-stream checks unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

```powershell
node --test electron/videoProcessingCommands.test.cjs
```

Expected: all command and verification tests pass.

- [ ] **Step 5: Run the complete release gate**

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: tests and build exit 0, no whitespace errors, and only the intended test/verification files are pending before commit.

- [ ] **Step 6: Commit the fix**

```powershell
git add electron/videoProcessingCommands.cjs electron/videoProcessingCommands.test.cjs
git commit -m "fix: validate declared OGV frame rate"
```
