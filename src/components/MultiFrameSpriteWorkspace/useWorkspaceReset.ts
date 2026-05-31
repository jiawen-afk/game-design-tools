import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export interface UseWorkspaceResetParams {
  clearMattePipeline: () => void
  setPlaying: Dispatch<SetStateAction<boolean>>
  setPlayIndex: Dispatch<SetStateAction<number>>
  setPlaybackFrameIds: Dispatch<SetStateAction<string[]>>
  clearFrames: () => void
}

export function useWorkspaceReset({
  clearMattePipeline,
  setPlaying,
  setPlayIndex,
  setPlaybackFrameIds,
  clearFrames,
}: UseWorkspaceResetParams) {
  const resetAllFrames = useCallback(() => {
    clearMattePipeline()
    setPlaying(false)
    setPlayIndex(0)
    setPlaybackFrameIds([])
    clearFrames()
  }, [clearFrames, clearMattePipeline, setPlayIndex, setPlaybackFrameIds, setPlaying])

  return { resetAllFrames }
}
