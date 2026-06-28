import {
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
  updatePersonalSpaceAsset,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows, type LegacyProjectRows } from './projectLegacyMigration'
import { createMemoryProjectRepository } from './projectSqliteRepository'

type MigrationAsset = ReturnType<typeof createPersonalSpaceAsset>
type MemoryRepository = ReturnType<typeof createMemoryProjectRepository>

export async function createMigrationRepositories() {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
  return { local, remote }
}

export function createMigrationVoiceAsset(options: {
  dialogueText?: string
  resourcePaths?: string[]
} = {}) {
  return createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    dialogueText: options.dialogueText,
    resourcePaths: options.resourcePaths ?? ['welcome.wav'],
  })
}

export function createMigrationSpriteAsset() {
  return createPersonalSpaceAsset({
    kind: 'sprite',
    assetSubtype: 'character_sprite',
    name: '行走',
    resourcePaths: ['walk.png', 'index.json'],
  })
}

export function createMigrationImageAsset() {
  return createPersonalSpaceAsset({
    kind: 'image',
    assetSubtype: 'effect',
    name: '火球',
    groupName: '特效',
    resourcePaths: ['fire.png'],
  })
}

export function createMigrationImageAssetWithCover() {
  return {
    ...createMigrationImageAsset(),
    coverResourcePath: 'fire-cover.png',
    coverStorageResourcePath: 'ProjectRoot/图片/2026-06-23/fire-cover.png',
  }
}

export function createMigrationRows(assets: MigrationAsset[]): LegacyProjectRows {
  return migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
}

export function createLinkedStoryboardMigrationRows() {
  const voice = createMigrationVoiceAsset({ dialogueText: '欢迎来到我的商店。' })
  const effect = createMigrationImageAsset()
  let state = {
    ...defaultPersonalSpaceState,
    assetGroups: { image: ['默认分组', '特效'], sprite: ['默认分组'], voice: ['默认分组'] },
    assets: [voice, effect],
  }
  state = addCharacterProfile(state, '商人')
  state = addStoryboardGroup(state, '开场')
  state = assignAssetToCharacterColumn(state, state.characters[0]!.id, voice.id, 'voice')
  state = assignVoiceToStoryboardGroup(state, state.storyboardGroups[0]!.id, voice.id, '欢迎', -200000)
  state = updatePersonalSpaceAsset(state, effect.id, { linkedVoiceAssetIds: [voice.id] })
  return migratePersonalSpaceStateToProjectRows(state, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
}

export async function importLocalRows(repository: MemoryRepository, rows: LegacyProjectRows) {
  await repository.importProjectRows(rows)
  return rows
}
