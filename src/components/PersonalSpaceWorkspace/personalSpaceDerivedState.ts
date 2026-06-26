import type { AssetGroupKind, PersonalSpaceAsset, PersonalSpaceState } from './personalSpaceModel'

export interface PersonalResourceSectionConfig {
  kind: AssetGroupKind
  title: string
  description: string
  importLabel: string
  emptyDescription: string
  groupNames: string[]
  starredGroupNames: string[]
  assets: PersonalSpaceAsset[]
}

export function assetOptions(assets: PersonalSpaceAsset[]) {
  return assets.map((asset) => ({ label: asset.name, value: asset.id }))
}

function uniqueGroupNames(groupNames: string[], assets: PersonalSpaceAsset[]) {
  const names = groupNames.concat(assets.map((asset) => asset.groupName))
  return Array.from(new Set(names.map((name) => name.trim() || '默认分组')))
}

export function createPersonalSpaceDerivedState(space: PersonalSpaceState) {
  const imageAssets = space.assets.filter((asset) => asset.kind === 'image')
  const portraitAssets = space.assets.filter((asset) => asset.kind === 'image' && asset.assetSubtype === 'portrait')
  const spriteAssets = space.assets.filter((asset) => asset.kind === 'sprite')
  const voiceAssets = space.assets.filter((asset) => asset.kind === 'voice')
  const characterOptions = space.characters.map((character) => ({ label: character.name, value: character.id }))
  const resourceSections: PersonalResourceSectionConfig[] = [
    {
      kind: 'image',
      title: '公共图片',
      description: '单张图片、地图、场景图、抠图结果和特效参考图。',
      importLabel: '导入公共图片',
      emptyDescription: '还没有公共图片。导入图片或从工作台批量导入后会显示在这里。',
      groupNames: uniqueGroupNames(space.assetGroups.image, imageAssets),
      starredGroupNames: space.starredAssetGroups.image,
      assets: imageAssets,
    },
    {
      kind: 'sprite',
      title: '精灵图',
      description: '角色精灵图和特效精灵图，使用 PNG 与 index.json 成套管理。',
      importLabel: '导入精灵图',
      emptyDescription: '还没有精灵图。导入精灵图或从精灵图工作台收藏后会显示在这里。',
      groupNames: uniqueGroupNames(space.assetGroups.sprite, spriteAssets),
      starredGroupNames: space.starredAssetGroups.sprite,
      assets: spriteAssets,
    },
    {
      kind: 'voice',
      title: '配音',
      description: '从配音工作台收藏或手动导入的角色语音、旁白和音效配音。',
      importLabel: '导入配音',
      emptyDescription: '还没有配音素材。生成或导入配音后可关联角色和剧情组。',
      groupNames: uniqueGroupNames(space.assetGroups.voice, voiceAssets),
      starredGroupNames: space.starredAssetGroups.voice,
      assets: voiceAssets,
    },
  ]
  const assetCounts = {
    image: imageAssets.length,
    sprite: spriteAssets.length,
    voice: voiceAssets.length,
  }

  return {
    imageAssets,
    portraitAssets,
    spriteAssets,
    voiceAssets,
    characterOptions,
    resourceSections,
    assetCounts,
  }
}

export function createStoryboardVoiceRefs(space: Pick<PersonalSpaceState, 'storyboardGroups'>, assetId: string) {
  return space.storyboardGroups
    .flatMap((group) => group.voiceEntries
      .filter((entry) => entry.assetId === assetId)
      .map((entry) => `${group.name} #${entry.order + 1}`))
}
