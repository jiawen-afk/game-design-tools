import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  buildMultiFrameSpriteIndex,
  applyComposedFrameUrl,
  applyFrameTagSelection,
  applyCanvasRatioToFrameLayouts,
  applyLayoutPresetToFrames,
  advancePlaybackCursor,
  batchHideSelectedFrames,
  buildPlaybackFrameIds,
  buildSpriteSheetGridCells,
  buildVideoFrameTimestamps,
  clearFrameCollection,
  clampVideoClipRange,
  clampPreviewZoom,
  clampUniformCrop,
  coerceLayoutDefaults,
  coerceMatteDefaults,
  computeUniformCropSize,
  computeAutoSpriteColumns,
  computeHandleResize,
  computeKeyboardOffset,
  getPendingComposedFrameIds,
  computeWheelFrameResize,
  computeRatioSize,
  computeWheelResize,
  countPlayableFrames,
  filterLivePlaybackFrameIds,
  filterNewUploadFiles,
  buildMatteFrameGroups,
  filterVisibleFrames,
  getInitialMatteFrameIds,
  getGuideEmptyStateText,
  getGuideLineEdgeStartPosition,
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getSpillColorHex,
  getGuideRulerLabel,
  getWheelScalingButtonLabel,
  normalizeHexColor,
  normalizePickerColor,
  normalizeGuideLinePosition,
  getVideoExtractionFrameCount,
  getVideoExtractionLimitMessage,
  getVideoPreviewSeekTarget,
  getVideoSourceUrlToRevoke,
  shouldReplayVideoSegment,
  shouldIgnoreInitialGuideDrag,
  applyMatteParamsToAllFrames,
  applyMatteParamsToFrameGroup,
  applyMatteParamsToFollowingFrames,
  getNextMatteGroupName,
  queueUniqueFrameId,
  removeMatteFrameGroup,
  resolvePipelineConcurrency,
  resolveSpillColor,
} from './model'
import { computeVideoPreviewCropState } from './videoFramePipeline'

test('auto columns make compact sprite sheets', () => {
  assert.equal(computeAutoSpriteColumns(1), 1)
  assert.equal(computeAutoSpriteColumns(5), 3)
  assert.equal(computeAutoSpriteColumns(16), 4)
})

test('sprite sheet grid cells split an uploaded sheet by rows and columns', () => {
  assert.deepEqual(buildSpriteSheetGridCells(96, 64, 2, 3), [
    { index: 0, row: 0, column: 0, x: 0, y: 0, width: 32, height: 32 },
    { index: 1, row: 0, column: 1, x: 32, y: 0, width: 32, height: 32 },
    { index: 2, row: 0, column: 2, x: 64, y: 0, width: 32, height: 32 },
    { index: 3, row: 1, column: 0, x: 0, y: 32, width: 32, height: 32 },
    { index: 4, row: 1, column: 1, x: 32, y: 32, width: 32, height: 32 },
    { index: 5, row: 1, column: 2, x: 64, y: 32, width: 32, height: 32 },
  ])
})

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
  assert.equal(getVideoExtractionFrameCount(0, 10, 12), 121)
  assert.equal(getVideoExtractionLimitMessage(0, 10, 12, 300), null)
  assert.equal(getVideoExtractionFrameCount(0, 12, 30), 361)
  assert.equal(getVideoExtractionLimitMessage(0, 12, 30, 300), '预计提取 361 帧，已超过单次上限 300 帧。请缩短片段或降低 FPS。')
})

test('video preview seeks to the slider handle that changed', () => {
  assert.equal(getVideoPreviewSeekTarget([2, 6], [3, 6]), 3)
  assert.equal(getVideoPreviewSeekTarget([2, 6], [2, 7]), 7)
  assert.equal(getVideoPreviewSeekTarget([2, 6], [3, 7]), 3)
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
  const css = readFileSync('src/components/MultiFrameSpriteWorkspace/workspace.css', 'utf8')

  assert.match(css, /\.video-workspace-grid\s*{[^}]*min-height:\s*640px/s)
  assert.match(css, /\.video-controls-column\s*{[^}]*grid-template-rows:\s*auto\s+auto[^}]*align-content:\s*start[^}]*gap:\s*12px/s)
  assert.match(css, /\.video-source-box\s*{[^}]*min-height:\s*380px/s)
  assert.match(css, /\.video-source-box\s+video\s*{[^}]*max-height:\s*380px/s)
  assert.match(css, /\.video-tab-right\s*{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto\s+auto/s)
  assert.match(css, /\.video-preview-box\s*{[^}]*flex:\s*1\s+1\s+auto[^}]*min-height:\s*220px/s)
  assert.match(css, /\.video-frame-list-panel\s*{[^}]*max-height:\s*156px[^}]*overflow:\s*auto/s)
  assert.match(css, /\.video-confirm-action\s+\.ant-btn\s*{[^}]*width:\s*100%/s)
})

test('playback preview stays bounded when many frame rows are present', () => {
  const css = readFileSync('src/components/MultiFrameSpriteWorkspace/workspace.css', 'utf8')
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackPanel.tsx', 'utf8')

  assert.match(panel, /className="playback-workspace-grid"/)
  assert.match(panel, /className="playback-frame-list"/)
  assert.match(panel, /className="playback-preview-box"/)
  assert.match(css, /\.playback-workspace-grid\s*{[^}]*align-items:\s*start/s)
  assert.match(css, /\.playback-workspace-grid\s*{[^}]*grid-template-columns:\s*minmax\(520px,\s*680px\)\s+minmax\(240px,\s*420px\)/s)
  assert.match(css, /\.playback-frame-list\s*{[^}]*grid-auto-flow:\s*column[^}]*grid-template-rows:\s*repeat\(7,\s*minmax\(0,\s*max-content\)\)[^}]*grid-auto-columns:\s*minmax\(150px,\s*1fr\)[^}]*max-height:\s*500px[^}]*overflow:\s*auto/s)
  assert.match(css, /\.playback-preview-box\s*{[^}]*height:\s*min\(42vw,\s*420px\)[^}]*max-height:\s*420px/s)
})

test('playback preview uses one all-play button for play and pause states', () => {
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackPanel.tsx', 'utf8')

  assert.match(panel, /playing \? '暂停播放' : '全部播放'/)
  assert.match(panel, /onClick=\{playing \? onPause : onStartAll\}/)
  assert.doesNotMatch(panel, /\{playing && <Button onClick=\{onPause\}>暂停<\/Button>\}/)
})

