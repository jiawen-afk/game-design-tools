import {
  archiveAssetForStorageDirectory,
  createPortraitAssetFromUpload,
  createResourceAssetFromUpload,
  createSpriteAssetFromExport,
  deletePersonalSpaceAsset,
  exportStoryboardReference,
  getStoryboardLinkedCharacterIds,
  storyboardReferenceFileName,
  type CommonAssetKind,
  type CharacterProfile,
  type PersonalSpaceAsset,
  type PersonalSpaceState,
  type StoryboardReferenceExport,
} from './personalSpaceModel'
import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import {
  createNativePersonalSpaceDirectoryHandle,
  deleteStoredResourceFiles,
  readStoredResourceBlob,
  type PersonalSpaceDirectoryHandle,
  writeAssetResourcesToDirectory,
  writeBlobFileToDirectory,
} from './personalSpaceFileStorage'
import { getDesktopApi } from '../../desktopApi'
import { buildProjectAssetResourceRef, readProjectAssetResourceBlob } from './projectAssetResourceResolver'

export interface StoryboardExportResult {
  kind: 'directory' | 'file'
  path?: string
}

export interface AssetDeleteResult {
  attemptedResourceDeletion: boolean
  pendingDeletedPaths: string[]
  resourcesDeleted: boolean
}

export interface ProjectResourceReadOptions {
  projectObjectStorage?: ProjectObjectStorage | null
  projectAssetManager?: ProjectAssetManager | null
  projectId?: string
  projectMode?: ProjectMode
}

