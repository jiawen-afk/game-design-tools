import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { spriteWorkspaceCssSource } from './spriteUpscaleTestHelpers.test'

test('sprite playback panel exposes batch upscale controls and a side by side upscale preview', () => {
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackPanel.tsx', 'utf8')
  const upscalePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackUpscalePanel.tsx', 'utf8')
  const outputPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')

  assert.match(controller, /useSpriteUpscaleWorkspace/)
  assert.match(outputPanel, /upscale=\{playback\.upscale\}/)
  assert.match(upscalePanel, /批量高清化/)
  assert.match(upscalePanel, /输入图高清化/)
  assert.match(upscalePanel, /结果图高清化/)
  assert.match(upscalePanel, /导出后单帧/)
  assert.match(panel, /高清化播放/)
  assert.match(panel, /upscale\.previewResult/)
})

test('sprite result upscale resolution hint is visible before runtime install gate', () => {
  const upscalePanel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackUpscalePanel.tsx', 'utf8')
  const hintIndex = upscalePanel.indexOf('导出后单帧')
  const installGateIndex = upscalePanel.indexOf('!upscaleInstalled')

  assert.ok(hintIndex > 0, 'result upscale resolution hint should be rendered by the upscale panel')
  assert.ok(installGateIndex > 0, 'runtime install gate should still be rendered by the upscale panel')
  assert.ok(hintIndex < installGateIndex, 'resolution hint should not be hidden behind the runtime install gate')
})

test('sprite export receives upscale results so enabled upscale exports cannot use original frames', () => {
  const exportHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts', 'utf8')
  const upscaleHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteUpscaleWorkspace.ts', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')

  assert.match(controller, /upscaleEnabled:\s*upscale\.upscaleEnabled/)
  assert.match(controller, /upscaleMode:\s*upscale\.upscaleMode/)
  assert.match(controller, /upscaleResultsByFrameId:\s*upscale\.resultByFrameId/)
  assert.match(controller, /composeStyle:\s*layout\.composeStyle/)
  assert.match(exportHook, /buildSpriteUpscaleExportPlan/)
  assert.match(exportHook, /已开启，请先批量高清化所有可见帧后再导出/)
  assert.match(upscaleHook, /frame\.matteUrl/)
  assert.match(upscaleHook, /frame\.composedUrl/)
  assert.match(upscaleHook, /composeFrame\(\s*upscaledSourceUrl,\s*canvasWidth,\s*canvasHeight,\s*frame\.layout,\s*composeStyle\s*\)/s)
})

test('sprite upscale workspace delegates result url lifecycle to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteUpscaleWorkspace.ts', 'utf8')
  const resultsHookPath = 'src/components/MultiFrameSpriteWorkspace/useSpriteUpscaleResults.ts'

  assert.ok(existsSync(resultsHookPath), 'sprite upscale results hook should exist')
  const resultsHookSource = readFileSync(resultsHookPath, 'utf8')

  assert.match(source, /from '\.\/useSpriteUpscaleResults'/)
  assert.match(source, /useSpriteUpscaleResults\(/)
  assert.doesNotMatch(source, /const \[resultByFrameId, setResultByFrameId\] = useState/)
  assert.doesNotMatch(source, /resultByFrameIdRef/)
  assert.doesNotMatch(source, /collectStaleSpriteUpscaleResultUrls/)
  assert.match(resultsHookSource, /export function useSpriteUpscaleResults/)
  assert.match(resultsHookSource, /collectStaleSpriteUpscaleResultUrls/)
  assert.match(resultsHookSource, /revokeImageObjectUrl/)
  assert.match(resultsHookSource, /clearUpscaleResults/)
  assert.match(resultsHookSource, /storeUpscaleResult/)
})

test('sprite playback layout caps the frame playlist at three columns', () => {
  const css = spriteWorkspaceCssSource()

  assert.match(css, /\.playback-workspace-grid\s*{[^}]*grid-template-columns:\s*minmax\(\d+px,\s*\d+px\)\s+minmax\(0,\s*1fr\)/s)
  assert.match(css, /\.playback-frame-list\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(\d+px,\s*1fr\)\)/s)
  assert.doesNotMatch(css, /\.playback-frame-list\s*{[^}]*grid-auto-flow:\s*column/s)
  assert.match(css, /\.playback-preview-pair\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(\d+px,\s*1fr\)\)/s)
})
