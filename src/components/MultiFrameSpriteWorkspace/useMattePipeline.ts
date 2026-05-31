import { useCallback, useEffect, useRef, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import { chromaKey, composeFrame, loadImage } from './imagePipeline'
import {
  applyMatteParamsToFollowingFrames,
  coerceMatteDefaults,
  normalizeHexColor,
  normalizePickerColor,
  type MatteDefaults,
} from './matteModel'
import { applyComposedFrameUrl } from './model'
import { readStoredMatteDefaults, writeStoredMatteDefaults } from './storage'
import type { ComposeStyle, FrameItem, MatteParams } from './types'

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
  const [matteDefaults, setMatteDefaults] = useState<MatteDefaults>(() => readStoredMatteDefaults())
  const [matteDefaultsOpen, setMatteDefaultsOpen] = useState(false)
  const [matteDefaultsDraft, setMatteDefaultsDraft] = useState<MatteDefaults>(() => readStoredMatteDefaults())
  const timersRef = useRef(new Map<string, number>())
  const matteRunRef = useRef(new Map<string, number>())
  const composeTimersRef = useRef(new Map<string, number>())
  const composeRunRef = useRef(new Map<string, number>())

  const clearMattePipeline = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    composeTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current.clear()
    matteRunRef.current.clear()
    composeTimersRef.current.clear()
    composeRunRef.current.clear()
  }, [])

  useEffect(() => clearMattePipeline, [clearMattePipeline])

  const recomposeFrame = useCallback(
    async (id: string) => {
      const item = framesRef.current.find((x) => x.id === id)
      if (!item?.matteUrl) return
      const revision = item.matteRevision
      const runId = (composeRunRef.current.get(id) ?? 0) + 1
      composeRunRef.current.set(id, runId)
      try {
        const url = await composeFrame(item.matteUrl, canvasWidth, canvasHeight, item.layout, composeStyle)
        if (composeRunRef.current.get(id) !== runId) {
          URL.revokeObjectURL(url)
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
      } catch (e) {
        message.error(`合成失败：${String(e)}`)
      }
    },
    [canvasHeight, canvasWidth, composeStyle, framesRef, setFrames]
  )

  const scheduleCompose = useCallback(
    (id: string, delay = 120) => {
      const old = composeTimersRef.current.get(id)
      if (old) window.clearTimeout(old)
      const timer = window.setTimeout(() => {
        composeTimersRef.current.delete(id)
        void recomposeFrame(id)
      }, delay)
      composeTimersRef.current.set(id, timer)
    },
    [recomposeFrame]
  )

  const scheduleMatte = useCallback(
    (id: string) => {
      const old = timersRef.current.get(id)
      if (old) window.clearTimeout(old)
      const timer = window.setTimeout(() => {
        const item = framesRef.current.find((x) => x.id === id)
        if (!item) return
        const runId = (matteRunRef.current.get(id) ?? 0) + 1
        matteRunRef.current.set(id, runId)
        updateFrame(id, (cur) => ({ ...cur, processing: true }))
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
            updateFrame(id, (cur) => ({ ...cur, processing: false }))
            message.error(`抠图失败：${String(e)}`)
          })
      }, 120)
      timersRef.current.set(id, timer)
    },
    [framesRef, setFrames, updateFrame]
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

  const sampleColor = async (item: FrameItem, e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * item.sourceWidth)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * item.sourceHeight)
    const img = await loadImage(item.sourceUrl)
    const canvas = document.createElement('canvas')
    canvas.width = item.sourceWidth
    canvas.height = item.sourceHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(
      Math.max(0, Math.min(item.sourceWidth - 1, x)),
      Math.max(0, Math.min(item.sourceHeight - 1, y)),
      1,
      1
    ).data
    setMatteParam(item.id, 'keyColor', [data[0]!, data[1]!, data[2]!])
  }

  const openMatteDefaults = () => {
    setMatteDefaultsDraft(matteDefaults)
    setMatteDefaultsOpen(true)
  }

  const saveMatteDefaults = () => {
    const next = coerceMatteDefaults(matteDefaultsDraft)
    setMatteDefaults(next)
    try {
      writeStoredMatteDefaults(next)
    } catch {
      // 本地存储不可用时仍保留本次会话设置
    }
    setMatteDefaultsOpen(false)
    message.success('已保存抠图默认参数')
  }

  return {
    matteDefaults,
    matteDefaultsOpen,
    setMatteDefaultsOpen,
    matteDefaultsDraft,
    setMatteDefaultsDraft,
    openMatteDefaults,
    saveMatteDefaults,
    scheduleMatte,
    clearMattePipeline,
    setMatteParam,
    setCustomSpillColor,
    setCustomSpillPickerColor,
    applyMatteToFollowingFrames,
    sampleColor,
  }
}
