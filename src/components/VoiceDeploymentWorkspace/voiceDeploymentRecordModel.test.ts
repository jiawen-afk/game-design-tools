import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  clearVoiceRecords,
  createVoiceRecordName,
  defaultVoiceGenerationParams,
  deleteVoiceRecord,
  prepareCloneFromRecord,
  updateRecordName,
  type VoiceGenerationRecord,
} from './voiceDeploymentModel'

test('voice records can be renamed, deleted, and loaded for cloning without star state', () => {
  const record: VoiceGenerationRecord = {
    id: 'r1',
    name: createVoiceRecordName(defaultVoiceGenerationParams, 1),
    createdAt: '2026-06-05T00:00:00.000Z',
    audioUrl: 'blob:voice',
    audioPath: '/tmp/out.wav',
    params: {
      ...defaultVoiceGenerationParams,
      mode: 'high-similarity-clone',
      referenceAudioPath: '/tmp/ref.wav',
      referenceAudioName: 'ref.wav',
    },
  }

  const renamed = updateRecordName([record], 'r1', '角色 A')
  assert.equal(renamed[0].name, '角色 A')
  assert.equal(updateRecordName(renamed, 'r1', '   ')[0].name, '角色 A')

  assert.deepEqual(deleteVoiceRecord(renamed, 'r1'), [])

  const currentParams = {
    ...defaultVoiceGenerationParams,
    mode: 'voice-design' as const,
    text: '当前正在编辑的台词',
    controlInstruction: '当前声音描述',
    promptText: '当前参考音频文本',
    referenceAudioName: 'old.wav',
    referenceAudioPath: '/tmp/old.wav',
    advanced: {
      ...defaultVoiceGenerationParams.advanced,
      cfgValue: 2.6,
    },
  }

  const cloneParams = prepareCloneFromRecord(currentParams, renamed[0])
  assert.equal(cloneParams.mode, 'reference-clone')
  assert.equal(cloneParams.referenceAudioPath, '/tmp/out.wav')
  assert.equal(cloneParams.referenceAudioName, '角色 A')
  assert.equal(cloneParams.text, '当前正在编辑的台词')
  assert.equal(cloneParams.controlInstruction, '当前声音描述')
  assert.equal(cloneParams.promptText, '当前参考音频文本')
  assert.equal(cloneParams.advanced.cfgValue, 2.6)
})

test('voice record names can include a selected character prefix', () => {
  const named = createVoiceRecordName(defaultVoiceGenerationParams, 2, '莉娜')
  assert.match(named, /^莉娜 · 声音盲盒 2/)

  const unnamed = createVoiceRecordName(defaultVoiceGenerationParams, 2, '   ')
  assert.match(unnamed, /^声音盲盒 2/)
})

test('voice record history can be cleared at once', () => {
  const record: VoiceGenerationRecord = {
    id: 'r1',
    name: '历史配音',
    createdAt: '2026-06-05T00:00:00.000Z',
    audioUrl: 'blob:voice',
    audioPath: '/tmp/out.wav',
    params: defaultVoiceGenerationParams,
  }

  assert.deepEqual(clearVoiceRecords([record]), [])
})
