import {
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
  type PersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'

export const semanticIdPrefixPattern = /^(asset|character|storyboard|group|link|relation)[_-]/

export const legacyMigrationOptions = {
  projectId: 'p1',
  projectName: '默认项目',
  now: '2026-06-23T00:00:00.000Z',
  localObjectRoot: 'D:\\GameAssets',
}

export function createLegacyMigrationFixture(options: {
  effectCoverStorageResourcePath?: string
} = {}) {
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      dialogueText: '欢迎来到我的商店。',
      resourcePaths: ['D:\\voice\\welcome.wav'],
    }),
    storageResourcePaths: ['ProjectRoot/配音/2026-06-23/audio.wav'],
  }
  const effect = {
    ...createPersonalSpaceAsset({
      kind: 'image',
      assetSubtype: 'effect',
      name: '火球',
      groupName: '特效',
      resourcePaths: ['D:\\image\\fire.png'],
      linkedVoiceAssetIds: [voice.id],
    }),
    storageResourcePaths: ['ProjectRoot/图片/2026-06-23/fire.png'],
    coverResourcePath: 'blob:fire-cover',
    coverStorageResourcePath: options.effectCoverStorageResourcePath ?? 'ProjectRoot/图片/2026-06-23/fire-cover.webp',
  }
  const state: PersonalSpaceState = {
    ...defaultPersonalSpaceState,
    assetGroups: { image: ['默认分组', '特效'], sprite: ['默认分组'], voice: ['默认分组'], sound: ['默认分组'] },
    starredAssetGroups: { image: ['特效'], sprite: [], voice: [], sound: [] },
    assets: [voice, effect],
    characters: [{
      id: 'character-old-1',
      name: '商人',
      order: 0,
      starred: true,
      portraitAssets: [],
      spriteAssets: [],
      voiceAssets: [{ assetId: voice.id, order: 0 }],
      portraitAssetIds: [],
      spriteAssetIds: [],
      voiceAssetIds: [voice.id],
    }],
    storyboardGroups: [{
      id: 'storyboard-old-1',
      name: '开场',
      starred: true,
      voiceEntries: [{ assetId: voice.id, text: '欢迎', startOffsetUs: -100000, order: 0 }],
      characterIds: ['character-old-1'],
      voiceAssetIds: [voice.id],
    }],
  }

  return { effect, state, voice }
}

export function migrateLegacyFixture(options?: Parameters<typeof createLegacyMigrationFixture>[0]) {
  const fixture = createLegacyMigrationFixture(options)
  const rows = migratePersonalSpaceStateToProjectRows(fixture.state, legacyMigrationOptions)

  return {
    ...fixture,
    rows,
    migratedCharacter: rows.characters[0]!,
    migratedEffect: rows.assets.find((asset) => asset.name === fixture.effect.name)!,
    migratedStoryboard: rows.storyboardGroups[0]!,
    migratedVoice: rows.assets.find((asset) => asset.name === fixture.voice.name)!,
  }
}
