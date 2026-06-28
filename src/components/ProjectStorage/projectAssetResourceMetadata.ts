import type { ProjectResourceRole } from './projectAssetManager'
import { assetObjectKeyForRole } from './projectAssetResourceRefs'
import type { Asset } from './projectStorageTypes'

export function assetHashForRole(asset: Asset, role: ProjectResourceRole) {
  if (role === 'sprite_index') return asset.sprite_index_hash_sha256
  if (role === 'cover') return asset.cover_hash_sha256
  return asset.primary_hash_sha256
}

export function assetSizeForRole(asset: Asset, role: ProjectResourceRole) {
  if (role === 'sprite_index') return asset.sprite_index_size_bytes
  if (role === 'cover') return asset.cover_size_bytes
  return asset.primary_size_bytes
}

export function copyAssetResourceFields(asset: Asset, existingAsset: Asset, role: ProjectResourceRole): Asset {
  if (role === 'sprite_index') {
    return {
      ...asset,
      sprite_index_resource_id: existingAsset.sprite_index_resource_id,
      sprite_index_object_key: existingAsset.sprite_index_object_key,
      sprite_index_file_name: existingAsset.sprite_index_file_name,
      sprite_index_mime_type: existingAsset.sprite_index_mime_type,
      sprite_index_size_bytes: existingAsset.sprite_index_size_bytes,
      sprite_index_hash_sha256: existingAsset.sprite_index_hash_sha256,
    }
  }
  if (role === 'cover') {
    return {
      ...asset,
      cover_resource_id: existingAsset.cover_resource_id,
      cover_object_key: existingAsset.cover_object_key,
      cover_file_name: existingAsset.cover_file_name,
      cover_mime_type: existingAsset.cover_mime_type,
      cover_size_bytes: existingAsset.cover_size_bytes,
      cover_hash_sha256: existingAsset.cover_hash_sha256,
    }
  }
  return {
    ...asset,
    primary_resource_id: existingAsset.primary_resource_id,
    primary_object_key: existingAsset.primary_object_key,
    primary_file_name: existingAsset.primary_file_name,
    primary_mime_group: existingAsset.primary_mime_group,
    primary_mime_type: existingAsset.primary_mime_type,
    primary_extension: existingAsset.primary_extension,
    primary_size_bytes: existingAsset.primary_size_bytes,
    primary_hash_sha256: existingAsset.primary_hash_sha256,
  }
}

export function setAssetResourceBlobMetadata(
  asset: Asset,
  role: ProjectResourceRole,
  blob: Blob,
  hashSha256: string | null,
): Asset {
  if (role === 'sprite_index') {
    return {
      ...asset,
      sprite_index_size_bytes: blob.size,
      sprite_index_hash_sha256: hashSha256,
    }
  }
  if (role === 'cover') {
    return {
      ...asset,
      cover_size_bytes: blob.size,
      cover_hash_sha256: hashSha256,
    }
  }
  return {
    ...asset,
    primary_size_bytes: blob.size,
    primary_hash_sha256: hashSha256,
  }
}

export function resourceMatchesExistingBlob(
  existingAsset: Asset,
  role: ProjectResourceRole,
  blob: Blob,
  hashSha256: string | null,
) {
  if (!assetObjectKeyForRole(existingAsset, role)) return false
  const existingHash = assetHashForRole(existingAsset, role)
  if (hashSha256 && existingHash) return hashSha256 === existingHash
  return assetSizeForRole(existingAsset, role) === blob.size
}
