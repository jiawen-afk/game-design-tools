import { useCallback, useEffect, useMemo, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import type { MatteMode } from './aiMattingService'
import {
  applyMatteParamsToFrameGroup,
  applyMatteParamsToFollowingFrames,
  buildMatteFrameGroups,
  buildMatteProcessingProgress,
  normalizeHexColor,
  normalizePickerColor,
  resolvePipelineConcurrency,
} from './matteModel'
import { createMatteGroupActions } from './matteGroupActions'
import type { ComposeStyle, FrameItem, MatteParams } from './types'
import { useAiMattingSetup } from './useAiMattingSetup'
import { useMatteComposeQueue } from './useMatteComposeQueue'
import { useMatteColorPicker } from './useMatteColorPicker'
import { useMatteDefaultsWorkspace } from './useMatteDefaultsWorkspace'
import { useMatteProcessingQueue } from './useMatteProcessingQueue'

const PIPELINE_CONCURRENCY = resolvePipelineConcurrency(
  typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency
)
const CPU_AI_MATTING_CONCURRENCY = 1
const BULK_MATTE_MESSAGE_KEY = 'bulk-matte-processing'

export interface UseMattePipelineParams {
  frames: FrameItem[]
  framesRef: React.MutableRefObject<FrameItem[]>
  setFrames: React.Dispatch<React.SetStateAction<FrameItem[]>>
  updateFrame: (id: string, updater: (item: FrameItem) => FrameItem) => void
  canvasWidth: number
  canvasHeight: number
  composeStyle: ComposeStyle
  composingPaused: boolean
}

export type MattePipelineViewModel = ReturnType<typeof useMattePipeline>

export function useMattePipeline({
  frames,
  framesRef,
  setFrames,
  updateFrame,
  canvasWidth,
  canvasHeight,
  composeStyle,
  composingPaused,
}: UseMattePipelineParams) {
  const matteDefaultsWorkspace = useMatteDefaultsWorkspace()
  const aiMatting = useAiMattingSetup()
  const [matteMode, setMatteModeState] = useState<MatteMode>('chroma')
  const [bulkMatteGroupId, setBulkMatteGroupId] = useState<string | null>(null)
  const { clearComposeQueue } = useMatteComposeQueue({
    frames,
    framesRef,
    setFrames,
    canvasWidth,
    canvasHeight,
    composeStyle,
    composingPaused,
    pipelineConcurrency: PIPELINE_CONCURRENCY,
  })
  const handleAiMattingUnavailable = useCallback(() => {
    setBulkMatteGroupId(null)
  }, [])
  const {
    scheduleMatte,
    clearMatteQueue,
    getQueueSnapshot,
    hasPendingQueuedIds,
  } = useMatteProcessingQueue({
    framesRef,
    setFrames,
    updateFrame,
    matteMode,
    aiMatting,
    pipelineConcurrency: PIPELINE_CONCURRENCY,
    cpuAiMattingConcurrency: CPU_AI_MATTING_CONCURRENCY,
    onAiMattingUnavailable: handleAiMattingUnavailable,
  })

  const clearMattePipeline = useCallback(() => {
    clearMatteQueue()
    clearComposeQueue()
  }, [clearComposeQueue, clearMatteQueue])

  useEffect(() => clearMattePipeline, [clearMattePipeline])

  const setMatteMode = useCallback((nextMode: MatteMode) => {
    setMatteModeState(nextMode)
    if (nextMode === 'ai' && !aiMatting.connected) {
      void aiMatting.runCheck()
      message.warning('AI 抠图服务未连接，请先启动 BiRefNet 服务。')
      return
    }
    const initialIds = buildMatteFrameGroups(framesRef.current).map((group) => group.firstFrame.id)
    initialIds.forEach((frameId) => scheduleMatte(frameId))
  }, [aiMatting.connected, aiMatting.runCheck, framesRef, scheduleMatte])

  useEffect(() => {
    if (!bulkMatteGroupId) return
    const items = framesRef.current.filter((item) => item.matteGroupId === bulkMatteGroupId)
    const groupIds = new Set(items.map((item) => item.id))
    const pendingWork =
      hasPendingQueuedIds(groupIds) ||
      items.some((item) => item.processing || !item.matteUrl)
    if (pendingWork) return
    setBulkMatteGroupId(null)
    message.open({
      key: BULK_MATTE_MESSAGE_KEY,
      type: 'success',
      content: `抠图处理完成，共 ${items.length} 帧`,
      duration: 2,
    })
  }, [bulkMatteGroupId, frames, framesRef, hasPendingQueuedIds])

  const aiMattingProgress = useMemo(() => {
    if (matteMode !== 'ai') return null
    const { delayedIds, queuedIds, activeIds } = getQueueSnapshot()
    const busyIds = new Set([...delayedIds, ...queuedIds, ...activeIds])
    const targetIds = bulkMatteGroupId
      ? frames
        .filter((item) => item.matteGroupId === bulkMatteGroupId)
        .map((item) => item.id)
      : frames
        .filter((item) => busyIds.has(item.id) || item.processing)
        .map((item) => item.id)

    return buildMatteProcessingProgress(frames, {
      targetIds,
      activeIds,
      queuedIds,
      delayedIds,
    })
  }, [bulkMatteGroupId, frames, getQueueSnapshot, matteMode])

  const setMatteParam = <K extends keyof MatteParams>(id: string, key: K, value: MatteParams[K]) => {
    updateFrame(id, (item) => ({ ...item, matte: { ...item.matte, [key]: value } }))
    scheduleMatte(id)
  }
  const { sampleColor } = useMatteColorPicker({ setMatteParam })

  const setCustomSpillColor = (id: string, hex: string) => {
    updateFrame(id, (item) => ({
      ...item,
      matte: {
        ...item.matte,
        spillColorMode: 'custom',
        customSpillHex: normalizeHexColor(hex, item.matte.customSpillHex),
      },
    }))
    scheduleMatte(id)
  }

  const setCustomSpillPickerColor = (id: string, color: unknown, hex: string | undefined) => {
    updateFrame(id, (item) => ({
      ...item,
      matte: {
        ...item.matte,
        spillColorMode: 'custom',
        customSpillHex: normalizePickerColor(color, hex, item.matte.customSpillHex),
      },
    }))
    scheduleMatte(id)
  }

  const applyMatteToFollowingFrames = (id: string) => {
    let recomputeIds: string[] = []
    setFrames((prev) => {
      const result = applyMatteParamsToFollowingFrames(prev, id)
      recomputeIds = result.recomputeIds
      return result.frames
    })
    recomputeIds.forEach((frameId) => scheduleMatte(frameId))
    if (recomputeIds.length > 0) message.success(`已应用到后续 ${recomputeIds.length} 帧`)
  }

  const applyMatteGroupToFrames = (sourceId: string) => {
    if (matteMode === 'ai' && !aiMatting.connected) {
      void aiMatting.runCheck()
      message.warning('AI 抠图服务未连接，请先启动 BiRefNet 服务。')
      return
    }
    const source = framesRef.current.find((item) => item.id === sourceId)
    if (!source) {
      message.info('请先添加帧')
      return
    }
    const recomputeIds = applyMatteParamsToFrameGroup(framesRef.current, sourceId).recomputeIds
    if (recomputeIds.length === 0) return
    setFrames((prev) => applyMatteParamsToFrameGroup(prev, sourceId).frames)
    setBulkMatteGroupId(source.matteGroupId)
    message.open({
      key: BULK_MATTE_MESSAGE_KEY,
      type: 'loading',
      content: `正在处理全部 ${recomputeIds.length} 帧...`,
      duration: 0,
    })
    recomputeIds.forEach((frameId) => scheduleMatte(frameId))
  }

  const {
    exportMatteGroup,
    importMatteGroupToPersonalSpace,
  } = createMatteGroupActions({ framesRef })

  return {
    ...matteDefaultsWorkspace,
    matteMode,
    setMatteMode,
    aiMatting,
    aiMattingProgress,
    bulkMatteProcessing: Boolean(bulkMatteGroupId),
    bulkMatteGroupId,
    scheduleMatte,
    clearMattePipeline,
    setMatteParam,
    setCustomSpillColor,
    setCustomSpillPickerColor,
    applyMatteToFollowingFrames,
    applyMatteGroupToFrames,
    exportMatteGroup,
    importMatteGroupToPersonalSpace,
    sampleColor,
  }
}
