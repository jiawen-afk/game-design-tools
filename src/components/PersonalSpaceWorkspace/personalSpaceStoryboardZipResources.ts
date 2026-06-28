import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'
import { buildProjectAssetResourceRef, readProjectAssetResourceBlob } from './projectAssetResourceResolver'

export interface ProjectResourceReadOptions {
  projectObjectStorage?: ProjectObjectStorage | null
  projectAssetManager?: ProjectAssetManager | null
  projectId?: string
  projectMode?: ProjectMode
}

export interface StoryboardAssetManifestEntry {
  assetId: string
  name: string
  resourcePath: string
  zipPath?: string
  error?: string
}

export interface StoryboardZipWriter {
  file: (path: string, data: string | Blob | ArrayBuffer) => unknown
}

export function sanitizeZipPart(value: string) {
  return (value.trim() || '未命名资源').replace(/[<>:"/\\|?*]+/g, '_')
}

function resourceExtension(path: string, fallback: string) {
  return path.match(/\.[^.\\/]+$/)?.[0] ?? fallback
}

async function readExportAssetResourceBlob(
  asset: PersonalSpaceAsset,
  index: number,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
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

export async function addAssetsToZip(
  zip: StoryboardZipWriter,
  assets: PersonalSpaceAsset[],
  folderName: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
) {
  const manifest: StoryboardAssetManifestEntry[] = []
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
