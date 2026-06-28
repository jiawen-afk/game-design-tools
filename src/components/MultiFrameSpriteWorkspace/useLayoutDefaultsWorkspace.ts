import { useMemo, useState } from 'react'
import { message } from 'antd'

import { coerceLayoutDefaults, type LayoutDefaults } from './model'
import { writeStoredLayoutDefaults } from './storage'
import type { ComposeStyle } from './types'

interface UseLayoutDefaultsWorkspaceOptions {
  initialLayoutDefaults: LayoutDefaults
}

export function useLayoutDefaultsWorkspace({ initialLayoutDefaults }: UseLayoutDefaultsWorkspaceOptions) {
  const [canvasWidth, setCanvasWidth] = useState(initialLayoutDefaults.canvasWidth)
  const [canvasHeight, setCanvasHeight] = useState(initialLayoutDefaults.canvasHeight)
  const [layoutDefaultsOpen, setLayoutDefaultsOpen] = useState(false)
  const [layoutDefaultsDraft, setLayoutDefaultsDraft] = useState<LayoutDefaults>(initialLayoutDefaults)
  const [canvasRatioPercent, setCanvasRatioPercent] = useState(initialLayoutDefaults.ratioPercent)
  const [canvasRatioBasis, setCanvasRatioBasis] = useState<'width' | 'height'>(initialLayoutDefaults.ratioBasis)
  const [activeRatioPercent, setActiveRatioPercent] = useState(initialLayoutDefaults.ratioPercent)
  const [activeRatioBasis, setActiveRatioBasis] = useState<'width' | 'height'>(initialLayoutDefaults.ratioBasis)
  const [strokeColor, setStrokeColor] = useState(initialLayoutDefaults.strokeColor)
  const [strokeWidth, setStrokeWidth] = useState(initialLayoutDefaults.strokeWidth)
  const [outlineColor, setOutlineColor] = useState(initialLayoutDefaults.outlineColor)
  const [outlineWidth, setOutlineWidth] = useState(initialLayoutDefaults.outlineWidth)

  const composeStyle = useMemo<ComposeStyle>(
    () => ({ strokeColor, strokeWidth, outlineColor, outlineWidth }),
    [outlineColor, outlineWidth, strokeColor, strokeWidth]
  )

  const openLayoutDefaults = () => {
    setLayoutDefaultsDraft(coerceLayoutDefaults({
      canvasWidth,
      canvasHeight,
      ratioPercent: canvasRatioPercent,
      ratioBasis: canvasRatioBasis,
      strokeColor,
      strokeWidth,
      outlineColor,
      outlineWidth,
    }))
    setLayoutDefaultsOpen(true)
  }

  const saveLayoutDefaults = () => {
    const next = coerceLayoutDefaults(layoutDefaultsDraft)
    setCanvasWidth(next.canvasWidth)
    setCanvasHeight(next.canvasHeight)
    setCanvasRatioPercent(next.ratioPercent)
    setCanvasRatioBasis(next.ratioBasis)
    setActiveRatioPercent(next.ratioPercent)
    setActiveRatioBasis(next.ratioBasis)
    setStrokeColor(next.strokeColor)
    setStrokeWidth(next.strokeWidth)
    setOutlineColor(next.outlineColor)
    setOutlineWidth(next.outlineWidth)
    try {
      writeStoredLayoutDefaults(next)
    } catch {
      // 本地存储不可用时仍保留本次会话设置
    }
    setLayoutDefaultsOpen(false)
    message.success('已保存公共参数配置')
  }

  return {
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
  }
}
