import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('layout workspace delegates batch frame layout presets to the model', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const actionHookSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutFrameActions.ts', 'utf8')
  const modelSource = readFileSync('src/components/MultiFrameSpriteWorkspace/layoutModel.ts', 'utf8')

  assert.match(source, /useLayoutFrameActions/)
  assert.doesNotMatch(source, /applyLayoutPresetToFrames/)
  assert.match(actionHookSource, /applyLayoutPresetToFrames/)
  assert.match(modelSource, /export function applyLayoutPresetToFrames/)
  assert.doesNotMatch(source, /const applyAllSize = /)
  assert.doesNotMatch(source, /Math\.max\(\.\.\.frames\.map\(\(f\) => f\.layout\.width\)\)/)
  assert.doesNotMatch(source, /item\.matteWidth \/ Math\.max\(1, item\.matteHeight\)/)
})

test('layout workspace delegates canvas ratio apply feedback to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const feedbackSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useCanvasRatioApplyFeedback.ts', 'utf8')
  const compositionSource = readFileSync('src/components/MultiFrameSpriteWorkspace/frameCompositionModel.ts', 'utf8')

  assert.match(source, /from '\.\/useCanvasRatioApplyFeedback'/)
  assert.match(source, /useCanvasRatioApplyFeedback/)
  assert.doesNotMatch(source, /CANVAS_RATIO_MESSAGE_KEY/)
  assert.doesNotMatch(source, /canvasRatioApplyIdsRef/)
  assert.doesNotMatch(source, /canvasRatioFallbackTimerRef/)
  assert.doesNotMatch(source, /getPendingComposedFrameIds/)
  assert.match(feedbackSource, /from '\.\/frameCompositionModel'/)
  assert.match(feedbackSource, /CANVAS_RATIO_MESSAGE_KEY/)
  assert.match(feedbackSource, /getPendingComposedFrameIds/)
  assert.match(feedbackSource, /startCanvasRatioApplyFeedback/)
  assert.match(feedbackSource, /canvasRatioApplying/)
  assert.match(compositionSource, /export function getPendingComposedFrameIds/)
})

test('layout workspace delegates default parameter persistence to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const defaultsHookPath = 'src/components/MultiFrameSpriteWorkspace/useLayoutDefaultsWorkspace.ts'

  assert.ok(existsSync(defaultsHookPath), 'layout defaults workspace hook should exist')
  const defaultsHookSource = readFileSync(defaultsHookPath, 'utf8')

  assert.match(source, /from '\.\/useLayoutDefaultsWorkspace'/)
  assert.match(source, /useLayoutDefaultsWorkspace\(/)
  assert.doesNotMatch(source, /writeStoredLayoutDefaults/)
  assert.doesNotMatch(source, /message\.success\('已保存公共参数配置'\)/)
  assert.doesNotMatch(source, /const \[layoutDefaultsOpen, setLayoutDefaultsOpen\] = useState/)
  assert.doesNotMatch(source, /const \[layoutDefaultsDraft, setLayoutDefaultsDraft\] = useState/)
  assert.doesNotMatch(source, /const openLayoutDefaults =/)
  assert.doesNotMatch(source, /const saveLayoutDefaults =/)
  assert.match(defaultsHookSource, /export function useLayoutDefaultsWorkspace/)
  assert.match(defaultsHookSource, /coerceLayoutDefaults/)
  assert.match(defaultsHookSource, /writeStoredLayoutDefaults/)
  assert.match(defaultsHookSource, /message\.success\('已保存公共参数配置'\)/)
})

test('layout workspace delegates pointer and keyboard interactions to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const interactionSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutPointerInteractions.ts', 'utf8')

  assert.match(source, /from '\.\/useLayoutPointerInteractions'/)
  assert.match(source, /useLayoutPointerInteractions/)
  assert.doesNotMatch(source, /const onPointerMove = useCallback/)
  assert.doesNotMatch(source, /window\.addEventListener\('pointermove'/)
  assert.doesNotMatch(source, /window\.addEventListener\('keydown'/)
  assert.doesNotMatch(source, /const onKeyDown = \(e: KeyboardEvent\)/)
  assert.match(interactionSource, /window\.addEventListener\('pointermove'/)
  assert.match(interactionSource, /window\.addEventListener\('keydown'/)
  assert.match(interactionSource, /computeKeyboardOffset/)
  assert.match(interactionSource, /computeHandleResize/)
  assert.match(interactionSource, /guideDragState/)
})

test('layout workspace delegates guide state to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const guideHookPath = 'src/components/MultiFrameSpriteWorkspace/useLayoutGuideWorkspace.ts'

  assert.ok(existsSync(guideHookPath), 'layout guide workspace hook should exist')
  const guideHookSource = readFileSync(guideHookPath, 'utf8')

  assert.match(source, /from '\.\/useLayoutGuideWorkspace'/)
  assert.match(source, /useLayoutGuideWorkspace\(/)
  assert.doesNotMatch(source, /const \[guideLines, setGuideLines\] = useState/)
  assert.doesNotMatch(source, /const \[selectedGuideLineId, setSelectedGuideLineId\] = useState/)
  assert.doesNotMatch(source, /const addGuideLine = /)
  assert.match(guideHookSource, /export function useLayoutGuideWorkspace/)
  assert.match(guideHookSource, /createWorkspaceId/)
  assert.match(guideHookSource, /setSelectedGuideLineId\(id\)/)
})

test('layout workspace delegates frame action orchestration to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const actionHookPath = 'src/components/MultiFrameSpriteWorkspace/useLayoutFrameActions.ts'

  assert.ok(existsSync(actionHookPath), 'layout frame action hook should exist')
  const actionHookSource = readFileSync(actionHookPath, 'utf8')

  assert.match(source, /from '\.\/useLayoutFrameActions'/)
  assert.match(source, /useLayoutFrameActions\(/)
  for (const delegatedToken of [
    'pendingLayoutRef',
    'computeWheelFrameResize',
    'applyLayoutPresetToFrames',
    'applyCanvasRatioToFrameLayouts',
    'const handleLayoutWheel =',
    'const applyPresetSize =',
    'const updateActiveRatio =',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
    assert.match(actionHookSource, new RegExp(delegatedToken))
  }
  assert.match(actionHookSource, /window\.requestAnimationFrame/)
  assert.match(actionHookSource, /startCanvasRatioApplyFeedback/)
})

test('active layout frame preview renders public stroke and outline styles without using composed canvas output', () => {
  const stageSource = readFileSync('src/components/MultiFrameSpriteWorkspace/CanvasStage.tsx', 'utf8')
  const layerSource = readFileSync('src/components/MultiFrameSpriteWorkspace/CanvasActiveFrameLayer.tsx', 'utf8')
  const modelSource = readFileSync('src/components/MultiFrameSpriteWorkspace/layoutModel.ts', 'utf8')

  assert.match(modelSource, /export function getLayoutFrameSilhouettePreviewLayers/)
  assert.match(stageSource, /composeStyle=\{layout\.composeStyle\}/)
  assert.match(layerSource, /composeStyle/)
  assert.match(layerSource, /getLayoutFrameSilhouettePreviewLayers\(composeStyle\)/)
  assert.match(layerSource, /maskImage/)
  assert.match(layerSource, /WebkitMaskImage/)
  assert.match(layerSource, /getLayoutFramePreviewUrl\(activeFrame\)/)
  assert.doesNotMatch(layerSource, /composedUrl\s*\?\?/)
})
