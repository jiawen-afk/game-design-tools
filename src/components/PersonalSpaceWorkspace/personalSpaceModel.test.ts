import test from 'node:test'
import assert from 'node:assert/strict'

import { defaultVoiceGenerationParams, type VoiceGenerationRecord } from '../VoiceDeploymentWorkspace/voiceDeploymentModel'
import {
  addCharacterProfile,
  addAssetGroup,
  addStoryboardGroup,
  archiveAssetForStorageDirectory,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  createPortraitAssetFromUpload,
  createResourceAssetFromUpload,
  createSpriteAssetFromExport,
  createVoiceAssetFromRecord,
  defaultPersonalSpaceState,
  deletePersonalSpaceAsset,
  deleteAssetGroup,
  exportStoryboardReference,
  getStoryboardLinkedCharacterIds,
  storyboardReferenceFileName,
  moveCharacterVoice,
  moveStoryboardVoice,
  personalSpaceStorageKey,
  readPersonalSpaceState,
  reorderCharacterProfile,
  reorderCharacterVoice,
  reorderStoryboardVoice,
  renameAssetGroup,
  renameCharacterProfile,
  transferAssetGroup,
  updatePersonalSpaceAsset,
  updateCharacterAssetNote,
  unassignAssetFromCharacterColumn,
  unassignVoiceFromStoryboardGroup,
  updateStoryboardVoiceNote,
} from './personalSpaceModel'

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

test('creates personal space voice asset from a generated voice record', () => {
  const record: VoiceGenerationRecord = {
    id: 'voice-1',
    name: '商人问候',
    createdAt: '2026-06-05T00:00:00.000Z',
    audioUrl: 'http://127.0.0.1/audio.wav',
    audioPath: 'C:\\temp\\audio.wav',
    params: {
      ...defaultVoiceGenerationParams,
      text: '欢迎来到我的商店。',
    },
  }

  const asset = createVoiceAssetFromRecord(record)

  assert.equal(asset.kind, 'voice')
  assert.equal(asset.name, '商人问候')
  assert.equal(asset.dialogueText, '欢迎来到我的商店。')
  assert.deepEqual(asset.resourcePaths, ['C:\\temp\\audio.wav'])
  assert.deepEqual(asset.tags, ['配音'])
})

test('creates personal space sprite asset from exported sprite files', () => {
  const asset = createSpriteAssetFromExport({
    name: '主角行走',
    spritePath: 'D:\\assets\\sprite.png',
    indexPath: 'D:\\assets\\index.json',
    tags: ['角色精灵图', '行走'],
  })

  assert.equal(asset.kind, 'sprite')
  assert.equal(asset.name, '主角行走')
  assert.deepEqual(asset.resourcePaths, ['D:\\assets\\sprite.png', 'D:\\assets\\index.json'])
  assert.deepEqual(asset.tags, ['角色精灵图', '行走'])
})

test('creates portrait assets from uploaded character portraits', () => {
  const asset = createPortraitAssetFromUpload({
    name: 'hero-face.png',
    portraitPath: 'blob:portrait',
    tags: ['正面', '笑脸'],
  })

  assert.equal(asset.kind, 'image')
  assert.equal(asset.name, 'hero-face.png')
  assert.equal(asset.groupName, '角色肖像')
  assert.deepEqual(asset.resourcePaths, ['blob:portrait'])
  assert.deepEqual(asset.tags, ['肖像', '正面', '笑脸'])
})

test('creates imported resource assets with original file names and unified kinds', () => {
  const image = createResourceAssetFromUpload({
    kind: 'image',
    name: 'forest.png',
    resourcePath: 'blob:forest',
  })
  const sprite = createResourceAssetFromUpload({
    kind: 'sprite',
    name: 'fire.webm',
    resourcePath: 'blob:fire',
    tags: ['特效精灵图'],
  })
  const voice = createResourceAssetFromUpload({
    kind: 'voice',
    name: 'hello.wav',
    resourcePath: 'blob:hello',
  })

  assert.equal(image.kind, 'image')
  assert.equal(sprite.kind, 'sprite')
  assert.equal(voice.kind, 'voice')
  assert.equal(image.name, 'forest.png')
  assert.equal(sprite.name, 'fire.webm')
  assert.equal(voice.name, 'hello.wav')
  assert.equal(image.groupName, '默认分组')
  assert.equal(sprite.groupName, '默认分组')
  assert.equal(voice.groupName, '默认分组')
  assert.deepEqual(image.tags, ['图片'])
  assert.deepEqual(sprite.tags, ['精灵图', '特效精灵图'])
  assert.deepEqual(voice.tags, ['配音'])
})

