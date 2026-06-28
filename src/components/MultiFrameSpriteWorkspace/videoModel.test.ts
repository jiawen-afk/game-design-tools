import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { computeVideoPreviewCropState } from './videoFramePipeline'
import {
  selectFramesByVisibilityStride,
  buildVideoFrameTimestamps,
  clampVideoClipRange,
  clampUniformCrop,
  computeUniformCropSize,
  getVideoExtractionFrameCount,
  getVideoExtractionLimitMessage,
  getVideoPreviewSeekTarget,
  getVideoSourceUrlToRevoke,
  shouldReplayVideoSegment
} from './model'
const spriteWorkspaceStylePaths = [
  'src/components/MultiFrameSpriteWorkspace/workspace.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.videoLayout.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.upload.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.video.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.matte.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.upscale.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.playback.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.responsive.css',
]

function spriteWorkspaceCssSource() {
  return spriteWorkspaceStylePaths
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
}
test('video clip range stays inside the loaded duration', () => {
  assert.deepEqual(clampVideoClipRange({ duration: 10, start: -2, end: 99 }), { start: 0, end: 10 })
  assert.deepEqual(clampVideoClipRange({ duration: 10, start: 8, end: 3 }), { start: 3, end: 8 })
  assert.deepEqual(clampVideoClipRange({ duration: 0, start: 2, end: 3 }), { start: 0, end: 0 })
})

test('video frame timestamps sample the selected clip by fps', () => {
  assert.deepEqual(buildVideoFrameTimestamps(1, 2, 4), [1, 1.25, 1.5, 1.75, 2])
  assert.deepEqual(buildVideoFrameTimestamps(0, 0.1, 60), [0, 0.017, 0.033, 0.05, 0.067, 0.083, 0.1])
  assert.deepEqual(buildVideoFrameTimestamps(3, 3, 12), [3])
})

test('video extraction frame count is capped before heavy extraction starts', () => {
  const allowedClip = { start: 0, end: 10, fps: 12, limit: 300 }
  const oversizedClip = { start: 0, end: 12, fps: 30, limit: 300 }
  const oversizedCount = (oversizedClip.end - oversizedClip.start) * oversizedClip.fps + 1

  assert.equal(
    getVideoExtractionFrameCount(allowedClip.start, allowedClip.end, allowedClip.fps),
    (allowedClip.end - allowedClip.start) * allowedClip.fps + 1
  )
  assert.equal(
    getVideoExtractionLimitMessage(allowedClip.start, allowedClip.end, allowedClip.fps, allowedClip.limit),
    null
  )
  assert.equal(getVideoExtractionFrameCount(oversizedClip.start, oversizedClip.end, oversizedClip.fps), oversizedCount)
  assert.equal(
    getVideoExtractionLimitMessage(oversizedClip.start, oversizedClip.end, oversizedClip.fps, oversizedClip.limit),
    `预计提取 ${oversizedCount} 帧，已超过单次上限 ${oversizedClip.limit} 帧。请缩短片段或降低 FPS。`
  )
})

test('video preview seeks to the slider handle that changed', () => {
  const previous = [2, 6] as [number, number]
  const startChanged = [previous[0] + 1, previous[1]] as [number, number]
  const endChanged = [previous[0], previous[1] + 1] as [number, number]
  const bothChanged = [previous[0] + 1, previous[1] + 1] as [number, number]

  assert.equal(getVideoPreviewSeekTarget(previous, startChanged), startChanged[0])
  assert.equal(getVideoPreviewSeekTarget(previous, endChanged), endChanged[1])
  assert.equal(getVideoPreviewSeekTarget(previous, bothChanged), bothChanged[0])
})

test('video segment replay triggers just before the selected end time', () => {
  assert.equal(shouldReplayVideoSegment(4.94, 2, 5), false)
  assert.equal(shouldReplayVideoSegment(4.95, 2, 5), true)
  assert.equal(shouldReplayVideoSegment(5.1, 2, 5), true)
  assert.equal(shouldReplayVideoSegment(2, 2, 2), false)
})

