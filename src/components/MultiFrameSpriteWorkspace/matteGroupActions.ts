import { message } from 'antd'

import type { FrameItem } from './types'
import {
  createResourceAssetFromUpload,
  type PersonalSpaceAsset,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  readCurrentProjectSpaceState,
} from '../PersonalSpaceWorkspace/projectSpaceState'
import { persistCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/currentProjectSpacePersistence'
import { showCurrentProjectSpaceSyncWarning } from '../PersonalSpaceWorkspace/projectSpacePersistenceMessages'
import {
  getPersonalSpaceDirectoryHandle,
  writeAssetResourcesToDirectory,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { personalSpaceDirectoryRequiredMessage } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'
import { getDesktopApi } from '../../desktopApi'

interface FrameItemsRef {
  current: FrameItem[]
}

export interface MatteGroupActionsOptions {
  framesRef: FrameItemsRef
}

function sanitizeDownloadName(value: string) {
  return (value.trim() || 'matte').replace(/[<>:"/\\|?*]+/g, '_')
}

async function saveExportFile(fileName: string, blob: Blob) {
  const api = getDesktopApi()
  if (!api) throw new Error('当前环境缺少桌面文件保存能力')
  const saved = await api.saveFile(fileName, await blob.arrayBuffer())
  if (!saved) throw new Error('未选择保存位置')
  return saved
}

async function readMatteBlob(frame: FrameItem) {
  if (!frame.matteUrl) throw new Error(`${frame.sourceName} 尚未完成抠图`)
  const response = await fetch(frame.matteUrl)
  if (!response.ok) throw new Error(`${frame.sourceName} 抠图读取失败`)
  return response.blob()
}

function getReadyMatteGroupFrames(frames: FrameItem[], groupId: string) {
  const items = frames.filter((item) => item.matteGroupId === groupId)
  if (items.length === 0) {
    message.info('没有找到这个抠图任务组')
    return null
  }
  const missing = items.find((item) => !item.matteUrl || item.processing)
  if (missing) {
    message.warning('该任务组还有图片未完成抠图，请先应用到该组所有帧并等待处理完成')
    return null
  }
  return items
}

export function createMatteGroupActions({ framesRef }: MatteGroupActionsOptions) {
  const exportMatteGroup = async (groupId: string) => {
    const items = getReadyMatteGroupFrames(framesRef.current, groupId)
    if (!items) return
    try {
      if (items.length === 1) {
        const blob = await readMatteBlob(items[0]!)
        await saveExportFile(`${sanitizeDownloadName(items[0]!.matteGroupName)}.png`, blob)
        message.success('已导出组图片')
        return
      }
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]!
        const blob = await readMatteBlob(item)
        zip.file(`${String(index + 1).padStart(3, '0')}-${sanitizeDownloadName(item.sourceName)}.png`, blob)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      await saveExportFile(`${sanitizeDownloadName(items[0]!.matteGroupName)}-抠图.zip`, zipBlob)
      message.success(`已导出 ${items.length} 张组图片`)
    } catch (error) {
      message.error(`导出组图片失败：${String(error)}`)
    }
  }

  const importMatteGroupToPersonalSpace = async (groupId: string) => {
    const items = getReadyMatteGroupFrames(framesRef.current, groupId)
    if (!items) return
    const directoryHandle = getPersonalSpaceDirectoryHandle()
    if (!directoryHandle) {
      message.warning(personalSpaceDirectoryRequiredMessage)
      return
    }
    try {
      const space = readCurrentProjectSpaceState()
      const assets: PersonalSpaceAsset[] = []
      for (const item of items) {
        const blob = await readMatteBlob(item)
        const previewUrl = URL.createObjectURL(blob)
        const baseAsset = createResourceAssetFromUpload({
          kind: 'image',
          assetSubtype: 'effect',
          name: item.sourceName,
          resourcePath: previewUrl,
          groupName: item.matteGroupName,
        })
        const asset = await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [{ name: `${baseAsset.name}.png`, data: blob }])
        assets.push(asset)
      }
      const nextSpace = {
        ...space,
        assets: [...assets, ...space.assets],
      }
      const persistence = await persistCurrentProjectSpaceState(nextSpace, {
        getDirectoryHandle: () => directoryHandle,
      })
      if (persistence.syncError) {
        showCurrentProjectSpaceSyncWarning(message, persistence.syncError)
      }
      message.success(`已成功导入 ${assets.length} 张抠图到 项目空间-素材-公共图片`)
    } catch (error) {
      message.error(`收藏到项目空间失败：${String(error)}`)
    }
  }

  return {
    exportMatteGroup,
    importMatteGroupToPersonalSpace,
  }
}
