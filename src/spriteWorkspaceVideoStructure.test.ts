import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('video workspace delegates extracted frame preview and crop interactions to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const previewSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoFramePreviewWorkspace.ts', 'utf8')

  assert.match(source, /from '\.\/useVideoFramePreviewWorkspace'/)
  assert.match(source, /useVideoFramePreviewWorkspace/)
  assert.doesNotMatch(source, /ResizeObserver/)
  assert.doesNotMatch(source, /setInterval/)
  assert.doesNotMatch(source, /videoCropDrag/)
  assert.doesNotMatch(source, /getContainedImageRect/)
  assert.match(previewSource, /ResizeObserver/)
  assert.match(previewSource, /setInterval/)
  assert.match(previewSource, /videoCropDrag/)
  assert.match(previewSource, /getContainedImageRect/)
  assert.match(previewSource, /startVideoCropDrag/)
})

test('video workspace delegates confirming extracted frames to a focused workflow hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const workflowHookPath = 'src/components/MultiFrameSpriteWorkspace/useVideoFrameConfirmWorkflow.ts'
  const actionPath = 'src/components/MultiFrameSpriteWorkspace/videoFrameConfirmAction.ts'

  assert.ok(existsSync(workflowHookPath), 'video frame confirm workflow hook should exist')
  assert.ok(existsSync(actionPath), 'video frame confirm action should exist')
  const workflowHookSource = readFileSync(workflowHookPath, 'utf8')
  const actionSource = readFileSync(actionPath, 'utf8')

  assert.match(source, /from '\.\/useVideoFrameConfirmWorkflow'/)
  assert.match(source, /useVideoFrameConfirmWorkflow/)
  assert.doesNotMatch(source, /from '\.\/videoFrameConfirmAction'/)
  assert.doesNotMatch(source, /addVisibleVideoFramesToWorkspace/)
  assert.doesNotMatch(source, /\bsetVideoAdding\b/)
  assert.doesNotMatch(source, /添加视频帧失败/)
  assert.doesNotMatch(source, /makeCroppedVideoFrameFile/)
  assert.doesNotMatch(source, /getInitialMatteFrameIds/)
  assert.match(workflowHookSource, /export function useVideoFrameConfirmWorkflow/)
  assert.match(workflowHookSource, /addVisibleVideoFramesToWorkspace/)
  assert.match(workflowHookSource, /\bsetVideoAdding\b/)
  assert.match(workflowHookSource, /message\.success/)
  assert.match(workflowHookSource, /message\.error/)
  assert.match(actionSource, /export async function addVisibleVideoFramesToWorkspace/)
  assert.match(actionSource, /makeCroppedVideoFrameFile/)
  assert.match(actionSource, /getInitialMatteFrameIds/)
})

test('video workspace delegates uploaded video object URL cleanup to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const sourceWorkspacePath = 'src/components/MultiFrameSpriteWorkspace/useVideoSourceWorkspace.ts'
  const cleanupHookPath = 'src/components/MultiFrameSpriteWorkspace/useVideoSourceUrlCleanup.ts'

  assert.ok(existsSync(sourceWorkspacePath), 'video source workspace hook should exist')
  assert.ok(existsSync(cleanupHookPath), 'video source URL cleanup hook should exist')
  const sourceWorkspaceSource = readFileSync(sourceWorkspacePath, 'utf8')
  const cleanupHookSource = readFileSync(cleanupHookPath, 'utf8')

  assert.match(source, /from '\.\/useVideoSourceWorkspace'/)
  assert.match(source, /useVideoSourceWorkspace/)
  assert.doesNotMatch(source, /from '\.\/useVideoSourceUrlCleanup'/)
  assert.doesNotMatch(source, /useVideoSourceUrlCleanup/)
  assert.doesNotMatch(source, /videoSourceUrlRef/)
  assert.doesNotMatch(source, /getVideoSourceUrlToRevoke/)
  assert.match(sourceWorkspaceSource, /from '\.\/useVideoSourceUrlCleanup'/)
  assert.match(sourceWorkspaceSource, /useVideoSourceUrlCleanup/)
  assert.match(cleanupHookSource, /export function useVideoSourceUrlCleanup/)
  assert.match(cleanupHookSource, /useRef/)
  assert.match(cleanupHookSource, /getVideoSourceUrlToRevoke/)
  assert.match(cleanupHookSource, /URL\.revokeObjectURL/)
})

