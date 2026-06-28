import { useCallback, useState } from 'react'

import { createWorkspaceId } from './imagePipeline'
import type { GuideAxis, GuideLine } from './types'

export interface UseLayoutGuideWorkspaceParams {
  canvasWidth: number
  canvasHeight: number
}

export function useLayoutGuideWorkspace({ canvasWidth, canvasHeight }: UseLayoutGuideWorkspaceParams) {
  const [guideLines, setGuideLines] = useState<GuideLine[]>([])
  const [selectedGuideLineId, setSelectedGuideLineId] = useState<string | null>(null)

  const addGuideLine = useCallback((axis: GuideAxis) => {
    const id = createWorkspaceId()
    const position = axis === 'x' ? Math.round(canvasWidth / 2) : Math.round(canvasHeight / 2)
    setGuideLines((prev) => [...prev, { id, axis, position }])
    setSelectedGuideLineId(id)
  }, [canvasHeight, canvasWidth])

  return {
    guideLines,
    setGuideLines,
    selectedGuideLineId,
    setSelectedGuideLineId,
    addGuideLine,
  }
}
