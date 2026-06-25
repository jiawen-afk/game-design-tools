import { getDesktopApi, type DesktopDirectoryInfo, type DesktopFileInfo } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import type {
  PersonalSpaceDirectoryHandle,
  PersonalSpaceFileHandle,
  PersonalSpaceWritableFileStream,
} from './personalSpaceFileStorage'

export const nativeDirectoryKind = 'desktop-native-directory'

export function isStoredNativeDirectoryHandle(handle: unknown): handle is DesktopDirectoryInfo & { kind: string } {
  return Boolean(
    handle &&
    typeof handle === 'object' &&
    (handle as { kind?: string }).kind === nativeDirectoryKind &&
    typeof (handle as { path?: string }).path === 'string' &&
    typeof (handle as { name?: string }).name === 'string',
  )
}

export async function restoreNativePersonalSpaceDirectoryHandle(handle: DesktopDirectoryInfo) {
  const api = getDesktopApi()
  if (!api) return null
  const info = await api.registerPersonalSpaceDirectory(handle.path)
  return createNativePersonalSpaceDirectoryHandle(info)
}

class NativeWritableFileStream implements PersonalSpaceWritableFileStream {
  private data = new Blob()

  constructor(private readonly filePath: string) {}

  async write(data: Blob) {
    this.data = data
  }

  async close() {
    const api = getDesktopApi()
    if (!api) throw new Error('当前环境不支持桌面文件写入')
    await api.writePersonalSpaceFile(this.filePath, await this.data.arrayBuffer())
  }
}

class NativeFileHandle implements PersonalSpaceFileHandle {
  constructor(private readonly file: DesktopFileInfo) {}

  async getFile() {
    const api = getDesktopApi()
    if (!api) throw new Error('当前环境不支持桌面文件读取')
    const result = await api.readPersonalSpaceFile(this.file.path)
    return blobFromDesktopBinaryData(result.data, '')
  }

  async createWritable() {
    return new NativeWritableFileStream(this.file.path)
  }
}

class NativeDirectoryHandle implements PersonalSpaceDirectoryHandle {
  readonly kind = nativeDirectoryKind

  constructor(private readonly directory: DesktopDirectoryInfo) {}

  get name() {
    return this.directory.name
  }

  get path() {
    return this.directory.path
  }

  async getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions) {
    const api = getDesktopApi()
    if (!api) throw new Error('当前环境不支持桌面目录管理')
    const directory = await api.ensurePersonalSpaceDirectory(this.directory.path, name, { create: options?.create })
    return new NativeDirectoryHandle(directory)
  }

  async getFileHandle(name: string, options?: FileSystemGetFileOptions) {
    const api = getDesktopApi()
    if (!api) throw new Error('当前环境不支持桌面文件管理')
    const file = await api.getPersonalSpaceFile(this.directory.path, name, { create: options?.create })
    return new NativeFileHandle(file)
  }

  async removeEntry(name: string) {
    const api = getDesktopApi()
    if (!api) throw new Error('当前环境不支持桌面资源删除')
    await api.removePersonalSpaceEntry(this.directory.path, name)
  }

  async queryPermission() {
    return 'granted' as PermissionState
  }

  async requestPermission() {
    return 'granted' as PermissionState
  }
}

export function createNativePersonalSpaceDirectoryHandle(directory: DesktopDirectoryInfo): PersonalSpaceDirectoryHandle {
  return new NativeDirectoryHandle(directory)
}
