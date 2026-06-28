import { useCallback, useEffect, useRef } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import { defaultBirefnetPort, removeImageBackground, type MatteMode } from './aiMattingService'
import { chromaKey } from './imagePipeline'
import { dequeueNextInactiveFrameId, queueUniqueFrameId } from './matteModel'
import type { FrameItem } from './types'
import type { useAiMattingSetup } from './useAiMattingSetup'

type AiMattingSetup = ReturnType<typeof useAiMattingSetup>

export interface MatteProcessingQueueSnapshot {
  delayedIds: string[]
  queuedIds: string[]
  activeIds: string[]
}

export interface UseMatteProcessingQueueParams {
  framesRef: React.MutableRefObject<FrameItem[]>
  setFrames: React.Dispatch<React.SetStateAction<FrameItem[]>>
  updateFrame: (id: string, updater: (item: FrameItem) => FrameItem) => void
  matteMode: MatteMode
  aiMatting: Pick<AiMattingSetup, 'activeDevice' | 'connected' | 'runCheck'>
  pipelineConcurrency: number
  cpuAiMattingConcurrency: number
  onAiMattingUnavailable: () => void
}

export function useMatteProcessingQueue({
  framesRef,
  setFrames,
  updateFrame,
  matteMode,
  aiMatting,
  pipelineConcurrency,
  cpuAiMattingConcurrency,
  onAiMattingUnavailable,
}: UseMatteProcessingQueueParams) {
  const timersRef = useRef(new Map<string, number>())
  const matteRunRef = useRef(new Map<string, number>())
  const matteQueueRef = useRef<string[]>([])
  const matteActiveRef = useRef(new Set<string>())
  const runMatteQueueRef = useRef<() => void>(() => undefined)

  const clearMatteQueue = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current.clear()
    matteRunRef.current.clear()
    matteQueueRef.current = []
    matteActiveRef.current.clear()
  }, [])

  useEffect(() => clearMatteQueue, [clearMatteQueue])

  const runMatteQueue = useCallback(
    () => {
      if (matteMode === 'ai' && !aiMatting.connected) {
        clearMatteQueue()
        onAiMattingUnavailable()
        setFrames((prev) => prev.map((item) => (item.processing ? { ...item, processing: false } : item)))
        void aiMatting.runCheck()
        message.warning('AI 抠图服务未连接，请先启动 BiRefNet 服务。')
        return
      }
      const matteConcurrency = matteMode === 'ai' && aiMatting.activeDevice === 'cpu'
        ? cpuAiMattingConcurrency
        : pipelineConcurrency
      while (matteActiveRef.current.size < matteConcurrency) {
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
        const matteJob = matteMode === 'ai'
          ? removeImageBackground(item.sourceUrl, { inputName: item.sourceName, port: defaultBirefnetPort })
          : chromaKey(item.sourceUrl, item.matte)
        void matteJob
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
            if (matteMode === 'ai') void aiMatting.runCheck()
            updateFrame(id, (cur) => ({ ...cur, processing: false }))
            message.error(`抠图失败：${String(e)}`)
          })
          .finally(() => {
            matteActiveRef.current.delete(id)
            runMatteQueueRef.current()
          })
      }
    },
    [
      aiMatting.activeDevice,
      aiMatting.connected,
      aiMatting.runCheck,
      clearMatteQueue,
      cpuAiMattingConcurrency,
      framesRef,
      matteMode,
      onAiMattingUnavailable,
      pipelineConcurrency,
      setFrames,
      updateFrame,
    ]
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

  const getQueueSnapshot = useCallback((): MatteProcessingQueueSnapshot => ({
    delayedIds: [...timersRef.current.keys()],
    queuedIds: [...matteQueueRef.current],
    activeIds: [...matteActiveRef.current],
  }), [])

  const hasPendingQueuedIds = useCallback((ids: Set<string>) => {
    const snapshot = getQueueSnapshot()
    return (
      snapshot.delayedIds.some((id) => ids.has(id)) ||
      snapshot.queuedIds.some((id) => ids.has(id)) ||
      snapshot.activeIds.some((id) => ids.has(id))
    )
  }, [getQueueSnapshot])

  return {
    scheduleMatte,
    clearMatteQueue,
    getQueueSnapshot,
    hasPendingQueuedIds,
  }
}
