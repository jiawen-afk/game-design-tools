import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('workspace implementation delegates focused responsibilities to local modules', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const videoHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const videoExtractionHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoExtractionWorkflow.ts', 'utf8')
  const videoPreviewHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoFramePreviewWorkspace.ts', 'utf8')
  const playbackHook = readFileSync('src/components/MultiFrameSpriteWorkspace/usePlaybackWorkspace.ts', 'utf8')

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
  assert.match(videoHook, /from '\.\/useVideoExtractionWorkflow'/)
  assert.match(videoHook, /from '\.\/videoModel'/)
  assert.match(videoExtractionHook, /from '\.\/videoFramePipeline'/)
})

test('workspace entry delegates stateful workflows to focused hooks', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')

  assert.match(source, /from '\.\/useSpriteWorkspaceController'/)
  assert.match(controller, /from '\.\/useFrameWorkspaceState'/)
  assert.match(controller, /from '\.\/usePlaybackWorkspace'/)
  assert.match(controller, /from '\.\/useSpriteExport'/)
  assert.match(controller, /from '\.\/useVideoWorkspace'/)
  assert.match(controller, /from '\.\/useLayoutWorkspace'/)
  assert.match(controller, /from '\.\/useMattePipeline'/)
  assert.match(controller, /from '\.\/useUploadWorkspace'/)
  assert.match(controller, /from '\.\/useWorkspaceReset'/)
})

test('matte pipeline hook owns matte side effects and delegates compose side effects', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const processingHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMatteProcessingQueue.ts', 'utf8')
  const composeHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMatteComposeQueue.ts', 'utf8')

  assert.doesNotMatch(source, /chromaKey/)
  assert.doesNotMatch(source, /composeFrame/)
  assert.doesNotMatch(source, /applyComposedFrameUrl/)
  assert.doesNotMatch(source, /applyMatteParamsToFollowingFrames/)
  assert.match(hook, /useMatteProcessingQueue/)
  assert.match(processingHook, /chromaKey/)
  assert.match(hook, /useMatteComposeQueue/)
  assert.match(hook, /applyMatteParamsToFollowingFrames/)
  assert.match(composeHook, /composeFrame/)
  assert.match(composeHook, /applyComposedFrameUrl/)
})

test('layout workspace hook owns layout and guide side effects', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const actionHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutFrameActions.ts', 'utf8')
  const guideHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutGuideWorkspace.ts', 'utf8')
  const interactionHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutPointerInteractions.ts', 'utf8')

  assert.doesNotMatch(source, /computeHandleResize/)
  assert.doesNotMatch(source, /computeKeyboardOffset/)
  assert.doesNotMatch(source, /normalizeGuideLinePosition/)
  assert.doesNotMatch(source, /applyCanvasRatioToFrameLayouts/)
  assert.match(hook, /useLayoutPointerInteractions/)
  assert.match(hook, /useLayoutFrameActions/)
  assert.match(hook, /useLayoutGuideWorkspace/)
  assert.doesNotMatch(hook, /applyCanvasRatioToFrameLayouts/)
  assert.match(actionHook, /applyCanvasRatioToFrameLayouts/)
  assert.match(guideHook, /createWorkspaceId/)
  assert.match(interactionHook, /computeHandleResize/)
  assert.match(interactionHook, /computeKeyboardOffset/)
  assert.match(interactionHook, /normalizeGuideLinePosition/)
})

test('upload workspace hook owns image and sprite sheet upload side effects', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const hookPath = 'src/components/MultiFrameSpriteWorkspace/useUploadWorkspace.ts'

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
})

test('upload workspace reports batch image frame creation failures', () => {
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useUploadWorkspace.ts', 'utf8')

  assert.match(hook, /Promise\.all\(nextFiles\.map\(\(file\) => makeFrameFromFile/)
  assert.match(hook, /\.catch\(\(e\) => \{[\s\S]*message\.error\(`添加图片失败：\$\{String\(e\)\}`\)[\s\S]*\}\)[\s\S]*\.finally\(\(\) => \{/)
})

test('workspace model delegates crop and video helpers to focused modules', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/model.ts', 'utf8')

  assert.match(source, /from '\.\/numberUtils'/)
  assert.match(source, /from '\.\/cropModel'/)
  assert.match(source, /from '\.\/guideModel'/)
  assert.match(source, /from '\.\/layoutModel'/)
  assert.match(source, /from '\.\/matteModel'/)
  assert.match(source, /from '\.\/playbackModel'/)
  assert.match(source, /from '\.\/videoModel'/)
})