test('personal space assets default to a named group', () => {
  const asset = createPersonalSpaceAsset({ kind: 'sprite', name: '火焰爆炸' })

  assert.equal(asset.groupName, '默认分组')
  assert.deepEqual(asset.linkedVoiceAssetIds, [])
})

test('asset groups can be created, renamed, transferred, and protected from deleting the last group', () => {
  const first = createPersonalSpaceAsset({ kind: 'image', name: 'forest.png', groupName: '地图' })
  const second = createPersonalSpaceAsset({ kind: 'image', name: 'town.png', groupName: '城镇' })
  let state = { ...defaultPersonalSpaceState, assets: [first, second] }

  state = addAssetGroup(state, 'image', '参考')
  assert.deepEqual(state.assetGroups.image, ['默认分组', '地图', '城镇', '参考'])

  state = renameAssetGroup(state, 'image', '地图', '场景')
  assert.equal(state.assets[0]!.groupName, '场景')
  assert.ok(state.assetGroups.image.includes('场景'))

  state = transferAssetGroup(state, 'image', '城镇', '场景')
  assert.deepEqual(state.assets.map((asset) => asset.groupName), ['场景', '场景'])

  state = deleteAssetGroup(state, 'image', '场景', { deleteAssets: true })
  assert.deepEqual(state.assets, [])
  assert.ok(state.assetGroups.image.includes('默认分组'))
  state = deleteAssetGroup(state, 'image', '参考', { deleteAssets: true })
  assert.throws(
    () => deleteAssetGroup(state, 'image', '默认分组', { deleteAssets: true }),
    /至少保留一个分组/,
  )
})

test('character profiles can be created, renamed, sorted, and deleted without mutating state', () => {
  const initial = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [] }, '商人')
  const second = addCharacterProfile(initial, '骑士')
  const renamed = renameCharacterProfile(second, second.characters[0]!.id, '杂货商')
  const reordered = reorderCharacterProfile(renamed, second.characters[1]!.id, 'up')

  assert.deepEqual(initial.characters.map((item) => item.name), ['商人'])
  assert.deepEqual(renamed.characters.map((item) => item.name), ['杂货商', '骑士'])
  assert.deepEqual(reordered.characters.map((item) => item.name), ['骑士', '杂货商'])
  assert.deepEqual(reordered.characters.map((item) => item.order), [0, 1])
})

test('common assets can be updated and deleted while removing links from characters and storyboards', () => {
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: '问候', linkedCharacterIds: ['c1'], linkedStoryboardIds: ['s1'] })
  const state = {
    ...defaultPersonalSpaceState,
    characters: [{
      id: 'c1',
      name: '商人',
      order: 0,
      portraitAssets: [],
      spriteAssets: [],
      voiceAssets: [{ assetId: voice.id, tags: [], order: 0 }],
      portraitAssetIds: [],
      spriteAssetIds: [],
      voiceAssetIds: [voice.id],
    }],
    assets: [voice],
    storyboardGroups: [{ id: 's1', name: '开场', voiceEntries: [{ assetId: voice.id, text: '', order: 0 }], characterIds: ['c1'], voiceAssetIds: [voice.id] }],
  }

  const updated = updatePersonalSpaceAsset(state, voice.id, { groupName: 'NPC 配音', tags: ['商人', '欢迎'] })
  const deleted = deletePersonalSpaceAsset(updated, voice.id)

  assert.deepEqual(updated.assets[0]!.tags, ['商人', '欢迎'])
  assert.equal(updated.assets[0]!.groupName, 'NPC 配音')
  assert.deepEqual(deleted.assets, [])
  assert.deepEqual(deleted.characters[0]!.voiceAssetIds, [])
  assert.deepEqual(deleted.storyboardGroups[0]!.voiceAssetIds, [])
})

