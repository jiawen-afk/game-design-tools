import { Avatar } from 'antd'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { assetListPreviewSource } from './personalSpacePreviewSourceModel'
import { useStoredAssetCoverSource } from './useStoredResourcePreviewSource'

function characterInitial(name: string) {
  return name.trim().slice(0, 1) || '?'
}

function findPortraitAsset(character: CharacterProfile, allAssets: PersonalSpaceAsset[]) {
  const portraitLink = character.portraitAssets.slice().sort((a, b) => a.order - b.order)[0]
  return portraitLink ? allAssets.find((asset) => asset.id === portraitLink.assetId) : undefined
}

const emptyPortraitAsset: PersonalSpaceAsset = {
  id: '',
  kind: 'image',
  assetSubtype: 'portrait',
  name: '',
  groupName: '',
  resourcePaths: [],
  createdAt: '',
  linkedCharacterIds: [],
  linkedStoryboardIds: [],
  linkedVoiceAssetIds: [],
  linkedSpriteAssetIds: [],
  storageResourcePaths: [],
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
  const portraitAsset = portrait ?? emptyPortraitAsset
  const fallbackSource = assetListPreviewSource(portraitAsset, { projectMode })
  const portraitSource = useStoredAssetCoverSource(portraitAsset, {
    enabled: Boolean(portrait),
    projectObjectStorage,
    projectAssetManager,
    projectId,
    projectMode,
  })

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
