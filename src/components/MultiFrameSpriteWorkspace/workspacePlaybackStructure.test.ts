import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { spriteWorkspaceStyleSources } from '../../appStructureTestHelpers.test'

test('playback preview stays bounded when many frame rows are present', () => {
  const css = spriteWorkspaceStyleSources()
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackPanel.tsx', 'utf8')

  assert.match(panel, /className="playback-workspace-grid"/)
  assert.match(panel, /className="playback-frame-list"/)
  assert.match(panel, /className="playback-preview-box"/)
  assert.match(css, /\.playback-workspace-grid\s*{[^}]*align-items:\s*start/s)
  assert.match(css, /\.playback-workspace-grid\s*{[^}]*grid-template-columns:\s*minmax\(\d+px,\s*\d+px\)\s+minmax\(0,\s*1fr\)/s)
  assert.match(css, /\.playback-frame-list\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(\d+px,\s*1fr\)\)[^}]*max-height:\s*\d+px[^}]*overflow:\s*auto/s)
  assert.doesNotMatch(css, /\.playback-frame-list\s*{[^}]*grid-auto-flow:\s*column/s)
  assert.match(css, /\.playback-preview-pair\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(\d+px,\s*1fr\)\)/s)
  assert.match(css, /\.playback-preview-box\s*{[^}]*height:\s*min\(\d+vw,\s*\d+px\)[^}]*max-height:\s*\d+px/s)
})

test('playback preview uses one all-play button for play and pause states', () => {
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackPanel.tsx', 'utf8')

  assert.match(panel, /playing \? '暂停播放' : '全部播放'/)
  assert.match(panel, /onClick=\{playing \? onPause : onStartAll\}/)
  assert.doesNotMatch(panel, /\{playing && <Button onClick=\{onPause\}>暂停<\/Button>\}/)
})

test('playback panel delegates upscale controls to a focused panel', () => {
  const panelPath = 'src/components/MultiFrameSpriteWorkspace/PlaybackPanel.tsx'
  const upscalePanelPath = 'src/components/MultiFrameSpriteWorkspace/PlaybackUpscalePanel.tsx'

  assert.ok(existsSync(upscalePanelPath), 'expected playback upscale panel to exist')

  const panel = readFileSync(panelPath, 'utf8')
  const upscalePanel = readFileSync(upscalePanelPath, 'utf8')

  assert.match(panel, /from '\.\/PlaybackUpscalePanel'/)
  assert.match(panel, /<PlaybackUpscalePanel\s+upscale=\{upscale\}\s*\/>/s)
  for (const delegatedToken of [
    'upscaylModels',
    'installUpscaleRuntime',
    'runBatchUpscale',
    'sprite-upscale-controls',
  ]) {
    assert.doesNotMatch(panel, new RegExp(delegatedToken))
    assert.match(upscalePanel, new RegExp(delegatedToken))
  }
})

test('workspace video styles live beside the workspace component', () => {
  const appCss = readFileSync('src/styles/app.css', 'utf8')
  const workspaceCss = spriteWorkspaceStyleSources()

  assert.doesNotMatch(appCss, /\.video-workspace-grid/)
  assert.match(workspaceCss, /\.video-workspace-grid\s*{[^}]*min-height:\s*\d+px/s)
  assert.match(workspaceCss, /\.video-crop-layer\s*{[^}]*pointer-events:\s*auto/s)
})