test('video workspace delegates source metadata and segment playback to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const sourceWorkspacePath = 'src/components/MultiFrameSpriteWorkspace/useVideoSourceWorkspace.ts'

  assert.ok(existsSync(sourceWorkspacePath), 'video source workspace hook should exist')
  const sourceWorkspaceSource = readFileSync(sourceWorkspacePath, 'utf8')

  assert.match(source, /from '\.\/useVideoSourceWorkspace'/)
  assert.match(source, /useVideoSourceWorkspace/)
  assert.doesNotMatch(source, /useRef<HTMLVideoElement/)
  assert.doesNotMatch(source, /videoClipRangeRef/)
  assert.doesNotMatch(source, /clampVideoClipRange/)
  assert.doesNotMatch(source, /getVideoPreviewSeekTarget/)
  assert.doesNotMatch(source, /shouldReplayVideoSegment/)
  assert.doesNotMatch(source, /URL\.createObjectURL/)
  assert.doesNotMatch(source, /视频读取失败/)
  assert.doesNotMatch(source, /视频播放失败/)
  assert.match(sourceWorkspaceSource, /export function useVideoSourceWorkspace/)
  assert.match(sourceWorkspaceSource, /useRef<HTMLVideoElement/)
  assert.match(sourceWorkspaceSource, /videoClipRangeRef/)
  assert.match(sourceWorkspaceSource, /clampVideoClipRange/)
  assert.match(sourceWorkspaceSource, /getVideoPreviewSeekTarget/)
  assert.match(sourceWorkspaceSource, /shouldReplayVideoSegment/)
  assert.match(sourceWorkspaceSource, /URL\.createObjectURL/)
  assert.match(sourceWorkspaceSource, /applyNativeVideoMetadata/)
  assert.match(sourceWorkspaceSource, /handleVideoTimeUpdate/)
  assert.match(sourceWorkspaceSource, /playVideoClip/)
})

test('video workspace delegates HTML video extraction workflow to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const extractionHookPath = 'src/components/MultiFrameSpriteWorkspace/useVideoExtractionWorkflow.ts'

  assert.ok(existsSync(extractionHookPath), 'video extraction workflow hook should exist')
  const extractionHookSource = readFileSync(extractionHookPath, 'utf8')

  assert.match(source, /from '\.\/useVideoExtractionWorkflow'/)
  assert.match(source, /useVideoExtractionWorkflow/)
  assert.doesNotMatch(source, /extractHtmlVideoFrames/)
  assert.doesNotMatch(source, /VIDEO_EXTRACTION_FRAME_LIMIT/)
  assert.doesNotMatch(source, /\bsetVideoExtracting\b/)
  assert.doesNotMatch(source, /\bsetVideoExtractProgress\b/)
  assert.doesNotMatch(source, /\bsetVideoOperationLabel\b/)
  assert.match(extractionHookSource, /export function useVideoExtractionWorkflow/)
  assert.match(extractionHookSource, /extractHtmlVideoFrames/)
  assert.match(extractionHookSource, /VIDEO_EXTRACTION_FRAME_LIMIT/)
  assert.match(extractionHookSource, /message\.warning/)
  assert.match(extractionHookSource, /message\.success/)
})

test('video upload panel delegates extracted frame preview controls to a focused component', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/VideoUploadPanel.tsx', 'utf8')
  const previewPanelSource = readFileSync('src/components/MultiFrameSpriteWorkspace/VideoFramePreviewPanel.tsx', 'utf8')

  assert.match(source, /from '\.\/VideoFramePreviewPanel'/)
  assert.match(source, /<VideoFramePreviewPanel/)
  assert.doesNotMatch(source, /from '\.\/VideoCropOverlay'/)
  assert.doesNotMatch(source, /from '\.\/VideoFrameList'/)
  assert.doesNotMatch(source, /video-preview-box/)
  assert.doesNotMatch(source, /video-frame-list-panel/)
  assert.doesNotMatch(source, /video-confirm-action/)
  assert.match(previewPanelSource, /VideoCropOverlay/)
  assert.match(previewPanelSource, /VideoFrameList/)
  assert.match(previewPanelSource, /video-preview-box/)
  assert.match(previewPanelSource, /video-frame-list-panel/)
  assert.match(previewPanelSource, /video-confirm-action/)
})

