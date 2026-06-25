import { useEffect, useState } from 'react'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'
import { useStoredResourcePreviewSource } from './useStoredResourcePreviewSource'

export interface SpritePreviewFrame {
  x: number
  y: number
  w: number
  h: number
}

export interface SpritePreviewIndex {
  sheet_size?: { w: number; h: number }
  fps?: number
  frames?: SpritePreviewFrame[]
}

export function useSpritePreviewIndex(
  asset: PersonalSpaceAsset,
  options: {
    projectObjectStorage?: ProjectObjectStorage
    projectAssetManager?: ProjectAssetManager
    projectId?: string
    projectMode?: ProjectMode
    enabled?: boolean
  },
) {
  const [index, setIndex] = useState<SpritePreviewIndex | null>(null)
  const indexSource = useStoredResourcePreviewSource(asset, 1, asset.resourcePaths[1] ?? '', options)

  useEffect(() => {
    if (asset.kind !== 'sprite' || !indexSource) {
      setIndex(null)
      return
    }
    let alive = true
    void fetch(indexSource)
      .then((response) => response.json())
      .then((value: SpritePreviewIndex) => {
        if (alive && Array.isArray(value.frames)) setIndex(value)
      })
      .catch(() => {
        if (alive) setIndex(null)
      })
    return () => {
      alive = false
    }
  }, [asset.kind, indexSource])

  return index
}
