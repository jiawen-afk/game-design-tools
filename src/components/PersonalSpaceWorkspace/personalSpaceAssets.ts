import type {
  CommonAssetKind,
  PersonalSpaceAsset,
  PersonalSpaceState,
  PortraitUploadAssetInput,
  ResourceUploadAssetInput,
  SpriteExportAssetInput,
  VoiceRecordAssetInput,
} from './personalSpaceModel'

export function createPersonalSpaceAsset(input: {
  kind: CommonAssetKind
  name: string
  groupName?: string
  tags?: string[]
  resourcePaths?: string[]
  linkedCharacterIds?: string[]
  linkedStoryboardIds?: string[]
  linkedVoiceAssetIds?: string[]
}): PersonalSpaceAsset {
  return {
    id: `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    name: input.name.trim() || '未命名资源',
    groupName: input.groupName?.trim() || '默认分组',
    tags: input.tags ?? [],
    resourcePaths: input.resourcePaths ?? [],
    linkedCharacterIds: input.linkedCharacterIds ?? [],
    linkedStoryboardIds: input.linkedStoryboardIds ?? [],
    linkedVoiceAssetIds: input.linkedVoiceAssetIds ?? [],
    storageResourcePaths: [],
    createdAt: new Date().toISOString(),
  }
}

function sanitizePathPart(value: string): string {
  return (value.trim() || '未命名资源').replace(/[<>:"/\\|?*]+/g, '_')
}

function joinStoragePath(root: string, ...parts: string[]): string {
  const separator = root.includes('\\') ? '\\' : '/'
  return [root.replace(/[\\/]+$/, ''), ...parts.map(sanitizePathPart)].join(separator)
}

export function storageCategoryForAsset(asset: PersonalSpaceAsset): string {
  if (asset.kind === 'sprite') return '角色精灵图'
  if (asset.kind === 'voice') return '配音素材'
  if (asset.kind === 'effect') return '特效素材'
  if (asset.groupName === '角色肖像' || asset.tags.includes('肖像')) return '角色肖像'
  return '地图素材'
}

function resourceFileName(asset: PersonalSpaceAsset, path: string, index: number): string {
  const clean = path.split(/[\\/]/).pop()?.trim()
  if (clean && clean !== path) return clean
  if (path.startsWith('blob:')) {
    if (asset.kind === 'sprite') return index === 0 ? 'sprite.png' : index === 1 ? 'index.json' : `resource-${index + 1}`
    if (asset.groupName === '角色肖像' || asset.tags.includes('肖像')) return 'portrait.png'
  }
  return clean || `resource-${index + 1}`
}

export function archiveAssetForStorageDirectory(state: PersonalSpaceState, asset: PersonalSpaceAsset): PersonalSpaceAsset {
  const directory = state.settings.storageDirectory.trim()
  if (!directory) return { ...asset, storageResourcePaths: [...asset.storageResourcePaths] }
  const category = storageCategoryForAsset(asset)
  return {
    ...asset,
    storageResourcePaths: asset.resourcePaths.map((path, index) => joinStoragePath(directory, category, asset.name, resourceFileName(asset, path, index))),
  }
}

export function createVoiceAssetFromRecord(record: VoiceRecordAssetInput): PersonalSpaceAsset {
  return createPersonalSpaceAsset({
    kind: 'voice',
    name: record.name,
    groupName: '配音素材',
    tags: ['配音'],
    resourcePaths: record.audioPath ? [record.audioPath] : [],
  })
}

export function createSpriteAssetFromExport(input: SpriteExportAssetInput): PersonalSpaceAsset {
  return createPersonalSpaceAsset({
    kind: 'sprite',
    name: input.name,
    groupName: '角色精灵图',
    tags: input.tags ?? ['角色精灵图'],
    resourcePaths: [input.spritePath, input.indexPath],
  })
}

export function createPortraitAssetFromUpload(input: PortraitUploadAssetInput): PersonalSpaceAsset {
  return createPersonalSpaceAsset({
    kind: 'map',
    name: input.name,
    groupName: '角色肖像',
    tags: ['肖像', ...(input.tags ?? [])],
    resourcePaths: [input.portraitPath],
  })
}

function groupNameForUploadedResource(kind: CommonAssetKind) {
  if (kind === 'effect') return '特效素材'
  if (kind === 'voice') return '配音素材'
  if (kind === 'sprite') return '角色精灵图'
  return '地图素材'
}

function defaultTagForUploadedResource(kind: CommonAssetKind) {
  if (kind === 'effect') return '特效'
  if (kind === 'voice') return '配音'
  if (kind === 'sprite') return '角色精灵图'
  return '地图'
}

export function createResourceAssetFromUpload(input: ResourceUploadAssetInput): PersonalSpaceAsset {
  return createPersonalSpaceAsset({
    kind: input.kind,
    name: input.name,
    groupName: groupNameForUploadedResource(input.kind),
    tags: [defaultTagForUploadedResource(input.kind), ...(input.tags ?? [])],
    resourcePaths: [input.resourcePath],
  })
}