test('public ratio apply button exposes processing state while composed frames update', () => {
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/CanvasPublicParamsPanel.tsx', 'utf8')
  const toolbar = readFileSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspaceToolbar.tsx', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const feedbackHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useCanvasRatioApplyFeedback.ts', 'utf8')

  assert.match(panel, /ratioApplying:\s*boolean/)
  assert.match(panel, /loading=\{ratioApplying\}/)
  assert.match(panel, /disabled=\{ratioApplying\}/)
  assert.match(toolbar, /ratioApplying=\{layout\.canvasRatioApplying\}/)
  assert.match(hook, /canvasRatioApplying/)
  assert.match(feedbackHook, /getPendingComposedFrameIds/)
})

test('pending composed frame ids track only ratio targets that still need composing', () => {
  assert.deepEqual(
    getPendingComposedFrameIds(
      [
        { id: 'a', matteUrl: 'blob:a', matteRevision: 2, composedRevision: -1 },
        { id: 'b', matteUrl: 'blob:b', matteRevision: 3, composedRevision: 3 },
        { id: 'c', matteUrl: null, matteRevision: 0, composedRevision: -1 },
      ],
      ['a', 'b', 'c']
    ),
    ['a']
  )
  assert.deepEqual(
    getPendingComposedFrameIds(
      [{ id: 'a', matteUrl: 'blob:a', matteRevision: 2, composedRevision: -1 }],
      []
    ),
    []
  )
})

test('workspace video styles live beside the workspace component', () => {
  const appCss = readFileSync('src/styles/app.css', 'utf8')
  const workspaceCss = readFileSync('src/components/MultiFrameSpriteWorkspace/workspace.css', 'utf8')

  assert.doesNotMatch(appCss, /\.video-workspace-grid/)
  assert.match(workspaceCss, /\.video-workspace-grid\s*{[^}]*min-height:\s*640px/s)
  assert.match(workspaceCss, /\.video-crop-layer\s*{[^}]*pointer-events:\s*auto/s)
})

test('workspace implementation delegates focused responsibilities to local modules', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const videoHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const videoPreviewHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoFramePreviewWorkspace.ts', 'utf8')
  const playbackHook = readFileSync('src/components/MultiFrameSpriteWorkspace/usePlaybackWorkspace.ts', 'utf8')
  const lineCount = source.split(/\r?\n/).length

  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspacePanel.tsx', 'utf8'), /from '\.\/types'/)
  assert.match(source, /from '\.\/constants'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/WorkspaceDialogs.tsx', 'utf8'), /from '\.\/DetailPreviewModal'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx', 'utf8'), /from '\.\/ExportPanel'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspaceToolbar.tsx', 'utf8'), /from '\.\/FrameThumbnailStrip'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/useFrameWorkspaceState.ts', 'utf8'), /from '\.\/imagePipeline'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/WorkspaceDialogs.tsx', 'utf8'), /from '\.\/LayoutDefaultsModal'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8'), /from '\.\/MatteFrameCard'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/WorkspaceDialogs.tsx', 'utf8'), /from '\.\/MatteDefaultsModal'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx', 'utf8'), /from '\.\/PlaybackPanel'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx', 'utf8'), /from '\.\/SpriteSheetUploadPanel'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx', 'utf8'), /from '\.\/VideoUploadPanel'/)
  assert.match(controller, /from '\.\/useVideoWorkspace'/)
  assert.match(playbackHook, /from '\.\/playbackModel'/)
  assert.match(readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8'), /from '\.\/matteModel'/)
  assert.match(videoPreviewHook, /from '\.\/cropModel'/)
  assert.match(videoHook, /from '\.\/useVideoFramePreviewWorkspace'/)
  assert.match(videoHook, /from '\.\/videoModel'/)
  assert.match(videoHook, /from '\.\/videoFramePipeline'/)
  assert.ok(lineCount < 2700, `expected workspace entry to stay below 2700 lines, got ${lineCount}`)
})

test('workspace entry delegates stateful workflows to focused hooks', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const lineCount = source.split(/\r?\n/).length

  assert.match(source, /from '\.\/useSpriteWorkspaceController'/)
  assert.match(controller, /from '\.\/useFrameWorkspaceState'/)
  assert.match(controller, /from '\.\/usePlaybackWorkspace'/)
  assert.match(controller, /from '\.\/useSpriteExport'/)
  assert.match(controller, /from '\.\/useVideoWorkspace'/)
  assert.match(controller, /from '\.\/useLayoutWorkspace'/)
  assert.match(controller, /from '\.\/useMattePipeline'/)
  assert.match(controller, /from '\.\/useUploadWorkspace'/)
  assert.match(controller, /from '\.\/useWorkspaceReset'/)
  assert.ok(lineCount < 1500, `expected workspace entry to stay below 1500 lines, got ${lineCount}`)
})

test('matte pipeline hook owns matte and compose side effects', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const lineCount = source.split(/\r?\n/).length

  assert.doesNotMatch(source, /chromaKey/)
  assert.doesNotMatch(source, /composeFrame/)
  assert.doesNotMatch(source, /applyComposedFrameUrl/)
  assert.doesNotMatch(source, /applyMatteParamsToFollowingFrames/)
  assert.match(hook, /chromaKey/)
  assert.match(hook, /composeFrame/)
  assert.match(hook, /applyComposedFrameUrl/)
  assert.match(hook, /applyMatteParamsToFollowingFrames/)
  assert.ok(lineCount < 1320, `expected workspace entry to stay below 1320 lines after matte extraction, got ${lineCount}`)
})

test('layout workspace hook owns layout and guide side effects', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const interactionHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutPointerInteractions.ts', 'utf8')
  const lineCount = source.split(/\r?\n/).length

  assert.doesNotMatch(source, /computeHandleResize/)
  assert.doesNotMatch(source, /computeKeyboardOffset/)
  assert.doesNotMatch(source, /normalizeGuideLinePosition/)
  assert.doesNotMatch(source, /applyCanvasRatioToFrameLayouts/)
  assert.match(hook, /useLayoutPointerInteractions/)
  assert.match(hook, /applyCanvasRatioToFrameLayouts/)
  assert.match(interactionHook, /computeHandleResize/)
  assert.match(interactionHook, /computeKeyboardOffset/)
  assert.match(interactionHook, /normalizeGuideLinePosition/)
  assert.ok(lineCount < 1050, `expected workspace entry to stay below 1050 lines after layout extraction, got ${lineCount}`)
})

