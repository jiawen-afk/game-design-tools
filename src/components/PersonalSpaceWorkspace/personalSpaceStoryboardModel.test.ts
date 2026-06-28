import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCharacterProfile,
  addStoryboardGroup,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  createStoryboardVoiceRefs,
  defaultPersonalSpaceState,
  exportStoryboardReference,
  getStoryboardLinkedCharacterIds,
  moveStoryboardVoice,
  reorderStoryboardVoice,
  storyboardReferenceFileName,
  unassignVoiceFromStoryboardGroup,
  updatePersonalSpaceAsset,
} from './personalSpaceModel'

test('storyboard voice references are derived by asset id', () => {
  const firstVoice = createPersonalSpaceAsset({ kind: 'voice', name: '第一句' })
  const secondVoice = createPersonalSpaceAsset({ kind: 'voice', name: '第二句' })
  const state = {
    ...defaultPersonalSpaceState,
    assets: [firstVoice, secondVoice],
    storyboardGroups: [
      {
        id: 'story-a',
        name: '开场',
        characterIds: [],
        voiceAssetIds: [firstVoice.id, secondVoice.id],
        voiceEntries: [
          { assetId: firstVoice.id, text: '一', startOffsetUs: 0, order: 0 },
          { assetId: secondVoice.id, text: '二', startOffsetUs: 0, order: 1 },
        ],
      },
      {
        id: 'story-b',
        name: '战斗',
        characterIds: [],
        voiceAssetIds: [firstVoice.id],
        voiceEntries: [
          { assetId: firstVoice.id, text: '三', startOffsetUs: 0, order: 2 },
        ],
      },
    ],
  }

  assert.deepEqual(createStoryboardVoiceRefs(state, firstVoice.id), ['开场 #1', '战斗 #3'])
  assert.deepEqual(createStoryboardVoiceRefs(state, secondVoice.id), ['开场 #2'])
})

test('storyboard groups can be created and exported with linked character and voice details', () => {
  let state = addCharacterProfile(defaultPersonalSpaceState, '商人')
  state = addStoryboardGroup(state, '开场对白')
  const character = state.characters[0]!
  const group = state.storyboardGroups[0]!
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    name: '欢迎',
    resourcePaths: ['D:\\voice\\welcome.wav'],
    linkedCharacterIds: [character.id],
    linkedStoryboardIds: [group.id],
  })
  state = {
    ...state,
    assets: [voice],
    storyboardGroups: [{ ...group, voiceEntries: [{ assetId: voice.id, text: '', startOffsetUs: 0, order: 0 }], characterIds: [character.id], voiceAssetIds: [voice.id] }],
  }

  const exported = exportStoryboardReference(state, group.id)

  assert.equal(exported.group.name, '开场对白')
  assert.deepEqual(exported.characters.map((item) => item.name), ['商人'])
  assert.deepEqual(exported.voiceAssets.map((item) => item.resourcePaths[0]), ['D:\\voice\\welcome.wav'])
})

test('storyboard voice entries default to generated dialogue text and export speaker prefixes', () => {
  let state = addCharacterProfile(defaultPersonalSpaceState, '商人')
  state = addStoryboardGroup(state, '开场对白')
  const character = state.characters[0]!
  const groupId = state.storyboardGroups[0]!.id
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    name: '欢迎',
    dialogueText: '欢迎来到我的商店。',
    linkedCharacterIds: [character.id],
  })
  state = { ...state, assets: [voice] }

  state = assignVoiceToStoryboardGroup(state, groupId, voice.id)
  const exported = exportStoryboardReference(state, groupId)

  assert.equal(state.storyboardGroups[0]!.voiceEntries[0]!.text, '欢迎来到我的商店。')
  assert.equal(exported.dialogue[0]!.speaker?.name, '商人')
  assert.equal(exported.dialogue[0]!.speakerText, '【商人：】欢迎来到我的商店。')
})

test('storyboard reference file names are sanitized and stable', () => {
  assert.equal(storyboardReferenceFileName('开场/战斗:01'), 'storyboard-开场_战斗_01.json')
  assert.equal(storyboardReferenceFileName('  '), 'storyboard-未命名剧情组.json')
})

test('image effect assets can link voice assets, and storyboard voice entries export dialogue order', () => {
  const effect = createPersonalSpaceAsset({ kind: 'image', assetSubtype: 'effect', name: '火球' })
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: '施法台词' })
  let state = addStoryboardGroup({ ...defaultPersonalSpaceState, assets: [effect, voice] }, '战斗开场')
  const groupId = state.storyboardGroups[0]!.id

  state = updatePersonalSpaceAsset(state, effect.id, { linkedVoiceAssetIds: [voice.id] })
  state = assignVoiceToStoryboardGroup(state, groupId, voice.id, '看我的火球！')
  const exported = exportStoryboardReference(state, groupId)

  assert.deepEqual(state.assets.find((item) => item.id === effect.id)!.linkedVoiceAssetIds, [voice.id])
  assert.deepEqual(exported.dialogue.map((item) => item.text), ['看我的火球！'])
  assert.deepEqual(exported.dialogue.map((item) => item.order), [0])
  assert.equal(exported.dialogue[0]!.voiceAsset.name, '施法台词')
})

