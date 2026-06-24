import { useEffect, useState } from 'react'
import { Avatar } from 'antd'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { buildProjectAssetResourceRef, resolveProjectAssetResourceSource } from './projectAssetResourceResolver'

function characterInitial(name: string) {
  return name.trim().slice(0, 1) || '?'
}

function findPortraitAsset(character: CharacterProfile, allAssets: PersonalSpaceAsset[]) {
  const portraitLink = character.portraitAssets.slice().sort((a, b) => a.order - b.order)[0]
  return portraitLink ? allAssets.find((asset) => asset.id === portraitLink.assetId) : undefined
}

export function StoryboardCharacterAvatar({
  character,
  allAssets,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: {
  character: CharacterProfile
  allAssets: PersonalSpaceAsset[]
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}) {
  const portrait = findPortraitAsset(character, allAssets)
  const fallbackSource = portrait?.resourcePaths[0] ?? ''
  const storedPath = portrait?.storageResourcePaths[0] ?? ''
  const [portraitSource, setPortraitSource] = useState('')

  useEffect(() => {
    if (!portrait || (!storedPath && !fallbackSource)) {
      setPortraitSource('')
      return undefined
    }
    let alive = true
    let objectUrl = ''
    void (async () => {
      const resourceRef = projectId && projectMode
        ? buildProjectAssetResourceRef({ asset: portrait, resourceIndex: 0, projectId, projectMode })
        : null
      const resolved = await resolveProjectAssetResourceSource(storedPath, fallbackSource, {
        projectObjectStorage,
        projectAssetManager,
        resourceRef,
      })
      objectUrl = resolved?.objectUrl ?? ''
      if (alive) setPortraitSource(resolved?.source ?? '')
      else if (objectUrl) URL.revokeObjectURL(objectUrl)
    })().catch(() => {
      if (alive) setPortraitSource('')
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fallbackSource, portrait, projectAssetManager, projectId, projectMode, projectObjectStorage, storedPath])

  return (
    <Avatar
      size={34}
      src={portraitSource || fallbackSource}
      className="storyboard-avatar"
    >
      {characterInitial(character.name)}
    </Avatar>
  )
}
