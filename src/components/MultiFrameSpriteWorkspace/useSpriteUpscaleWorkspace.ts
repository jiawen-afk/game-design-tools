import { useCallback, useMemo, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import { executeUpscaleBatchCandidates } from '../../desktopUpscaleBatchClient'
import { revokeImageObjectUrl } from '../ImageProcessingWorkspace/imageProcessingPipeline'
import { useUpscaleRuntime } from '../ImageProcessingWorkspace/useUpscaleRuntime'
import { composeFrame } from './imagePipeline'
import {
  defaultUpscaleOptions,
  normalizeUpscaleOptions,
  type UpscaleOptions,
} from '../ImageProcessingWorkspace/imageUpscaleModel'
import {
  getCurrentSpriteUpscalePreview,
  getResultUpscaleFrameSize,
  getSpriteUpscaleModeLabel,
  getSpriteUpscaleTargetFrames,
  isSpriteUpscaleResultCurrent,
  type ActiveSpriteUpscaleMode,
  type SpriteUpscaleMode,
  type SpriteUpscaleResult,
} from './spriteUpscaleModel'
import type { ComposeStyle, FrameItem } from './types'
import { useSpriteUpscaleResults } from './useSpriteUpscaleResults'

interface SpriteUpscaleBatchProgress {
  total: number
  completed: number
  activeName: string
}

interface UseSpriteUpscaleWorkspaceParams {
  frames: FrameItem[]
  previewFrame: FrameItem | undefined
  canvasWidth: number
  canvasHeight: number
  composeStyle: ComposeStyle
}

export type SpriteUpscaleWorkspaceViewModel = ReturnType<typeof useSpriteUpscaleWorkspace>

export function useSpriteUpscaleWorkspace({
  frames,
  previewFrame,
  canvasWidth,
  canvasHeight,
  composeStyle,
}: UseSpriteUpscaleWorkspaceParams) {
  const [upscaleMode, setUpscaleMode] = useState<SpriteUpscaleMode>('off')
  const [upscaleOptions, setUpscaleOptions] = useState<UpscaleOptions>(defaultUpscaleOptions)
  const [upscaleProcessing, setUpscaleProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState<SpriteUpscaleBatchProgress>({ total: 0, completed: 0, activeName: '' })
  const upscaleEnabled = upscaleMode !== 'off'
  const {
    installUpscaleRuntime,
    queryUpscaleStatus,
    upscaleInstallProgress,
    upscaleInstalling,
    upscaleRuntimeStatus,
  } = useUpscaleRuntime({
    unavailableMessage: '当前不是桌面运行环境，无法执行高清化。',
  })
  const {
    clearUpscaleResults: clearStoredUpscaleResults,
    resultByFrameId,
    storeUpscaleResult,
  } = useSpriteUpscaleResults({ frames })

  const clearUpscaleResults = useCallback(() => {
    clearStoredUpscaleResults()
    setBatchProgress({ total: 0, completed: 0, activeName: '' })
  }, [clearStoredUpscaleResults])

  const targetFrames = useMemo(() => getSpriteUpscaleTargetFrames(frames), [frames])
  const resultUpscaleFrameSize = useMemo(
    () => getResultUpscaleFrameSize(canvasWidth, canvasHeight, upscaleOptions.scale),
    [canvasHeight, canvasWidth, upscaleOptions.scale]
  )
  const upscaleModeLabel = getSpriteUpscaleModeLabel(upscaleMode)
  const upscaledFrameCount = useMemo(
    () => targetFrames.reduce((count, frame) => (
      isSpriteUpscaleResultCurrent(frame, resultByFrameId[frame.id], upscaleMode, upscaleOptions.scale) ? count + 1 : count
    ), 0),
    [resultByFrameId, targetFrames, upscaleMode, upscaleOptions.scale]
  )
  const previewResult = useMemo(
    () => getCurrentSpriteUpscalePreview(previewFrame, resultByFrameId, upscaleMode, upscaleOptions.scale),
    [previewFrame, resultByFrameId, upscaleMode, upscaleOptions.scale]
  )
  const batchPercent = batchProgress.total > 0
    ? Math.round((batchProgress.completed / batchProgress.total) * 100)
    : 0

  const setUpscaleModeWithReset = useCallback((mode: SpriteUpscaleMode) => {
    setUpscaleMode(mode)
    clearUpscaleResults()
  }, [clearUpscaleResults])

  const setUpscaleEnabledWithReset = useCallback((enabled: boolean) => {
    setUpscaleModeWithReset(enabled ? 'input' : 'off')
  }, [setUpscaleModeWithReset])

  const getBatchMode = useCallback((): ActiveSpriteUpscaleMode => {
    return upscaleMode === 'off' ? 'input' : upscaleMode
  }, [upscaleMode])

  const updateUpscaleOptions = useCallback((patch: Partial<UpscaleOptions>) => {
    setUpscaleOptions((current) => normalizeUpscaleOptions({ ...current, ...patch }))
    clearUpscaleResults()
  }, [clearUpscaleResults])

  const runBatchUpscale = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) {
      message.warning('当前不是桌面运行环境，无法执行高清化。')
      return
    }
    if (!upscaleRuntimeStatus?.installed) {
      message.warning('请先安装高清化运行包。')
      return
    }
    const targets = getSpriteUpscaleTargetFrames(frames)
    if (targets.length === 0) {
      message.warning('没有可高清化的已处理可见帧。')
      return
    }

    const batchMode = getBatchMode()
    const batchModeLabel = getSpriteUpscaleModeLabel(batchMode)
    const resultFrameSize = getResultUpscaleFrameSize(canvasWidth, canvasHeight, upscaleOptions.scale)
    setUpscaleMode(batchMode)
    setUpscaleProcessing(true)
    setBatchProgress({ total: targets.length, completed: 0, activeName: targets[0]?.sourceName ?? '' })

    try {
      const candidates = []
      for (let index = 0; index < targets.length; index += 1) {
        const frame = targets[index]!
        if (!frame.matteUrl || !frame.composedUrl) {
          throw new Error(`${frame.sourceName} 缺少可高清化的处理结果`)
        }
        setBatchProgress({ total: targets.length, completed: index, activeName: frame.sourceName })
        const inputUrl = batchMode === 'input' ? frame.matteUrl : frame.composedUrl
        const response = await fetch(inputUrl)
        if (!response.ok) throw new Error(`${frame.sourceName} 读取失败`)
        const blob = await response.blob()
        candidates.push({
          value: {
            frame,
            matteUrl: frame.matteUrl,
            composedUrl: frame.composedUrl,
          },
          inputName: frame.sourceName,
          outputFormat: 'png' as const,
          data: await blob.arrayBuffer(),
          options: upscaleOptions,
        })
      }
      setBatchProgress({ total: targets.length, completed: 0, activeName: 'GPU 批量处理' })
      const batchResults = await executeUpscaleBatchCandidates(api, candidates)
      for (let index = 0; index < batchResults.length; index += 1) {
        const { value: source, result } = batchResults[index]!
        const { frame, matteUrl, composedUrl } = source
        setBatchProgress({ total: targets.length, completed: index, activeName: frame.sourceName })
        const upscaledBlob = blobFromDesktopBinaryData(result.data, 'image/png')
        const upscaledUrl = URL.createObjectURL(upscaledBlob)
        let upscaledSourceUrl: string | undefined
        let finalUrl = upscaledUrl
        try {
          if (batchMode === 'input') {
            upscaledSourceUrl = upscaledUrl
            finalUrl = await composeFrame(upscaledSourceUrl, canvasWidth, canvasHeight, frame.layout, composeStyle)
          }
        } catch (error) {
          revokeImageObjectUrl(upscaledUrl)
          throw error
        }
        const upscaledResult: SpriteUpscaleResult = {
          frameId: frame.id,
          mode: batchMode,
          scale: upscaleOptions.scale,
          sourceMatteUrl: matteUrl,
          matteRevision: frame.matteRevision,
          sourceComposedUrl: composedUrl,
          composedRevision: frame.composedRevision,
          upscaledSourceUrl,
          url: finalUrl,
          width: batchMode === 'output' ? resultFrameSize.width : Math.max(1, Math.round(canvasWidth)),
          height: batchMode === 'output' ? resultFrameSize.height : Math.max(1, Math.round(canvasHeight)),
        }
        storeUpscaleResult(upscaledResult)
        setBatchProgress({ total: targets.length, completed: index + 1, activeName: '' })
      }
      message.success(`已生成 ${targets.length} 帧${batchModeLabel}预览`)
    } catch (error) {
      message.error(`批量高清化失败：${String(error)}`)
    } finally {
      setUpscaleProcessing(false)
    }
  }, [canvasHeight, canvasWidth, composeStyle, frames, getBatchMode, storeUpscaleResult, upscaleOptions, upscaleRuntimeStatus])

  return {
    upscaleMode,
    setUpscaleMode: setUpscaleModeWithReset,
    upscaleEnabled,
    setUpscaleEnabled: setUpscaleEnabledWithReset,
    upscaleModeLabel,
    upscaleOptions,
    updateUpscaleOptions,
    resultUpscaleFrameSize,
    upscaleRuntimeStatus,
    upscaleInstallProgress,
    upscaleInstalling,
    upscaleProcessing,
    batchProgress,
    batchPercent,
    targetFrameCount: targetFrames.length,
    upscaledFrameCount,
    resultByFrameId,
    previewResult,
    queryUpscaleStatus,
    installUpscaleRuntime,
    runBatchUpscale,
    clearUpscaleResults,
  }
}
