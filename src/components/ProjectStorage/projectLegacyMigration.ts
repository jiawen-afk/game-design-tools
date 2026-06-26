import { createProjectStorageId } from './projectId'
import { sanitizeObjectKeyPart } from './projectStorageModel'
import { migrateLegacyAssetsToProjectRows } from './projectLegacyAssetMigration'
import type {
  Asset,
  AssetGroup,
  AssetRelation,
  Character,
  CharacterAssetLink,
  DocumentCollection,
  DocumentEdge,
  DocumentEdgeRecordLink,
  DocumentImportRun,
  DocumentNode,
  DocumentNodeRecordLink,
  DocumentRecord,
  DocumentSource,
  Project,
  ProjectAssetGroupKind,
  ProjectSettings,
  StoryboardGroup,
  StoryboardVoiceEntry,
} from './projectStorageTypes'
import { defaultPersonalSpaceState, type PersonalSpaceAsset, type PersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

export interface LegacyMigrationOptions {
  projectId: string
  projectName: string
  now: string
  localObjectRoot: string
  preserveSourceIds?: boolean
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
  documentCollections: DocumentCollection[]
  documentSources: DocumentSource[]
  documentRecords: DocumentRecord[]
  documentNodes: DocumentNode[]
  documentEdges: DocumentEdge[]
  documentNodeRecordLinks: DocumentNodeRecordLink[]
  documentEdgeRecordLinks: DocumentEdgeRecordLink[]
  documentImportRuns: DocumentImportRun[]
}

function createIdMap(sourceIds: string[], preserveSourceIds = false) {
  return new Map(sourceIds.map((sourceId) => [sourceId, preserveSourceIds ? sourceId : createProjectStorageId()]))
}

function mappedId(map: Map<string, string>, sourceId: string) {
  return map.get(sourceId) ?? sourceId
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
    object_key_prefix: `objects/${sanitizeObjectKeyPart(options.projectName)}`,
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

  const assetIdMap = createIdMap(state.assets.map((asset) => asset.id), options.preserveSourceIds)
  const characterIdMap = createIdMap(state.characters.map((character) => character.id), options.preserveSourceIds)
  const storyboardIdMap = createIdMap(state.storyboardGroups.map((group) => group.id), options.preserveSourceIds)

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
  const assets = migrateLegacyAssetsToProjectRows({
    assets: state.assets,
    assetGroups,
    assetIdMap,
    projectId: options.projectId,
    projectName: options.projectName,
    now: options.now,
    preserveSourceIds: options.preserveSourceIds,
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
    documentCollections: [],
    documentSources: [],
    documentRecords: [],
    documentNodes: [],
    documentEdges: [],
    documentNodeRecordLinks: [],
    documentEdgeRecordLinks: [],
    documentImportRuns: [],
  }
}

function groupNameById(rows: LegacyProjectRows) {
  return new Map(rows.assetGroups.map((group) => [group.id, group.name]))
}

function sortedByOrder<T extends { sort_order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sort_order - right.sort_order)
}

function idsUniqueInOrder(ids: string[]) {
  return Array.from(new Set(ids))
}

function restoreAssetGroups(rows: LegacyProjectRows): PersonalSpaceState['assetGroups'] {
  return {
    image: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'image')).map((group) => group.name),
    sprite: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'sprite')).map((group) => group.name),
    voice: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'voice')).map((group) => group.name),
  }
}

function restoreStarredAssetGroups(rows: LegacyProjectRows): PersonalSpaceState['starredAssetGroups'] {
  return {
    image: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'image' && group.starred)).map((group) => group.name),
    sprite: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'sprite' && group.starred)).map((group) => group.name),
    voice: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'voice' && group.starred)).map((group) => group.name),
  }
}

