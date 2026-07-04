import test from 'node:test'
import assert from 'node:assert/strict'

import { defaultPersonalSpaceState, type PersonalSpaceAsset, type PersonalSpaceState } from './personalSpaceModel'
import { createPersonalSpaceAssetUploadActions } from './personalSpaceAssetUploadActions'

function createAsset(id: string, kind: PersonalSpaceAsset['kind'], assetSubtype: PersonalSpaceAsset['assetSubtype']): PersonalSpaceAsset {
  return {
    id,
    kind,
    assetSubtype,
    name: id,
    groupName: '',
    resourcePaths: [],
    createdAt: '2026-06-28T00:00:00.000Z',
    linkedCharacterIds: [],
    linkedStoryboardIds: [],
    linkedVoiceAssetIds: [],
    linkedSpriteAssetIds: [],
    storageResourcePaths: [],
  }
}

function createState(): PersonalSpaceState {
  return {
    ...defaultPersonalSpaceState,
    characters: [{
      id: 'character-1',
      name: '角色',
      order: 0,
      portraitAssets: [],
      spriteAssets: [],
      voiceAssets: [],
      portraitAssetIds: [],
      spriteAssetIds: [],
      voiceAssetIds: [],
    }],
    storyboardGroups: [{
      id: 'storyboard-1',
      name: '剧情',
      voiceEntries: [],
      characterIds: [],
      voiceAssetIds: [],
    }],
  }
}

function createMessageRecorder() {
  const messages: Array<[string, string]> = []
  return {
    messages,
    messageApi: {
      success: (content: string) => messages.push(['success', content]),
      warning: (content: string) => messages.push(['warning', content]),
      error: (content: string) => messages.push(['error', content]),
    },
  }
}

test('personal space upload actions prepend uploaded character assets and link them to the character column', async () => {
  let state = createState()
  const { messageApi, messages } = createMessageRecorder()
  const actions = createPersonalSpaceAssetUploadActions({
    messageApi,
    getSpace: () => state,
    setSpace: (updater) => { state = updater(state) },
    getDirectoryHandle: () => null,
    createPortraitAssetForUpload: async () => createAsset('portrait-1', 'image', 'portrait'),
  })

  await actions.uploadCharacterPortrait('character-1', new File(['image'], 'portrait.png'))

  assert.equal(state.assets[0]?.id, 'portrait-1')
  assert.deepEqual(state.characters[0]?.portraitAssetIds, ['portrait-1'])
  assert.deepEqual(state.assets[0]?.linkedCharacterIds, ['character-1'])
  assert.deepEqual(messages, [['success', '已上传角色肖像']])
})

test('personal space upload actions prepend storyboard voices and link them to the storyboard group', async () => {
  let state = createState()
  const { messageApi, messages } = createMessageRecorder()
  const actions = createPersonalSpaceAssetUploadActions({
    messageApi,
    getSpace: () => state,
    setSpace: (updater) => { state = updater(state) },
    getDirectoryHandle: () => null,
    createVoiceAssetForUpload: async () => createAsset('voice-1', 'voice', 'character_voice'),
  })

  await actions.uploadStoryboardVoice('storyboard-1', new File(['voice'], 'line.wav'))

  assert.equal(state.assets[0]?.id, 'voice-1')
  assert.deepEqual(state.storyboardGroups[0]?.voiceAssetIds, ['voice-1'])
  assert.deepEqual(state.storyboardGroups[0]?.voiceEntries.map((entry) => entry.assetId), ['voice-1'])
  assert.deepEqual(state.assets[0]?.linkedStoryboardIds, ['storyboard-1'])
  assert.deepEqual(messages, [['success', '已导入并关联配音']])
})

test('personal space upload actions report upload failures without mutating state', async () => {
  let state = createState()
  const before = state
  const { messageApi, messages } = createMessageRecorder()
  const actions = createPersonalSpaceAssetUploadActions({
    messageApi,
    getSpace: () => state,
    setSpace: (updater) => { state = updater(state) },
    getDirectoryHandle: () => null,
    createVoiceAssetForUpload: async () => {
      throw new Error('disk full')
    },
  })

  await actions.uploadCharacterVoice('character-1', new File(['voice'], 'line.wav'))

  assert.equal(state, before)
  assert.deepEqual(messages, [['error', '上传配音失败：Error: disk full']])
})