test('video upload panel delegates source preview and extraction controls to a focused component', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/VideoUploadPanel.tsx', 'utf8')
  const controlsPath = 'src/components/MultiFrameSpriteWorkspace/VideoSourceControlsPanel.tsx'

  assert.ok(existsSync(controlsPath), 'video source controls panel should exist')
  const controlsSource = readFileSync(controlsPath, 'utf8')

  assert.match(source, /from '\.\/VideoSourceControlsPanel'/)
  assert.match(source, /<VideoSourceControlsPanel/)
  assert.doesNotMatch(source, /className="video-source-panel"/)
  assert.doesNotMatch(source, /确定提取帧/)
  assert.match(controlsSource, /function VideoSourceControlsPanel/)
  assert.match(controlsSource, /className="video-source-panel"/)
  assert.match(controlsSource, /确定提取帧/)
  assert.match(controlsSource, /formatVideoTime/)
})

test('video source range slider avoids tooltip portal update loops', () => {
  const controlsSource = readFileSync('src/components/MultiFrameSpriteWorkspace/VideoSourceControlsPanel.tsx', 'utf8')
  const rangeSliderStart = controlsSource.indexOf('<Slider')
  const rangeSliderEnd = controlsSource.indexOf('/>', rangeSliderStart)
  const rangeSliderSource = controlsSource.slice(rangeSliderStart, rangeSliderEnd)

  assert.notEqual(rangeSliderStart, -1)
  assert.match(rangeSliderSource, /tooltip=\{\{[^}]*open:\s*false/s)
  assert.doesNotMatch(rangeSliderSource, /formatter:\s*\(value\)\s*=>\s*formatVideoTime/)
})

test('video processing owns one-in-n frame stride before adding frames to matte flow', () => {
  const model = readFileSync('src/components/MultiFrameSpriteWorkspace/playbackModel.ts', 'utf8')
  const videoHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const videoConfirmAction = readFileSync('src/components/MultiFrameSpriteWorkspace/videoFrameConfirmAction.ts', 'utf8')
  const previewHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoFramePreviewWorkspace.ts', 'utf8')
  const uploadWorkspacePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx', 'utf8')
  const videoUploadPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/VideoUploadPanel.tsx', 'utf8')
  const videoPreviewPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/VideoFramePreviewPanel.tsx', 'utf8')
  const playbackHook = readFileSync('src/components/MultiFrameSpriteWorkspace/usePlaybackWorkspace.ts', 'utf8')
  const outputPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx', 'utf8')
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackPanel.tsx', 'utf8')

  const cropButtonIndex = videoPreviewPanel.indexOf('调整裁剪范围')
  const strideControlIndex = videoPreviewPanel.indexOf('抽帧隐藏')
  const confirmButtonIndex = videoPreviewPanel.indexOf('确认添加到流程 2')

  assert.match(model, /selectFramesByVisibilityStride/)
  assert.match(videoHook, /videoVisibilityStride/)
  assert.match(videoHook, /visibleVideoExtractedFrames/)
  assert.match(videoHook, /selectFramesByVisibilityStride\(videoExtractedFrames, videoVisibilityStride\)/)
  assert.match(videoConfirmAction, /visibleFrames\.map\(\(frame\) => makeCroppedVideoFrameFile/)
  assert.match(previewHook, /videoPreviewFrames/)
  assert.match(uploadWorkspacePanel, /visibilityStride=\{video\.videoVisibilityStride\}/)
  assert.match(uploadWorkspacePanel, /visibleFrameCount=\{video\.visibleVideoExtractedFrames\.length\}/)
  assert.match(videoUploadPanel, /visibilityStride=\{visibilityStride\}/)
  assert.match(videoUploadPanel, /visibleFrameCount=\{visibleFrameCount\}/)
  assert.notEqual(cropButtonIndex, -1)
  assert.notEqual(strideControlIndex, -1)
  assert.notEqual(confirmButtonIndex, -1)
  assert.ok(cropButtonIndex < strideControlIndex)
  assert.ok(strideControlIndex < confirmButtonIndex)
  assert.match(videoPreviewPanel, /1选1/)
  assert.match(videoPreviewPanel, /2选1/)
  assert.match(videoPreviewPanel, /3选1/)
  assert.match(videoPreviewPanel, /4选1/)
  assert.match(videoPreviewPanel, /onVisibilityStrideChange\(Number\(value\)\)/)
  assert.doesNotMatch(playbackHook, /visibilityStride|applyVisibilityStride|applyFrameVisibilityStride/)
  assert.doesNotMatch(outputPanel, /visibilityStride=\{playback\.visibilityStride\}|onVisibilityStrideChange=\{playback\.applyVisibilityStride\}/)
  assert.doesNotMatch(panel, /抽帧隐藏|onVisibilityStrideChange|visibilityStride/)
})