function sanitizeZipPart(value: string) {
  return (value.trim() || '未命名资源').replace(/[<>:"/\\|?*]+/g, '_')
}

async function saveBlobFile(fileName: string, blob: Blob) {
  const api = getDesktopApi()
  if (!api) throw new Error('当前环境缺少桌面文件保存能力')
  const saved = await api.saveFile(fileName, await blob.arrayBuffer())
  if (!saved) throw new Error('未选择保存位置')
  return saved
}

function resourceExtension(path: string, fallback: string) {
  return path.match(/\.[^.\\/]+$/)?.[0] ?? fallback
}

async function readExportAssetResourceBlob(
  asset: PersonalSpaceAsset,
  index: number,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: {
    projectObjectStorage?: ProjectObjectStorage | null
    projectAssetManager?: ProjectAssetManager | null
    projectId?: string
    projectMode?: ProjectMode
  } = {},
) {
  const storedPath = asset.storageResourcePaths[index]
  const resourcePath = asset.resourcePaths[index]
  const resourceRef = options.projectId && options.projectMode
    ? buildProjectAssetResourceRef({ asset, resourceIndex: index, projectId: options.projectId, projectMode: options.projectMode })
    : null
  return {
    blob: await readProjectAssetResourceBlob(storedPath, resourcePath, {
      directoryHandle,
      projectObjectStorage: options.projectObjectStorage,
      projectAssetManager: options.projectAssetManager,
      resourceRef,
    }),
    resourcePath: storedPath ?? resourcePath ?? '',
  }
}

async function buildStoryboardZip(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
) {
  const exported = exportStoryboardReference(state, storyboardId)
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('storyboard.json', JSON.stringify(exported, null, 2))
  const includedAssets = new Map<string, PersonalSpaceAsset>()
  exported.voiceAssets.forEach((asset) => includedAssets.set(asset.id, asset))
  exported.characters
    .flatMap((character) => [...character.portraitAssetIds, ...character.spriteAssetIds, ...character.voiceAssetIds])
    .forEach((assetId) => {
      const asset = state.assets.find((item) => item.id === assetId)
      if (asset) includedAssets.set(asset.id, asset)
    })
  const manifest: Array<{ assetId: string; name: string; resourcePath: string; zipPath?: string; error?: string }> = []
  for (const asset of includedAssets.values()) {
    const resourceCount = Math.max(asset.resourcePaths.length, asset.storageResourcePaths.length)
    for (let index = 0; index < resourceCount; index += 1) {
      const exportPath = asset.storageResourcePaths[index] ?? asset.resourcePaths[index] ?? ''
      const zipPath = `assets/${sanitizeZipPart(asset.kind)}/${sanitizeZipPart(asset.id)}-${index + 1}-${sanitizeZipPart(asset.name)}${resourceExtension(exportPath, '')}`
      try {
        const resource = await readExportAssetResourceBlob(asset, index, directoryHandle, options)
        zip.file(zipPath, await resource.blob.arrayBuffer())
        manifest.push({ assetId: asset.id, name: asset.name, resourcePath: resource.resourcePath, zipPath })
      } catch (error) {
        manifest.push({ assetId: asset.id, name: asset.name, resourcePath: exportPath, error: String(error) })
      }
    }
  }
  zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
  return {
    fileName: `${storyboardReferenceFileName(exported.group.name).replace(/\.json$/, '')}.zip`,
    zipBlob: await zip.generateAsync({ type: 'blob' }),
  }
}

function storyboardZipBaseName(name: string) {
  return storyboardReferenceFileName(name).replace(/\.json$/, '')
}

function findStoryboardPortraitAssets(state: PersonalSpaceState, character: CharacterProfile) {
  return character.portraitAssets
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((link) => {
      const asset = state.assets.find((item) => item.id === link.assetId)
      return asset ? [asset] : []
    })
}

function collectStoryboardVoiceAssets(state: PersonalSpaceState, exported: StoryboardReferenceExport) {
  const includedAssets = new Map<string, PersonalSpaceAsset>()
  exported.voiceAssets.forEach((asset) => includedAssets.set(asset.id, asset))
  return Array.from(includedAssets.values())
}

function collectStoryboardCharacterPortraitAssets(state: PersonalSpaceState, characters: CharacterProfile[]) {
  const includedAssets = new Map<string, PersonalSpaceAsset>()
  characters.forEach((character) => {
    findStoryboardPortraitAssets(state, character).forEach((asset) => includedAssets.set(asset.id, asset))
  })
  return Array.from(includedAssets.values())
}

async function addAssetsToZip(
  zip: { file: (path: string, data: string | Blob | ArrayBuffer) => unknown },
  assets: PersonalSpaceAsset[],
  folderName: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
) {
  const manifest: Array<{ assetId: string; name: string; resourcePath: string; zipPath?: string; error?: string }> = []
  for (const asset of assets) {
    const resourceCount = Math.max(asset.resourcePaths.length, asset.storageResourcePaths.length)
    for (let index = 0; index < resourceCount; index += 1) {
      const exportPath = asset.storageResourcePaths[index] ?? asset.resourcePaths[index] ?? ''
      const zipPath = `${folderName}/${sanitizeZipPart(asset.kind)}/${sanitizeZipPart(asset.id)}-${index + 1}-${sanitizeZipPart(asset.name)}${resourceExtension(exportPath, '')}`
      try {
        const resource = await readExportAssetResourceBlob(asset, index, directoryHandle, options)
        zip.file(zipPath, await resource.blob.arrayBuffer())
        manifest.push({ assetId: asset.id, name: asset.name, resourcePath: resource.resourcePath, zipPath })
      } catch (error) {
        manifest.push({ assetId: asset.id, name: asset.name, resourcePath: exportPath, error: String(error) })
      }
    }
  }
  return manifest
}

async function buildStoryboardVoiceAssetsZip(
  state: PersonalSpaceState,
  storyboardIds: string[],
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const exports = storyboardIds.map((id) => exportStoryboardReference(state, id))
  const manifest: Array<{ assetId: string; name: string; resourcePath: string; zipPath?: string; error?: string }> = []
  if (exports.length === 1) {
    const exported = exports[0]!
    zip.file('storyboard.json', JSON.stringify(exported, null, 2))
    manifest.push(...await addAssetsToZip(zip, collectStoryboardVoiceAssets(state, exported), 'voices', directoryHandle, options))
    zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
    return {
      fileName: `${storyboardZipBaseName(exported.group.name)}-配音资产.zip`,
      zipBlob: await zip.generateAsync({ type: 'blob' }),
    }
  }

  zip.file('storyboards.json', JSON.stringify(exports, null, 2))
  for (const exported of exports) {
    const folderName = `storyboards/${sanitizeZipPart(exported.group.name)}-${sanitizeZipPart(exported.group.id)}`
    zip.file(`${folderName}/storyboard.json`, JSON.stringify(exported, null, 2))
    manifest.push(...await addAssetsToZip(zip, collectStoryboardVoiceAssets(state, exported), `${folderName}/voices`, directoryHandle, options))
  }
  zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
  return {
    fileName: 'storyboards-all-配音资产.zip',
    zipBlob: await zip.generateAsync({ type: 'blob' }),
  }
}

async function buildStoryboardCharacterAssetsZip(
  state: PersonalSpaceState,
  storyboardIds: string[],
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const groupCharacterExports = storyboardIds.map((storyboardId) => {
    const exported = exportStoryboardReference(state, storyboardId)
    const characterIds = getStoryboardLinkedCharacterIds(state, storyboardId)
    const characters = characterIds
      .map((characterId) => state.characters.find((character) => character.id === characterId))
      .filter((character): character is CharacterProfile => Boolean(character))
    return { group: exported.group, characters }
  })
  const manifest: Array<{ assetId: string; name: string; resourcePath: string; zipPath?: string; error?: string }> = []

  if (groupCharacterExports.length === 1) {
    const exported = groupCharacterExports[0]!
    zip.file('characters.json', JSON.stringify(exported, null, 2))
    manifest.push(...await addAssetsToZip(zip, collectStoryboardCharacterPortraitAssets(state, exported.characters), 'portraits', directoryHandle, options))
    zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
    return {
      fileName: `${storyboardZipBaseName(exported.group.name)}-关联角色资产.zip`,
      zipBlob: await zip.generateAsync({ type: 'blob' }),
    }
  }

  zip.file('storyboard-characters.json', JSON.stringify(groupCharacterExports, null, 2))
  for (const exported of groupCharacterExports) {
    const folderName = `storyboards/${sanitizeZipPart(exported.group.name)}-${sanitizeZipPart(exported.group.id)}`
    zip.file(`${folderName}/characters.json`, JSON.stringify(exported, null, 2))
    manifest.push(...await addAssetsToZip(zip, collectStoryboardCharacterPortraitAssets(state, exported.characters), `${folderName}/portraits`, directoryHandle, options))
  }
  zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
  return {
    fileName: 'storyboards-all-关联角色资产.zip',
    zipBlob: await zip.generateAsync({ type: 'blob' }),
  }
}

async function exportZipToTarget(
  zipFile: { fileName: string; zipBlob: Blob },
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<StoryboardExportResult> {
  if (directoryHandle) {
    const path = await writeBlobFileToDirectory(directoryHandle, ['剧情编排资产'], zipFile.fileName, zipFile.zipBlob)
    return { kind: 'directory', path }
  }
  const saved = await saveBlobFile(zipFile.fileName, zipFile.zipBlob)
  return { kind: 'file', path: saved.path }
}

export async function pickPersonalSpaceDirectory() {
  const desktopApi = getDesktopApi()
  if (!desktopApi) return null
  const directory = await desktopApi.selectPersonalSpaceDirectory()
  return directory ? createNativePersonalSpaceDirectoryHandle(directory) : null
}

export async function exportStoryboardAssetToTarget(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardZip(state, storyboardId, directoryHandle, options), directoryHandle)
}

export async function exportStoryboardVoiceAssetsToTarget(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardVoiceAssetsZip(state, [storyboardId], directoryHandle, options), directoryHandle)
}

export async function exportStoryboardCharacterAssetsToTarget(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardCharacterAssetsZip(state, [storyboardId], directoryHandle, options), directoryHandle)
}

