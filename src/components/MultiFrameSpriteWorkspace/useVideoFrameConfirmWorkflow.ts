import { useCallback, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import type { UniformCrop } from './cropModel'
import type { MatteDefaults } from './matteModel'
import type { ExtractedVideoFrame, FrameItem } from './types'
import { addVisibleVideoFramesToWorkspace } from './videoFrameConfirmAction'

interface UseVideoFrameConfirmWorkflowParams {
  visibleVideoExtractedFrames: ExtractedVideoFrame[]
  videoCrop: UniformCrop
  framesRef: React.RefObject<FrameItem[]>
  matteDefaults: MatteDefaults
  appendFrames: (frames: FrameItem[]) => void
  scheduleMatte: (id: string) => void
}

export function useVideoFrameConfirmWorkflow({
  visibleVideoExtractedFrames,
  videoCrop,
  framesRef,
  matteDefaults,
  appendFrames,
  scheduleMatte,
}: UseVideoFrameConfirmWorkflowParams) {
  const [videoAdding, setVideoAdding] = useState(false)

  const confirmVideoFrames = useCallback(async () => {
    if (visibleVideoExtractedFrames.length === 0) return
    setVideoAdding(true)
    try {
      const createdCount = await addVisibleVideoFramesToWorkspace({
        visibleFrames: visibleVideoExtractedFrames,
        videoCrop,
        frames: framesRef.current,
        matteDefaults,
        appendFrames,
        scheduleMatte,
      })
      message.success(`已添加 ${createdCount} 帧到流程 2`)
    } catch (e) {
      message.error(`添加视频帧失败：${String(e)}`)
    } finally {
      setVideoAdding(false)
    }
  }, [appendFrames, framesRef, matteDefaults, scheduleMatte, videoCrop, visibleVideoExtractedFrames])

  return {
    videoAdding,
    confirmVideoFrames,
  }
}
