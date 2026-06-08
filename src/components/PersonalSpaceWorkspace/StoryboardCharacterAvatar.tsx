import { Avatar } from 'antd'

import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'

function characterInitial(name: string) {
  return name.trim().slice(0, 1) || '?'
}

function findPortraitAsset(character: CharacterProfile, allAssets: PersonalSpaceAsset[]) {
  const portraitLink = character.portraitAssets.slice().sort((a, b) => a.order - b.order)[0]
  return portraitLink ? allAssets.find((asset) => asset.id === portraitLink.assetId) : undefined
}

export function StoryboardCharacterAvatar({ character, allAssets }: { character: CharacterProfile; allAssets: PersonalSpaceAsset[] }) {
  const portrait = findPortraitAsset(character, allAssets)
  const portraitPath = portrait?.resourcePaths[0]
  return (
    <Avatar
      size={34}
      src={portraitPath}
      className="storyboard-avatar"
    >
      {characterInitial(character.name)}
    </Avatar>
  )
}
