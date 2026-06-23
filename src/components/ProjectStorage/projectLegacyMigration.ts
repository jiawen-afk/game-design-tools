import { createProjectStorageId } from './projectId'
import { createAssetResourceFields } from './projectStorageModel'
import type {
  Asset,
  AssetGroup,
  AssetRelation,
  Character,
  CharacterAssetLink,
  Project,
  ProjectAssetGroupKind,
  ProjectSettings,
  StoryboardGroup,
  StoryboardVoiceEntry,
} from './projectStorageTypes'
import type { PersonalSpaceAsset, PersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

export interface LegacyMigrationOptions {
  projectId: string
  projectName: string
  now: string
  localObjectRoot: string
}

export interface LegacyProjectRows {
  project: Project
  settings: ProjectSettings
  assetGroups: AssetGroup[]
  assets: Asset[]
  characters: Character[]
  characterAssetLinks: CharacterAssetLink[]
  storyboardGroups: StoryboardGroup[]
  storyboardVoiceEntries: StoryboardVoiceEntry[]
  assetRelations: AssetRelation[]
}

function mimeTypeForAsset(asset: PersonalSpaceAsset, index: number) {
  if (asset.kind === 'voice') return 'audio/wav'
  if (asset.kind === 'sprite' && index === 1) return 'application/json'
  return 'image/png'
}

function fileNameFromPath(path: string, fallback: string) {
  return path.split(/[\\/]/).pop()?.trim() || fallback
}

function createIdMap(sourceIds: string[]) {
  return new Map(sourceIds.map((sourceId) => [sourceId, createProjectStorageId()]))
}

function mappedId(map: Map<string, string>, sourceId: string) {
  return map.get(sourceId) ?? sourceId
}

function assetGroupKey(kind: ProjectAssetGroupKind, name: string) {
  return `${kind}\u0000${name}`
}

function findPrimaryPath(asset: PersonalSpaceAsset) {
  return asset.storageResourcePaths[0] ?? asset.resourcePaths[0] ?? asset.name
}

function findSpriteIndexPath(asset: PersonalSpaceAsset) {
  if (asset.kind !== 'sprite') return undefined
  return asset.storageResourcePaths[1] ?? asset.resourcePaths[1]
}

export function migratePersonalSpaceStateToProjectRows(
  state: PersonalSpaceState,
  options: LegacyMigrationOptions,
): LegacyProjectRows {
  const project: Project = {
    id: options.projectId,
    name: options.projectName,
    description: '',
    mode: 'local',
    status: 'active',
    object_key_prefix: `objects/${options.projectId}`,
    created_at: options.now,
    updated_at: options.now,
    metadata_json: null,
  }
  const settings: ProjectSettings = {
    project_id: options.projectId,
    storage_provider: 'local',
    database_provider: 'sqlite',
    local_object_root: options.localObjectRoot,
    remote_database_profile_id: null,
    remote_storage_profile_id: null,
    last_verified_at: null,
    updated_at: options.now,
  }

  const assetIdMap = createIdMap(state.assets.map((asset) => asset.id))
  const characterIdMap = createIdMap(state.characters.map((character) => character.id))
  const storyboardIdMap = createIdMap(state.storyboardGroups.map((group) => group.id))

  const assetGroups = (Object.entries(state.assetGroups) as Array<[ProjectAssetGroupKind, string[]]>).flatMap(([kind, names]) => (
    names.map((name, sortOrder): AssetGroup => ({
      id: createProjectStorageId(),
      project_id: options.projectId,
      kind,
      name,
      starred: state.starredAssetGroups[kind]?.includes(name) ?? false,
      sort_order: sortOrder,
      created_at: options.now,
      updated_at: options.now,
    }))
  ))
  const assetGroupIdByKey = new Map(assetGroups.map((group) => [assetGroupKey(group.kind, group.name), group.id]))

  const assets = state.assets.map((asset): Asset => {
    const primaryPath = findPrimaryPath(asset)
    const spriteIndexPath = findSpriteIndexPath(asset)
    const resources = createAssetResourceFields({
      projectId: options.projectId,
      fileName: fileNameFromPath(primaryPath, asset.name),
      mimeType: mimeTypeForAsset(asset, 0),
      sizeBytes: 0,
      resourceId: createProjectStorageId(),
      spriteIndex: spriteIndexPath ? {
        fileName: fileNameFromPath(spriteIndexPath, 'index.json'),
        mimeType: mimeTypeForAsset(asset, 1),
        sizeBytes: 0,
        resourceId: createProjectStorageId(),
      } : undefined,
    })
    return {
      id: mappedId(assetIdMap, asset.id),
      project_id: options.projectId,
      kind: asset.kind,
      asset_subtype: asset.assetSubtype,
      group_id: assetGroupIdByKey.get(assetGroupKey(asset.kind, asset.groupName)) ?? null,
      name: asset.name,
      dialogue_text: asset.dialogueText ?? null,
      source_key: asset.sourceKey ?? null,
      ...resources,
      sprite_frame_width: null,
      sprite_frame_height: null,
      sprite_sheet_width: null,
      sprite_sheet_height: null,
      sprite_fps: null,
      sprite_frame_count: null,
      created_at: asset.createdAt,
      updated_at: options.now,
      metadata_json: null,
    }
  })

  const characters = state.characters.map((character): Character => ({
    id: mappedId(characterIdMap, character.id),
    project_id: options.projectId,
    name: character.name,
    starred: Boolean(character.starred),
    sort_order: character.order,
    created_at: options.now,
    updated_at: options.now,
  }))

  const characterAssetLinks = state.characters.flatMap((character) => (
    [
      ...character.portraitAssets.map((link) => ({ link, column: 'portrait' as const })),
      ...character.spriteAssets.map((link) => ({ link, column: 'sprite' as const })),
      ...character.voiceAssets.map((link) => ({ link, column: 'voice' as const })),
    ].map(({ link, column }): CharacterAssetLink => ({
      id: createProjectStorageId(),
      project_id: options.projectId,
      character_id: mappedId(characterIdMap, character.id),
      asset_id: mappedId(assetIdMap, link.assetId),
      column_kind: column,
      sort_order: link.order,
      created_at: options.now,
      updated_at: options.now,
    }))
  ))

  const storyboardGroups = state.storyboardGroups.map((group): StoryboardGroup => ({
    id: mappedId(storyboardIdMap, group.id),
    project_id: options.projectId,
    name: group.name,
    starred: Boolean(group.starred),
    created_at: options.now,
    updated_at: options.now,
  }))

  const storyboardVoiceEntries = state.storyboardGroups.flatMap((group) => (
    group.voiceEntries.map((entry): StoryboardVoiceEntry => ({
      id: createProjectStorageId(),
      project_id: options.projectId,
      storyboard_id: mappedId(storyboardIdMap, group.id),
      asset_id: mappedId(assetIdMap, entry.assetId),
      character_id: group.characterIds[0] ? mappedId(characterIdMap, group.characterIds[0]) : null,
      text: entry.text,
      start_offset_us: entry.startOffsetUs,
      sort_order: entry.order,
      created_at: options.now,
      updated_at: options.now,
    }))
  ))

  const assetRelations = state.assets.flatMap((asset) => (
    asset.linkedVoiceAssetIds.map((voiceAssetId): AssetRelation => ({
      id: createProjectStorageId(),
      project_id: options.projectId,
      source_asset_id: mappedId(assetIdMap, asset.id),
      target_asset_id: mappedId(assetIdMap, voiceAssetId),
      relation_type: 'effect_voice',
      created_at: options.now,
    }))
  ))

  return {
    project,
    settings,
    assetGroups,
    assets,
    characters,
    characterAssetLinks,
    storyboardGroups,
    storyboardVoiceEntries,
    assetRelations,
  }
}
