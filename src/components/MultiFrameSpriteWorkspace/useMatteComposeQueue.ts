import { useCallback, useEffect, useRef } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import { composeFrame } from './imagePipeline'
import { dequeueNextInactiveFrameId, queueUniqueFrameId } from './matteModel'
import { applyComposedFrameUrl } from './model'
import type { ComposeStyle, FrameItem } from './types'

export interface UseMatteComposeQueueParams {
  frames: FrameItem[]
  framesRef: React.MutableRefObject<FrameItem[]>
  setFrames: React.Dispatch<React.SetStateAction<FrameItem[]>>
  canvasWidth: number
  canvasHeight: number
  composeStyle: ComposeStyle
  composingPaused: boolean
  pipelineConcurrency: number
}

export function useMatteComposeQueue({
  frames,
  framesRef,
  setFrames,
  canvasWidth,
  canvasHeight,
  composeStyle,
  composingPaused,
  pipelineConcurrency,
}: UseMatteComposeQueueParams) {
  const composeTimersRef = useRef(new Map<string, number>())
  const composeRunRef = useRef(new Map<string, number>())
  const composeQueueRef = useRef<string[]>([])
  const composeActiveRef = useRef(new Set<string>())
  const runComposeQueueRef = useRef<() => void>(() => undefined)

  const clearComposeQueue = useCallback(() => {
    composeTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    composeTimersRef.current.clear()
    composeRunRef.current.clear()
    composeQueueRef.current = []
    composeActiveRef.current.clear()
  }, [])

  useEffect(() => clearComposeQueue, [clearComposeQueue])

  const runComposeQueue = useCallback(
    () => {
      while (composeActiveRef.current.size < pipelineConcurrency) {
        const next = dequeueNextInactiveFrameId(composeQueueRef.current, composeActiveRef.current)
        composeQueueRef.current = next.queue
        if (!next.id) return
        const id = next.id
        const item = framesRef.current.find((x) => x.id === id)
        if (!item?.matteUrl) continue
        const revision = item.matteRevision
        const runId = (composeRunRef.current.get(id) ?? 0) + 1
        composeRunRef.current.set(id, runId)
        const layout = item.layout
        composeActiveRef.current.add(id)
        void composeFrame(item.matteUrl, canvasWidth, canvasHeight, layout, composeStyle)
          .then((url) => {
            const current = framesRef.current.find((x) => x.id === id)
            if (
              composeRunRef.current.get(id) !== runId ||
              !current ||
              current.matteRevision !== revision ||
              current.layout !== layout
            ) {
              URL.revokeObjectURL(url)
              if (current?.matteUrl) scheduleCompose(id, 80)
              return
            }
            setFrames((prev) =>
              applyComposedFrameUrl(prev, {
                id,
                matteRevision: revision,
                url,
                revoke: (u) => URL.revokeObjectURL(u),
              })
            )
          })
          .catch((e) => {
            message.error(`合成失败：${String(e)}`)
          })
          .finally(() => {
            composeActiveRef.current.delete(id)
            runComposeQueueRef.current()
          })
      }
    },
    [canvasHeight, canvasWidth, composeStyle, framesRef, pipelineConcurrency, setFrames]
  )

  useEffect(() => {
    runComposeQueueRef.current = runComposeQueue
  }, [runComposeQueue])

  const scheduleCompose = useCallback(
    (id: string, delay = 120) => {
      if (composeActiveRef.current.has(id) || composeQueueRef.current.includes(id)) return
      const old = composeTimersRef.current.get(id)
      if (old) window.clearTimeout(old)
      const timer = window.setTimeout(() => {
        composeTimersRef.current.delete(id)
        composeQueueRef.current = queueUniqueFrameId(composeQueueRef.current, id)
        runComposeQueueRef.current()
      }, delay)
      composeTimersRef.current.set(id, timer)
    },
    []
  )

  useEffect(() => {
    if (composingPaused) return
    frames.forEach((item) => {
      if (item.matteUrl && item.composedRevision !== item.matteRevision) {
        scheduleCompose(item.id)
      }
    })
  }, [composingPaused, frames, scheduleCompose])

  useEffect(() => {
    framesRef.current.forEach((item) => {
      if (item.matteUrl) scheduleCompose(item.id, 80)
    })
  }, [canvasHeight, canvasWidth, composeStyle, framesRef, scheduleCompose])

  return {
    scheduleCompose,
    clearComposeQueue,
  }
}
