import {
  archiveAssetForStorageDirectory,
  createPortraitAssetFromUpload,
  createResourceAssetFromUpload,
  createSpriteAssetFromExport,
  deletePersonalSpaceAsset,
  type CommonAssetKind,
  type PersonalSpaceAsset,
  type PersonalSpaceState,
} from './personalSpaceModel'
import {
  createNativePersonalSpaceDirectoryHandle,
  deleteStoredResourceFiles,
  type PersonalSpaceDirectoryHandle,
  type PersonalSpaceResourceFile,
  writeAssetCoverToDirectory,
  writeAssetResourcesToDirectory,
} from './personalSpaceFileStorage'
import {
  createAssetCover,
  type PersonalSpaceAssetCoverOptions,
} from './personalSpaceAssetCoverService'
import { getDesktopApi } from '../../desktopApi'
export {
  exportAllStoryboardCharacterAssetsToTarget,
  exportAllStoryboardVoiceAssetsToTarget,
  exportStoryboardAssetToTarget,
  exportStoryboardCharacterAssetsToTarget,
  exportStoryboardVoiceAssetsToTarget,
} from './personalSpaceStoryboardExportActions'

export type {
  ProjectResourceReadOptions,
  StoryboardExportResult,
} from './personalSpaceStoryboardExportActions'

export interface AssetDeleteResult {
  attemptedResourceDeletion: boolean
  pendingDeletedPaths: string[]
  resourcesDeleted: boolean
}

async function attachUploadCover(
  state: PersonalSpaceState,
  asset: PersonalSpaceAsset,
  sourceFile: File,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: PersonalSpaceAssetCoverOptions = {},
) {
  const cover = await createAssetCover(sourceFile, options)
  if (!cover) return asset
  const coverResourcePath = cover.resourcePath ?? URL.createObjectURL(cover.data)
  const assetWithCover = {
    ...asset,
    coverResourcePath,
  }
  const coverResource: PersonalSpaceResourceFile = {
    name: cover.name || 'cover.png',
    data: cover.data,
  }
  if (directoryHandle) {
    return writeAssetCoverToDirectory(directoryHandle, assetWithCover, coverResource)
  }
  return archiveAssetForStorageDirectory(state, assetWithCover)
}

export async function pickPersonalSpaceDirectory() {
  const desktopApi = getDesktopApi()
  if (!desktopApi) return null
  const directory = await desktopApi.selectPersonalSpaceDirectory()
  return directory ? createNativePersonalSpaceDirectoryHandle(directory) : null
}

export async function createPortraitAssetForUpload(
  state: PersonalSpaceState,
  file: File,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: PersonalSpaceAssetCoverOptions = {},
): Promise<PersonalSpaceAsset> {
  const objectUrl = URL.createObjectURL(file)
  const baseAsset = createPortraitAssetFromUpload({
    name: file.name,
    portraitPath: objectUrl,
  })
  const storedAsset = directoryHandle
    ? await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [{ name: file.name || 'portrait.png', data: file }])
    : archiveAssetForStorageDirectory(state, baseAsset)
  return attachUploadCover(state, storedAsset, file, directoryHandle, options)
}

export async function createCommonResourceAssetForUpload(
  state: PersonalSpaceState,
  kind: CommonAssetKind,
  file: File,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  groupName?: string,
  options: PersonalSpaceAssetCoverOptions = {},
): Promise<PersonalSpaceAsset> {
  const objectUrl = URL.createObjectURL(file)
  const baseAsset = createResourceAssetFromUpload({
    kind,
    name: file.name,
    resourcePath: objectUrl,
    groupName,
  })
  const storedAsset = directoryHandle
    ? await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [{ name: file.name, data: file }])
    : archiveAssetForStorageDirectory(state, baseAsset)
  if (storedAsset.kind === 'voice') return storedAsset
  return attachUploadCover(state, storedAsset, file, directoryHandle, options)
}

export async function createVoiceAssetForUpload(
  state: PersonalSpaceState,
  file: File,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<PersonalSpaceAsset> {
  return createCommonResourceAssetForUpload(state, 'voice', file, directoryHandle)
}

export async function createSpriteAssetForUpload(
  state: PersonalSpaceState,
  files: File[],
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  groupName?: string,
  options: PersonalSpaceAssetCoverOptions = {},
): Promise<PersonalSpaceAsset> {
  const pngFile = files.find((file) => file.name.toLowerCase().endsWith('.png'))
  const indexFile = files.find((file) => file.name.toLowerCase() === 'index.json')
  if (!pngFile || !indexFile) throw new Error('请选择一个 PNG 精灵图和一个 index.json')

  const spriteUrl = URL.createObjectURL(pngFile)
  const indexUrl = URL.createObjectURL(indexFile)
  const baseAsset = createSpriteAssetFromExport({
    name: pngFile.name,
    spritePath: spriteUrl,
    indexPath: indexUrl,
    groupName,
  })
  const storedAsset = directoryHandle
    ? await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [
      { name: pngFile.name || 'sprite.png', data: pngFile },
      { name: 'index.json', data: indexFile },
    ])
    : archiveAssetForStorageDirectory(state, baseAsset)
  return attachUploadCover(state, storedAsset, pngFile, directoryHandle, options)
}

export async function deleteAssetWithOptionalResources(
  state: PersonalSpaceState,
  assetId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<AssetDeleteResult> {
  const asset = state.assets.find((item) => item.id === assetId)
  const storedPaths = asset ? [
    ...asset.storageResourcePaths,
    asset.coverStorageResourcePath,
  ].filter((path): path is string => Boolean(path)) : []
  if (!state.settings.deleteResourcesWithContent || storedPaths.length === 0 || !directoryHandle) {
    return {
      attemptedResourceDeletion: false,
      pendingDeletedPaths: [],
      resourcesDeleted: false,
    }
  }

  const cleanup = await deleteStoredResourceFiles(directoryHandle, storedPaths)
  return {
    attemptedResourceDeletion: true,
    pendingDeletedPaths: cleanup.pendingPaths,
    resourcesDeleted: cleanup.pendingPaths.length === 0,
  }
}

export function applyAssetDeleteResult(
  state: PersonalSpaceState,
  assetId: string,
  result: AssetDeleteResult,
): PersonalSpaceState {
  const deleted = deletePersonalSpaceAsset(state, assetId, {
    resourcesDeleted: result.attemptedResourceDeletion ? result.resourcesDeleted : false,
  })
  if (!result.attemptedResourceDeletion || result.pendingDeletedPaths.length === 0) return deleted
  return {
    ...deleted,
    pendingDeletedResourcePaths: Array.from(new Set([
      ...state.pendingDeletedResourcePaths,
      ...result.pendingDeletedPaths,
    ])),
  }
}
