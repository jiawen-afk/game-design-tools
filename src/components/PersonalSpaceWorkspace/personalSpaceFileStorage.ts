import { hashText, importDatePart, type PersonalSpaceAsset, storageCategoryForAsset } from './personalSpaceModel'
import { createNativePersonalSpaceDirectoryHandle } from './personalSpaceNativeFileStorage'
import {
  ensureDirectory,
  relativePartsForRoot,
  sanitizePathPart,
  writeFile,
} from './personalSpaceDirectoryFileOps'
import { createMemoryDirectoryHandle } from './personalSpaceMemoryFileStorage'

export interface PersonalSpaceResourceFile {
  name: string
  data: Blob
}

export interface PersonalSpaceDirectoryHandle {
  name: string
  path?: string
  kind?: string
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<PersonalSpaceDirectoryHandle>
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<PersonalSpaceFileHandle>
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

export interface PersonalSpaceFileHandle {
  getFile?: () => Promise<Blob>
  createWritable(): Promise<PersonalSpaceWritableFileStream>
}

export interface PersonalSpaceWritableFileStream {
  write(data: Blob): Promise<void> | void
  close(): Promise<void> | void
}

export interface StoredResourceDeletionResult {
  deletedPaths: string[]
  pendingPaths: string[]
}

export {
  createLocalDirectoryPathStore,
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  persistPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
  type PersonalSpaceDirectoryHandleStore,
} from './personalSpaceDirectoryHandleStore'

function extensionForResource(asset: PersonalSpaceAsset, resource: PersonalSpaceResourceFile, index: number) {
  const clean = resource.name.trim()
  const ext = clean.match(/\.[^.\\/]+$/)?.[0]
  if (ext) return ext.toLowerCase()
  if (asset.kind === 'sprite') return index === 0 ? '.png' : '.json'
  if (asset.kind === 'voice') return '.wav'
  if (asset.assetSubtype === 'portrait') return '.png'
  return ''
}

async function hashResource(resource: PersonalSpaceResourceFile) {
  const buffer = await resource.data.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let text = resource.name
  for (const byte of bytes) text += String.fromCharCode(byte)
  return hashText(text).slice(0, 16)
}

async function storedResourceFileName(asset: PersonalSpaceAsset, resource: PersonalSpaceResourceFile, index: number) {
  const ext = extensionForResource(asset, resource, index)
  return `${await hashResource(resource)}${ext}`
}

export async function readStoredResourceBlob(root: PersonalSpaceDirectoryHandle, storedPath: string) {
  const parts = relativePartsForRoot(root.name, storedPath)
  const fileName = parts.at(-1)
  if (!fileName) throw new Error(`资源路径无效：${storedPath}`)
  let directory = root
  for (const part of parts.slice(0, -1)) {
    directory = await directory.getDirectoryHandle(part)
  }
  const file = await directory.getFileHandle(fileName)
  if (!file.getFile) throw new Error('当前目录句柄不支持读取资源文件')
  return file.getFile()
}

export async function buildStoredResourcePath(rootName: string, asset: PersonalSpaceAsset, resource: PersonalSpaceResourceFile, index = 0) {
  return [
    rootName,
    storageCategoryForAsset(asset),
    importDatePart(asset.createdAt),
    sanitizePathPart(await storedResourceFileName(asset, resource, index)),
  ].join('/')
}

export async function writeAssetResourcesToDirectory(
  root: PersonalSpaceDirectoryHandle,
  asset: PersonalSpaceAsset,
  resources: PersonalSpaceResourceFile[],
): Promise<PersonalSpaceAsset> {
  const folder = await ensureDirectory(root, [storageCategoryForAsset(asset), importDatePart(asset.createdAt)])
  const storedNames: string[] = []
  for (const [index, resource] of resources.entries()) {
    const fileName = await storedResourceFileName(asset, resource, index)
    storedNames.push(fileName)
    await writeFile(folder, fileName, resource.data)
  }
  return {
    ...asset,
    storageResourcePaths: storedNames.map((fileName) => [
      root.name,
      storageCategoryForAsset(asset),
      importDatePart(asset.createdAt),
      sanitizePathPart(fileName),
    ].join('/')),
  }
}

export async function writeAssetCoverToDirectory(
  root: PersonalSpaceDirectoryHandle,
  asset: PersonalSpaceAsset,
  resource: PersonalSpaceResourceFile,
): Promise<PersonalSpaceAsset> {
  const folder = await ensureDirectory(root, [storageCategoryForAsset(asset), importDatePart(asset.createdAt)])
  const fileName = await storedResourceFileName(asset, resource, 0)
  await writeFile(folder, fileName, resource.data)
  return {
    ...asset,
    coverStorageResourcePath: [
      root.name,
      storageCategoryForAsset(asset),
      importDatePart(asset.createdAt),
      sanitizePathPart(fileName),
    ].join('/'),
  }
}

export async function writeJsonFileToDirectory(
  root: PersonalSpaceDirectoryHandle,
  directoryParts: string[],
  fileName: string,
  data: unknown,
) {
  const folder = await ensureDirectory(root, directoryParts)
  const json = JSON.stringify(data, null, 2)
  await writeFile(folder, fileName, new Blob([json], { type: 'application/json' }))
  return [root.name, ...directoryParts.map(sanitizePathPart), sanitizePathPart(fileName)].join('/')
}

export async function writeBlobFileToDirectory(
  root: PersonalSpaceDirectoryHandle,
  directoryParts: string[],
  fileName: string,
  data: Blob,
) {
  const folder = await ensureDirectory(root, directoryParts)
  await writeFile(folder, fileName, data)
  return [root.name, ...directoryParts.map(sanitizePathPart), sanitizePathPart(fileName)].join('/')
}

export async function deleteStoredResourceFiles(
  root: PersonalSpaceDirectoryHandle,
  storedPaths: string[],
): Promise<StoredResourceDeletionResult> {
  const deletedPaths: string[] = []
  const pendingPaths: string[] = []

  for (const storedPath of storedPaths) {
    const parts = relativePartsForRoot(root.name, storedPath)
    const fileName = parts.at(-1)
    if (!fileName) {
      pendingPaths.push(storedPath)
      continue
    }
    try {
      const directory = await ensureDirectory(root, parts.slice(0, -1))
      await directory.removeEntry(fileName)
      deletedPaths.push(storedPath)
    } catch {
      pendingPaths.push(storedPath)
    }
  }

  return { deletedPaths, pendingPaths }
}

export {
  createMemoryDirectoryHandle,
  createNativePersonalSpaceDirectoryHandle,
}
