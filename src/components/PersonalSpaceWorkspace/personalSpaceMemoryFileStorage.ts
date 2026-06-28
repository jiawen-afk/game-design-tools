import type {
  PersonalSpaceDirectoryHandle,
  PersonalSpaceFileHandle,
  PersonalSpaceWritableFileStream,
} from './personalSpaceFileStorage'
import { ensureDirectory, sanitizePathPart, splitStoredPath, writeFile } from './personalSpaceDirectoryFileOps'

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
