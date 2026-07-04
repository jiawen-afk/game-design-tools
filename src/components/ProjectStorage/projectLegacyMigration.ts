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
  DocumentSourceContent,
  Project,
  ProjectAssetGroupKind,
  ProjectSettings,
  StoryboardGroup,
  StoryboardVoiceEntry,
} from './projectStorageTypes'
import type { PersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

export { restoreProjectRowsToPersonalSpaceState } from './projectLegacyRestore'

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
  documentCollections?: DocumentCollection[]
  documentSources?: DocumentSource[]
  documentSourceContents?: DocumentSourceContent[]
  documentRecords?: DocumentRecord[]
  documentNodes?: DocumentNode[]
  documentEdges?: DocumentEdge[]
  documentNodeRecordLinks?: DocumentNodeRecordLink[]
  documentEdgeRecordLinks?: DocumentEdgeRecordLink[]
  documentImportRuns?: DocumentImportRun[]
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
    [
      ...asset.linkedVoiceAssetIds.map((voiceAssetId): AssetRelation => ({
      id: createProjectStorageId(),
      project_id: options.projectId,
      source_asset_id: mappedId(assetIdMap, asset.id),
      target_asset_id: mappedId(assetIdMap, voiceAssetId),
      relation_type: 'effect_voice',
      created_at: options.now,
      })),
      ...asset.linkedSpriteAssetIds.map((spriteAssetId): AssetRelation => ({
        id: createProjectStorageId(),
        project_id: options.projectId,
        source_asset_id: mappedId(assetIdMap, asset.id),
        target_asset_id: mappedId(assetIdMap, spriteAssetId),
        relation_type: 'sound_sprite',
        created_at: options.now,
      })),
    ]
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
    documentSourceContents: [],
    documentRecords: [],
    documentNodes: [],
    documentEdges: [],
    documentNodeRecordLinks: [],
    documentEdgeRecordLinks: [],
    documentImportRuns: [],
  }
}