function restoreAssets(rows: LegacyProjectRows): PersonalSpaceAsset[] {
  const groupNames = groupNameById(rows)
  return rows.assets.map((asset): PersonalSpaceAsset => {
    const characterIds = rows.characterAssetLinks
      .filter((link) => link.asset_id === asset.id)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((link) => link.character_id)
    const storyboardIds = rows.storyboardVoiceEntries
      .filter((entry) => entry.asset_id === asset.id)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((entry) => entry.storyboard_id)
    const linkedVoiceAssetIds = rows.assetRelations
      .filter((relation) => relation.source_asset_id === asset.id && relation.relation_type === 'effect_voice')
      .map((relation) => relation.target_asset_id)
    const resourcePaths = [
      asset.primary_object_key,
      ...(asset.sprite_index_object_key ? [asset.sprite_index_object_key] : []),
    ]
    const projectResourceIds = [
      asset.primary_resource_id,
      ...(asset.sprite_index_resource_id ? [asset.sprite_index_resource_id] : []),
    ]
    const projectResourceSizes = [
      asset.primary_size_bytes,
      ...(asset.sprite_index_resource_id ? [asset.sprite_index_size_bytes] : []),
    ]
    const projectResourceHashes = [
      asset.primary_hash_sha256,
      ...(asset.sprite_index_resource_id ? [asset.sprite_index_hash_sha256] : []),
    ]
    const projectResourceMimeTypes = [
      asset.primary_mime_type,
      ...(asset.sprite_index_resource_id ? [asset.sprite_index_mime_type] : []),
    ]
    const coverObjectKey = asset.cover_object_key ?? undefined
    return {
      id: asset.id,
      kind: asset.kind,
      assetSubtype: asset.asset_subtype,
      name: asset.name,
      groupName: asset.group_id ? groupNames.get(asset.group_id) ?? '默认分组' : '默认分组',
      dialogueText: asset.dialogue_text ?? undefined,
      resourcePaths,
      createdAt: asset.created_at,
      linkedCharacterIds: idsUniqueInOrder(characterIds),
      linkedStoryboardIds: idsUniqueInOrder(storyboardIds),
      linkedVoiceAssetIds: idsUniqueInOrder(linkedVoiceAssetIds),
      storageResourcePaths: resourcePaths,
      projectResourceIds,
      projectResourceSizes,
      projectResourceHashes,
      projectResourceMimeTypes,
      coverResourcePath: coverObjectKey,
      coverStorageResourcePath: coverObjectKey,
      coverProjectResourceId: asset.cover_resource_id,
      coverProjectResourceSize: asset.cover_size_bytes,
      coverProjectResourceHash: asset.cover_hash_sha256,
      coverProjectResourceMimeType: asset.cover_mime_type,
      sourceKey: asset.source_key ?? undefined,
    }
  })
}

function restoreCharacters(rows: LegacyProjectRows): PersonalSpaceState['characters'] {
  return sortedByOrder(rows.characters).map((character) => {
    const links = sortedByOrder(rows.characterAssetLinks.filter((link) => link.character_id === character.id))
    const portraitAssets = links
      .filter((link) => link.column_kind === 'portrait')
      .map((link) => ({ assetId: link.asset_id, order: link.sort_order }))
    const spriteAssets = links
      .filter((link) => link.column_kind === 'sprite')
      .map((link) => ({ assetId: link.asset_id, order: link.sort_order }))
    const voiceAssets = links
      .filter((link) => link.column_kind === 'voice')
      .map((link) => ({ assetId: link.asset_id, order: link.sort_order }))
    return {
      id: character.id,
      name: character.name,
      order: character.sort_order,
      starred: character.starred,
      portraitAssets,
      spriteAssets,
      voiceAssets,
      portraitAssetIds: portraitAssets.map((link) => link.assetId),
      spriteAssetIds: spriteAssets.map((link) => link.assetId),
      voiceAssetIds: voiceAssets.map((link) => link.assetId),
    }
  })
}

function restoreStoryboardGroups(rows: LegacyProjectRows): PersonalSpaceState['storyboardGroups'] {
  return rows.storyboardGroups.map((group) => {
    const entries = sortedByOrder(rows.storyboardVoiceEntries.filter((entry) => entry.storyboard_id === group.id))
    const characterIds = idsUniqueInOrder(entries.flatMap((entry) => entry.character_id ? [entry.character_id] : []))
    return {
      id: group.id,
      name: group.name,
      starred: group.starred,
      voiceEntries: entries.map((entry) => ({
        assetId: entry.asset_id,
        text: entry.text,
        startOffsetUs: entry.start_offset_us,
        order: entry.sort_order,
      })),
      characterIds,
      voiceAssetIds: entries.map((entry) => entry.asset_id),
    }
  })
}

export function restoreProjectRowsToPersonalSpaceState(rows: LegacyProjectRows): PersonalSpaceState {
  return {
    ...defaultPersonalSpaceState,
    settings: {
      ...defaultPersonalSpaceState.settings,
      storageDirectory: rows.settings.local_object_root ?? '',
    },
    assetGroups: restoreAssetGroups(rows),
    starredAssetGroups: restoreStarredAssetGroups(rows),
    characters: restoreCharacters(rows),
    assets: restoreAssets(rows),
    storyboardGroups: restoreStoryboardGroups(rows),
    pendingDeletedResourcePaths: [],
  }
}
