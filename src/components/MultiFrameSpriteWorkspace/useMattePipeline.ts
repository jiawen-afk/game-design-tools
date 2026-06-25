import { useCallback, useEffect, useRef, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import { chromaKey, composeFrame } from './imagePipeline'
import { sampleFrameKeyColor } from './matteColorSampler'
import {
  applyMatteParamsToFrameGroup,
  applyMatteParamsToFollowingFrames,
  dequeueNextInactiveFrameId,
  normalizeHexColor,
  normalizePickerColor,
  queueUniqueFrameId,
  resolvePipelineConcurrency,
} from './matteModel'
import { createMatteGroupActions } from './matteGroupActions'
import { applyComposedFrameUrl } from './model'
import type { ComposeStyle, FrameItem, MatteParams } from './types'
import { useMatteDefaultsWorkspace } from './useMatteDefaultsWorkspace'

const PIPELINE_CONCURRENCY = resolvePipelineConcurrency(
  typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency
)
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
  const [bulkMatteGroupId, setBulkMatteGroupId] = useState<string | null>(null)
  const timersRef = useRef(new Map<string, number>())
  const matteRunRef = useRef(new Map<string, number>())
  const matteQueueRef = useRef<string[]>([])
  const matteActiveRef = useRef(new Set<string>())
  const composeTimersRef = useRef(new Map<string, number>())
  const composeRunRef = useRef(new Map<string, number>())
  const composeQueueRef = useRef<string[]>([])
  const composeActiveRef = useRef(new Set<string>())
  const runMatteQueueRef = useRef<() => void>(() => undefined)
  const runComposeQueueRef = useRef<() => void>(() => undefined)

  const clearMattePipeline = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    composeTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current.clear()
    matteRunRef.current.clear()
    matteQueueRef.current = []
    matteActiveRef.current.clear()
    composeTimersRef.current.clear()
    composeRunRef.current.clear()
    composeQueueRef.current = []
    composeActiveRef.current.clear()
  }, [])

  useEffect(() => clearMattePipeline, [clearMattePipeline])

  const runComposeQueue = useCallback(
    () => {
      while (composeActiveRef.current.size < PIPELINE_CONCURRENCY) {
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
    [canvasHeight, canvasWidth, composeStyle, framesRef, setFrames]
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

  const runMatteQueue = useCallback(
    () => {
      while (matteActiveRef.current.size < PIPELINE_CONCURRENCY) {
        const next = dequeueNextInactiveFrameId(matteQueueRef.current, matteActiveRef.current)
        matteQueueRef.current = next.queue
        if (!next.id) return
        const id = next.id
        const item = framesRef.current.find((x) => x.id === id)
        if (!item) continue
        const runId = matteRunRef.current.get(id)
        if (runId === undefined) continue
        matteActiveRef.current.add(id)
        updateFrame(id, (cur) => (cur.processing ? cur : { ...cur, processing: true }))
        void chromaKey(item.sourceUrl, item.matte)
          .then((result) => {
            if (matteRunRef.current.get(id) !== runId) {
              URL.revokeObjectURL(result.url)
              return
            }
            setFrames((prev) =>
              prev.map((cur) => {
                if (cur.id !== id) return cur
                if (cur.matteUrl) URL.revokeObjectURL(cur.matteUrl)
                return {
                  ...cur,
                  matteUrl: result.url,
                  matteWidth: result.width,
                  matteHeight: result.height,
                  matteRevision: cur.matteRevision + 1,
                  processing: false,
                }
              })
            )
          })
          .catch((e) => {
            if (matteRunRef.current.get(id) !== runId) return
            updateFrame(id, (cur) => ({ ...cur, processing: false }))
            message.error(`抠图失败：${String(e)}`)
          })
          .finally(() => {
            matteActiveRef.current.delete(id)
            runMatteQueueRef.current()
          })
      }
    },
    [framesRef, setFrames, updateFrame]
  )

  useEffect(() => {
    runMatteQueueRef.current = runMatteQueue
  }, [runMatteQueue])

  const scheduleMatte = useCallback(
    (id: string) => {
      const old = timersRef.current.get(id)
      if (old) window.clearTimeout(old)
      const timer = window.setTimeout(() => {
        timersRef.current.delete(id)
        const runId = (matteRunRef.current.get(id) ?? 0) + 1
        matteRunRef.current.set(id, runId)
        matteQueueRef.current = queueUniqueFrameId(matteQueueRef.current, id)
        runMatteQueueRef.current()
      }, 120)
      timersRef.current.set(id, timer)
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

  useEffect(() => {
    if (!bulkMatteGroupId) return
    const items = framesRef.current.filter((item) => item.matteGroupId === bulkMatteGroupId)
    const groupIds = new Set(items.map((item) => item.id))
    const pendingWork =
      [...timersRef.current.keys()].some((id) => groupIds.has(id)) ||
      matteQueueRef.current.some((id) => groupIds.has(id)) ||
      [...matteActiveRef.current].some((id) => groupIds.has(id)) ||
      items.some((item) => item.processing || !item.matteUrl)
    if (pendingWork) return
    setBulkMatteGroupId(null)
    message.open({
      key: BULK_MATTE_MESSAGE_KEY,
      type: 'success',
      content: `抠图处理完成，共 ${items.length} 帧`,
      duration: 2,
    })
  }, [bulkMatteGroupId, frames, framesRef])

  const setMatteParam = <K extends keyof MatteParams>(id: string, key: K, value: MatteParams[K]) => {
    updateFrame(id, (item) => ({ ...item, matte: { ...item.matte, [key]: value } }))
    scheduleMatte(id)
  }

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

  const sampleColor = async (item: FrameItem, e: React.MouseEvent<HTMLImageElement>) => {
    try {
      const keyColor = await sampleFrameKeyColor({
        sourceUrl: item.sourceUrl,
        sourceWidth: item.sourceWidth,
        sourceHeight: item.sourceHeight,
        clientX: e.clientX,
        clientY: e.clientY,
        previewRect: e.currentTarget.getBoundingClientRect(),
      })
      setMatteParam(item.id, 'keyColor', keyColor)
    } catch (error) {
      message.error(`取色失败：${String(error)}`)
    }
  }
  const {
    exportMatteGroup,
    importMatteGroupToPersonalSpace,
  } = createMatteGroupActions({ framesRef })

  return {
    ...matteDefaultsWorkspace,
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