test('upload workspace hook owns image and sprite sheet upload side effects', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const hookPath = 'src/components/MultiFrameSpriteWorkspace/useUploadWorkspace.ts'
  const lineCount = source.split(/\r?\n/).length

  assert.ok(existsSync(hookPath), 'expected upload workspace hook to exist')
  const hook = readFileSync(hookPath, 'utf8')

  assert.doesNotMatch(source, /makeFrameFromFile/)
  assert.doesNotMatch(source, /splitSpriteSheetToPreviews/)
  assert.doesNotMatch(source, /filterNewUploadFiles/)
  assert.doesNotMatch(source, /pendingUploadKeysRef/)
  assert.match(controller, /from '\.\/useUploadWorkspace'/)
  assert.match(hook, /makeFrameFromFile/)
  assert.match(hook, /splitSpriteSheetToPreviews/)
  assert.match(hook, /filterNewUploadFiles/)
  assert.match(hook, /pendingUploadKeysRef/)
  assert.ok(lineCount < 930, `expected workspace entry to stay below 930 lines after upload extraction, got ${lineCount}`)
})

test('layout workspace panel owns canvas editing view details', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const panelPath = 'src/components/MultiFrameSpriteWorkspace/LayoutWorkspacePanel.tsx'
  const canvasStagePath = 'src/components/MultiFrameSpriteWorkspace/CanvasStage.tsx'
  const lineCount = source.split(/\r?\n/).length

  assert.ok(existsSync(panelPath), 'expected layout workspace panel to exist')
  assert.ok(existsSync(canvasStagePath), 'expected canvas stage component to exist')
  const canvasStage = readFileSync(canvasStagePath, 'utf8')

  assert.doesNotMatch(source, /HANDLE_CURSORS/)
  assert.doesNotMatch(source, /getGuideRulerLabel/)
  assert.doesNotMatch(source, /data-guide-line-overlay/)
  assert.match(source, /from '\.\/LayoutWorkspacePanel'/)
  assert.match(canvasStage, /HANDLE_CURSORS/)
  assert.match(canvasStage, /getGuideRulerLabel/)
  assert.match(canvasStage, /data-guide-line-overlay/)
  assert.ok(lineCount < 620, `expected workspace entry to stay below 620 lines after layout view extraction, got ${lineCount}`)
})

test('upload and matte panels own staged card view details', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const uploadPanelPath = 'src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx'
  const mattePanelPath = 'src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx'
  const lineCount = source.split(/\r?\n/).length

  assert.ok(existsSync(uploadPanelPath), 'expected upload workspace panel to exist')
  assert.ok(existsSync(mattePanelPath), 'expected matte workspace panel to exist')
  const uploadPanel = readFileSync(uploadPanelPath, 'utf8')
  const mattePanel = readFileSync(mattePanelPath, 'utf8')

  assert.doesNotMatch(source, /SpriteSheetUploadPanel/)
  assert.doesNotMatch(source, /VideoUploadPanel/)
  assert.doesNotMatch(source, /MatteFrameCard/)
  assert.doesNotMatch(source, /<Tabs/)
  assert.doesNotMatch(source, /<Upload\s/)
  assert.match(source, /from '\.\/UploadWorkspacePanel'/)
  assert.match(source, /from '\.\/MatteWorkspacePanel'/)
  assert.match(uploadPanel, /SpriteSheetUploadPanel/)
  assert.match(uploadPanel, /VideoUploadPanel/)
  assert.match(uploadPanel, /<Tabs/)
  assert.match(uploadPanel, /<Upload\s/)
  assert.match(mattePanel, /MatteFrameCard/)
  assert.ok(lineCount < 380, `expected workspace entry to stay below 380 lines after staged panel extraction, got ${lineCount}`)
})

test('workspace entry only composes focused panels and hooks', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const layoutPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspacePanel.tsx', 'utf8')
  const lineCount = source.split(/\r?\n/).length
  const layoutLineCount = layoutPanel.split(/\r?\n/).length

  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/useWorkspaceReset.ts'), 'expected reset hook to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspaceToolbar.tsx'), 'expected layout toolbar component to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/CanvasStage.tsx'), 'expected canvas stage component to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/ActiveFrameInspector.tsx'), 'expected active frame inspector component to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/WorkspaceDialogs.tsx'), 'expected dialogs component to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx'), 'expected output panel component to exist')

  assert.doesNotMatch(source, /useEffect/)
  assert.doesNotMatch(source, /removeAllFrames/)
  assert.doesNotMatch(source, /setGuideDragState/)
  assert.doesNotMatch(source, /canvasStageRef/)
  assert.doesNotMatch(source, /handleLayoutWheel/)
  assert.doesNotMatch(source, /PlaybackPanel/)
  assert.doesNotMatch(source, /ExportPanel/)
  assert.doesNotMatch(source, /MatteDefaultsModal/)
  assert.doesNotMatch(source, /LayoutDefaultsModal/)
  assert.doesNotMatch(source, /DetailPreviewModal/)
  assert.match(controller, /from '\.\/useWorkspaceReset'/)
  assert.match(source, /from '\.\/WorkspaceDialogs'/)
  assert.match(source, /from '\.\/OutputWorkspacePanel'/)

  assert.match(layoutPanel, /LayoutWorkspaceToolbar/)
  assert.match(layoutPanel, /CanvasStage/)
  assert.match(layoutPanel, /ActiveFrameInspector/)
  assert.ok(layoutLineCount < 260, `expected layout workspace panel to stay below 260 lines after tool extraction, got ${layoutLineCount}`)
  assert.ok(lineCount < 260, `expected workspace entry to stay below 260 lines after final panel extraction, got ${lineCount}`)
})

