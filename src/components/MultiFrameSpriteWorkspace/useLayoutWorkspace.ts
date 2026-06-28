import { useRef } from 'react'
import type * as React from 'react'

import type { LayoutDefaults } from './model'
import type { ComposeStyle, DragState, FrameItem, FrameLayout, GuideAxis, GuideDragState, GuideLine } from './types'
import { useCanvasRatioApplyFeedback } from './useCanvasRatioApplyFeedback'
import { useLayoutDefaultsWorkspace } from './useLayoutDefaultsWorkspace'
import { useLayoutFrameActions } from './useLayoutFrameActions'
import { useLayoutGuideWorkspace } from './useLayoutGuideWorkspace'
import { useLayoutPointerInteractions } from './useLayoutPointerInteractions'

export interface UseLayoutWorkspaceParams {
  initialLayoutDefaults: LayoutDefaults
  frames: FrameItem[]
  activeFrame: FrameItem | null
  detailPreview: { url: string; name: string } | null
  setFrames: React.Dispatch<React.SetStateAction<FrameItem[]>>
  updateFrame: (id: string, updater: (item: FrameItem) => FrameItem) => void
}

export interface LayoutWorkspaceViewModel {
  canvasWidth: number
  setCanvasWidth: React.Dispatch<React.SetStateAction<number>>
  canvasHeight: number
  setCanvasHeight: React.Dispatch<React.SetStateAction<number>>
  dragState: DragState
  setDragState: React.Dispatch<React.SetStateAction<DragState>>
  guideLines: GuideLine[]
  setGuideLines: React.Dispatch<React.SetStateAction<GuideLine[]>>
  selectedGuideLineId: string | null
  setSelectedGuideLineId: React.Dispatch<React.SetStateAction<string | null>>
  setGuideDragState: React.Dispatch<React.SetStateAction<GuideDragState | null>>
  layoutDefaultsOpen: boolean
  setLayoutDefaultsOpen: React.Dispatch<React.SetStateAction<boolean>>
  layoutDefaultsDraft: LayoutDefaults
  setLayoutDefaultsDraft: React.Dispatch<React.SetStateAction<LayoutDefaults>>
  canvasRatioPercent: number
  setCanvasRatioPercent: React.Dispatch<React.SetStateAction<number>>
  canvasRatioBasis: 'width' | 'height'
  setCanvasRatioBasis: React.Dispatch<React.SetStateAction<'width' | 'height'>>
  canvasRatioApplying: boolean
  activeRatioPercent: number
  activeRatioBasis: 'width' | 'height'
  strokeColor: string
  setStrokeColor: React.Dispatch<React.SetStateAction<string>>
  strokeWidth: number
  setStrokeWidth: React.Dispatch<React.SetStateAction<number>>
  outlineColor: string
  setOutlineColor: React.Dispatch<React.SetStateAction<string>>
  outlineWidth: number
  setOutlineWidth: React.Dispatch<React.SetStateAction<number>>
  composeStyle: ComposeStyle
  layoutWheelScalingEnabled: boolean
  setLayoutWheelScalingEnabled: React.Dispatch<React.SetStateAction<boolean>>
  canvasStageRef: React.RefObject<HTMLDivElement | null>
  setLayout: (id: string, patch: Partial<FrameLayout>) => void
  handleLayoutWheel: (e: React.WheelEvent<HTMLDivElement>) => void
  createGuideLine: (axis: GuideAxis, e: React.PointerEvent<HTMLElement>) => void
  addGuideLine: (axis: GuideAxis) => void
  applyAllCenter: () => void
  applyPresetSize: (mode: string) => void
  applyCanvasRatio: (percent: number, basis: 'width' | 'height') => void
  updateActiveRatio: (next: { percent?: number; basis?: 'width' | 'height' }) => void
  openLayoutDefaults: () => void
  saveLayoutDefaults: () => void
}

export function useLayoutWorkspace({
  initialLayoutDefaults,
  frames,
  activeFrame,
  detailPreview,
  setFrames,
  updateFrame,
}: UseLayoutWorkspaceParams): LayoutWorkspaceViewModel {
  const { canvasRatioApplying, startCanvasRatioApplyFeedback } = useCanvasRatioApplyFeedback({ frames })
  const {
    canvasWidth,
    setCanvasWidth,
    canvasHeight,
    setCanvasHeight,
    layoutDefaultsOpen,
    setLayoutDefaultsOpen,
    layoutDefaultsDraft,
    setLayoutDefaultsDraft,
    canvasRatioPercent,
    setCanvasRatioPercent,
    canvasRatioBasis,
    setCanvasRatioBasis,
    activeRatioPercent,
    setActiveRatioPercent,
    activeRatioBasis,
    setActiveRatioBasis,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    outlineColor,
    setOutlineColor,
    outlineWidth,
    setOutlineWidth,
    composeStyle,
    openLayoutDefaults,
    saveLayoutDefaults,
  } = useLayoutDefaultsWorkspace({ initialLayoutDefaults })
  const {
    guideLines,
    setGuideLines,
    selectedGuideLineId,
    setSelectedGuideLineId,
    addGuideLine,
  } = useLayoutGuideWorkspace({ canvasWidth, canvasHeight })
  const {
    layoutWheelScalingEnabled,
    setLayoutWheelScalingEnabled,
    setLayout,
    scheduleLayout,
    handleLayoutWheel,
    applyAllCenter,
    applyPresetSize,
    applyCanvasRatio,
    updateActiveRatio,
  } = useLayoutFrameActions({
    frames,
    activeFrame,
    canvasWidth,
    canvasHeight,
    activeRatioPercent,
    activeRatioBasis,
    setActiveRatioPercent,
    setActiveRatioBasis,
    setFrames,
    updateFrame,
    startCanvasRatioApplyFeedback,
  })
  const canvasStageRef = useRef<HTMLDivElement | null>(null)

  const {
    dragState,
    setDragState,
    setGuideDragState,
    createGuideLine,
  } = useLayoutPointerInteractions({
    frames,
    activeFrame,
    detailPreview,
    canvasWidth,
    canvasHeight,
    canvasStageRef,
    selectedGuideLineId,
    setGuideLines,
    setSelectedGuideLineId,
    setLayout,
    scheduleLayout,
  })

  return {
    canvasWidth,
    setCanvasWidth,
    canvasHeight,
    setCanvasHeight,
    dragState,
    setDragState,
    guideLines,
    setGuideLines,
    selectedGuideLineId,
    setSelectedGuideLineId,
    setGuideDragState,
    layoutDefaultsOpen,
    setLayoutDefaultsOpen,
    layoutDefaultsDraft,
    setLayoutDefaultsDraft,
    canvasRatioPercent,
    setCanvasRatioPercent,
    canvasRatioBasis,
    setCanvasRatioBasis,
    canvasRatioApplying,
    activeRatioPercent,
    activeRatioBasis,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    outlineColor,
    setOutlineColor,
    outlineWidth,
    setOutlineWidth,
    composeStyle,
    layoutWheelScalingEnabled,
    setLayoutWheelScalingEnabled,
    canvasStageRef,
    setLayout,
    handleLayoutWheel,
    createGuideLine,
    addGuideLine,
    applyAllCenter,
    applyPresetSize,
    applyCanvasRatio,
    updateActiveRatio,
    openLayoutDefaults,
    saveLayoutDefaults,
  }
}
