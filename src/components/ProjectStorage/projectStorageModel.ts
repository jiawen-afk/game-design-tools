import { createProjectId, createProjectStorageId, createResourceId } from './projectId'
import {
  buildProjectObjectKey,
  extensionFromFileName,
  fileNameFromProjectObjectKey,
  isProjectObjectKey,
  mimeGroupFromMimeType,
  normalizeFileExtension,
  resourceIdFromProjectObjectKey,
  sanitizeObjectKeyPart,
} from './projectObjectKeys'
import { PROJECT_SCHEMA_TABLES, createProjectSchemaSql } from './projectSchema'
import type {
  AssetResourceFields,
  ProjectAssetKind,
  ProjectAssetSubtype,
  ProjectSettings,
  StoryboardVoiceEntry,
} from './projectStorageTypes'

export interface LegacySubtypeInput {
  kind: 'map' | 'image' | 'effect' | 'voice' | 'sprite'
  groupName?: string
  tags?: string[]
}

export interface ResourceFieldInput {
  projectId: string
  projectName: string
  fileName: string
  mimeType: string
  sizeBytes: number
  resourceId?: string
  hashSha256?: string | null
  spriteIndex?: {
    fileName: string
    mimeType: string
    sizeBytes: number
    resourceId?: string
    hashSha256?: string | null
  }
}

export function assetKindFromLegacyKind(kind: LegacySubtypeInput['kind']): ProjectAssetKind {
  if (kind === 'voice') return 'voice'
  if (kind === 'sprite') return 'sprite'
  return 'image'
}

export function assetSubtypeFromLegacyInput(input: LegacySubtypeInput): ProjectAssetSubtype {
  const tags = new Set((input.tags ?? []).map((tag) => tag.trim()))
  const groupName = input.groupName?.trim() ?? ''
  if (input.kind === 'map' || tags.has('地图') || groupName.includes('地图')) return 'map'
  if (input.kind === 'effect' || tags.has('特效') || groupName.includes('特效')) return 'effect'
  if (tags.has('肖像') || groupName.includes('肖像')) return 'portrait'
  if (input.kind === 'sprite' && (tags.has('角色精灵图') || groupName.includes('角色'))) return 'character_sprite'
  if (input.kind === 'sprite' && (tags.has('特效精灵图') || groupName.includes('特效'))) return 'effect_sprite'
  if (input.kind === 'voice' && (tags.has('角色配音') || tags.has('配音'))) return 'character_voice'
  return 'generic'
}

export function createAssetResourceFields(input: ResourceFieldInput): AssetResourceFields {
  const primaryResourceId = input.resourceId ?? createResourceId()
  const primaryMimeGroup = mimeGroupFromMimeType(input.mimeType)
  const primaryExtension = extensionFromFileName(input.fileName)
  const spriteIndexResourceId = input.spriteIndex?.resourceId ?? (input.spriteIndex ? createResourceId() : null)
  const spriteIndexExtension = input.spriteIndex ? extensionFromFileName(input.spriteIndex.fileName) : null
  const spriteIndexMimeGroup = input.spriteIndex ? mimeGroupFromMimeType(input.spriteIndex.mimeType) : null
  return {
    primary_resource_id: primaryResourceId,
    primary_object_key: buildProjectObjectKey({
      projectName: input.projectName,
      fileMime: input.mimeType,
      resourceId: primaryResourceId,
      extension: primaryExtension,
    }),
    primary_file_name: input.fileName,
    primary_mime_group: primaryMimeGroup,
    primary_mime_type: input.mimeType,
    primary_extension: primaryExtension,
    primary_size_bytes: input.sizeBytes,
    primary_hash_sha256: input.hashSha256 ?? null,
    sprite_index_resource_id: spriteIndexResourceId,
    sprite_index_object_key: input.spriteIndex && spriteIndexResourceId && spriteIndexExtension && spriteIndexMimeGroup
      ? buildProjectObjectKey({
        projectName: input.projectName,
        fileMime: input.spriteIndex.mimeType,
        resourceId: spriteIndexResourceId,
        extension: spriteIndexExtension,
      })
      : null,
    sprite_index_file_name: input.spriteIndex?.fileName ?? null,
    sprite_index_mime_type: input.spriteIndex?.mimeType ?? null,
    sprite_index_size_bytes: input.spriteIndex?.sizeBytes ?? null,
    sprite_index_hash_sha256: input.spriteIndex?.hashSha256 ?? null,
  }
}

export function createStoryboardVoiceEntry(input: {
  id?: string
  projectId: string
  storyboardId: string
  assetId: string
  characterId: string | null
  text: string
  startOffsetUs?: number
  sortOrder: number
  now?: string
}): StoryboardVoiceEntry {
  const now = input.now ?? new Date().toISOString()
  return {
    id: input.id ?? createProjectStorageId(),
    project_id: input.projectId,
    storyboard_id: input.storyboardId,
    asset_id: input.assetId,
    character_id: input.characterId,
    text: input.text,
    start_offset_us: Math.trunc(input.startOffsetUs ?? 0),
    sort_order: input.sortOrder,
    created_at: now,
    updated_at: now,
  }
}

export function validateRemoteProjectSettings(settings: ProjectSettings): string[] {
  const errors: string[] = []
  if (settings.storage_provider !== 'qiniu_kodo') errors.push('远程项目必须使用七牛 Kodo 对象存储')
  if (settings.database_provider !== 'postgresql' && settings.database_provider !== 'mysql') {
    errors.push('远程项目必须使用 PostgreSQL 或 MySQL')
  }
  return errors
}

export {
  PROJECT_SCHEMA_TABLES,
  buildProjectObjectKey,
  createProjectId,
  createProjectSchemaSql,
  createProjectStorageId,
  createResourceId,
  fileNameFromProjectObjectKey,
  isProjectObjectKey,
  mimeGroupFromMimeType,
  normalizeFileExtension,
  resourceIdFromProjectObjectKey,
  sanitizeObjectKeyPart,
}
export type * from './projectStorageTypes'