test('workspace entry delegates controller shell and view model boundaries', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controllerPath = 'src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts'
  const shellPath = 'src/components/MultiFrameSpriteWorkspace/WorkspaceShell.tsx'
  const frameHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useFrameWorkspaceState.ts', 'utf8')
  const layoutHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const uploadPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx', 'utf8')
  const outputPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx', 'utf8')
  const dialogs = readFileSync('src/components/MultiFrameSpriteWorkspace/WorkspaceDialogs.tsx', 'utf8')
  const lineCount = source.split(/\r?\n/).length

  assert.ok(existsSync(controllerPath), 'expected sprite workspace controller hook to exist')
  assert.ok(existsSync(shellPath), 'expected workspace shell component to exist')
  const controller = readFileSync(controllerPath, 'utf8')
  const shell = readFileSync(shellPath, 'utf8')

  assert.doesNotMatch(source, /useMemo/)
  assert.doesNotMatch(source, /readStoredLayoutDefaults/)
  assert.doesNotMatch(source, /useLayoutWorkspace/)
  assert.doesNotMatch(source, /usePlaybackWorkspace/)
  assert.doesNotMatch(source, /useSpriteExport/)
  assert.doesNotMatch(source, /useMattePipeline/)
  assert.doesNotMatch(source, /useUploadWorkspace/)
  assert.doesNotMatch(source, /useVideoWorkspace/)
  assert.doesNotMatch(source, /useWorkspaceReset/)
  assert.doesNotMatch(source, /setDetailPreview/)
  assert.doesNotMatch(source, /setDetailZoom/)
  assert.match(source, /from '\.\/useSpriteWorkspaceController'/)
  assert.match(source, /from '\.\/WorkspaceShell'/)
  assert.match(controller, /useLayoutWorkspace/)
  assert.match(controller, /usePlaybackWorkspace/)
  assert.match(controller, /useWorkspaceReset/)
  assert.match(shell, /精灵图工作台/)
  assert.doesNotMatch(shell, /多图动作精灵工作台/)
  assert.match(frameHook, /openDetailPreview/)
  assert.doesNotMatch(uploadPanel, /ReturnType/)
  assert.doesNotMatch(outputPanel, /ReturnType/)
  assert.doesNotMatch(dialogs, /ReturnType/)
  assert.match(layoutHook, /export interface LayoutWorkspaceViewModel/)
  assert.ok(lineCount < 90, `expected workspace entry to stay below 90 lines after controller extraction, got ${lineCount}`)
})

test('workspace model delegates crop and video helpers to focused modules', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/model.ts', 'utf8')
  const lineCount = source.split(/\r?\n/).length

  assert.match(source, /from '\.\/numberUtils'/)
  assert.match(source, /from '\.\/cropModel'/)
  assert.match(source, /from '\.\/guideModel'/)
  assert.match(source, /from '\.\/layoutModel'/)
  assert.match(source, /from '\.\/matteModel'/)
  assert.match(source, /from '\.\/playbackModel'/)
  assert.match(source, /from '\.\/videoModel'/)
  assert.ok(lineCount < 320, `expected workspace model to stay below 320 lines, got ${lineCount}`)
})

test('ratio sizing keeps a frame inside the shared canvas', () => {
  assert.deepEqual(computeRatioSize(200, 100, 400, 300, 50, 'height'), {
    width: 300,
    height: 150,
  })
  assert.deepEqual(computeRatioSize(200, 100, 400, 300, 50, 'width'), {
    width: 200,
    height: 100,
  })
})

test('canvas ratio sizing can target all frames or only one frame', () => {
  const frames = [
    { id: 'a', matteWidth: 100, matteHeight: 50, layout: { width: 10, height: 10 }, composedRevision: 3 },
    { id: 'b', matteWidth: 50, matteHeight: 100, layout: { width: 20, height: 20 }, composedRevision: 4 },
  ]

  assert.deepEqual(
    applyCanvasRatioToFrameLayouts(frames, {
      canvasWidth: 200,
      canvasHeight: 200,
      percent: 50,
      basis: 'height',
      targetId: 'a',
    }),
    [
      { id: 'a', matteWidth: 100, matteHeight: 50, layout: { width: 200, height: 100 }, composedRevision: -1 },
      { id: 'b', matteWidth: 50, matteHeight: 100, layout: { width: 20, height: 20 }, composedRevision: 4 },
    ]
  )

  assert.deepEqual(
    applyCanvasRatioToFrameLayouts(frames, {
      canvasWidth: 200,
      canvasHeight: 200,
      percent: 50,
      basis: 'width',
    }).map((frame) => frame.layout),
    [
      { width: 100, height: 50 },
      { width: 100, height: 200 },
    ]
  )
})

test('layout presets update frame layouts without UI state', () => {
  const frames = [
    { id: 'a', matteWidth: 100, matteHeight: 50, layout: { width: 20, height: 10, offsetX: 4, offsetY: -3 }, composedRevision: 2 },
    { id: 'b', matteWidth: 60, matteHeight: 120, layout: { width: 30, height: 60, offsetX: -6, offsetY: 8 }, composedRevision: 3 },
  ]

  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'center' }).map((frame) => ({ layout: frame.layout, composedRevision: frame.composedRevision })),
    [
      { layout: { width: 20, height: 10, offsetX: 0, offsetY: 0 }, composedRevision: -1 },
      { layout: { width: 30, height: 60, offsetX: 0, offsetY: 0 }, composedRevision: -1 },
    ]
  )
  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'active', activeFrameId: 'a' }).map((frame) => frame.layout),
    [
      { width: 20, height: 10, offsetX: 4, offsetY: -3 },
      { width: 20, height: 10, offsetX: -6, offsetY: 8 },
    ]
  )
  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'maxBoth' }).map((frame) => frame.layout),
    [
      { width: 30, height: 60, offsetX: 4, offsetY: -3 },
      { width: 30, height: 60, offsetX: -6, offsetY: 8 },
    ]
  )
  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'maxWidth' }).map((frame) => frame.layout),
    [
      { width: 30, height: 15, offsetX: 4, offsetY: -3 },
      { width: 30, height: 60, offsetX: -6, offsetY: 8 },
    ]
  )
  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'maxHeight' }).map((frame) => frame.layout),
    [
      { width: 120, height: 60, offsetX: 4, offsetY: -3 },
      { width: 30, height: 60, offsetX: -6, offsetY: 8 },
    ]
  )
})

test('corner handle resize preserves aspect ratio when locked', () => {
  assert.deepEqual(
    computeHandleResize({
      startWidth: 120,
      startHeight: 80,
      deltaX: 30,
      deltaY: 10,
      handle: 'se',
      keepAspect: true,
    }),
    { width: 150, height: 100 }
  )
})

