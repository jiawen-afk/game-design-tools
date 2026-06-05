import { type PersonalSpaceAsset, storageCategoryForAsset } from './personalSpaceModel'

export interface PersonalSpaceResourceFile {
  name: string
  data: Blob
}

export interface PersonalSpaceDirectoryHandle {
  name: string
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<PersonalSpaceDirectoryHandle>
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<PersonalSpaceFileHandle>
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

export interface PersonalSpaceFileHandle {
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

function openDirectoryHandleDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('game-design-tools.personal-space.handles', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('handles')
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export function createIndexedDbDirectoryHandleStore(): PersonalSpaceDirectoryHandleStore | null {
  if (typeof indexedDB === 'undefined') return null
  return {
    async get(key) {
      const db = await openDirectoryHandleDatabase()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('handles', 'readonly')
        const request = transaction.objectStore('handles').get(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result ?? null)
        transaction.oncomplete = () => db.close()
      })
    },
    async set(key, value) {
      const db = await openDirectoryHandleDatabase()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('handles', 'readwrite')
        const request = transaction.objectStore('handles').put(value, key)
        request.onerror = () => reject(request.error)
        transaction.onerror = () => reject(transaction.error)
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
      })
    },
  }
}

export async function persistPersonalSpaceDirectoryHandle(
  handle: PersonalSpaceDirectoryHandle,
  store: PersonalSpaceDirectoryHandleStore | null = createIndexedDbDirectoryHandleStore(),
) {
  await store?.set(directoryHandleKey, handle)
}

export async function loadPersistedPersonalSpaceDirectoryHandle(
  store: PersonalSpaceDirectoryHandleStore | null = createIndexedDbDirectoryHandleStore(),
) {
  const handle = await store?.get(directoryHandleKey)
  if (!handle) return null
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

export function buildStoredResourcePath(rootName: string, asset: PersonalSpaceAsset, fileName: string) {
  return [rootName, storageCategoryForAsset(asset), sanitizePathPart(asset.name), sanitizePathPart(fileName)].join('/')
}

export async function writeAssetResourcesToDirectory(
  root: PersonalSpaceDirectoryHandle,
  asset: PersonalSpaceAsset,
  resources: PersonalSpaceResourceFile[],
): Promise<PersonalSpaceAsset> {
  const folder = await ensureDirectory(root, [storageCategoryForAsset(asset), asset.name])
  for (const resource of resources) {
    await writeFile(folder, resource.name, resource.data)
  }
  return {
    ...asset,
    storageResourcePaths: resources.map((resource) => buildStoredResourcePath(root.name, asset, resource.name)),
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
  constructor(private readonly commit: (data: Blob) => void) {}

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
    return new MemoryFileHandle((data) => this.files.set(clean, data))
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
