import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('adding frames to flow 2 only schedules the initial matte frame', () => {
  const videoHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts', 'utf8')
  const uploadHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useUploadWorkspace.ts', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const frameHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useFrameWorkspaceState.ts', 'utf8')
  const workspaceEntry = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const mattePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')
  const matteGroupActions = readFileSync('src/components/MultiFrameSpriteWorkspace/matteGroupActions.ts', 'utf8')
  const videoConfirmHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useVideoFrameConfirmWorkflow.ts', 'utf8')
  const videoConfirmAction = readFileSync('src/components/MultiFrameSpriteWorkspace/videoFrameConfirmAction.ts', 'utf8')

  assert.match(videoHook, /useVideoFrameConfirmWorkflow/)
  assert.doesNotMatch(videoHook, /addVisibleVideoFramesToWorkspace/)
  assert.match(videoConfirmHook, /addVisibleVideoFramesToWorkspace/)
  assert.match(videoConfirmAction, /getInitialMatteFrameIds/)
  assert.match(uploadHook, /getInitialMatteFrameIds/)
  assert.match(videoConfirmAction, /getNextMatteGroupName\(frames,\s*'video'\)/)
  assert.match(uploadHook, /getNextMatteGroupName\(framesRef\.current,\s*'imageBatch'\)/)
  assert.match(uploadHook, /getNextMatteGroupName\(framesRef\.current,\s*'spriteSheet'\)/)
  assert.doesNotMatch(controller, /existingFrameCount:\s*frame\.frames\.length/)
  assert.match(mattePanel, /buildMatteFrameGroups/)
  assert.match(mattePanel, /应用到组所有帧/)
  assert.match(mattePanel, /导出组图片/)
  assert.match(mattePanel, /收藏到项目空间/)
  assert.match(mattePanel, /personalSpaceCollectEnabled/)
  assert.match(mattePanel, /personalSpaceCollectDisabledReason/)
  assert.match(mattePanel, /resolveMatteGroupFrameSelection/)
  assert.match(mattePanel, /selectedFrameIndexByGroup/)
  assert.match(mattePanel, /上一帧/)
  assert.match(mattePanel, /下一帧/)
  assert.match(matteGroupActions, /readCurrentProjectSpaceState/)
  assert.match(matteGroupActions, /persistCurrentProjectSpaceState/)
  assert.match(matteGroupActions, /writeAssetResourcesWithGeneratedCoverToDirectory/)
  assert.doesNotMatch(matteGroupActions, /writeAssetResourcesToDirectory/)
  assert.doesNotMatch(matteGroupActions, /writeCurrentProjectSpaceState/)
  assert.doesNotMatch(mattePanel, /确定应用到该组所有帧/)
  assert.match(mattePanel, /<span>\{group\.name\} · 第 \{selection\.frameNumber\} 帧<\/span>/)
  assert.match(mattePanel, /<Text type="secondary">共 \{group\.frameCount\} 帧<\/Text>/)
  assert.doesNotMatch(mattePanel, /item=\{group\.firstFrame\}/)
  assert.match(frameHook, /removeFrameGroup/)
  assert.match(frameHook, /removeMatteFrameGroup/)
  assert.match(workspaceEntry, /onRemoveGroup=\{workspace\.frame\.removeFrameGroup\}/)
  assert.doesNotMatch(workspaceEntry, /onRemove=\{workspace\.frame\.removeFrame\}/)
  assert.match(mattePanel, /onRemoveGroup\(group\.id\)/)
  assert.doesNotMatch(videoHook, /created\.forEach\(\(item\)\s*=>\s*scheduleMatte\(item\.id\)\)/)
  assert.doesNotMatch(uploadHook, /created\.forEach\(\(item\)\s*=>\s*scheduleMatte\(item\.id\)\)/)
})

