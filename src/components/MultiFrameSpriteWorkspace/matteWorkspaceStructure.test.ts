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
  assert.match(matteGroupActions, /readCurrentProjectSpaceState/)
  assert.match(matteGroupActions, /persistCurrentProjectSpaceState/)
  assert.match(matteGroupActions, /writeAssetResourcesWithGeneratedCoverToDirectory/)
  assert.doesNotMatch(matteGroupActions, /writeAssetResourcesToDirectory/)
  assert.doesNotMatch(matteGroupActions, /writeCurrentProjectSpaceState/)
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
