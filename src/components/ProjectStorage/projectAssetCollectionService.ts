import { createProjectStorageId } from './projectId'
import { createAssetResourceFields } from './projectStorageModel'
import type { Asset, ProjectAssetKind, ProjectAssetSubtype } from './projectStorageTypes'

export interface ProjectAssetCollectionInput {
  projectId: string
  kind: ProjectAssetKind
  assetSubtype: ProjectAssetSubtype
  name: string
  groupId?: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  dialogueText?: string
  sourceKey?: string
  now: string
  resourceId?: string
  spriteIndex?: {
    fileName: string
    mimeType: string
    sizeBytes: number
    resourceId?: string
    frameWidth: number
    frameHeight: number
    sheetWidth: number
    sheetHeight: number
    fps: number
    frameCount: number
  }
}

export function createProjectAssetFromCollection(input: ProjectAssetCollectionInput): Asset {
  const resources = createAssetResourceFields({
    projectId: input.projectId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    resourceId: input.resourceId,
    spriteIndex: input.spriteIndex,
  })
  return {
    id: createProjectStorageId(),
    project_id: input.projectId,
    kind: input.kind,
    asset_subtype: input.assetSubtype,
    group_id: input.groupId ?? null,
    name: input.name.trim() || '未命名素材',
    dialogue_text: input.dialogueText?.trim() || null,
    source_key: input.sourceKey?.trim() || null,
    ...resources,
    sprite_frame_width: input.spriteIndex?.frameWidth ?? null,
    sprite_frame_height: input.spriteIndex?.frameHeight ?? null,
    sprite_sheet_width: input.spriteIndex?.sheetWidth ?? null,
    sprite_sheet_height: input.spriteIndex?.sheetHeight ?? null,
    sprite_fps: input.spriteIndex?.fps ?? null,
    sprite_frame_count: input.spriteIndex?.frameCount ?? null,
    created_at: input.now,
    updated_at: input.now,
    metadata_json: null,
  }
}
