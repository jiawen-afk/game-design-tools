import { useEffect, useMemo, useState } from 'react'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'
import { assetListPreviewSource } from './personalSpacePreviewSourceModel'
import {
  buildProjectAssetCoverResourceRef,
  buildProjectAssetResourceRef,
  resolveProjectAssetResourceSource,
} from './projectAssetResourceResolver'

function canCreateObjectUrl() {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
}

interface StoredPreviewSourceOptions {
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
  enabled?: boolean
}

function useResolvedPreviewSource(
  asset: PersonalSpaceAsset,
  storedPath: string,
  fallbackSource: string,
  resourceRef: ReturnType<typeof buildProjectAssetResourceRef> | ReturnType<typeof buildProjectAssetCoverResourceRef>,
  options: StoredPreviewSourceOptions = {},
) {
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
  }, [asset, enabled, fallbackSource, options.projectAssetManager, options.projectObjectStorage, resourceRef, storedPath])

  return enabled ? (storedSource || fallbackSource) : ''
}

export function useStoredResourcePreviewSource(
  asset: PersonalSpaceAsset,
  resourceIndex: number,
  fallbackSource: string,
  options: StoredPreviewSourceOptions = {},
) {
  const storedPath = asset.storageResourcePaths[resourceIndex] ?? ''
  const resourceRef = useMemo(
    () => (options.projectId && options.projectMode
      ? buildProjectAssetResourceRef({
        asset,
        resourceIndex,
        projectId: options.projectId,
        projectMode: options.projectMode,
      })
      : null),
    [asset, options.projectId, options.projectMode, resourceIndex],
  )
  return useResolvedPreviewSource(
    asset,
    storedPath,
    fallbackSource,
    resourceRef,
    options,
  )
}

export function useStoredAssetCoverSource(
  asset: PersonalSpaceAsset,
  options: StoredPreviewSourceOptions = {},
) {
  const storedPath = asset.coverStorageResourcePath ?? ''
  const resourceRef = useMemo(
    () => (options.projectId && options.projectMode
      ? buildProjectAssetCoverResourceRef({
        asset,
        projectId: options.projectId,
        projectMode: options.projectMode,
      })
      : null),
    [asset, options.projectId, options.projectMode],
  )
  return useResolvedPreviewSource(
    asset,
    storedPath,
    assetListPreviewSource(asset, { projectMode: options.projectMode }),
    resourceRef,
    options,
  )
}
