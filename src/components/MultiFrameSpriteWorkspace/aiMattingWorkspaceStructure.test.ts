import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { buildMatteProcessingProgress } from './model'

test('sprite matte workspace exposes chroma key and AI matting modes', () => {
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')
  const setupPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteAiSetupPanel.tsx', 'utf8')
  const card = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteFrameCard.tsx', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const processingHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMatteProcessingQueue.ts', 'utf8')
  const service = readFileSync('src/components/MultiFrameSpriteWorkspace/aiMattingService.ts', 'utf8')

  assert.match(panel, /modeOptions/)
  assert.match(panel, /色键抠图/)
  assert.match(panel, /AI抠图/)
  assert.match(panel, /MatteAiSetupPanel/)
  assert.match(panel, /aiMattingProgress/)
  assert.match(setupPanel, /Progress/)
  assert.match(setupPanel, /AI抠图进度/)
  assert.match(setupPanel, /onAiDetectEnvironment/)
  assert.match(setupPanel, /onAiInstallDependencies/)
  assert.match(setupPanel, /onAiStartService/)
  assert.match(setupPanel, /onAiStopService/)
  assert.match(card, /matteMode === 'ai'/)
  assert.match(hook, /matteMode/)
  assert.match(hook, /aiMattingProgress/)
  assert.match(processingHook, /removeImageBackground/)
  assert.match(service, /removeImageBackground/)
})

test('AI matte progress separates completed active and waiting frames', () => {
  const progress = buildMatteProcessingProgress(
    [
      { id: 'done', matteUrl: 'blob:done', processing: false },
      { id: 'active', matteUrl: 'blob:stale', processing: true },
      { id: 'queued', matteUrl: null, processing: false },
      { id: 'outside', matteUrl: 'blob:outside', processing: false },
    ],
    {
      targetIds: ['done', 'active', 'queued'],
      activeIds: ['active'],
      queuedIds: ['queued'],
      delayedIds: [],
    }
  )

  assert.deepEqual(progress, {
    total: 3,
    completed: 1,
    active: 1,
    waiting: 1,
    percent: 33,
    label: '已完成 1 / 3 帧，处理中 1 帧，等待 1 帧',
  })
})

test('AI matte processing requires a connected BiRefNet service before invoking inference', () => {
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')

  assert.match(hook, /matteMode === 'ai' && !aiMatting\.connected/)
  assert.match(hook, /AI 抠图服务未连接/)
  assert.match(hook, /aiMatting\.runCheck/)
  assert.match(panel, /matteMode === 'ai' && !aiMatting\.connected/)
  assert.match(panel, /请先启动 BiRefNet 服务/)
})

test('AI matting setup hook delegates runtime status parsing to a pure model', () => {
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useAiMattingSetup.ts', 'utf8')
  const modelPath = 'src/components/MultiFrameSpriteWorkspace/aiMattingRuntimeModel.ts'

  assert.ok(existsSync(modelPath), `${modelPath} should exist`)
  const model = readFileSync(modelPath, 'utf8')

  assert.match(hook, /from '\.\/aiMattingRuntimeModel'/)
  assert.doesNotMatch(hook, /function normalizeDevicePreference/)
  assert.doesNotMatch(hook, /function parseBirefnetStatusOutput/)
  assert.doesNotMatch(hook, /function extractDevicePreferenceFromText/)
  assert.match(model, /export function normalizeBirefnetDevicePreference/)
  assert.match(model, /export function parseBirefnetServiceStatus/)
  assert.match(model, /export function extractBirefnetDevicePreferenceFromText/)
})

test('AI matting setup hook delegates service connection probing to a focused hook', () => {
  const setupHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useAiMattingSetup.ts', 'utf8')
  const connectionHookPath = 'src/components/MultiFrameSpriteWorkspace/useAiMattingConnection.ts'

  assert.ok(existsSync(connectionHookPath), 'AI matting connection hook should exist')
  const connectionHook = readFileSync(connectionHookPath, 'utf8')

  assert.match(setupHook, /from '\.\/useAiMattingConnection'/)
  assert.match(setupHook, /useAiMattingConnection\(/)
  assert.doesNotMatch(setupHook, /useRef/)
  assert.doesNotMatch(setupHook, /waitForDesktopServiceConnection/)
  assert.doesNotMatch(setupHook, /checkBirefnetConnection/)
  assert.doesNotMatch(setupHook, /parseBirefnetServiceStatus/)
  assert.doesNotMatch(setupHook, /setConnectionStatus/)
  assert.match(connectionHook, /export function useAiMattingConnection/)
  assert.match(connectionHook, /useRef/)
  assert.match(connectionHook, /waitForDesktopServiceConnection/)
  assert.match(connectionHook, /checkBirefnetConnection/)
  assert.match(connectionHook, /parseBirefnetServiceStatus/)
  assert.match(connectionHook, /runCheck/)
  assert.match(connectionHook, /waitForServiceConnection/)
})
