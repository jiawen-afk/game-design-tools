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
  dialogueText?: string
  resourcePaths?: string[]
  linkedCharacterIds?: string[]
  linkedStoryboardIds?: string[]
  linkedVoiceAssetIds?: string[]
  sourceKey?: string
}): PersonalSpaceAsset {
  return {
    id: `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    name: input.name.trim() || '未命名资源',
    groupName: input.groupName?.trim() || '默认分组',
    tags: input.tags ?? [],
    dialogueText: input.dialogueText?.trim() || undefined,
    resourcePaths: input.resourcePaths ?? [],
    linkedCharacterIds: input.linkedCharacterIds ?? [],
    linkedStoryboardIds: input.linkedStoryboardIds ?? [],
    linkedVoiceAssetIds: input.linkedVoiceAssetIds ?? [],
    storageResourcePaths: [],
    createdAt: new Date().toISOString(),
    sourceKey: input.sourceKey?.trim() || undefined,
  }
}

function padTime(value: number) {
  return String(value).padStart(2, '0')
}

function systemTimestamp(date = new Date()) {
  return [
    date.getFullYear(),
    padTime(date.getMonth() + 1),
    padTime(date.getDate()),
  ].join('') + '-' + [
    padTime(date.getHours()),
    padTime(date.getMinutes()),
    padTime(date.getSeconds()),
  ].join('')
}

let lastImportedAssetNameKey = ''
let lastImportedAssetNameSequence = 0

export function createImportedAssetName(label: string) {
  const key = `${label}-${systemTimestamp()}`
  if (key === lastImportedAssetNameKey) {
    lastImportedAssetNameSequence += 1
  } else {
    lastImportedAssetNameKey = key
    lastImportedAssetNameSequence = 1
  }
  return lastImportedAssetNameSequence === 1
    ? key
    : `${key}-${String(lastImportedAssetNameSequence).padStart(2, '0')}`
}

function sanitizePathPart(value: string): string {
  return (value.trim() || '未命名资源').replace(/[<>:"/\\|?*]+/g, '_')
}

function joinStoragePath(root: string, ...parts: string[]): string {
  const separator = root.includes('\\') ? '\\' : '/'
  return [root.replace(/[\\/]+$/, ''), ...parts.map(sanitizePathPart)].join(separator)
}

export function storageCategoryForAsset(asset: PersonalSpaceAsset): string {
  if (asset.groupName === '角色肖像' || asset.tags.includes('肖像')) return '角色肖像'
  if (asset.kind === 'sprite') return '精灵图'
  if (asset.kind === 'voice') return '配音'
  return '图片'
}

export function importDatePart(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown-date'
  return [
    date.getFullYear(),
    padTime(date.getMonth() + 1),
    padTime(date.getDate()),
  ].join('-')
}

export function hashText(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  let second = 0x811c9dc5
  for (let index = value.length - 1; index >= 0; index -= 1) {
    second ^= value.charCodeAt(index)
    second = Math.imul(second, 0x01000193)
  }
  return `${(hash >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}

function resourceExtension(asset: PersonalSpaceAsset, path: string, index: number): string {
  const clean = path.split(/[\\/]/).pop()?.trim()
  const ext = clean?.match(/\.[^.\\/]+$/)?.[0]
  if (ext) return ext.toLowerCase()
  if (path.startsWith('blob:')) {
    if (asset.kind === 'sprite') return index === 0 ? '.png' : '.json'
    if (asset.kind === 'voice') return '.wav'
    if (asset.groupName === '角色肖像' || asset.tags.includes('肖像')) return '.png'
  }
  return ''
}

export function hashedResourceFileName(asset: PersonalSpaceAsset, path: string, index: number): string {
  return `${hashText(`${asset.id}:${asset.createdAt}:${index}:${path}`).slice(0, 16)}${resourceExtension(asset, path, index)}`
}

export function archiveAssetForStorageDirectory(state: PersonalSpaceState, asset: PersonalSpaceAsset): PersonalSpaceAsset {
  const directory = state.settings.storageDirectory.trim()
  if (!directory) return { ...asset, storageResourcePaths: [...asset.storageResourcePaths] }
  const category = storageCategoryForAsset(asset)
  const datePart = importDatePart(asset.createdAt)
  return {
    ...asset,
    storageResourcePaths: asset.resourcePaths.map((path, index) => joinStoragePath(directory, category, datePart, hashedResourceFileName(asset, path, index))),
  }
}

export function createVoiceAssetFromRecord(record: VoiceRecordAssetInput): PersonalSpaceAsset {
  const playablePath = record.audioUrl?.trim() || record.audioPath || ''
  return createPersonalSpaceAsset({
    kind: 'voice',
    name: record.name,
    groupName: '默认分组',
    tags: ['配音'],
    dialogueText: record.dialogueText ?? record.params?.text,
    resourcePaths: playablePath ? [playablePath] : [],
    sourceKey: record.sourceKey,
  })
}

export function createSpriteAssetFromExport(input: SpriteExportAssetInput): PersonalSpaceAsset {
  return createPersonalSpaceAsset({
    kind: 'sprite',
    name: input.name,
    groupName: input.groupName,
    tags: input.tags ?? ['精灵图'],
    resourcePaths: [input.spritePath, input.indexPath],
    sourceKey: input.sourceKey,
  })
}

export function createPortraitAssetFromUpload(input: PortraitUploadAssetInput): PersonalSpaceAsset {
  return createPersonalSpaceAsset({
    kind: 'image',
    name: input.name,
    groupName: '角色肖像',
    tags: ['肖像', ...(input.tags ?? [])],
    resourcePaths: [input.portraitPath],
  })
}

function groupNameForUploadedResource(kind: CommonAssetKind, groupName?: string) {
  void kind
  return groupName?.trim() || '默认分组'
}

function defaultTagForUploadedResource(kind: CommonAssetKind) {
  if (kind === 'voice') return '配音'
  if (kind === 'sprite') return '精灵图'
  if (kind === 'image') return '图片'
  if (kind === 'effect') return '特效'
  return '地图'
}

export function createResourceAssetFromUpload(input: ResourceUploadAssetInput): PersonalSpaceAsset {
  const normalizedKind: CommonAssetKind = input.kind === 'map' || input.kind === 'effect' ? 'image' : input.kind
  const legacyTags = input.kind === 'map' ? ['地图'] : input.kind === 'effect' ? ['特效'] : []
  return createPersonalSpaceAsset({
    kind: normalizedKind,
    name: input.name,
    groupName: groupNameForUploadedResource(normalizedKind, input.groupName),
    tags: Array.from(new Set([defaultTagForUploadedResource(normalizedKind), ...legacyTags, ...(input.tags ?? [])])),
    resourcePaths: [input.resourcePath],
  })
}