test('edge handle resize can change a single axis when aspect ratio is unlocked', () => {
  assert.deepEqual(
    computeHandleResize({
      startWidth: 120,
      startHeight: 80,
      deltaX: 20,
      deltaY: 15,
      handle: 'e',
      keepAspect: false,
    }),
    { width: 140, height: 80 }
  )
})

test('sprite index records frame cells and playback metadata', () => {
  const index = buildMultiFrameSpriteIndex({
    canvasWidth: 64,
    canvasHeight: 48,
    columns: 2,
    fps: 12,
    playbackMode: 'pingpong',
    frames: [
      { id: 'a', sourceName: 'idle.png' },
      { id: 'b', sourceName: 'step.png' },
      { id: 'c', sourceName: 'turn.png' },
    ],
  })

  assert.deepEqual(index, {
    version: '1.0',
    frame_size: { w: 64, h: 48 },
    sheet_size: { w: 128, h: 96 },
    fps: 12,
    playbackMode: 'pingpong',
    frames: [
      { i: 0, id: 'a', name: 'idle.png', x: 0, y: 0, w: 64, h: 48, t: 0 },
      { i: 1, id: 'b', name: 'step.png', x: 64, y: 0, w: 64, h: 48, t: 0.083 },
      { i: 2, id: 'c', name: 'turn.png', x: 0, y: 48, w: 64, h: 48, t: 0.167 },
    ],
  })
})

test('sprite export can be collected into personal space with sprite and index resources', () => {
  const exportPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/ExportPanel.tsx', 'utf8')
  const exportHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts', 'utf8')
  const outputPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx', 'utf8')

  assert.match(exportPanel, /收藏到个人空间/)
  assert.match(exportPanel, /onCollectToPersonalSpace/)
  assert.match(outputPanel, /collectToPersonalSpace/)
  assert.match(exportHook, /createSpriteAssetFromExport/)
  assert.match(exportHook, /writeAssetResourcesToDirectory/)
  assert.match(exportHook, /readPersonalSpaceState/)
  assert.match(exportHook, /writePersonalSpaceState/)
  assert.match(exportHook, /个人空间-素材-精灵图/)
  assert.match(exportHook, /sprite\.png/)
  assert.match(exportHook, /index\.json/)
})

test('hidden frames are skipped for playback and export lists', () => {
  const frames = [
    { id: 'a', hidden: false },
    { id: 'b', hidden: true },
    { id: 'c' },
  ]

  assert.deepEqual(filterVisibleFrames(frames).map((frame) => frame.id), ['a', 'c'])
})

test('playback frame ids are snapshotted from visible composed frames', () => {
  const frames = [
    { id: 'a', hidden: false, composedUrl: 'blob:a' },
    { id: 'b', hidden: false, composedUrl: null },
    { id: 'c', hidden: true, composedUrl: 'blob:c' },
    { id: 'd', hidden: false, composedUrl: 'blob:d' },
  ]

  assert.deepEqual(buildPlaybackFrameIds(frames), ['a', 'd'])
  assert.deepEqual(buildPlaybackFrameIds(frames, ['d', 'a', 'missing']), ['a', 'd'])
})

test('live playback helpers avoid repeated scans during playback', () => {
  const frames = [
    { id: 'a', hidden: false, composedUrl: 'blob:a' },
    { id: 'b', hidden: true, composedUrl: 'blob:b' },
    { id: 'c', hidden: false, composedUrl: null },
    { id: 'd', hidden: false, composedUrl: 'blob:d' },
  ]

  assert.equal(countPlayableFrames(frames), 2)
  assert.deepEqual(filterLivePlaybackFrameIds(frames, ['d', 'b', 'missing', 'a']), ['d', 'a'])
})

test('playback cursor advances loop and pingpong modes', () => {
  assert.deepEqual(advancePlaybackCursor(0, 3, 'loop', 1), { index: 1, direction: 1 })
  assert.deepEqual(advancePlaybackCursor(2, 3, 'loop', 1), { index: 0, direction: 1 })
  assert.deepEqual(advancePlaybackCursor(1, 3, 'pingpong', 1), { index: 2, direction: 1 })
  assert.deepEqual(advancePlaybackCursor(2, 3, 'pingpong', 1), { index: 1, direction: -1 })
  assert.deepEqual(advancePlaybackCursor(0, 3, 'pingpong', -1), { index: 1, direction: 1 })
})

test('frame tag selection supports single range and toggle gestures', () => {
  const ids = ['a', 'b', 'c', 'd']

  const single = applyFrameTagSelection({
    ids,
    currentSelectedIds: [],
    targetId: 'b',
    anchorId: null,
    gesture: 'single',
  })
  assert.deepEqual(single, { selectedIds: ['b'], anchorId: 'b' })

  const range = applyFrameTagSelection({
    ids,
    currentSelectedIds: single.selectedIds,
    targetId: 'd',
    anchorId: single.anchorId,
    gesture: 'range',
  })
  assert.deepEqual(range, { selectedIds: ['b', 'c', 'd'], anchorId: 'b' })

  const toggleOff = applyFrameTagSelection({
    ids,
    currentSelectedIds: range.selectedIds,
    targetId: 'c',
    anchorId: range.anchorId,
    gesture: 'toggle',
  })
  assert.deepEqual(toggleOff, { selectedIds: ['b', 'd'], anchorId: 'c' })
})

test('batch hide only hides selected frames', () => {
  const frames = [
    { id: 'a', hidden: false },
    { id: 'b', hidden: false },
    { id: 'c', hidden: true },
  ]

  assert.deepEqual(batchHideSelectedFrames(frames, ['a', 'c']), [
    { id: 'a', hidden: true },
    { id: 'b', hidden: false },
    { id: 'c', hidden: true },
  ])
})

test('clear frame collection revokes every frame before returning an empty list', () => {
  const revoked: string[] = []
  const frames = [
    { id: 'a', sourceUrl: 'blob:a-source' },
    { id: 'b', sourceUrl: 'blob:b-source' },
  ]

  assert.deepEqual(clearFrameCollection(frames, (frame) => revoked.push(frame.sourceUrl)), [])
  assert.deepEqual(revoked, ['blob:a-source', 'blob:b-source'])
})

