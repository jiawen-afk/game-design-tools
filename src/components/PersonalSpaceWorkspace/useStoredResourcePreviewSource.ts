import { useEffect, useState } from 'react'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'
import { buildProjectAssetResourceRef, resolveProjectAssetResourceSource } from './projectAssetResourceResolver'

function canCreateObjectUrl() {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
}

export function useStoredResourcePreviewSource(
  asset: PersonalSpaceAsset,
  resourceIndex: number,
  fallbackSource: string,
  options: {
    projectObjectStorage?: ProjectObjectStorage
    projectAssetManager?: ProjectAssetManager
    projectId?: string
    projectMode?: ProjectMode
    enabled?: boolean
  } = {},
) {
  const storedPath = asset.storageResourcePaths[resourceIndex] ?? ''
  const [storedSource, setStoredSource] = useState('')
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled) {
      setStoredSource('')
      return undefined
    }
    if ((!storedPath && !fallbackSource) || !canCreateObjectUrl()) {
      setStoredSource('')
      return undefined
    }
    let alive = true
    let objectUrl = ''
    void (async () => {
      const resourceRef = options.projectId && options.projectMode
        ? buildProjectAssetResourceRef({
          asset,
          resourceIndex,
          projectId: options.projectId,
          projectMode: options.projectMode,
        })
        : null
      const resolved = await resolveProjectAssetResourceSource(storedPath, fallbackSource, {
        projectObjectStorage: options.projectObjectStorage,
        projectAssetManager: options.projectAssetManager,
        resourceRef,
      })
      objectUrl = resolved?.objectUrl ?? ''
      if (alive) setStoredSource(resolved?.source ?? '')
      else if (objectUrl) URL.revokeObjectURL(objectUrl)
    })().catch(() => {
      if (alive) setStoredSource('')
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [asset, enabled, fallbackSource, options.projectAssetManager, options.projectId, options.projectMode, options.projectObjectStorage, resourceIndex, storedPath])

  return enabled ? (storedSource || fallbackSource) : ''
}
