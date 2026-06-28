import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('multi-frame sprite model tests live in focused files', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/model.test.ts', 'utf8')
  const focusedFiles = [
    ['src/components/MultiFrameSpriteWorkspace/videoModel.test.ts', 'video frame timestamps sample the selected clip by fps'],
    ['src/components/MultiFrameSpriteWorkspace/aiMattingModel.test.ts', 'AI matting tests stay split by service responsibility'],
    ['src/components/MultiFrameSpriteWorkspace/aiMattingWorkspaceStructure.test.ts', 'AI matte processing requires a connected BiRefNet service before invoking inference'],
    ['src/components/MultiFrameSpriteWorkspace/aiMattingDesktopBridge.test.ts', 'desktop bridge exposes BiRefNet setup'],
    ['src/components/MultiFrameSpriteWorkspace/aiMattingDeployment.test.ts', 'BiRefNet service detection waits for model readiness'],
    ['src/components/MultiFrameSpriteWorkspace/layoutModel.test.ts', 'layout model tests stay split by layout responsibility'],
    ['src/components/MultiFrameSpriteWorkspace/layoutRatioModel.test.ts', 'ratio sizing keeps a frame inside the shared canvas'],
    ['src/components/MultiFrameSpriteWorkspace/layoutInteractionModel.test.ts', 'corner handle resize preserves aspect ratio when locked'],
    ['src/components/MultiFrameSpriteWorkspace/layoutGuideModel.test.ts', 'guide line positions clamp to canvas and delete at the origin'],
    ['src/components/MultiFrameSpriteWorkspace/layoutDefaultsModel.test.ts', 'layout defaults are clamped for saved public parameters'],
    ['src/components/MultiFrameSpriteWorkspace/matteGroupModel.test.ts', 'matte import groups are named by import order and source type'],
    ['src/components/MultiFrameSpriteWorkspace/spriteFrameModel.test.ts', 'sprite frame model tests stay split by frame responsibility'],
    ['src/components/MultiFrameSpriteWorkspace/spriteSheetModel.test.ts', 'sprite index records frame cells and playback metadata'],
    ['src/components/MultiFrameSpriteWorkspace/playbackModel.test.ts', 'playback cursor advances loop and pingpong modes'],
    ['src/components/MultiFrameSpriteWorkspace/frameCompositionModel.test.ts', 'composed url replacement does not revoke the new url for unrelated frames'],
    ['src/components/MultiFrameSpriteWorkspace/spriteUploadFilterModel.test.ts', 'upload filtering ignores files that already exist or are pending'],
    ['src/components/MultiFrameSpriteWorkspace/spriteProjectCollectStructure.test.ts', 'sprite export can be collected into project space with sprite and index resources'],
    ['src/components/MultiFrameSpriteWorkspace/spriteUpscaleModel.test.ts', 'sprite upscale tests stay split by model and workspace responsibility'],
    ['src/components/MultiFrameSpriteWorkspace/spriteUpscalePreviewModel.test.ts', 'sprite upscale targets visible composed frames in playback order'],
    ['src/components/MultiFrameSpriteWorkspace/spriteUpscaleExportModel.test.ts', 'sprite export uses current upscaled frame urls and flow 3 canvas dimensions when upscale is enabled'],
    ['src/components/MultiFrameSpriteWorkspace/spriteUpscaleWorkspaceStructure.test.ts', 'sprite playback panel exposes batch upscale controls and a side by side upscale preview'],
    ['src/components/MultiFrameSpriteWorkspace/workspaceStructure.test.ts', 'sprite workspace structure tests stay split by workspace boundary'],
    ['src/components/MultiFrameSpriteWorkspace/workspacePlaybackStructure.test.ts', 'playback preview stays bounded when many frame rows are present'],
    ['src/components/MultiFrameSpriteWorkspace/workspaceHookStructure.test.ts', 'workspace implementation delegates focused responsibilities to local modules'],
    ['src/components/MultiFrameSpriteWorkspace/workspacePanelStructure.test.ts', 'workspace entry only composes focused panels and hooks'],
  ] as const

  for (const [path, testName] of focusedFiles) {
    const focusedSource = existsSync(path) ? readFileSync(path, 'utf8') : ''

    assert.ok(existsSync(path), `${path} should exist`)
    assert.doesNotMatch(source, new RegExp("test\\('" + testName))
    assert.match(focusedSource, new RegExp("test\\('" + testName))
  }
})
