import { hashText, importDatePart, type PersonalSpaceAsset, storageCategoryForAsset } from './personalSpaceModel'
import {
  createNativePersonalSpaceDirectoryHandle,
  isStoredNativeDirectoryHandle,
  nativeDirectoryKind,
  restoreNativePersonalSpaceDirectoryHandle,
} from './personalSpaceNativeFileStorage'

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

export interface PersonalSpaceDirectoryHandleStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}

let currentPersonalSpaceDirectoryHandle: PersonalSpaceDirectoryHandle | null = null
const directoryHandleKey = 'personal-space-directory'

export function setPersonalSpaceDirectoryHandle(handle: PersonalSpaceDirectoryHandle | null) {
  currentPersonalSpaceDirectoryHandle = handle
}

export function getPersonalSpaceDirectoryHandle() {
  return currentPersonalSpaceDirectoryHandle
}

export function createLocalDirectoryPathStore(): PersonalSpaceDirectoryHandleStore | null {
  if (typeof localStorage === 'undefined') return null
  return {
    async get(key) {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    },
    async set(key, value) {
      localStorage.setItem(key, JSON.stringify(value))
    },
  }
}

export async function persistPersonalSpaceDirectoryHandle(
  handle: PersonalSpaceDirectoryHandle,
  store: PersonalSpaceDirectoryHandleStore | null = createLocalDirectoryPathStore(),
) {
  const storedHandle = handle.kind === nativeDirectoryKind && handle.path
    ? { kind: nativeDirectoryKind, name: handle.name, path: handle.path }
    : handle
  await store?.set(directoryHandleKey, storedHandle)
}

export async function loadPersistedPersonalSpaceDirectoryHandle(
  store: PersonalSpaceDirectoryHandleStore | null = createLocalDirectoryPathStore(),
) {
  const handle = await store?.get(directoryHandleKey)
  if (!handle) return null
  if (isStoredNativeDirectoryHandle(handle)) {
    return restoreNativePersonalSpaceDirectoryHandle(handle)
  }
  const directoryHandle = handle as PersonalSpaceDirectoryHandle
  if (directoryHandle.queryPermission) {
    const current = await directoryHandle.queryPermission({ mode: 'readwrite' })
    if (current === 'granted') return directoryHandle
  } else {
    return directoryHandle
  }
  if (directoryHandle.requestPermission) {
    const next = await directoryHandle.requestPermission({ mode: 'readwrite' })
    if (next === 'granted') return directoryHandle
  }
  return null
}

function sanitizePathPart(value: string): string {
  return (value.trim() || '未命名资源').replace(/[<>:"/\\|?*]+/g, '_')
}

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

function splitStoredPath(path: string) {
  return path.split(/[\\/]+/).filter(Boolean)
}

function relativePartsForRoot(rootName: string, storedPath: string) {
  const parts = splitStoredPath(storedPath)
  return parts[0] === rootName ? parts.slice(1) : parts
}

async function ensureDirectory(root: PersonalSpaceDirectoryHandle, parts: string[]) {
  let current = root
  for (const part of parts) {
    current = await current.getDirectoryHandle(sanitizePathPart(part), { create: true })
  }
  return current
}

async function writeFile(directory: PersonalSpaceDirectoryHandle, name: string, data: Blob) {
  const file = await directory.getFileHandle(sanitizePathPart(name), { create: true })
  const writable = await file.createWritable()
  await writable.write(data)
  await writable.close()
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

class MemoryWritableFileStream implements PersonalSpaceWritableFileStream {
  constructor(private readonly commit: (data: Blob) => void) {}

  private data = new Blob()

  async write(data: Blob) {
    this.data = data
  }

  async close() {
    this.commit(this.data)
  }
}

class MemoryFileHandle implements PersonalSpaceFileHandle {
  constructor(
    private readonly read: () => Blob,
    private readonly commit: (data: Blob) => void,
  ) {}

  async getFile() {
    return this.read()
  }

  async createWritable() {
    return new MemoryWritableFileStream(this.commit)
  }
}

export class MemoryDirectoryHandle implements PersonalSpaceDirectoryHandle {
  private readonly directories = new Map<string, MemoryDirectoryHandle>()
  private readonly files = new Map<string, Blob>()

  constructor(public readonly name: string) {}

  async getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions) {
    const clean = sanitizePathPart(name)
    const existing = this.directories.get(clean)
    if (existing) return existing
    if (!options?.create) throw new Error(`目录不存在：${clean}`)
    const directory = new MemoryDirectoryHandle(clean)
    this.directories.set(clean, directory)
    return directory
  }

  async getFileHandle(name: string, options?: FileSystemGetFileOptions) {
    const clean = sanitizePathPart(name)
    if (!options?.create && !this.files.has(clean)) throw new Error(`文件不存在：${clean}`)
    return new MemoryFileHandle(
      () => this.files.get(clean) ?? (() => { throw new Error(`文件不存在：${clean}`) })(),
      (data) => this.files.set(clean, data),
    )
  }

  async removeEntry(name: string) {
    const clean = sanitizePathPart(name)
    if (!this.files.delete(clean) && !this.directories.delete(clean)) throw new Error(`资源不存在：${clean}`)
  }

  async writeText(path: string, value: string) {
    const parts = splitStoredPath(path)
    const directory = await ensureDirectory(this, parts.slice(0, -1))
    await writeFile(directory, parts.at(-1) ?? 'resource.txt', new Blob([value]))
  }

  async readText(path: string) {
    const parts = splitStoredPath(path)
    let directory: MemoryDirectoryHandle = this
    for (const part of parts.slice(0, -1)) {
      directory = directory.directories.get(part) ?? (() => { throw new Error(`目录不存在：${part}`) })()
    }
    const file = directory.files.get(parts.at(-1) ?? '')
    if (!file) throw new Error(`文件不存在：${path}`)
    return file.text()
  }
}

export function createMemoryDirectoryHandle(name: string) {
  return new MemoryDirectoryHandle(name)
}

export { createNativePersonalSpaceDirectoryHandle }
