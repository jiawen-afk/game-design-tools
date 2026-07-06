import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildStableAudioGeneratePayload,
  chooseSoundEffectModel,
  clampSoundDuration,
  createSoundEffectRecordName,
  defaultSoundEffectParams,
  defaultStableAudioPort,
  deriveStableAudioInstallState,
  stableAudioModels,
} from './soundEffectModel'

test('stable audio model metadata describes the three supported models', () => {
  assert.deepEqual(stableAudioModels.map((model) => model.id), ['small-sfx', 'small-music', 'medium'])
  assert.equal(stableAudioModels.find((model) => model.id === 'small-sfx')?.recommendedUse, '游戏音效、环境声、foley、UI 音')
  assert.equal(stableAudioModels.find((model) => model.id === 'small-music')?.hardware, 'CPU / 轻量设备')
  assert.equal(stableAudioModels.find((model) => model.id === 'medium')?.maxDurationSeconds, 380)
})

test('sound effect defaults prefer small-sfx on port 8818', () => {
  assert.equal(defaultStableAudioPort, 8818)
  assert.equal(defaultSoundEffectParams.model, 'small-sfx')
  assert.equal(defaultSoundEffectParams.durationSeconds, 6)
})

test('duration clamps to the selected model limits', () => {
  assert.equal(clampSoundDuration('small-sfx', 180), 120)
  assert.equal(clampSoundDuration('small-music', 0), 1)
  assert.equal(clampSoundDuration('medium', 500), 380)
})

test('builds stable audio generate payload from params', () => {
  const payload = buildStableAudioGeneratePayload({
    ...defaultSoundEffectParams,
    model: 'medium',
    prompt: 'short magical pickup chime',
    durationSeconds: 8.4,
    seed: 42,
    outputName: 'pickup chime',
  })

  assert.deepEqual(payload, {
    model: 'medium',
    prompt: 'short magical pickup chime',
    durationSeconds: 8,
    seed: 42,
    outputName: 'pickup chime',
  })
})

test('derives installed and missing stable audio models from dependency checks', () => {
  const state = deriveStableAudioInstallState({
    'small-sfx': {
      ok: true,
      output: [
        'Stable Audio 3 依赖已安装。',
        '服务管理脚本：C:\\tools\\stable-audio-service.ps1',
        '安装配置：C:\\tools\\stable-audio-config.json',
        'Python：D:\\models\\StableAudio3\\stable-audio-3\\.venv\\Scripts\\python.exe',
        'Stable Audio 3 仓库：D:\\models\\StableAudio3\\stable-audio-3',
        'Python 依赖：torch ok',
        '模型缓存：model installed: small-sfx',
      ].join('\n'),
    },
    'small-music': {
      ok: false,
      output: [
        '尚未完成 Stable Audio 3 依赖安装。',
        '模型 small-music 尚未下载到本机缓存：stabilityai/stable-audio-3-small-music',
        'Python 依赖：torch ok',
      ].join('\n'),
    },
    medium: {
      ok: false,
      output: [
        '尚未完成 Stable Audio 3 依赖安装。',
        '模型 medium 尚未下载到本机缓存：stabilityai/stable-audio-3-medium',
        'Python 依赖：torch ok',
      ].join('\n'),
    },
  })

  assert.equal(state.hasChecked, true)
  assert.equal(state.dependenciesReady, true)
  assert.deepEqual(state.installedModelIds, ['small-sfx'])
  assert.deepEqual(state.missingModelIds, ['small-music', 'medium'])
})

test('chooses the last used sound effect model when installed, otherwise first installed model', () => {
  assert.equal(chooseSoundEffectModel('medium', ['small-sfx', 'medium']), 'medium')
  assert.equal(chooseSoundEffectModel('medium', ['small-music', 'small-sfx']), 'small-music')
  assert.equal(chooseSoundEffectModel(null, ['small-music', 'small-sfx']), 'small-music')
  assert.equal(chooseSoundEffectModel(null, []), 'small-sfx')
})

test('creates concise sound effect record names', () => {
  assert.equal(createSoundEffectRecordName({
    ...defaultSoundEffectParams,
    prompt: 'heavy stone door opening with dust',
  }, 3), '音效 3 · heavy stone')
})