test('deleting a voice asset removes effect voice links that point to it', () => {
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: '问候' })
  const effect = createPersonalSpaceAsset({ kind: 'effect', name: '闪光', linkedVoiceAssetIds: [voice.id] })
  const state = {
    ...defaultPersonalSpaceState,
    assets: [voice, effect],
  }

  const deleted = deletePersonalSpaceAsset(state, voice.id)

  assert.deepEqual(deleted.assets.map((asset) => asset.id), [effect.id])
  assert.deepEqual(deleted.assets[0]!.linkedVoiceAssetIds, [])
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
    storyboardGroups: [{ ...group, voiceEntries: [{ assetId: voice.id, text: '', order: 0 }], characterIds: [character.id], voiceAssetIds: [voice.id] }],
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

test('character columns keep tagged portrait, sprite, and voice asset order', () => {
  const portrait = createPersonalSpaceAsset({ kind: 'map', name: '肖像' })
  const sprite = createPersonalSpaceAsset({ kind: 'sprite', name: '行走图' })
  const hello = createPersonalSpaceAsset({ kind: 'voice', name: '问候' })
  const attack = createPersonalSpaceAsset({ kind: 'voice', name: '攻击' })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [portrait, sprite, hello, attack] }, '主角')
  const characterId = state.characters[0]!.id

  state = assignAssetToCharacterColumn(state, characterId, portrait.id, 'portrait', ['头像', '正面'])
  state = assignAssetToCharacterColumn(state, characterId, sprite.id, 'sprite', ['下走', '奔跑'])
  state = assignAssetToCharacterColumn(state, characterId, hello.id, 'voice', ['问候'])
  state = assignAssetToCharacterColumn(state, characterId, attack.id, 'voice', ['攻击'])
  state = reorderCharacterVoice(state, characterId, attack.id, 'up')

  assert.deepEqual(state.characters[0]!.portraitAssets.map((item) => item.tags), [['头像', '正面']])
  assert.deepEqual(state.characters[0]!.spriteAssets.map((item) => item.tags), [['下走', '奔跑']])
  assert.deepEqual(state.characters[0]!.voiceAssets.map((item) => item.assetId), [attack.id, hello.id])
  assert.deepEqual(state.assets.find((item) => item.id === sprite.id)!.linkedCharacterIds, [characterId])
})

test('character asset links can be removed and voice links can be drag-sorted', () => {
  const portrait = createPersonalSpaceAsset({ kind: 'image', name: '肖像' })
  const hello = createPersonalSpaceAsset({ kind: 'voice', name: '问候' })
  const attack = createPersonalSpaceAsset({ kind: 'voice', name: '攻击' })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [portrait, hello, attack] }, '主角')
  const characterId = state.characters[0]!.id

  state = assignAssetToCharacterColumn(state, characterId, portrait.id, 'portrait', ['肖像'])
  state = assignAssetToCharacterColumn(state, characterId, hello.id, 'voice', ['问候'])
  state = assignAssetToCharacterColumn(state, characterId, attack.id, 'voice', ['攻击'])
  state = moveCharacterVoice(state, characterId, hello.id, attack.id)
  state = unassignAssetFromCharacterColumn(state, characterId, portrait.id, 'portrait')

  assert.deepEqual(state.characters[0]!.portraitAssetIds, [])
  assert.deepEqual(state.characters[0]!.voiceAssetIds, [attack.id, hello.id])
  assert.deepEqual(state.assets.find((asset) => asset.id === portrait.id)!.linkedCharacterIds, [])
})

test('image effect assets can link voice assets, and storyboard voice entries export dialogue order', () => {
  const effect = createPersonalSpaceAsset({ kind: 'image', name: '火球', tags: ['特效'] })
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

test('character and storyboard asset links keep independent note names for the same asset', () => {
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: 'line.wav' })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [voice] }, '商人')
  state = addStoryboardGroup(state, '开场')
  const characterId = state.characters[0]!.id
  const storyboardId = state.storyboardGroups[0]!.id

  state = assignAssetToCharacterColumn(state, characterId, voice.id, 'voice', [])
  state = assignVoiceToStoryboardGroup(state, storyboardId, voice.id, '')
  state = updateCharacterAssetNote(state, characterId, voice.id, 'voice', '商人问候')
  state = updateStoryboardVoiceNote(state, storyboardId, voice.id, '开场第一句')

  assert.equal(state.assets[0]!.name, 'line.wav')
  assert.equal(state.characters[0]!.voiceAssets[0]!.noteName, '商人问候')
  assert.equal(state.storyboardGroups[0]!.voiceEntries[0]!.noteName, '开场第一句')
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

