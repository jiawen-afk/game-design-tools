import type { PersonalSpaceAsset } from './personalSpaceModel'
import {
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  readStoredResourceBlob,
  setPersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'

export type StoryboardPlaybackSource = { source: string; objectUrl?: string } | null

function canCreateObjectUrl() {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
}

async function createStoredResourceObjectUrl(storedPath: string) {
  if (!storedPath || !canCreateObjectUrl()) return ''
  const directoryHandle = getPersonalSpaceDirectoryHandle() ?? await loadPersistedPersonalSpaceDirectoryHandle()
  if (!directoryHandle) return ''
  setPersonalSpaceDirectoryHandle(directoryHandle)
  const blob = await readStoredResourceBlob(directoryHandle, storedPath)
  return URL.createObjectURL(blob)
}

export async function resolveStoryboardVoicePlaybackSource(asset: PersonalSpaceAsset): Promise<StoryboardPlaybackSource> {
  const storedPath = asset.storageResourcePaths[0]
  if (storedPath) {
    try {
      const objectUrl = await createStoredResourceObjectUrl(storedPath)
      if (objectUrl) return { source: objectUrl, objectUrl }
    } catch {
      // Fall back to the in-memory object URL when the authorized directory is unavailable.
    }
  }
  const source = asset.resourcePaths[0]
  return source ? { source } : null
}

export function revokeObjectUrls(objectUrls: string[]) {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
}
