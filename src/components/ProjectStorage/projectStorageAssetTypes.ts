import type { ProjectMimeGroup } from './projectStorageCoreTypes'

export type ProjectAssetKind = 'image' | 'sprite' | 'voice' | 'sound'
export type ProjectAssetSubtype =
  | 'generic'
  | 'portrait'
  | 'map'
  | 'effect'
  | 'character_sprite'
  | 'effect_sprite'
  | 'character_voice'
  | 'narration'
  | 'sound_effect'
export type ProjectAssetGroupKind = ProjectAssetKind
export type CharacterAssetColumnKind = 'portrait' | 'sprite' | 'voice'

export interface AssetGroup {
  id: string
  project_id: string
  kind: ProjectAssetGroupKind
  name: string
  starred: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AssetResourceFields {
  primary_resource_id: string
  primary_object_key: string
  primary_file_name: string
  primary_mime_group: ProjectMimeGroup
  primary_mime_type: string
  primary_extension: string
  primary_size_bytes: number
  primary_hash_sha256: string | null
  sprite_index_resource_id: string | null
  sprite_index_object_key: string | null
  sprite_index_file_name: string | null
  sprite_index_mime_type: string | null
  sprite_index_size_bytes: number | null
  sprite_index_hash_sha256: string | null
  cover_resource_id: string | null
  cover_object_key: string | null
  cover_file_name: string | null
  cover_mime_type: string | null
  cover_size_bytes: number | null
  cover_hash_sha256: string | null
}

export interface Asset extends AssetResourceFields {
  id: string
  project_id: string
  kind: ProjectAssetKind
  asset_subtype: ProjectAssetSubtype
  group_id: string | null
  name: string
  dialogue_text: string | null
  source_key: string | null
  sprite_frame_width: number | null
  sprite_frame_height: number | null
  sprite_sheet_width: number | null
  sprite_sheet_height: number | null
  sprite_fps: number | null
  sprite_frame_count: number | null
  created_at: string
  updated_at: string
  metadata_json: string | null
}

export interface Character {
  id: string
  project_id: string
  name: string
  starred: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CharacterAssetLink {
  id: string
  project_id: string
  character_id: string
  asset_id: string
  column_kind: CharacterAssetColumnKind
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StoryboardGroup {
  id: string
  project_id: string
  name: string
  starred: boolean
  created_at: string
  updated_at: string
}

export interface StoryboardVoiceEntry {
  id: string
  project_id: string
  storyboard_id: string
  asset_id: string
  character_id: string | null
  text: string
  start_offset_us: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AssetRelation {
  id: string
  project_id: string
  source_asset_id: string
  target_asset_id: string
  relation_type: 'effect_voice' | 'sound_sprite' | 'derived_from' | string
  created_at: string
}
