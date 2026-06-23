import type { PersonalSpaceAsset } from './personalSpaceModel'
import type { ProjectObjectStorage } from '../ProjectStorage'
import { resolveProjectAssetResourceSource } from './projectAssetResourceResolver'

export type StoryboardPlaybackSource = { source: string; objectUrl?: string } | null

export async function resolveStoryboardVoicePlaybackSource(
  asset: PersonalSpaceAsset,
  projectObjectStorage?: ProjectObjectStorage,
): Promise<StoryboardPlaybackSource> {
  const storedPath = asset.storageResourcePaths[0]
  const source = asset.resourcePaths[0]
  const resolved = await resolveProjectAssetResourceSource(storedPath, source, { projectObjectStorage })
  return resolved ? { source: resolved.source, objectUrl: resolved.objectUrl } : null
}

export function revokeObjectUrls(objectUrls: string[]) {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
}
