import { getDesktopApi } from '../../desktopApi'
import {
  type PersonalSpaceDirectoryHandle,
  writeBlobFileToDirectory,
} from './personalSpaceFileStorage'
import type { StoryboardZipFile } from './personalSpaceStoryboardZipBuilders'

export interface StoryboardExportResult {
  kind: 'directory' | 'file'
  path?: string
}

async function saveBlobFile(fileName: string, blob: Blob) {
  const api = getDesktopApi()
  if (!api) throw new Error('当前环境缺少桌面文件保存能力')
  const saved = await api.saveFile(fileName, await blob.arrayBuffer())
  if (!saved) throw new Error('未选择保存位置')
  return saved
}

export async function exportZipToTarget(
  zipFile: StoryboardZipFile,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<StoryboardExportResult> {
  if (directoryHandle) {
    const path = await writeBlobFileToDirectory(directoryHandle, ['剧情编排资产'], zipFile.fileName, zipFile.zipBlob)
    return { kind: 'directory', path }
  }
  const saved = await saveBlobFile(zipFile.fileName, zipFile.zipBlob)
  return { kind: 'file', path: saved.path }
}
