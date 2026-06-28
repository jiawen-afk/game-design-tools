import { useState } from 'react'
import { message } from 'antd'

import type { PlaybackMode } from './playbackModel'
import type { FrameItem } from './types'
import {
  buildSpriteUpscaleExportPlan,
  type SpriteUpscaleExportPlan,
  type SpriteUpscaleMode,
  type SpriteUpscaleResultMap,
} from './spriteUpscaleModel'
import type { UpscaleOptions } from '../ImageProcessingWorkspace/imageUpscaleModel'
import { buildSpriteExportPackage } from './spriteExportPackage'
import { useSpriteCollectWorkflow } from './useSpriteCollectWorkflow'
import { getDesktopApi } from '../../desktopApi'

export interface UseSpriteExportParams {
  frames: FrameItem[]
  visibleFrames: FrameItem[]
  canvasWidth: number
  canvasHeight: number
  fps: number
  playbackMode: PlaybackMode
  upscaleMode?: SpriteUpscaleMode
  upscaleEnabled?: boolean
  upscaleResultsByFrameId?: SpriteUpscaleResultMap
  upscaleOptions?: UpscaleOptions
}

export type SpriteExportViewModel = ReturnType<typeof useSpriteExport>

async function saveExportFile(fileName: string, blob: Blob) {
  const api = getDesktopApi()
  if (!api) throw new Error('当前环境缺少桌面文件保存能力')
  const saved = await api.saveFile(fileName, await blob.arrayBuffer())
  if (!saved) throw new Error('未选择保存位置')
  return saved
}

export function useSpriteExport({
  frames,
  visibleFrames,
  canvasWidth,
  canvasHeight,
  fps,
  playbackMode,
  upscaleMode,
  upscaleEnabled = false,
  upscaleResultsByFrameId = {},
  upscaleOptions,
}: UseSpriteExportParams) {
  const [columns, setColumns] = useState(4)
  const [exporting, setExporting] = useState(false)

  const buildExportPlan = (): SpriteUpscaleExportPlan<FrameItem> => buildSpriteUpscaleExportPlan(
    visibleFrames,
    upscaleResultsByFrameId,
    upscaleMode ?? upscaleEnabled,
    canvasWidth,
    canvasHeight,
    upscaleOptions?.scale ?? 1
  )

  const validateExportableFrames = () => {
    if (frames.length === 0) {
      message.warning('请先上传图片')
      return null
    }
    if (visibleFrames.length === 0) {
      message.warning('没有可导出的可见帧')
      return null
    }
    const missing = visibleFrames.find((item) => !item.composedUrl)
    if (missing) {
      message.warning('仍有帧未处理完成，请稍后再导出')
      return null
    }
    const exportPlan = buildExportPlan()
    if (exportPlan.usingUpscale && exportPlan.missingFrameNames.length > 0) {
      const modeLabel = exportPlan.upscaleMode === 'input' ? '输入图高清化' : '结果图高清化'
      message.warning(`${modeLabel}已开启，请先批量高清化所有可见帧后再导出`)
      return null
    }
    return exportPlan
  }

  const exportAll = async () => {
    const exportPlan = validateExportableFrames()
    if (!exportPlan) return
    setExporting(true)
    try {
      const { default: JSZip } = await import('jszip')
      const { spriteBlob, indexJson } = await buildSpriteExportPackage({
        columns,
        visibleFrames: exportPlan.visibleFrames,
        canvasWidth: exportPlan.canvasWidth,
        canvasHeight: exportPlan.canvasHeight,
        fps,
        playbackMode,
      })
      const zip = new JSZip()
      zip.file('sprite.png', spriteBlob)
      zip.file('index.json', indexJson)
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      await saveExportFile('sprite_export.zip', zipBlob)
      message.success('已导出 ZIP')
    } catch (e) {
      message.error(`导出失败：${String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  const collectWorkflow = useSpriteCollectWorkflow({
    fps,
    columns,
    playbackMode,
    upscaleOptions,
    upscaleResultsByFrameId,
    validateExportableFrames,
    visibleFrames,
    setExporting,
  })

  return {
    columns,
    setColumns,
    exporting,
    exportAll,
    ...collectWorkflow,
  }
}