test('composed url replacement does not revoke the new url for unrelated frames', () => {
  const revoked: string[] = []
  const frames = [
    { id: 'a', matteRevision: 1, composedUrl: 'blob:old-a' },
    { id: 'b', matteRevision: 2, composedUrl: 'blob:old-b' },
  ]

  const next = applyComposedFrameUrl(frames, {
    id: 'b',
    matteRevision: 2,
    url: 'blob:new-b',
    revoke: (url) => revoked.push(url),
  })

  assert.equal(next[0]?.composedUrl, 'blob:old-a')
  assert.equal(next[1]?.composedUrl, 'blob:new-b')
  assert.deepEqual(revoked, ['blob:old-b'])
})

test('arrow keys move the selected frame on the requested axis', () => {
  assert.deepEqual(computeKeyboardOffset({ offsetX: 0, offsetY: 0 }, 'ArrowRight', false), { offsetX: 1, offsetY: 0 })
  assert.deepEqual(computeKeyboardOffset({ offsetX: 0, offsetY: 0 }, 'ArrowLeft', true), { offsetX: -10, offsetY: 0 })
  assert.deepEqual(computeKeyboardOffset({ offsetX: 4, offsetY: 8 }, 'ArrowUp', false), { offsetX: 4, offsetY: 7 })
  assert.deepEqual(computeKeyboardOffset({ offsetX: 4, offsetY: 8 }, 'KeyA', false), { offsetX: 4, offsetY: 8 })
})

test('mouse wheel resizes the selected frame proportionally', () => {
  assert.deepEqual(computeWheelResize({ width: 100, height: 50 }, -100, false), { width: 110, height: 55 })
  assert.deepEqual(computeWheelResize({ width: 100, height: 50 }, 100, false), { width: 91, height: 45 })
  assert.deepEqual(computeWheelResize({ width: 100, height: 50 }, -100, true), { width: 125, height: 63 })
})

test('layout wheel resize is ignored until wheel scaling is enabled', () => {
  const current = { width: 100, height: 50 }

  assert.equal(computeWheelFrameResize(current, -100, false, false), null)
  assert.deepEqual(computeWheelFrameResize(current, -100, true, false), { width: 110, height: 55 })
  assert.deepEqual(computeWheelFrameResize(current, -100, true, true), { width: 125, height: 63 })
})

test('wheel scaling button label describes the next action', () => {
  assert.equal(getWheelScalingButtonLabel(false), '开放缩放滚轮')
  assert.equal(getWheelScalingButtonLabel(true), '禁止缩放滚轮')
})

test('guide line positions clamp to canvas and delete at the origin', () => {
  assert.equal(normalizeGuideLinePosition(-4, 256), null)
  assert.equal(normalizeGuideLinePosition(0, 256), null)
  assert.equal(normalizeGuideLinePosition(120.6, 256), 121)
  assert.equal(normalizeGuideLinePosition(999, 256), 256)
})

test('ruler drag guide lines start from the canvas edge', () => {
  assert.equal(getGuideLineEdgeStartPosition(), 1)
})

test('initial ruler drags are ignored until the pointer reaches the canvas', () => {
  assert.equal(shouldIgnoreInitialGuideDrag(-4, 256, false), true)
  assert.equal(shouldIgnoreInitialGuideDrag(0, 256, false), true)
  assert.equal(shouldIgnoreInitialGuideDrag(120, 256, false), false)
  assert.equal(shouldIgnoreInitialGuideDrag(-4, 256, true), false)
})

test('guide ruler labels describe the axis users can drag from', () => {
  assert.equal(getGuideRulerLabel('x'), 'X 轴')
  assert.equal(getGuideRulerLabel('y'), 'Y 轴')
})

test('guide rulers create lines in the drag direction users expect', () => {
  assert.equal(getGuideRulerDragAxis('x'), 'y')
  assert.equal(getGuideRulerDragAxis('y'), 'x')
  assert.equal(getGuideRulerCursor('x'), 'ns-resize')
  assert.equal(getGuideRulerCursor('y'), 'ew-resize')
})

test('layout toolbar relies on rulers instead of guide add buttons', () => {
  const toolbar = readFileSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspaceToolbar.tsx', 'utf8')
  assert.doesNotMatch(toolbar, /getGuideActionLabel/)
  assert.doesNotMatch(toolbar, /添加竖向辅助线/)
  assert.doesNotMatch(toolbar, /添加横向辅助线/)
  assert.match(toolbar, /清空辅助线/)
})

test('guide empty state explains rulers are available before upload', () => {
  assert.equal(getGuideEmptyStateText(), '从顶部或左侧标尺添加辅助线。请先上传图片开始调整。')
})

test('preview zoom is clamped to a useful detail range', () => {
  assert.equal(clampPreviewZoom(0.1), 0.25)
  assert.equal(clampPreviewZoom(2.345), 2.35)
  assert.equal(clampPreviewZoom(9), 8)
})

test('upload filtering ignores files that already exist or are pending', () => {
  const a = { name: 'a.png', size: 100, lastModified: 1 } as File
  const b = { name: 'b.png', size: 200, lastModified: 2 } as File
  const c = { name: 'c.png', size: 300, lastModified: 3 } as File
  const pending = new Set([`${b.name}-${b.size}-${b.lastModified}`])

  assert.deepEqual(
    filterNewUploadFiles([a, b, c], {
      existingKeys: new Set([`${a.name}-${a.size}-${a.lastModified}`]),
      pendingKeys: pending,
    }),
    [c]
  )
})

test('initial matte processing primes the first frame for every import group', () => {
  assert.deepEqual(getInitialMatteFrameIds({ existingFrameCount: 0, createdIds: ['a', 'b', 'c'] }), ['a'])
  assert.deepEqual(getInitialMatteFrameIds({ existingFrameCount: 3, createdIds: ['d', 'e'] }), ['d'])
  assert.deepEqual(getInitialMatteFrameIds({ existingFrameCount: 0, createdIds: [] }), [])
})

test('matte import groups are named by import order and source type', () => {
  const frames = [
    { id: 'a', matteGroupId: 'g1', matteGroupName: '1-视频处理' },
    { id: 'b', matteGroupId: 'g1', matteGroupName: '1-视频处理' },
    { id: 'c', matteGroupId: 'g2', matteGroupName: '2-精灵图处理' },
  ]

  assert.equal(getNextMatteGroupName(frames, 'video'), '3-视频处理')
  assert.equal(getNextMatteGroupName(frames, 'spriteSheet'), '3-精灵图处理')
  assert.equal(getNextMatteGroupName(frames, 'imageBatch'), '3-批量图片')
  assert.equal(
    getNextMatteGroupName([{ matteGroupId: 'g9', matteGroupName: '9-批量图片' }], 'video'),
    '10-视频处理'
  )
})

