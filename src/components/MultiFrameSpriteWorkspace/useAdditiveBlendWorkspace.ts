import { useCallback, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import {
  resolveAdditiveTargetFrameIds,
  type AdditiveTargetFrameMode,
} from './additiveBlendModel'
import {
  applyAdditiveBlendToImage,
  type AdditiveBlendMaskRect,
} from './spriteAdditiveBlendPipeline'
import type { FrameItem } from './types'

export type AdditiveBlendRegionMode = 'brush' | 'full' | 'clear'

export interface AdditiveBlendGroupState {
  regionMode: AdditiveBlendRegionMode
  targetMode: AdditiveTargetFrameMode
  customSelectedFrameIds: string[]
  customRangeInput: string
  threshold: number
  strength: number
  brushSize: number
  maskRects: AdditiveBlendMaskRect[]
}

export interface ApplyAdditiveBlendToFramesInput {
  groupId: string
  frames: FrameItem[]
  currentFrameId: string | null
}

export interface UseAdditiveBlendWorkspaceParams {
  framesRef: React.MutableRefObject<FrameItem[]>
  setFrames: React.Dispatch<React.SetStateAction<FrameItem[]>>
}

const defaultAdditiveBlendGroupState: AdditiveBlendGroupState = {
  regionMode: 'full',
  targetMode: 'current',
  customSelectedFrameIds: [],
  customRangeInput: '',
  threshold: 0.18,
  strength: 1,
  brushSize: 18,
  maskRects: [{ x: 0, y: 0, width: 1, height: 1 }],
}

function createDefaultGroupState(): AdditiveBlendGroupState {
  return {
    ...defaultAdditiveBlendGroupState,
    customSelectedFrameIds: [],
    maskRects: defaultAdditiveBlendGroupState.maskRects.map((rect) => ({ ...rect })),
  }
}

function clampSliderValue(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useAdditiveBlendWorkspace({
  framesRef,
  setFrames,
}: UseAdditiveBlendWorkspaceParams) {
  const [groupStateById, setGroupStateById] = useState<Record<string, AdditiveBlendGroupState>>({})
  const [processingFrameIds, setProcessingFrameIds] = useState<Set<string>>(() => new Set())

  const getGroupState = useCallback((groupId: string): AdditiveBlendGroupState => (
    groupStateById[groupId] ?? createDefaultGroupState()
  ), [groupStateById])

  const updateGroupState = useCallback((
    groupId: string,
    updater: (state: AdditiveBlendGroupState) => AdditiveBlendGroupState
  ) => {
    setGroupStateById((current) => ({
      ...current,
      [groupId]: updater(current[groupId] ?? createDefaultGroupState()),
    }))
  }, [])

  const setTargetMode = useCallback((groupId: string, targetMode: AdditiveTargetFrameMode) => {
    updateGroupState(groupId, (state) => ({ ...state, targetMode }))
  }, [updateGroupState])

  const setCustomRangeInput = useCallback((groupId: string, customRangeInput: string) => {
    updateGroupState(groupId, (state) => ({ ...state, customRangeInput }))
  }, [updateGroupState])

  const setCustomSelectedFrameIds = useCallback((groupId: string, customSelectedFrameIds: string[]) => {
    updateGroupState(groupId, (state) => ({
      ...state,
      customSelectedFrameIds: [...new Set(customSelectedFrameIds)],
    }))
  }, [updateGroupState])

  const setThreshold = useCallback((groupId: string, threshold: number) => {
    updateGroupState(groupId, (state) => ({ ...state, threshold: clampSliderValue(threshold, state.threshold) }))
  }, [updateGroupState])

  const setStrength = useCallback((groupId: string, strength: number) => {
    updateGroupState(groupId, (state) => ({ ...state, strength: clampSliderValue(strength, state.strength) }))
  }, [updateGroupState])

  const setBrushSize = useCallback((groupId: string, brushSize: number) => {
    updateGroupState(groupId, (state) => ({
      ...state,
      brushSize: Math.min(120, Math.max(4, Math.round(Number.isFinite(brushSize) ? brushSize : state.brushSize))),
    }))
  }, [updateGroupState])

  const setRegionMode = useCallback((groupId: string, regionMode: AdditiveBlendRegionMode) => {
    updateGroupState(groupId, (state) => ({ ...state, regionMode }))
  }, [updateGroupState])

  const setFullMask = useCallback((groupId: string) => {
    updateGroupState(groupId, (state) => ({
      ...state,
      regionMode: 'full',
      maskRects: [{ x: 0, y: 0, width: 1, height: 1 }],
    }))
  }, [updateGroupState])

  const clearMask = useCallback((groupId: string) => {
    updateGroupState(groupId, (state) => ({
      ...state,
      regionMode: 'clear',
      maskRects: [],
    }))
  }, [updateGroupState])

  const addMaskRect = useCallback((groupId: string, rect: AdditiveBlendMaskRect) => {
    updateGroupState(groupId, (state) => ({
      ...state,
      regionMode: 'brush',
      maskRects: [...state.maskRects, rect],
    }))
  }, [updateGroupState])

  const applyToFrames = useCallback(async ({
    groupId,
    frames,
    currentFrameId,
  }: ApplyAdditiveBlendToFramesInput) => {
    const state = groupStateById[groupId] ?? createDefaultGroupState()
    if (state.maskRects.length === 0) {
      message.warning('请先选择加色去黑区域。')
      return
    }

    const target = resolveAdditiveTargetFrameIds({
      mode: state.targetMode,
      frames,
      currentFrameId,
      customSelectedFrameIds: state.customSelectedFrameIds,
      customRangeInput: state.customRangeInput,
    })
    if (target.invalidTokens.length > 0) {
      message.warning(`已忽略无效帧范围：${target.invalidTokens.join(', ')}`)
    }
    if (!target.canApply) {
      message.warning('请先选择要应用加色去黑的帧。')
      return
    }

    const targetIds = new Set(target.frameIds)
    const latestFrames = framesRef.current.filter((item) => item.matteGroupId === groupId && targetIds.has(item.id))
    const readyFrames = latestFrames.filter((item) => item.matteUrl)
    const skippedCount = latestFrames.length - readyFrames.length
    if (readyFrames.length === 0) {
      message.warning('选中的帧还没有抠图结果，请先完成抠图去背。')
      return
    }

    const readyIds = readyFrames.map((item) => item.id)
    setProcessingFrameIds((current) => new Set([...current, ...readyIds]))
    let appliedCount = 0
    try {
      for (const item of readyFrames) {
        if (!item.matteUrl) continue
        try {
          const result = await applyAdditiveBlendToImage(item.matteUrl, {
            threshold: state.threshold,
            strength: state.strength,
            maskRects: state.maskRects,
          })
          setFrames((prev) => prev.map((cur) => {
            if (cur.id !== item.id) return cur
            if (cur.matteUrl) URL.revokeObjectURL(cur.matteUrl)
            return {
              ...cur,
              matteUrl: result.url,
              matteWidth: result.width,
              matteHeight: result.height,
              matteRevision: cur.matteRevision + 1,
            }
          }))
          appliedCount += 1
        } catch (error) {
          message.error(`加色去黑失败：${getErrorMessage(error)}`)
        }
      }
    } finally {
      setProcessingFrameIds((current) => {
        const next = new Set(current)
        readyIds.forEach((id) => next.delete(id))
        return next
      })
    }

    if (skippedCount > 0) {
      message.warning(`已跳过 ${skippedCount} 帧未抠图图片。`)
    }
    if (appliedCount > 0) {
      message.success(`加色去黑完成，共 ${appliedCount} 帧。`)
    }
  }, [framesRef, groupStateById, setFrames])

  return {
    getGroupState,
    processingFrameIds,
    setTargetMode,
    setCustomRangeInput,
    setCustomSelectedFrameIds,
    setThreshold,
    setStrength,
    setBrushSize,
    setRegionMode,
    setFullMask,
    clearMask,
    addMaskRect,
    applyToFrames,
  }
}

export type AdditiveBlendWorkspaceViewModel = ReturnType<typeof useAdditiveBlendWorkspace>
