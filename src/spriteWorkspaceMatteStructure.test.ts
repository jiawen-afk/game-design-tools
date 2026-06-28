import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { readSources } from './appStructureTestHelpers.test'

test('matte pipeline delegates default parameter persistence to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const defaultsHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMatteDefaultsWorkspace.ts', 'utf8')

  assert.match(source, /from '\.\/useMatteDefaultsWorkspace'/)
  assert.match(source, /useMatteDefaultsWorkspace/)
  assert.doesNotMatch(source, /readStoredMatteDefaults/)
  assert.doesNotMatch(source, /writeStoredMatteDefaults/)
  assert.doesNotMatch(source, /const openMatteDefaults = /)
  assert.doesNotMatch(source, /const saveMatteDefaults = /)
  assert.match(defaultsHook, /readStoredMatteDefaults/)
  assert.match(defaultsHook, /writeStoredMatteDefaults/)
  assert.match(defaultsHook, /coerceMatteDefaults/)
  assert.match(defaultsHook, /openMatteDefaults/)
  assert.match(defaultsHook, /saveMatteDefaults/)
})

test('matte pipeline delegates sampled key color reads to a focused helper', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const colorPickerPath = 'src/components/MultiFrameSpriteWorkspace/useMatteColorPicker.ts'
  const samplerPath = 'src/components/MultiFrameSpriteWorkspace/matteColorSampler.ts'

  assert.ok(existsSync(colorPickerPath), 'matte color picker hook should exist')
  assert.ok(existsSync(samplerPath), 'matte color sampler should exist')
  const colorPickerSource = readFileSync(colorPickerPath, 'utf8')
  const samplerSource = readFileSync(samplerPath, 'utf8')

  assert.match(source, /from '\.\/useMatteColorPicker'/)
  assert.match(source, /useMatteColorPicker\(/)
  assert.doesNotMatch(source, /from '\.\/matteColorSampler'/)
  assert.doesNotMatch(source, /sampleFrameKeyColor/)
  assert.doesNotMatch(source, /loadImage/)
  assert.doesNotMatch(source, /document\.createElement\('canvas'\)/)
  assert.doesNotMatch(source, /getImageData/)
  assert.match(colorPickerSource, /export function useMatteColorPicker/)
  assert.match(colorPickerSource, /from '\.\/matteColorSampler'/)
  assert.match(colorPickerSource, /sampleFrameKeyColor\(/)
  assert.match(samplerSource, /export async function sampleFrameKeyColor/)
  assert.match(samplerSource, /loadImage/)
  assert.match(samplerSource, /document\.createElement\('canvas'\)/)
  assert.match(samplerSource, /getImageData/)
})

test('matte pipeline delegates composed frame queue orchestration to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const composeHookPath = 'src/components/MultiFrameSpriteWorkspace/useMatteComposeQueue.ts'

  assert.ok(existsSync(composeHookPath), 'matte compose queue hook should exist')
  const composeHookSource = readFileSync(composeHookPath, 'utf8')

  assert.match(source, /from '\.\/useMatteComposeQueue'/)
  assert.match(source, /useMatteComposeQueue\(/)
  assert.doesNotMatch(source, /const composeTimersRef/)
  assert.doesNotMatch(source, /const runComposeQueue\b/)
  assert.doesNotMatch(source, /composeFrame\(/)
  assert.match(composeHookSource, /export function useMatteComposeQueue/)
  assert.match(composeHookSource, /composeFrame/)
  assert.match(composeHookSource, /applyComposedFrameUrl/)
  assert.match(composeHookSource, /dequeueNextInactiveFrameId/)
})

test('matte pipeline delegates matte processing queue orchestration to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const processingHookPath = 'src/components/MultiFrameSpriteWorkspace/useMatteProcessingQueue.ts'

  assert.ok(existsSync(processingHookPath), 'matte processing queue hook should exist')
  const processingHookSource = readFileSync(processingHookPath, 'utf8')

  assert.match(source, /from '\.\/useMatteProcessingQueue'/)
  assert.match(source, /useMatteProcessingQueue\(/)
  assert.doesNotMatch(source, /const timersRef/)
  assert.doesNotMatch(source, /const matteRunRef/)
  assert.doesNotMatch(source, /const matteQueueRef/)
  assert.doesNotMatch(source, /const matteActiveRef/)
  assert.doesNotMatch(source, /const runMatteQueue\b/)
  assert.doesNotMatch(source, /removeImageBackground\(/)
  assert.doesNotMatch(source, /chromaKey\(/)
  assert.match(processingHookSource, /export function useMatteProcessingQueue/)
  assert.match(processingHookSource, /removeImageBackground/)
  assert.match(processingHookSource, /chromaKey/)
  assert.match(processingHookSource, /dequeueNextInactiveFrameId/)
})

test('matte pipeline reports key color sampling failures instead of leaking rejected promises', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useMatteColorPicker.ts', 'utf8')

  assert.match(source, /const sampleColor = useCallback\(async/)
  assert.match(source, /try\s*{[\s\S]*sampleFrameKeyColor\([\s\S]*setMatteParam\(item\.id, 'keyColor', keyColor\)[\s\S]*} catch \(error\)/)
  assert.match(source, /message\.error\(`取色失败：\$\{String\(error\)\}`\)/)
})

test('sprite matte smoothness controls cap edge smoothing at 50', () => {
  const model = readSources([
    'src/components/MultiFrameSpriteWorkspace/matteModel.ts',
    'src/components/MultiFrameSpriteWorkspace/matteColorModel.ts',
  ])
  const card = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteFrameCard.tsx', 'utf8')
  const defaultsModal = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteDefaultsModal.tsx', 'utf8')

  assert.match(model, /smoothness:\s*50/)
  assert.match(card, /MATTE_PARAM_MAX\[key\]/)
  assert.match(defaultsModal, /MATTE_PARAM_MAX\[key\]/)
  assert.doesNotMatch(card, /max=\{100\}/)
})

test('matte model delegates color normalization and defaults to a focused module', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/matteModel.ts', 'utf8')
  const colorModelPath = 'src/components/MultiFrameSpriteWorkspace/matteColorModel.ts'

  assert.ok(existsSync(colorModelPath), 'matte color model should exist')
  const colorModelSource = readFileSync(colorModelPath, 'utf8')

  assert.match(source, /from '\.\/matteColorModel'/)
  assert.doesNotMatch(source, /function normalizeHexColor/)
  assert.doesNotMatch(source, /function normalizePickerColor/)
  assert.doesNotMatch(source, /function resolveSpillColor/)
  assert.doesNotMatch(source, /function coerceMatteDefaults/)
  assert.match(colorModelSource, /export function normalizeHexColor/)
  assert.match(colorModelSource, /export function normalizePickerColor/)
  assert.match(colorModelSource, /export function resolveSpillColor/)
  assert.match(colorModelSource, /export function coerceMatteDefaults/)
})

test('matte model delegates grouped, parameter, and pipeline rules to focused modules', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/matteModel.ts', 'utf8')
  const moduleExpectations = [
    {
      path: 'src/components/MultiFrameSpriteWorkspace/matteGroupModel.ts',
      importName: 'matteGroupModel',
      helpers: [
        'getInitialMatteFrameIds',
        'getNextMatteGroupName',
        'buildMatteFrameGroups',
        'removeMatteFrameGroup',
      ],
    },
    {
      path: 'src/components/MultiFrameSpriteWorkspace/matteParamModel.ts',
      importName: 'matteParamModel',
      helpers: [
        'applyMatteParamsToFollowingFrames',
        'applyMatteParamsToAllFrames',
        'applyMatteParamsToFrameGroup',
      ],
    },
    {
      path: 'src/components/MultiFrameSpriteWorkspace/mattePipelineModel.ts',
      importName: 'mattePipelineModel',
      helpers: [
        'buildMatteProcessingProgress',
        'queueUniqueFrameId',
        'dequeueNextInactiveFrameId',
        'resolvePipelineConcurrency',
      ],
    },
  ]

  for (const expectation of moduleExpectations) {
    assert.ok(existsSync(expectation.path), `${expectation.path} should exist`)
    const focusedSource = readFileSync(expectation.path, 'utf8')

    assert.match(source, new RegExp(`from '\\./${expectation.importName}'`))
    for (const helper of expectation.helpers) {
      assert.match(focusedSource, new RegExp(`export function ${helper}\\b`))
      assert.doesNotMatch(source, new RegExp(`function ${helper}\\b`))
    }
  }
})

test('matte workspace panel delegates AI matting setup to a focused component', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')
  const setupPath = 'src/components/MultiFrameSpriteWorkspace/MatteAiSetupPanel.tsx'

  assert.ok(existsSync(setupPath), 'matte AI setup panel should exist')
  const setupSource = readFileSync(setupPath, 'utf8')

  assert.match(source, /from '\.\/MatteAiSetupPanel'/)
  assert.match(source, /<MatteAiSetupPanel/)
  assert.doesNotMatch(source, /className="ai-matting-setup"/)
  assert.doesNotMatch(source, /BiRefNet 服务未连接/)
  assert.match(setupSource, /function MatteAiSetupPanel/)
  assert.match(setupSource, /className="ai-matting-setup"/)
  assert.match(setupSource, /BiRefNet 服务未连接/)
  assert.match(setupSource, /onAiDevicePreferenceChange/)
  assert.match(setupSource, /AI抠图进度/)
})