export async function exportAllStoryboardVoiceAssetsToTarget(
  state: PersonalSpaceState,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardVoiceAssetsZip(state, state.storyboardGroups.map((group) => group.id), directoryHandle, options), directoryHandle)
}

export async function exportAllStoryboardCharacterAssetsToTarget(
  state: PersonalSpaceState,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardCharacterAssetsZip(state, state.storyboardGroups.map((group) => group.id), directoryHandle, options), directoryHandle)
}

export async function createPortraitAssetForUpload(
  state: PersonalSpaceState,
  file: File,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<PersonalSpaceAsset> {
  const objectUrl = URL.createObjectURL(file)
  const baseAsset = createPortraitAssetFromUpload({
    name: file.name,
    portraitPath: objectUrl,
  })
  const storedAsset = directoryHandle
    ? await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [{ name: file.name || 'portrait.png', data: file }])
    : archiveAssetForStorageDirectory(state, baseAsset)
  return storedAsset
}

export async function createCommonResourceAssetForUpload(
  state: PersonalSpaceState,
  kind: CommonAssetKind,
  file: File,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  groupName?: string,
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
  return storedAsset
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
  return storedAsset
}

export async function deleteAssetWithOptionalResources(
  state: PersonalSpaceState,
  assetId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<AssetDeleteResult> {
  const asset = state.assets.find((item) => item.id === assetId)
  if (!state.settings.deleteResourcesWithContent || !asset?.storageResourcePaths.length || !directoryHandle) {
    return {
      attemptedResourceDeletion: false,
      pendingDeletedPaths: [],
      resourcesDeleted: false,
    }
  }

  const cleanup = await deleteStoredResourceFiles(directoryHandle, asset.storageResourcePaths)
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
