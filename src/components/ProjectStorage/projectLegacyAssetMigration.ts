import { createProjectStorageId } from './projectId'
import {
  createAssetResourceFields,
  fileNameFromProjectObjectKey,
  isProjectObjectKey,
  resourceIdFromProjectObjectKey,
} from './projectStorageModel'
import type { Asset, AssetGroup, ProjectAssetGroupKind } from './projectStorageTypes'
import type { PersonalSpaceAsset } from '../PersonalSpaceWorkspace/personalSpaceModel'

export interface LegacyAssetMigrationInput {
  assets: PersonalSpaceAsset[]
  assetGroups: AssetGroup[]
  assetIdMap: Map<string, string>
  projectId: string
  projectName: string
  now: string
  preserveSourceIds?: boolean
}

function mimeTypeForAsset(asset: PersonalSpaceAsset, index: number) {
  if (asset.kind === 'voice') return 'audio/wav'
  if (asset.kind === 'sprite' && index === 1) return 'application/json'
  return 'image/png'
}

function fileNameFromPath(path: string, fallback: string) {
  return path.split(/[\\/]/).pop()?.trim() || fallback
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

function objectKeyExtension(objectKey: string) {
  return fileNameFromProjectObjectKey(objectKey, '').match(/\.[^.\\/]+$/)?.[0] ?? ''
}

export function migrateLegacyAssetsToProjectRows(input: LegacyAssetMigrationInput): Asset[] {
  const assetGroupIdByKey = new Map(input.assetGroups.map((group) => [assetGroupKey(group.kind, group.name), group.id]))
  return input.assets.map((asset): Asset => {
    const primaryPath = findPrimaryPath(asset)
    const spriteIndexPath = findSpriteIndexPath(asset)
    const primaryResourceId = input.preserveSourceIds && isProjectObjectKey(primaryPath)
      ? resourceIdFromProjectObjectKey(primaryPath, createProjectStorageId())
      : createProjectStorageId()
    const spriteIndexResourceId = input.preserveSourceIds && isProjectObjectKey(spriteIndexPath)
      ? resourceIdFromProjectObjectKey(spriteIndexPath!, createProjectStorageId())
      : spriteIndexPath ? createProjectStorageId() : undefined
    const resources = createAssetResourceFields({
      projectId: input.projectId,
      projectName: input.projectName,
      fileName: fileNameFromPath(primaryPath, asset.name),
      mimeType: mimeTypeForAsset(asset, 0),
      sizeBytes: 0,
      resourceId: primaryResourceId,
      spriteIndex: spriteIndexPath ? {
        fileName: fileNameFromPath(spriteIndexPath, 'index.json'),
        mimeType: mimeTypeForAsset(asset, 1),
        sizeBytes: 0,
        resourceId: spriteIndexResourceId,
      } : undefined,
    })
    if (input.preserveSourceIds && isProjectObjectKey(primaryPath)) {
      resources.primary_object_key = primaryPath
      resources.primary_file_name = fileNameFromProjectObjectKey(primaryPath, asset.name)
      resources.primary_extension = objectKeyExtension(primaryPath)
    }
    if (input.preserveSourceIds && isProjectObjectKey(spriteIndexPath)) {
      resources.sprite_index_object_key = spriteIndexPath!
      resources.sprite_index_file_name = fileNameFromProjectObjectKey(spriteIndexPath!, 'index.json')
    }
    return {
      id: mappedId(input.assetIdMap, asset.id),
      project_id: input.projectId,
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
      updated_at: input.now,
      metadata_json: null,
    }
  })
}
