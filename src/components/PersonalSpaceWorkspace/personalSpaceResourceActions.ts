import {
  archiveAssetForStorageDirectory,
  createPortraitAssetFromUpload,
  createResourceAssetFromUpload,
  createSpriteAssetFromExport,
  deletePersonalSpaceAsset,
  exportStoryboardReference,
  storyboardReferenceFileName,
  type CommonAssetKind,
  type PersonalSpaceAsset,
  type PersonalSpaceState,
} from './personalSpaceModel'
import {
  deleteStoredResourceFiles,
  type PersonalSpaceDirectoryHandle,
  writeAssetResourcesToDirectory,
  writeBlobFileToDirectory,
} from './personalSpaceFileStorage'

export interface StoryboardExportResult {
  kind: 'directory' | 'download'
  path?: string
}

export interface AssetDeleteResult {
  attemptedResourceDeletion: boolean
  pendingDeletedPaths: string[]
  resourcesDeleted: boolean
}

function supportsDirectoryPicker() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

function sanitizeZipPart(value: string) {
  return (value.trim() || '未命名资源').replace(/[<>:"/\\|?*]+/g, '_')
}

function downloadBlobFile(fileName: string, blob: Blob) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

function resourceExtension(path: string, fallback: string) {
  return path.match(/\.[^.\\/]+$/)?.[0] ?? fallback
}

async function readAssetResourceBlob(path: string) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`读取资源失败：${response.status}`)
  return response.blob()
}

async function buildStoryboardZip(state: PersonalSpaceState, storyboardId: string) {
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
    for (const [index, resourcePath] of asset.resourcePaths.entries()) {
      const zipPath = `assets/${sanitizeZipPart(asset.kind)}/${sanitizeZipPart(asset.id)}-${index + 1}-${sanitizeZipPart(asset.name)}${resourceExtension(resourcePath, '')}`
      try {
        zip.file(zipPath, await readAssetResourceBlob(resourcePath))
        manifest.push({ assetId: asset.id, name: asset.name, resourcePath, zipPath })
      } catch (error) {
        manifest.push({ assetId: asset.id, name: asset.name, resourcePath, error: String(error) })
      }
    }
  }
  zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
  return {
    fileName: `${storyboardReferenceFileName(exported.group.name).replace(/\.json$/, '')}.zip`,
    zipBlob: await zip.generateAsync({ type: 'blob' }),
  }
}

export async function pickPersonalSpaceDirectory() {
  if (!supportsDirectoryPicker()) return null
  const picker = window as unknown as Window & {
    showDirectoryPicker: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
  }
  return (await picker.showDirectoryPicker({ mode: 'readwrite' })) as PersonalSpaceDirectoryHandle
}

export async function exportStoryboardAssetToTarget(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<StoryboardExportResult> {
  const { fileName, zipBlob } = await buildStoryboardZip(state, storyboardId)
  if (directoryHandle) {
    const path = await writeBlobFileToDirectory(directoryHandle, ['剧情编排资产'], fileName, zipBlob)
    return { kind: 'directory', path }
  }
  downloadBlobFile(fileName, zipBlob)
  return { kind: 'download' }
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
): Promise<PersonalSpaceAsset> {
  const objectUrl = URL.createObjectURL(file)
  const baseAsset = createResourceAssetFromUpload({
    kind,
    name: file.name,
    resourcePath: objectUrl,
  })
  const storedAsset = directoryHandle
    ? await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [{ name: file.name, data: file }])
    : archiveAssetForStorageDirectory(state, baseAsset)
  return storedAsset
}

export async function createSpriteAssetForUpload(
  state: PersonalSpaceState,
  files: File[],
  directoryHandle: PersonalSpaceDirectoryHandle | null,
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