test('stored personal space state migrates legacy character and storyboard asset id lists', () => {
  const storage = createMemoryStorage({
    [personalSpaceStorageKey]: JSON.stringify({
      settings: { storageDirectory: 'D:\\assets', deleteResourcesWithContent: true },
      assets: [createPersonalSpaceAsset({ kind: 'voice', name: '旧配音' })],
      characters: [{
        id: 'c1',
        name: '旧角色',
        order: 0,
        portraitAssetIds: ['p1'],
        spriteAssetIds: ['s1'],
        voiceAssetIds: ['v1'],
      }],
      storyboardGroups: [{
        id: 'g1',
        name: '旧剧情',
        characterIds: ['c1'],
        voiceAssetIds: ['v1'],
      }],
    }),
  })

  const state = readPersonalSpaceState(storage)

  assert.deepEqual(state.characters[0]!.portraitAssets.map((item) => item.assetId), ['p1'])
  assert.deepEqual(state.characters[0]!.spriteAssets.map((item) => item.assetId), ['s1'])
  assert.deepEqual(state.characters[0]!.voiceAssets.map((item) => item.assetId), ['v1'])
  assert.deepEqual(state.storyboardGroups[0]!.voiceEntries.map((item) => item.assetId), ['v1'])
})

test('assets archived with a storage directory receive categorized target paths', () => {
  const sprite = {
    ...createSpriteAssetFromExport({
      name: 'hero.png',
      spritePath: 'blob:sprite',
      indexPath: 'blob:index',
    }),
    createdAt: '2026-06-06T12:00:00.000Z',
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
    assets: [],
  }

  const archived = archiveAssetForStorageDirectory(state, sprite)

  assert.equal(archived.storageResourcePaths.length, 2)
  assert.match(archived.storageResourcePaths[0]!, /^D:\\GameAssets\\精灵图\\2026-06-06\\[a-f0-9]{16}\.png$/)
  assert.match(archived.storageResourcePaths[1]!, /^D:\\GameAssets\\精灵图\\2026-06-06\\[a-f0-9]{16}\.json$/)
  assert.doesNotMatch(archived.storageResourcePaths.join('\n'), /hero|index/)
})

test('portrait assets archived with a storage directory use the character portrait category', () => {
  const portrait = {
    ...createPortraitAssetFromUpload({
      name: 'hero-face.png',
      portraitPath: 'blob:portrait',
    }),
    createdAt: '2026-06-06T12:00:00.000Z',
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
    assets: [],
  }

  const archived = archiveAssetForStorageDirectory(state, portrait)

  assert.equal(archived.name, 'hero-face.png')
  assert.equal(archived.storageResourcePaths.length, 1)
  assert.match(archived.storageResourcePaths[0]!, /^D:\\GameAssets\\角色肖像\\2026-06-06\\[a-f0-9]{16}\.png$/)
  assert.doesNotMatch(archived.storageResourcePaths[0]!, /hero-face/)
})

test('deleting assets with resource deletion enabled records stored resource paths for cleanup', () => {
  const voice = {
    ...createPersonalSpaceAsset({ kind: 'voice', name: '问候' }),
    storageResourcePaths: ['D:\\GameAssets\\配音素材\\问候\\audio.wav'],
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: true },
    assets: [voice],
    pendingDeletedResourcePaths: [],
  }

  const deleted = deletePersonalSpaceAsset(state, voice.id)

  assert.deepEqual(deleted.assets, [])
  assert.deepEqual(deleted.pendingDeletedResourcePaths, ['D:\\GameAssets\\配音素材\\问候\\audio.wav'])
})

test('deleting assets after resource cleanup removes links without recording pending cleanup', () => {
  const voice = {
    ...createPersonalSpaceAsset({ kind: 'voice', name: '问候' }),
    storageResourcePaths: ['D:\\GameAssets\\配音素材\\问候\\audio.wav'],
  }
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: true },
    assets: [voice],
    pendingDeletedResourcePaths: [],
  }

  const deleted = deletePersonalSpaceAsset(state, voice.id, { resourcesDeleted: true })

  assert.deepEqual(deleted.assets, [])
  assert.deepEqual(deleted.pendingDeletedResourcePaths, [])
})
