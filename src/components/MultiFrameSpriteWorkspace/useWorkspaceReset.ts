import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export interface UseWorkspaceResetParams {
  clearMattePipeline: () => void
  clearUpscaleResults?: () => void
  setPlaying: Dispatch<SetStateAction<boolean>>
  setPlayIndex: Dispatch<SetStateAction<number>>
  setPlaybackFrameIds: Dispatch<SetStateAction<string[]>>
  clearFrames: () => void
}

export function useWorkspaceReset({
  clearMattePipeline,
  clearUpscaleResults,
  setPlaying,
  setPlayIndex,
  setPlaybackFrameIds,
  clearFrames,
}: UseWorkspaceResetParams) {
  const resetAllFrames = useCallback(() => {
    clearMattePipeline()
    clearUpscaleResults?.()
    setPlaying(false)
    setPlayIndex(0)
    setPlaybackFrameIds([])
    clearFrames()
  }, [clearFrames, clearMattePipeline, clearUpscaleResults, setPlayIndex, setPlaybackFrameIds, setPlaying])

  return { resetAllFrames }
}