test('storyboard voice entries can store microsecond start offsets', () => {
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: '提前播放' })
  let state = addStoryboardGroup({ ...defaultPersonalSpaceState, assets: [voice] }, '开场')
  const groupId = state.storyboardGroups[0]!.id

  state = assignVoiceToStoryboardGroup(state, groupId, voice.id, '提前', -200000)

  assert.equal(state.storyboardGroups[0]!.voiceEntries[0]!.startOffsetUs, -200000)
})

test('storyboard voice entries can be reordered inside a group', () => {
  const first = createPersonalSpaceAsset({ kind: 'voice', name: '第一句' })
  const second = createPersonalSpaceAsset({ kind: 'voice', name: '第二句' })
  let state = addStoryboardGroup({ ...defaultPersonalSpaceState, assets: [first, second] }, '开场')
  const groupId = state.storyboardGroups[0]!.id

  state = assignVoiceToStoryboardGroup(state, groupId, first.id, '先说')
  state = assignVoiceToStoryboardGroup(state, groupId, second.id, '后说')
  state = reorderStoryboardVoice(state, groupId, second.id, 'up')

  const exported = exportStoryboardReference(state, groupId)
  assert.deepEqual(exported.dialogue.map((entry) => entry.voiceAsset.name), ['第二句', '第一句'])
  assert.deepEqual(exported.dialogue.map((entry) => entry.order), [0, 1])
})

test('storyboard voice entries can be moved to an exact drop position', () => {
  const first = createPersonalSpaceAsset({ kind: 'voice', name: '第一句' })
  const second = createPersonalSpaceAsset({ kind: 'voice', name: '第二句' })
  const third = createPersonalSpaceAsset({ kind: 'voice', name: '第三句' })
  let state = addStoryboardGroup({ ...defaultPersonalSpaceState, assets: [first, second, third] }, '开场')
  const groupId = state.storyboardGroups[0]!.id

  state = assignVoiceToStoryboardGroup(state, groupId, first.id, '一')
  state = assignVoiceToStoryboardGroup(state, groupId, second.id, '二')
  state = assignVoiceToStoryboardGroup(state, groupId, third.id, '三')
  state = moveStoryboardVoice(state, groupId, first.id, third.id)

  const exported = exportStoryboardReference(state, groupId)
  assert.deepEqual(exported.dialogue.map((entry) => entry.voiceAsset.name), ['第二句', '第三句', '第一句'])
  assert.deepEqual(exported.dialogue.map((entry) => entry.order), [0, 1, 2])
})

test('storyboard voice entries can be moved before the first entry', () => {
  const first = createPersonalSpaceAsset({ kind: 'voice', name: '第一句' })
  const second = createPersonalSpaceAsset({ kind: 'voice', name: '第二句' })
  const third = createPersonalSpaceAsset({ kind: 'voice', name: '第三句' })
  let state = addStoryboardGroup({ ...defaultPersonalSpaceState, assets: [first, second, third] }, '开场')
  const groupId = state.storyboardGroups[0]!.id

  state = assignVoiceToStoryboardGroup(state, groupId, first.id, '一')
  state = assignVoiceToStoryboardGroup(state, groupId, second.id, '二')
  state = assignVoiceToStoryboardGroup(state, groupId, third.id, '三')
  state = moveStoryboardVoice(state, groupId, third.id, first.id, 'before')

  const exported = exportStoryboardReference(state, groupId)
  assert.deepEqual(exported.dialogue.map((entry) => entry.voiceAsset.name), ['第三句', '第一句', '第二句'])
  assert.deepEqual(exported.dialogue.map((entry) => entry.order), [0, 1, 2])
})

test('storyboard groups derive linked characters from voices and can remove voice links', () => {
  let state = addCharacterProfile(defaultPersonalSpaceState, '商人')
  state = addCharacterProfile(state, '骑士')
  const merchant = state.characters[0]!
  const knight = state.characters[1]!
  const first = createPersonalSpaceAsset({ kind: 'voice', name: '第一句', linkedCharacterIds: [merchant.id] })
  const second = createPersonalSpaceAsset({ kind: 'voice', name: '第二句', linkedCharacterIds: [merchant.id, knight.id] })
  state = addStoryboardGroup({ ...state, assets: [first, second] }, '开场')
  const groupId = state.storyboardGroups[0]!.id

  state = assignVoiceToStoryboardGroup(state, groupId, first.id, '你好')
  state = assignVoiceToStoryboardGroup(state, groupId, second.id, '出发')
  assert.deepEqual(getStoryboardLinkedCharacterIds(state, groupId), [merchant.id, knight.id])

  state = unassignVoiceFromStoryboardGroup(state, groupId, first.id)
  const exported = exportStoryboardReference(state, groupId)

  assert.deepEqual(state.storyboardGroups[0]!.voiceAssetIds, [second.id])
  assert.deepEqual(state.assets.find((asset) => asset.id === first.id)!.linkedStoryboardIds, [])
  assert.deepEqual(exported.characters.map((character) => character.name), ['商人', '骑士'])
})
