import type { ProjectMode } from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'

export function assetPrimaryPreviewSource(asset: PersonalSpaceAsset) {
  return asset.resourcePaths[0] ?? ''
}

export function assetListPreviewSource(
  asset: PersonalSpaceAsset,
  options: { projectMode?: ProjectMode } = {},
) {
  if (asset.coverResourcePath) return asset.coverResourcePath
  if (options.projectMode === 'remote') return ''
  return assetPrimaryPreviewSource(asset)
}
