import type { PersonalSpaceAsset } from './personalSpaceModel'
import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import { buildProjectAssetResourceRef, resolveProjectAssetResourceSource } from './projectAssetResourceResolver'

export type StoryboardPlaybackSource = { source: string; objectUrl?: string } | null

export async function resolveStoryboardVoicePlaybackSource(
  asset: PersonalSpaceAsset,
  options: {
    projectObjectStorage?: ProjectObjectStorage
    projectAssetManager?: ProjectAssetManager
    projectId?: string
    projectMode?: ProjectMode
  } = {},
): Promise<StoryboardPlaybackSource> {
  const storedPath = asset.storageResourcePaths[0]
  const source = asset.resourcePaths[0]
  const resourceRef = options.projectId && options.projectMode
    ? buildProjectAssetResourceRef({ asset, resourceIndex: 0, projectId: options.projectId, projectMode: options.projectMode })
    : null
  const resolved = await resolveProjectAssetResourceSource(storedPath, source, {
    projectObjectStorage: options.projectObjectStorage,
    projectAssetManager: options.projectAssetManager,
    resourceRef,
  })
  return resolved ? { source: resolved.source, objectUrl: resolved.objectUrl } : null
}

export function revokeObjectUrls(objectUrls: string[]) {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
}
