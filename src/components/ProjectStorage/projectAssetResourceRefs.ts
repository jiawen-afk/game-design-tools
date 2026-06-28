import type { ProjectAssetResourceRef, ProjectResourceRole } from './projectAssetManager'
import type { Asset, ProjectMode } from './projectStorageTypes'

export function listAssetObjectKeys(asset: Asset) {
  return [
    asset.primary_object_key,
    ...(asset.sprite_index_object_key ? [asset.sprite_index_object_key] : []),
    ...(asset.cover_object_key ? [asset.cover_object_key] : []),
  ]
}

export function buildProjectAssetResourceRef(
  projectMode: ProjectMode,
  asset: Asset,
  role: ProjectResourceRole,
): ProjectAssetResourceRef | null {
  if (role === 'sprite_index') {
    if (!asset.sprite_index_resource_id || !asset.sprite_index_object_key) return null
    return {
      projectId: asset.project_id,
      projectMode,
      assetId: asset.id,
      resourceId: asset.sprite_index_resource_id,
      role,
      objectKey: asset.sprite_index_object_key,
      mimeType: asset.sprite_index_mime_type,
      sizeBytes: asset.sprite_index_size_bytes,
      hashSha256: asset.sprite_index_hash_sha256,
    }
  }
  if (role === 'cover') {
    if (!asset.cover_resource_id || !asset.cover_object_key) return null
    return {
      projectId: asset.project_id,
      projectMode,
      assetId: asset.id,
      resourceId: asset.cover_resource_id,
      role,
      objectKey: asset.cover_object_key,
      mimeType: asset.cover_mime_type,
      sizeBytes: asset.cover_size_bytes,
      hashSha256: asset.cover_hash_sha256,
    }
  }
  return {
    projectId: asset.project_id,
    projectMode,
    assetId: asset.id,
    resourceId: asset.primary_resource_id,
    role,
    objectKey: asset.primary_object_key,
    mimeType: asset.primary_mime_type,
    sizeBytes: asset.primary_size_bytes,
    hashSha256: asset.primary_hash_sha256,
  }
}

export function assetObjectKeyForRole(asset: Asset, role: ProjectResourceRole) {
  if (role === 'sprite_index') return asset.sprite_index_object_key
  if (role === 'cover') return asset.cover_object_key
  return asset.primary_object_key
}