test('video source object urls are kept when only metadata changes', () => {
  assert.equal(getVideoSourceUrlToRevoke(null, 'blob:video-a'), null)
  assert.equal(getVideoSourceUrlToRevoke('blob:video-a', 'blob:video-a'), null)
  assert.equal(getVideoSourceUrlToRevoke('blob:video-a', 'blob:video-b'), 'blob:video-a')
  assert.equal(getVideoSourceUrlToRevoke('blob:video-a', null), 'blob:video-a')
})

test('uniform video crop clamps each edge inside the frame', () => {
  assert.deepEqual(
    clampUniformCrop({ top: -5, bottom: 999, left: 8.6, right: 999 }, 32, 24),
    { top: 0, bottom: 23, left: 9, right: 22 }
  )
  assert.deepEqual(
    clampUniformCrop({ top: 10, bottom: 20, left: 10, right: 20 }, 16, 16, 4),
    { top: 10, bottom: 2, left: 10, right: 2 }
  )
})

test('uniform video crop reports the shared output frame size', () => {
  assert.deepEqual(
    computeUniformCropSize(96, 64, { top: 4, bottom: 12, left: 8, right: 16 }),
    { width: 72, height: 48 }
  )
  assert.deepEqual(
    computeUniformCropSize(12, 10, { top: 9, bottom: 9, left: 9, right: 9 }, 3),
    { width: 3, height: 3 }
  )
})

test('video preview crop state projects frame crop into preview coordinates', () => {
  const state = computeVideoPreviewCropState(
    { width: 100, height: 50 },
    { width: 200, height: 200 },
    { top: 5, bottom: 10, left: 10, right: 20 },
    4
  )

  assert.deepEqual(state, {
    imageRect: { left: 0, top: 50, width: 200, height: 100, scale: 2 },
    safeCrop: { top: 5, bottom: 10, left: 10, right: 20 },
    outputSize: { width: 70, height: 35 },
    cropBox: { left: 20, top: 10, width: 140, height: 70 },
  })
  assert.equal(computeVideoPreviewCropState(undefined, { width: 200, height: 200 }, { top: 0, bottom: 0, left: 0, right: 0 }, 4), null)
})

test('video extracted frame preview layout keeps preview flexible and frame list scrollable', () => {
  const css = spriteWorkspaceCssSource()

  assert.match(css, /\.video-workspace-grid\s*{[^}]*min-height:\s*\d+px/s)
  assert.match(css, /\.video-controls-column\s*{[^}]*grid-template-rows:\s*auto\s+auto[^}]*align-content:\s*start[^}]*gap:\s*\d+px/s)
  assert.match(css, /\.video-source-box\s*{[^}]*min-height:\s*\d+px/s)
  assert.match(css, /\.video-source-box\s+video\s*{[^}]*max-height:\s*\d+px/s)
  assert.match(css, /\.video-tab-right\s*{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto\s+auto/s)
  assert.match(css, /\.video-preview-box\s*{[^}]*flex:\s*1\s+1\s+auto[^}]*min-height:\s*\d+px/s)
  assert.match(css, /\.video-frame-list-panel\s*{[^}]*max-height:\s*\d+px[^}]*overflow:\s*auto/s)
  assert.match(css, /\.video-confirm-action\s+\.ant-btn\s*{[^}]*width:\s*100%/s)
})

test('video visibility stride selects only the first extracted frame in each group', () => {
  const frames = [
    { id: 'a' },
    { id: 'b' },
    { id: 'c' },
    { id: 'd' },
    { id: 'e' },
    { id: 'f' },
  ]

  assert.deepEqual(selectFramesByVisibilityStride(frames, 1).map((frame) => frame.id), ['a', 'b', 'c', 'd', 'e', 'f'])
  assert.deepEqual(selectFramesByVisibilityStride(frames, 2).map((frame) => frame.id), ['a', 'c', 'e'])
  assert.deepEqual(selectFramesByVisibilityStride(frames, 3).map((frame) => frame.id), ['a', 'd'])
  assert.deepEqual(selectFramesByVisibilityStride(frames, 4).map((frame) => frame.id), ['a', 'e'])
  assert.deepEqual(selectFramesByVisibilityStride(frames, 99).map((frame) => frame.id), ['a', 'e'])
  assert.deepEqual(selectFramesByVisibilityStride(frames, 0).map((frame) => frame.id), ['a', 'b', 'c', 'd', 'e', 'f'])
})