test('matte workspace shows the first frame of each import group', () => {
  const frames = [
    { id: 'a', matteGroupId: 'g1', matteGroupName: '1-视频处理' },
    { id: 'b', matteGroupId: 'g1', matteGroupName: '1-视频处理' },
    { id: 'c', matteGroupId: 'g2', matteGroupName: '2-精灵图处理' },
    { id: 'd', matteGroupId: 'g2', matteGroupName: '2-精灵图处理' },
  ]

  const groups = buildMatteFrameGroups(frames)

  assert.deepEqual(groups.map((group) => group.name), ['1-视频处理', '2-精灵图处理'])
  assert.deepEqual(groups.map((group) => group.firstFrame.id), ['a', 'c'])
  assert.deepEqual(groups.map((group) => group.frameCount), [2, 2])
})

test('matte group removal deletes every frame in the import group', () => {
  const frames = [
    { id: 'a', matteGroupId: 'g1', matteGroupName: '1-批量图片' },
    { id: 'b', matteGroupId: 'g1', matteGroupName: '1-批量图片' },
    { id: 'c', matteGroupId: 'g2', matteGroupName: '2-精灵图处理' },
  ]

  assert.deepEqual(removeMatteFrameGroup(frames, 'g1'), [frames[2]])
  assert.equal(removeMatteFrameGroup(frames, 'missing'), frames)
})

test('matte params apply only to frames in the same import group', () => {
  const sourceMatte = {
    keyColor: [1, 2, 3] as [number, number, number],
    tolerance: 30,
    smoothness: 40,
    spill: 50,
    spillColorMode: 'custom' as const,
    customSpillHex: '#123456',
    erosion: 2,
  }
  const otherMatte = {
    ...sourceMatte,
    keyColor: [9, 9, 9] as [number, number, number],
    tolerance: 9,
  }
  const frames = [
    { id: 'a', matteGroupId: 'g1', matte: sourceMatte },
    { id: 'b', matteGroupId: 'g1', matte: otherMatte },
    { id: 'c', matteGroupId: 'g2', matte: otherMatte },
  ]

  const result = applyMatteParamsToFrameGroup(frames, 'a')

  assert.deepEqual(result.recomputeIds, ['a', 'b'])
  assert.deepEqual(result.frames[1]?.matte, sourceMatte)
  assert.deepEqual(result.frames[2]?.matte, otherMatte)
})

test('adding frames to flow 2 only schedules the initial matte frame', () => {
  const videoHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const uploadHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useUploadWorkspace.ts', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const frameHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useFrameWorkspaceState.ts', 'utf8')
  const workspaceEntry = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const mattePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')

  assert.match(videoHook, /getInitialMatteFrameIds/)
  assert.match(uploadHook, /getInitialMatteFrameIds/)
  assert.match(videoHook, /getNextMatteGroupName\(framesRef\.current,\s*'video'\)/)
  assert.match(uploadHook, /getNextMatteGroupName\(framesRef\.current,\s*'imageBatch'\)/)
  assert.match(uploadHook, /getNextMatteGroupName\(framesRef\.current,\s*'spriteSheet'\)/)
  assert.doesNotMatch(controller, /existingFrameCount:\s*frame\.frames\.length/)
  assert.match(mattePanel, /buildMatteFrameGroups/)
  assert.match(mattePanel, /应用到组所有帧/)
  assert.match(mattePanel, /导出组图片/)
  assert.match(mattePanel, /收藏到个人空间/)
  assert.doesNotMatch(mattePanel, /确定应用到该组所有帧/)
  assert.match(mattePanel, /<span>\{group\.name\} · 第 1 帧<\/span>/)
  assert.match(mattePanel, /<Text type="secondary">共 \{group\.frameCount\} 帧<\/Text>/)
  assert.match(frameHook, /removeFrameGroup/)
  assert.match(frameHook, /removeMatteFrameGroup/)
  assert.match(workspaceEntry, /onRemoveGroup=\{workspace\.frame\.removeFrameGroup\}/)
  assert.doesNotMatch(workspaceEntry, /onRemove=\{workspace\.frame\.removeFrame\}/)
  assert.match(mattePanel, /onRemoveGroup\(group\.id\)/)
  assert.doesNotMatch(videoHook, /created\.forEach\(\(item\)\s*=>\s*scheduleMatte\(item\.id\)\)/)
  assert.doesNotMatch(uploadHook, /created\.forEach\(\(item\)\s*=>\s*scheduleMatte\(item\.id\)\)/)
})

test('spill color options resolve to expected RGB colors', () => {
  assert.deepEqual(resolveSpillColor('key', undefined, [12, 34, 56]), [12, 34, 56])
  assert.deepEqual(resolveSpillColor('green'), [0, 255, 0])
  assert.deepEqual(resolveSpillColor('blue'), [0, 0, 255])
  assert.deepEqual(resolveSpillColor('magenta'), [255, 0, 255])
  assert.deepEqual(resolveSpillColor('custom', '#123abc'), [18, 58, 188])
  assert.deepEqual(resolveSpillColor('custom', 'bad'), [0, 255, 0])
})

test('spill color options expose preview hex values', () => {
  assert.equal(getSpillColorHex('key', undefined, [12, 34, 56]), '#0c2238')
  assert.equal(getSpillColorHex('green'), '#00ff00')
  assert.equal(getSpillColorHex('blue'), '#0000ff')
  assert.equal(getSpillColorHex('magenta'), '#ff00ff')
  assert.equal(getSpillColorHex('custom', '#123abc'), '#123abc')
  assert.equal(getSpillColorHex('custom', 'bad'), '#00ff00')
})

test('hex colors normalize picker values without falling back to green', () => {
  assert.equal(normalizeHexColor('#ABCDEF'), '#abcdef')
  assert.equal(normalizeHexColor('123abc'), '#123abc')
  assert.equal(normalizeHexColor('#12abcf80'), '#12abcf')
  assert.equal(normalizeHexColor('rgb(12, 34, 56)'), '#0c2238')
  assert.equal(normalizeHexColor('rgba(12, 34, 56, 0.5)'), '#0c2238')
  assert.equal(normalizeHexColor('bad', '#ffffff'), '#ffffff')
})