test('matte pipeline delegates frame key color picking to a focused hook', () => {
  const hookSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const colorPickerPath = 'src/components/MultiFrameSpriteWorkspace/useMatteColorPicker.ts'

  assert.ok(existsSync(colorPickerPath), `${colorPickerPath} should exist`)
  const colorPickerSource = readFileSync(colorPickerPath, 'utf8')

  assert.match(hookSource, /from '\.\/useMatteColorPicker'/)
  assert.match(hookSource, /useMatteColorPicker\(/)
  assert.doesNotMatch(hookSource, /sampleFrameKeyColor/)
  assert.match(colorPickerSource, /export function useMatteColorPicker/)
  assert.match(colorPickerSource, /sampleFrameKeyColor/)
  assert.match(colorPickerSource, /message\.error\(`取色失败：/)
})

test('chroma key matte keeps uploaded transparent pixels transparent', () => {
  const mattePipeline = readFileSync('src/components/MultiFrameSpriteWorkspace/spriteMattePipeline.ts', 'utf8')

  assert.match(mattePipeline, /sourceAlpha/)
  assert.match(mattePipeline, /composeChromaKeyOutputAlpha\(sourceAlpha,\s*keyAlpha\)/)
  assert.doesNotMatch(mattePipeline, /data\.data\[i \+ 3\] = Math\.round\(alpha \* 255\)/)
})

test('additive black-to-alpha canvas work stays in a focused pipeline', () => {
  const pipelinePath = 'src/components/MultiFrameSpriteWorkspace/spriteAdditiveBlendPipeline.ts'
  const mattePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')

  assert.ok(existsSync(pipelinePath), `${pipelinePath} should exist`)
  const pipeline = readFileSync(pipelinePath, 'utf8')

  assert.match(pipeline, /applyAdditiveBlendToImage/)
  assert.match(pipeline, /computeAdditiveBlackToAlphaPixel/)
  assert.match(pipeline, /getImageData/)
  assert.match(pipeline, /canvasToBlob/)
  assert.doesNotMatch(mattePanel, /getImageData/)
  assert.doesNotMatch(mattePanel, /computeAdditiveBlackToAlphaPixel/)
  assert.doesNotMatch(mattePanel, /canvasToBlob/)
})

test('matte pipeline delegates additive post-processing workflow to a focused hook', () => {
  const matteHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const additiveHookPath = 'src/components/MultiFrameSpriteWorkspace/useAdditiveBlendWorkspace.ts'

  assert.ok(existsSync(additiveHookPath), `${additiveHookPath} should exist`)
  const additiveHook = readFileSync(additiveHookPath, 'utf8')

  assert.match(matteHook, /from '\.\/useAdditiveBlendWorkspace'/)
  assert.match(matteHook, /useAdditiveBlendWorkspace\(/)
  assert.match(matteHook, /additiveBlend/)
  assert.match(additiveHook, /export function useAdditiveBlendWorkspace/)
  assert.match(additiveHook, /applyAdditiveBlendToImage/)
  assert.match(additiveHook, /matteRevision:\s*cur\.matteRevision \+ 1/)
  assert.doesNotMatch(matteHook, /applyAdditiveBlendToImage/)
})

test('flow 2 renders additive black-to-alpha controls through a focused panel', () => {
  const mattePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')
  const workspaceEntry = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const additivePanelPath = 'src/components/MultiFrameSpriteWorkspace/AdditiveBlendPanel.tsx'

  assert.ok(existsSync(additivePanelPath), `${additivePanelPath} should exist`)
  const additivePanel = readFileSync(additivePanelPath, 'utf8')

  assert.match(mattePanel, /from '\.\/AdditiveBlendPanel'/)
  assert.match(mattePanel, /<AdditiveBlendPanel/)
  assert.match(mattePanel, /additiveBlend=/)
  assert.match(workspaceEntry, /additiveBlend=\{workspace\.matte\.additiveBlend\}/)
  assert.match(additivePanel, /加色去黑/)
  assert.match(additivePanel, /当前帧/)
  assert.match(additivePanel, /本组全部帧/)
  assert.match(additivePanel, /自定义选择/)
  assert.match(additivePanel, /选择当前帧之后/)
  assert.match(additivePanel, /应用加色去黑/)
})