test('picker colors prefer stable color object methods', () => {
  assert.equal(normalizePickerColor({ toHexString: () => '#ABCDEF' }, '#00ff00', '#1a1a1a'), '#abcdef')
  assert.equal(normalizePickerColor({ toRgbString: () => 'rgb(12, 34, 56)' }, '#00ff00', '#1a1a1a'), '#0c2238')
  assert.equal(normalizePickerColor({}, 'rgba(12, 34, 56, 0.5)', '#1a1a1a'), '#0c2238')
  assert.equal(normalizePickerColor({}, 'bad', '#1a1a1a'), '#1a1a1a')
})

test('matte defaults are clamped and keep expected fallback values', () => {
  assert.deepEqual(coerceMatteDefaults({}), {
    tolerance: 5,
    smoothness: 5,
    spill: 0,
    erosion: 5,
    spillColorMode: 'key',
    customSpillHex: '#00ff00',
  })
  assert.deepEqual(coerceMatteDefaults({
    tolerance: 120,
    smoothness: -10,
    spill: 44,
    erosion: 6,
    spillColorMode: 'blue',
    customSpillHex: '#123abc',
  }), {
    tolerance: 100,
    smoothness: 0,
    spill: 44,
    erosion: 6,
    spillColorMode: 'blue',
    customSpillHex: '#123abc',
  })
})

test('matte params can be applied to all following frames without changing earlier frames', () => {
  const frames = [
    {
      id: 'before',
      matte: {
        keyColor: [1, 2, 3] as [number, number, number],
        tolerance: 1,
        smoothness: 2,
        spill: 3,
        erosion: 4,
        spillColorMode: 'green' as const,
        customSpillHex: '#111111',
      },
    },
    {
      id: 'active',
      matte: {
        keyColor: [10, 20, 30] as [number, number, number],
        tolerance: 11,
        smoothness: 22,
        spill: 33,
        erosion: 44,
        spillColorMode: 'custom' as const,
        customSpillHex: '#abcdef',
      },
    },
    {
      id: 'after-a',
      matte: {
        keyColor: [4, 5, 6] as [number, number, number],
        tolerance: 5,
        smoothness: 6,
        spill: 7,
        erosion: 8,
        spillColorMode: 'blue' as const,
        customSpillHex: '#222222',
      },
    },
    {
      id: 'after-b',
      matte: {
        keyColor: [7, 8, 9] as [number, number, number],
        tolerance: 9,
        smoothness: 10,
        spill: 11,
        erosion: 12,
        spillColorMode: 'magenta' as const,
        customSpillHex: '#333333',
      },
    },
  ]

  const result = applyMatteParamsToFollowingFrames(frames, 'active')

  assert.deepEqual(result.recomputeIds, ['after-a', 'after-b'])
  assert.deepEqual(result.frames[0], frames[0])
  assert.deepEqual(result.frames[1], frames[1])
  assert.deepEqual(result.frames[2]?.matte, frames[1]?.matte)
  assert.deepEqual(result.frames[3]?.matte, frames[1]?.matte)
  assert.notEqual(result.frames[2]?.matte.keyColor, frames[1]?.matte.keyColor)
})

test('first frame matte params can be applied to every frame', () => {
  const frames = [
    {
      id: 'first',
      matte: {
        keyColor: [10, 20, 30] as [number, number, number],
        tolerance: 11,
        smoothness: 22,
        spill: 33,
        erosion: 44,
        spillColorMode: 'custom' as const,
        customSpillHex: '#abcdef',
      },
    },
    {
      id: 'second',
      matte: {
        keyColor: [4, 5, 6] as [number, number, number],
        tolerance: 5,
        smoothness: 6,
        spill: 7,
        erosion: 8,
        spillColorMode: 'blue' as const,
        customSpillHex: '#222222',
      },
    },
    {
      id: 'third',
      matte: {
        keyColor: [7, 8, 9] as [number, number, number],
        tolerance: 9,
        smoothness: 10,
        spill: 11,
        erosion: 12,
        spillColorMode: 'magenta' as const,
        customSpillHex: '#333333',
      },
    },
  ]

  const result = applyMatteParamsToAllFrames(frames, 'first')

  assert.deepEqual(result.recomputeIds, ['first', 'second', 'third'])
  assert.deepEqual(result.frames[0], frames[0])
  assert.deepEqual(result.frames[1]?.matte, frames[0]?.matte)
  assert.deepEqual(result.frames[2]?.matte, frames[0]?.matte)
  assert.notEqual(result.frames[1]?.matte.keyColor, frames[0]?.matte.keyColor)
})

test('pipeline queues keep the latest request for a frame id', () => {
  assert.deepEqual(queueUniqueFrameId(['a', 'b', 'a'], 'b'), ['a', 'a', 'b'])
  assert.deepEqual(queueUniqueFrameId(['a', 'b'], 'c'), ['a', 'b', 'c'])
})

test('pipeline concurrency scales with available threads', () => {
  assert.equal(resolvePipelineConcurrency(undefined), 4)
  assert.equal(resolvePipelineConcurrency(4), 2)
  assert.equal(resolvePipelineConcurrency(8), 4)
  assert.equal(resolvePipelineConcurrency(16), 6)
})

test('layout defaults are clamped for saved public parameters', () => {
  assert.deepEqual(coerceLayoutDefaults({}), {
    canvasWidth: 256,
    canvasHeight: 256,
    ratioPercent: 80,
    ratioBasis: 'height',
    strokeColor: '#ffffff',
    strokeWidth: 0,
    outlineColor: '#1a1a1a',
    outlineWidth: 0,
  })
  assert.deepEqual(coerceLayoutDefaults({
    canvasWidth: 0,
    canvasHeight: 9000,
    ratioPercent: 500,
    ratioBasis: 'width',
    strokeColor: '#ABCDEF',
    strokeWidth: 200,
    outlineColor: '123abc',
    outlineWidth: -4,
  }), {
    canvasWidth: 1,
    canvasHeight: 4096,
    ratioPercent: 300,
    ratioBasis: 'width',
    strokeColor: '#abcdef',
    strokeWidth: 128,
    outlineColor: '#123abc',
    outlineWidth: 0,
  })
})

