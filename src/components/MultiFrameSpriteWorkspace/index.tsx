import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  ColorPicker,
  Divider,
  InputNumber,
  Segmented,
  Select,
  Slider,
  Space,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import {
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  HANDLE_CURSORS,
  HANDLE_SIZE,
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
} from './constants'
import { CanvasPublicParamsPanel } from './CanvasPublicParamsPanel'
import { DetailPreviewModal } from './DetailPreviewModal'
import { ExportPanel } from './ExportPanel'
import { FrameThumbnailStrip } from './FrameThumbnailStrip'
import {
  getGuideActionLabel,
  getGuideEmptyStateText,
  getGuideLineEdgeStartPosition,
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getGuideRulerLabel,
  normalizeGuideLinePosition,
  shouldIgnoreInitialGuideDrag,
} from './guideModel'
import {
  applyCanvasRatioToFrameLayouts,
  computeHandleResize,
  computeKeyboardOffset,
  computeWheelFrameResize,
  getWheelScalingButtonLabel,
  type ResizeHandle,
} from './layoutModel'
import {
  applyMatteParamsToFollowingFrames,
  coerceMatteDefaults,
  normalizeHexColor,
  normalizePickerColor,
  type MatteDefaults,
} from './matteModel'
import {
  applyComposedFrameUrl,
  buildUploadFileKey,
  coerceLayoutDefaults,
  filterNewUploadFiles,
  type LayoutDefaults,
} from './model'
import { clampInt } from './numberUtils'
import {
  chromaKey,
  composeFrame,
  createWorkspaceId,
  loadImage,
  makeFrameFromFile,
  revokeFrameUrls,
  revokeSpriteSlicePreviews,
  splitSpriteSheetToPreviews,
} from './imagePipeline'
import { MatteFrameCard } from './MatteFrameCard'
import { MatteDefaultsModal } from './MatteDefaultsModal'
import { LayoutDefaultsModal } from './LayoutDefaultsModal'
import { PlaybackPanel } from './PlaybackPanel'
import { SpriteSheetUploadPanel } from './SpriteSheetUploadPanel'
import { VideoUploadPanel } from './VideoUploadPanel'
import { useFrameWorkspaceState } from './useFrameWorkspaceState'
import { useLayoutWorkspace } from './useLayoutWorkspace'
import { useMattePipeline } from './useMattePipeline'
import { usePlaybackWorkspace } from './usePlaybackWorkspace'
import { useSpriteExport } from './useSpriteExport'
import { useVideoWorkspace } from './useVideoWorkspace'
import {
  readStoredLayoutDefaults,
  readStoredMatteDefaults,
  writeStoredLayoutDefaults,
  writeStoredMatteDefaults,
} from './storage'
import type {
  ComposeStyle,
  DragState,
  FrameItem,
  FrameLayout,
  GuideAxis,
  GuideDragState,
  GuideLine,
  MatteParams,
  SpriteSheetDraft,
  SpriteSlicePreview,
} from './types'
import './workspace.css'

const { Text, Title } = Typography

const RATIO_GROUP_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'nowrap',
  whiteSpace: 'nowrap',
  padding: '6px 8px',
  border: '1px solid #b8a898',
  borderRadius: 6,
  background: '#f7f1e8',
}
const RATIO_PERCENT_INPUT_STYLE: React.CSSProperties = { width: 56 }

export default function MultiFrameSpriteWorkspace() {
  useLayoutWorkspace()
  useMattePipeline()
  const initialLayoutDefaults = useMemo(() => readStoredLayoutDefaults(), [])
  const {
    frames,
    setFrames,
    framesRef,
    activeId,
    setActiveId,
    activeFrame,
    activeFrameIndex,
    selectedFrameIds,
    setSelectedFrameIds,
    selectionAnchorId,
    setSelectionAnchorId,
    detailPreview,
    setDetailPreview,
    detailZoom,
    setDetailZoom,
    dragOrderId,
    setDragOrderId,
    updateFrame,
    appendFrames,
    removeFrame,
    clearFrames,
    reorder,
    toggleFrameHidden,
  } = useFrameWorkspaceState()
  const [canvasWidth, setCanvasWidth] = useState(initialLayoutDefaults.canvasWidth)
  const [canvasHeight, setCanvasHeight] = useState(initialLayoutDefaults.canvasHeight)
  const [dragState, setDragState] = useState<DragState>(null)
  const [guideLines, setGuideLines] = useState<GuideLine[]>([])
  const [selectedGuideLineId, setSelectedGuideLineId] = useState<string | null>(null)
  const [guideDragState, setGuideDragState] = useState<GuideDragState | null>(null)
  const [matteDefaults, setMatteDefaults] = useState<MatteDefaults>(() => readStoredMatteDefaults())
  const [matteDefaultsOpen, setMatteDefaultsOpen] = useState(false)
  const [matteDefaultsDraft, setMatteDefaultsDraft] = useState<MatteDefaults>(() => readStoredMatteDefaults())
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
  const [layoutWheelScalingEnabled, setLayoutWheelScalingEnabled] = useState(false)
  const [spriteSheetDraft, setSpriteSheetDraft] = useState<SpriteSheetDraft | null>(null)
  const [spriteRows, setSpriteRows] = useState(4)
  const [spriteColumns, setSpriteColumns] = useState(4)
  const [spriteSlices, setSpriteSlices] = useState<SpriteSlicePreview[]>([])
  const [spriteProcessing, setSpriteProcessing] = useState(false)
  const timersRef = useRef(new Map<string, number>())
  const matteRunRef = useRef(new Map<string, number>())
  const composeTimersRef = useRef(new Map<string, number>())
  const composeRunRef = useRef(new Map<string, number>())
  const layoutRafRef = useRef<number | null>(null)
  const pendingLayoutRef = useRef<{ id: string; patch: Partial<FrameLayout> } | null>(null)
  const pendingUploadKeysRef = useRef(new Set<string>())
  const canvasStageRef = useRef<HTMLDivElement | null>(null)
  const {
    fps,
    setFps,
    playbackMode,
    setPlaybackMode,
    playing,
    setPlaying,
    playIndex,
    setPlayIndex,
    setPlaybackFrameIds,
    visibleFrames,
    selectedFrameIdSet,
    playbackFrameIdSet,
    playbackFrames,
    previewFrame,
    startAllPlayback,
    startSelectedPlayback,
    batchHideSelected,
    handlePlaybackRowDragStart,
    handlePlaybackRowDrop,
    handlePlaybackRowToggleHidden,
    selectFrameTag,
  } = usePlaybackWorkspace({
    frames,
    framesRef,
    selectedFrameIds,
    selectionAnchorId,
    dragOrderId,
    setFrames,
    setSelectedFrameIds,
    setSelectionAnchorId,
    setActiveId,
    setDragOrderId,
    reorder,
    toggleFrameHidden,
  })
  const { columns, setColumns, exporting, exportAll } = useSpriteExport({
    frames,
    visibleFrames,
    canvasWidth,
    canvasHeight,
    fps,
    playbackMode,
  })

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      composeTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      if (layoutRafRef.current !== null) window.cancelAnimationFrame(layoutRafRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (spriteSheetDraft) URL.revokeObjectURL(spriteSheetDraft.sourceUrl)
    }
  }, [spriteSheetDraft])

  useEffect(() => {
    return () => revokeSpriteSlicePreviews(spriteSlices)
  }, [spriteSlices])

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
    [canvasHeight, canvasWidth, composeStyle]
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
    [updateFrame]
  )
  const {
    videoDraft,
    videoClipStart,
    videoClipEnd,
    videoFps,
    videoPlaying,
    videoLooping,
    videoLoading,
    videoExtracting,
    videoAdding,
    videoExtractProgress,
    videoOperationLabel,
    videoExtractedFrames,
    videoFramePreviewIndex,
    videoCropMode,
    setVideoCropMode,
    videoError,
    videoPreviewRef,
    videoFramePreviewBoxRef,
    videoFrameCount,
    videoLimitMessage,
    previewVideoFrame,
    videoCropImageRect,
    videoCropOutputSize,
    videoCropBox,
    handleVideoUpload,
    applyNativeVideoMetadata,
    handleVideoTimeUpdate,
    handleVideoPreviewError,
    setVideoPlaying,
    setVideoLooping,
    playVideoClip,
    setVideoClipRange,
    setVideoFps,
    resetVideoExtraction,
    resetVideoSegmentPreview,
    extractVideoFrames,
    setVideoFramePreviewIndex,
    setVideoFramePreviewPlaying,
    confirmVideoFrames,
    startVideoCropDrag,
  } = useVideoWorkspace({ matteDefaults, appendFrames, scheduleMatte })

  useEffect(() => {
    if (dragState) return
    frames.forEach((item) => {
      if (item.matteUrl && item.composedRevision !== item.matteRevision) {
        scheduleCompose(item.id)
      }
    })
  }, [dragState, frames, scheduleCompose])

  useEffect(() => {
    framesRef.current.forEach((item) => {
      if (item.matteUrl) scheduleCompose(item.id, 80)
    })
  }, [canvasHeight, canvasWidth, composeStyle, scheduleCompose])

  useEffect(() => {
    let alive = true
    if (!spriteSheetDraft) {
      setSpriteSlices([])
      return () => {
        alive = false
      }
    }
    setSpriteProcessing(true)
    void splitSpriteSheetToPreviews(spriteSheetDraft, spriteRows, spriteColumns)
      .then((previews) => {
        if (!alive) {
          revokeSpriteSlicePreviews(previews)
          return
        }
        setSpriteSlices(previews)
      })
      .catch((e) => {
        if (alive) {
          setSpriteSlices([])
          message.error(`精灵图切分失败：${String(e)}`)
        }
      })
      .finally(() => {
        if (alive) setSpriteProcessing(false)
      })
    return () => {
      alive = false
    }
  }, [spriteColumns, spriteRows, spriteSheetDraft])

  useEffect(() => {
    const ids = new Set(frames.map((item) => item.id))
    setSelectedFrameIds((prev) => prev.filter((id) => ids.has(id)))
    setSelectionAnchorId((prev) => (prev && ids.has(prev) ? prev : null))
  }, [frames])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement
      const tag = el?.tagName?.toLowerCase()
      const editingText = tag === 'input' || tag === 'textarea' || (el instanceof HTMLElement && el.isContentEditable)
      if (selectedGuideLineId && e.key === 'Delete' && !editingText) {
        e.preventDefault()
        setGuideLines((prev) => prev.filter((line) => line.id !== selectedGuideLineId))
        setSelectedGuideLineId(null)
        return
      }
      if (!activeFrame || detailPreview) return
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (editingText) return
      e.preventDefault()
      const next = computeKeyboardOffset(
        { offsetX: activeFrame.layout.offsetX, offsetY: activeFrame.layout.offsetY },
        e.key,
        e.shiftKey
      )
      setLayout(activeFrame.id, next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeFrame, detailPreview, selectedGuideLineId])

  const handleUploadChange: UploadProps['onChange'] = ({ fileList }) => {
    const incoming: File[] = []
    for (const item of fileList) {
      const file = item.originFileObj
      if (file) incoming.push(file as File)
    }
    const existingKeys = new Set(framesRef.current.map((item) => buildUploadFileKey(item.file)))
    const nextFiles = filterNewUploadFiles(incoming, {
      existingKeys,
      pendingKeys: pendingUploadKeysRef.current,
    })
    if (nextFiles.length === 0) return
    nextFiles.forEach((file) => pendingUploadKeysRef.current.add(buildUploadFileKey(file)))
    const defaults = matteDefaults
    void Promise.all(nextFiles.map((file) => makeFrameFromFile(file, defaults))).then((created) => {
      appendFrames(created)
      created.forEach((item) => scheduleMatte(item.id))
    }).finally(() => {
      nextFiles.forEach((file) => pendingUploadKeysRef.current.delete(buildUploadFileKey(file)))
    })
  }

  const handleSpriteSheetUpload = async (file: File) => {
    const sourceUrl = URL.createObjectURL(file)
    try {
      const img = await loadImage(sourceUrl)
      setSpriteSheetDraft({
        file,
        sourceUrl,
        sourceName: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    } catch (e) {
      URL.revokeObjectURL(sourceUrl)
      message.error(`精灵图读取失败：${String(e)}`)
    }
  }

  const confirmSpriteSheetSplit = async () => {
    if (spriteSlices.length === 0) return
    setSpriteProcessing(true)
    try {
      const defaults = matteDefaults
      const files = spriteSlices.map((slice) => new File([slice.blob], slice.name, { type: 'image/png' }))
      const created = await Promise.all(files.map((file) => makeFrameFromFile(file, defaults)))
      appendFrames(created)
      created.forEach((item) => scheduleMatte(item.id))
      message.success(`已添加 ${created.length} 帧到流程 2`)
    } catch (e) {
      message.error(`添加切分帧失败：${String(e)}`)
    } finally {
      setSpriteProcessing(false)
    }
  }

  const removeAllFrames = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    composeTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current.clear()
    matteRunRef.current.clear()
    composeTimersRef.current.clear()
    composeRunRef.current.clear()
    setPlaying(false)
    setPlayIndex(0)
    setPlaybackFrameIds([])
    clearFrames()
  }

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

  const setLayout = useCallback((id: string, patch: Partial<FrameLayout>) => {
    updateFrame(id, (item) => ({ ...item, layout: { ...item.layout, ...patch }, composedRevision: -1 }))
  }, [updateFrame])

  const scheduleLayout = useCallback(
    (id: string, patch: Partial<FrameLayout>) => {
      pendingLayoutRef.current = { id, patch }
      if (layoutRafRef.current !== null) return
      layoutRafRef.current = window.requestAnimationFrame(() => {
        const pending = pendingLayoutRef.current
        pendingLayoutRef.current = null
        layoutRafRef.current = null
        if (pending) setLayout(pending.id, pending.patch)
      })
    },
    [setLayout]
  )

  const handleLayoutWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!activeFrame) return
      const next = computeWheelFrameResize(
        { width: activeFrame.layout.width, height: activeFrame.layout.height },
        e.deltaY,
        layoutWheelScalingEnabled,
        e.shiftKey
      )
      if (!next) return
      e.preventDefault()
      e.stopPropagation()
      setLayout(activeFrame.id, next)
    },
    [activeFrame, layoutWheelScalingEnabled, setLayout]
  )

  const updateGuideLineFromPointer = useCallback(
    (id: string, axis: GuideAxis, clientX: number, clientY: number) => {
      const rect = canvasStageRef.current?.getBoundingClientRect()
      if (!rect) return
      const raw = axis === 'x'
        ? ((clientX - rect.left) / Math.max(1, rect.width)) * canvasWidth
        : ((clientY - rect.top) / Math.max(1, rect.height)) * canvasHeight
      const nextPosition = normalizeGuideLinePosition(raw, axis === 'x' ? canvasWidth : canvasHeight)
      if (nextPosition === null) {
        setGuideLines((prev) => prev.filter((line) => line.id !== id))
        setSelectedGuideLineId((selected) => (selected === id ? null : selected))
        setGuideDragState(null)
        return
      }
      setGuideLines((prev) =>
        prev.map((line) => (line.id === id ? { ...line, position: nextPosition } : line))
      )
    },
    [canvasHeight, canvasWidth]
  )

  const createGuideLine = (axis: GuideAxis, e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const id = createWorkspaceId()
    setGuideLines((prev) => [...prev, { id, axis, position: getGuideLineEdgeStartPosition() }])
    setSelectedGuideLineId(id)
    let hasEnteredCanvas = false
    const onMove = (event: PointerEvent) => {
      const rect = canvasStageRef.current?.getBoundingClientRect()
      if (!rect) return
      const raw = axis === 'x'
        ? ((event.clientX - rect.left) / Math.max(1, rect.width)) * canvasWidth
        : ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvasHeight
      const max = axis === 'x' ? canvasWidth : canvasHeight
      if (shouldIgnoreInitialGuideDrag(raw, max, hasEnteredCanvas)) return
      hasEnteredCanvas = true
      updateGuideLineFromPointer(id, axis, event.clientX, event.clientY)
    }
    const onUp = () => {
      setGuideDragState(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const addGuideLine = (axis: GuideAxis) => {
    const id = createWorkspaceId()
    const position = axis === 'x' ? Math.round(canvasWidth / 2) : Math.round(canvasHeight / 2)
    setGuideLines((prev) => [...prev, { id, axis, position }])
    setSelectedGuideLineId(id)
  }

  useEffect(() => {
    if (!guideDragState) return
    const onMove = (e: PointerEvent) => {
      updateGuideLineFromPointer(guideDragState.id, guideDragState.axis, e.clientX, e.clientY)
    }
    const onUp = () => setGuideDragState(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [guideDragState, updateGuideLineFromPointer])


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
    const data = ctx.getImageData(Math.max(0, Math.min(item.sourceWidth - 1, x)), Math.max(0, Math.min(item.sourceHeight - 1, y)), 1, 1).data
    setMatteParam(item.id, 'keyColor', [data[0]!, data[1]!, data[2]!])
  }

  const applyAllCenter = () => {
    setFrames((prev) =>
      prev.map((item) => ({
        ...item,
        layout: { ...item.layout, offsetX: 0, offsetY: 0 },
        composedRevision: -1,
      }))
    )
  }

  const applyAllSize = (width: number, height: number) => {
    setFrames((prev) =>
      prev.map((item) => ({
        ...item,
        layout: { ...item.layout, width, height },
        composedRevision: -1,
      }))
    )
  }

  const applyPresetSize = (mode: string) => {
    if (frames.length === 0) return
    if (mode === 'active' && activeFrame) {
      applyAllSize(activeFrame.layout.width, activeFrame.layout.height)
      return
    }
    if (mode === 'maxBoth') {
      applyAllSize(Math.max(...frames.map((f) => f.layout.width)), Math.max(...frames.map((f) => f.layout.height)))
      return
    }
    if (mode === 'maxWidth') {
      const w = Math.max(...frames.map((f) => f.layout.width))
      setFrames((prev) =>
        prev.map((item) => {
          const ratio = item.matteWidth / Math.max(1, item.matteHeight)
          return {
            ...item,
            layout: { ...item.layout, width: w, height: Math.max(1, Math.round(w / ratio)) },
            composedRevision: -1,
          }
        })
      )
      return
    }
    if (mode === 'maxHeight') {
      const h = Math.max(...frames.map((f) => f.layout.height))
      setFrames((prev) =>
        prev.map((item) => {
          const ratio = item.matteWidth / Math.max(1, item.matteHeight)
          return {
            ...item,
            layout: { ...item.layout, width: Math.max(1, Math.round(h * ratio)), height: h },
            composedRevision: -1,
          }
        })
      )
    }
  }

  const applyCanvasRatio = (percent: number, basis: 'width' | 'height') => {
    setFrames((prev) =>
      applyCanvasRatioToFrameLayouts(prev, { canvasWidth, canvasHeight, percent, basis })
    )
  }

  const applyActiveCanvasRatio = (percent: number, basis: 'width' | 'height') => {
    if (!activeFrame) return
    setFrames((prev) =>
      applyCanvasRatioToFrameLayouts(prev, { canvasWidth, canvasHeight, percent, basis, targetId: activeFrame.id })
    )
  }

  const updateActiveRatio = (next: { percent?: number; basis?: 'width' | 'height' }) => {
    const percent = next.percent ?? activeRatioPercent
    const basis = next.basis ?? activeRatioBasis
    if (next.percent !== undefined) setActiveRatioPercent(next.percent)
    if (next.basis !== undefined) setActiveRatioBasis(next.basis)
    applyActiveCanvasRatio(percent, basis)
  }

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState) return
      const item = framesRef.current.find((x) => x.id === dragState.id)
      if (!item) return
      if (dragState.kind === 'move') {
        scheduleLayout(dragState.id, {
          offsetX: Math.round(dragState.startOffsetX + e.clientX - dragState.startX),
          offsetY: Math.round(dragState.startOffsetY + e.clientY - dragState.startY),
        })
      } else {
        const next = computeHandleResize({
          startWidth: dragState.startWidth,
          startHeight: dragState.startHeight,
          deltaX: e.clientX - dragState.startX,
          deltaY: e.clientY - dragState.startY,
          handle: dragState.handle,
          keepAspect: item.layout.keepAspect && ['nw', 'ne', 'se', 'sw'].includes(dragState.handle),
          minSize: 1,
        })
        scheduleLayout(dragState.id, next)
      }
    },
    [dragState, scheduleLayout]
  )

  useEffect(() => {
    const up = () => setDragState(null)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', up)
    }
  }, [onPointerMove])

  const uploadFileList: UploadFile[] = frames.map((item) => ({
    uid: item.id,
    name: item.sourceName,
    status: 'done',
    originFileObj: item.file as UploadFile['originFileObj'],
  }))
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ marginTop: 0 }}>多图动作精灵工作台</Title>
        <Text type="secondary">
          多图独立抠图、统一画布、逐帧缩放对齐、排序预览，并导出 Sprite Sheet ZIP。
        </Text>
      </div>

      <Card title="1. 文件上传">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Tabs
            items={[
              {
                key: 'sprite-sheet',
                label: '上传精灵图处理',
                children: (
                  <SpriteSheetUploadPanel
                    imageAccept={IMAGE_ACCEPT}
                    rows={spriteRows}
                    columns={spriteColumns}
                    processing={spriteProcessing}
                    slices={spriteSlices}
                    draft={spriteSheetDraft}
                    onUpload={(file) => void handleSpriteSheetUpload(file)}
                    onRowsChange={setSpriteRows}
                    onColumnsChange={setSpriteColumns}
                    onConfirm={() => void confirmSpriteSheetSplit()}
                  />
                ),
              },
              {
                key: 'video',
                label: '上传视频处理',
                children: (
                  <VideoUploadPanel
                    videoAccept={VIDEO_ACCEPT}
                    loading={videoLoading}
                    operationLabel={videoOperationLabel}
                    draft={videoDraft}
                    error={videoError}
                    previewRef={videoPreviewRef}
                    framePreviewBoxRef={videoFramePreviewBoxRef}
                    clipStart={videoClipStart}
                    clipEnd={videoClipEnd}
                    fps={videoFps}
                    frameCount={videoFrameCount}
                    limitMessage={videoLimitMessage}
                    playing={videoPlaying}
                    looping={videoLooping}
                    extracting={videoExtracting}
                    extractProgress={videoExtractProgress}
                    previewFrame={previewVideoFrame}
                    cropMode={videoCropMode}
                    cropImageRect={videoCropImageRect}
                    cropBox={videoCropBox}
                    cropOutputSize={videoCropOutputSize}
                    extractedFrames={videoExtractedFrames}
                    framePreviewIndex={videoFramePreviewIndex}
                    adding={videoAdding}
                    onUpload={(file) => void handleVideoUpload(file)}
                    onLoadedMetadata={applyNativeVideoMetadata}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onPreviewError={handleVideoPreviewError}
                    onPlayingChange={setVideoPlaying}
                    onLoopingChange={setVideoLooping}
                    onPlayClip={playVideoClip}
                    onClipRangeChange={setVideoClipRange}
                    onFpsChange={setVideoFps}
                    onResetExtraction={resetVideoExtraction}
                    onResetSegmentPreview={resetVideoSegmentPreview}
                    onExtractFrames={() => void extractVideoFrames()}
                    onSelectPreviewFrame={(index) => {
                      setVideoFramePreviewIndex(index)
                      setVideoFramePreviewPlaying(false)
                    }}
                    onCropModeChange={setVideoCropMode}
                    onConfirmFrames={() => void confirmVideoFrames()}
                    onStartCropDrag={startVideoCropDrag}
                  />
                ),
              },
            ]}
          />

          <Divider plain style={{ margin: '4px 0' }}>或</Divider>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Upload
              accept={IMAGE_ACCEPT.join(',')}
              multiple
              fileList={uploadFileList}
              beforeUpload={() => false}
              onChange={handleUploadChange}
              showUploadList={false}
            >
              <Button type="primary" icon={<UploadOutlined />}>批量添加图片</Button>
            </Upload>
          </div>
        </Space>
      </Card>

      <Card
        title="2. 抠图去背"
        extra={
          <Space wrap>
            <Button onClick={openMatteDefaults}>抠图参数配置</Button>
            <Button danger icon={<DeleteOutlined />} disabled={frames.length === 0} onClick={removeAllFrames}>
              移除所有图片
            </Button>
          </Space>
        }
      >
        {frames.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
            {frames.map((item, index) => (
              <MatteFrameCard
                key={item.id}
                item={item}
                index={index}
                frameCount={frames.length}
                active={activeFrame?.id === item.id}
                onActivate={setActiveId}
                onRemove={removeFrame}
                onSampleColor={(frame, event) => void sampleColor(frame, event)}
                onPreview={(url, name) => {
                  setDetailPreview({ url, name })
                  setDetailZoom(1)
                }}
                onMatteParamChange={setMatteParam}
                onApplyToFollowing={applyMatteToFollowingFrames}
                onCustomSpillPickerColor={setCustomSpillPickerColor}
                onCustomSpillColor={setCustomSpillColor}
              />
            ))}
          </div>
        ) : (
          <Text type="secondary">请先在流程 1 上传多张图片，或上传精灵图切分后添加到这里。</Text>
        )}
      </Card>

      <Card title="3. 统一画布、缩放与对齐">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <CanvasPublicParamsPanel
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            ratioPercent={canvasRatioPercent}
            ratioBasis={canvasRatioBasis}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            outlineColor={outlineColor}
            outlineWidth={outlineWidth}
            onOpenDefaults={openLayoutDefaults}
            onCanvasWidthChange={setCanvasWidth}
            onCanvasHeightChange={setCanvasHeight}
            onRatioPercentChange={setCanvasRatioPercent}
            onRatioBasisChange={setCanvasRatioBasis}
            onApplyRatio={() => applyCanvasRatio(canvasRatioPercent, canvasRatioBasis)}
            onApplyAllCenter={applyAllCenter}
            onApplyPresetSize={applyPresetSize}
            onStrokeColorChange={setStrokeColor}
            onStrokeWidthChange={setStrokeWidth}
            onOutlineColorChange={setOutlineColor}
            onOutlineWidthChange={setOutlineWidth}
          />

          <FrameThumbnailStrip frames={frames} activeId={activeFrame?.id ?? null} onSelect={setActiveId} />

          <Card size="small" title="当前图片调整">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <Space wrap>
                <Button
                  icon={layoutWheelScalingEnabled ? <LockOutlined /> : <UnlockOutlined />}
                  type={layoutWheelScalingEnabled ? 'default' : 'primary'}
                  aria-pressed={layoutWheelScalingEnabled}
                  onClick={() => setLayoutWheelScalingEnabled((value) => !value)}
                >
                  {getWheelScalingButtonLabel(layoutWheelScalingEnabled)}
                </Button>
                <Text type="secondary">
                  当前：{layoutWheelScalingEnabled ? '开放' : '禁止'}
                </Text>
                <Button size="small" onClick={() => addGuideLine('x')}>
                  {getGuideActionLabel('x')}
                </Button>
                <Button size="small" onClick={() => addGuideLine('y')}>
                  {getGuideActionLabel('y')}
                </Button>
                <Button size="small" disabled={guideLines.length === 0} onClick={() => {
                  setGuideLines([])
                  setSelectedGuideLineId(null)
                }}>
                  清空辅助线
                </Button>
              </Space>
              {activeFrame && (
                <div style={RATIO_GROUP_STYLE}>
                  <Segmented
                    value={activeRatioBasis}
                    onChange={(value) => updateActiveRatio({ basis: value as 'width' | 'height' })}
                    options={[
                      { label: '宽度', value: 'width' },
                      { label: '高度', value: 'height' },
                    ]}
                  />
                  <Text>占画布</Text>
                  <InputNumber
                    min={1}
                    max={300}
                    value={activeRatioPercent}
                    onChange={(v) => updateActiveRatio({ percent: v ?? 80 })}
                    addonAfter="%"
                    style={RATIO_PERCENT_INPUT_STYLE}
                  />
                  <Text>大小</Text>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) 150px', gap: 16, alignItems: 'start' }}>
                <div
                  onWheel={activeFrame ? handleLayoutWheel : undefined}
                  tabIndex={0}
                  style={{
                    minHeight: 540,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#d9d0c4',
                    border: '1px solid #9a8b78',
                    overflow: 'auto',
                    padding: 24,
                    outline: 'none',
                    overscrollBehavior: 'contain',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      paddingTop: 18,
                      paddingLeft: 18,
                      width: 'fit-content',
                      maxWidth: '100%',
                      isolation: 'isolate',
                      overflow: 'visible',
                    }}
                  >
                    <div
                      onPointerDown={(e) => createGuideLine(getGuideRulerDragAxis('x'), e)}
                      title="从 X 轴向下拖出横向辅助线"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 18,
                        right: 0,
                        height: 18,
                        background: '#c9bfaf',
                        border: '1px solid #9a8b78',
                        borderBottom: 0,
                        cursor: getGuideRulerCursor('x'),
                        display: 'grid',
                        placeItems: 'center',
                        color: '#574838',
                        fontSize: 11,
                        fontWeight: 600,
                        zIndex: 30,
                      }}
                    >
                      {getGuideRulerLabel('x')}
                    </div>
                    <div
                      onPointerDown={(e) => createGuideLine(getGuideRulerDragAxis('y'), e)}
                      title="从 Y 轴向右拖出竖向辅助线"
                      style={{
                        position: 'absolute',
                        top: 18,
                        left: 0,
                        bottom: 0,
                        width: 18,
                        background: '#c9bfaf',
                        border: '1px solid #9a8b78',
                        borderRight: 0,
                        cursor: getGuideRulerCursor('y'),
                        display: 'grid',
                        placeItems: 'center',
                        color: '#574838',
                        fontSize: 10,
                        fontWeight: 600,
                        writingMode: 'vertical-rl',
                        zIndex: 30,
                      }}
                    >
                      {getGuideRulerLabel('y')}
                    </div>
                    <div
                      ref={canvasStageRef}
                      onPointerDown={() => setSelectedGuideLineId(null)}
                      style={{
                        position: 'relative',
                        width: canvasWidth,
                        height: canvasHeight,
                        maxWidth: '100%',
                        maxHeight: 780,
                        background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px',
                        border: '1px solid #6b5d4d',
                        flexShrink: 0,
                        isolation: 'isolate',
                        zIndex: 10,
                      }}
                    >
                    {activeFrame && activeFrame.matteUrl ? (
                      <div
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId)
                          setDragState({
                            kind: 'move',
                            id: activeFrame.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            startOffsetX: activeFrame.layout.offsetX,
                            startOffsetY: activeFrame.layout.offsetY,
                          })
                        }}
                        style={{
                          position: 'absolute',
                          left: canvasWidth / 2 - activeFrame.layout.width / 2 + activeFrame.layout.offsetX,
                          top: canvasHeight / 2 - activeFrame.layout.height / 2 + activeFrame.layout.offsetY,
                          width: activeFrame.layout.width,
                          height: activeFrame.layout.height,
                          cursor: 'move',
                          outline: '1px solid #b55233',
                          zIndex: 2,
                        }}
                      >
                        <img
                          src={activeFrame.composedUrl ?? activeFrame.matteUrl}
                          alt="active composed"
                          draggable={false}
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                        {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map((handle) => {
                          const pos: React.CSSProperties = {
                            position: 'absolute',
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            background: '#fff',
                            border: '1px solid #b55233',
                            borderRadius: 2,
                            cursor: HANDLE_CURSORS[handle],
                          }
                          if (handle.includes('n')) pos.top = -HANDLE_SIZE / 2
                          if (handle.includes('s')) pos.bottom = -HANDLE_SIZE / 2
                          if (handle.includes('w')) pos.left = -HANDLE_SIZE / 2
                          if (handle.includes('e')) pos.right = -HANDLE_SIZE / 2
                          if (handle === 'n' || handle === 's') pos.left = `calc(50% - ${HANDLE_SIZE / 2}px)`
                          if (handle === 'e' || handle === 'w') pos.top = `calc(50% - ${HANDLE_SIZE / 2}px)`
                          return (
                            <span
                              key={handle}
                              style={pos}
                              onPointerDown={(e) => {
                                e.stopPropagation()
                                setDragState({
                                  kind: 'resize',
                                  id: activeFrame.id,
                                  handle,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  startWidth: activeFrame.layout.width,
                                  startHeight: activeFrame.layout.height,
                                })
                              }}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          padding: 24,
                          color: '#574838',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <Text type="secondary">{getGuideEmptyStateText()}</Text>
                      </div>
                    )}
                    {guideLines.map((line) => {
                      const selected = selectedGuideLineId === line.id
                      const lineColor = selected ? '#d63384' : '#ff7ab6'
                      const positionPercent = line.axis === 'x'
                        ? (line.position / Math.max(1, canvasWidth)) * 100
                        : (line.position / Math.max(1, canvasHeight)) * 100
                      return (
                        <span
                          key={`canvas-${line.id}`}
                          data-guide-line-overlay={line.axis}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            setSelectedGuideLineId(line.id)
                            setGuideDragState({ id: line.id, axis: line.axis })
                          }}
                          title="拖动辅助线，按 Delete 删除"
                          style={line.axis === 'x'
                            ? {
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `${positionPercent}%`,
                                width: 9,
                                transform: 'translateX(-50%)',
                                cursor: 'ew-resize',
                                pointerEvents: 'auto',
                                zIndex: 60,
                              }
                            : {
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${positionPercent}%`,
                                height: 9,
                                transform: 'translateY(-50%)',
                                cursor: 'ns-resize',
                                pointerEvents: 'auto',
                                zIndex: 60,
                              }}
                        >
                          <span
                            aria-hidden="true"
                            style={line.axis === 'x'
                              ? {
                                  position: 'absolute',
                                  top: 0,
                                  bottom: 0,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  borderLeft: `${selected ? 2 : 1}px dashed ${lineColor}`,
                                  pointerEvents: 'none',
                                }
                              : {
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  borderTop: `${selected ? 2 : 1}px dashed ${lineColor}`,
                                  pointerEvents: 'none',
                                }}
                          />
                        </span>
                      )
                    })}
                    </div>
                  </div>
                </div>

                <Space direction="vertical" size={12} style={{ minWidth: 0 }}>
                  {activeFrame ? (
                    <>
                      <Text strong>帧 {activeFrameIndex + 1} / {frames.length}</Text>
                      <Checkbox
                        checked={activeFrame.layout.keepAspect}
                        onChange={(e) => setLayout(activeFrame.id, { keepAspect: e.target.checked })}
                      >
                        锁定比例
                      </Checkbox>
                      <Space>
                        <Text>宽</Text>
                        <InputNumber
                          min={1}
                          max={4096}
                          value={Math.round(activeFrame.layout.width)}
                          onChange={(v) => {
                            const width = v ?? activeFrame.layout.width
                            const patch: Partial<FrameLayout> = { width }
                            if (activeFrame.layout.keepAspect) {
                              patch.height = Math.max(1, Math.round(width / (activeFrame.matteWidth / Math.max(1, activeFrame.matteHeight))))
                            }
                            setLayout(activeFrame.id, patch)
                          }}
                        />
                      </Space>
                      <Space>
                        <Text>高</Text>
                        <InputNumber
                          min={1}
                          max={4096}
                          value={Math.round(activeFrame.layout.height)}
                          onChange={(v) => {
                            const height = v ?? activeFrame.layout.height
                            const patch: Partial<FrameLayout> = { height }
                            if (activeFrame.layout.keepAspect) {
                              patch.width = Math.max(1, Math.round(height * (activeFrame.matteWidth / Math.max(1, activeFrame.matteHeight))))
                            }
                            setLayout(activeFrame.id, patch)
                          }}
                        />
                      </Space>
                      <Space>
                        <Text>X</Text>
                        <InputNumber value={activeFrame.layout.offsetX} onChange={(v) => setLayout(activeFrame.id, { offsetX: v ?? 0 })} />
                      </Space>
                      <Space>
                        <Text>Y</Text>
                        <InputNumber value={activeFrame.layout.offsetY} onChange={(v) => setLayout(activeFrame.id, { offsetY: v ?? 0 })} />
                      </Space>
                      <Button onClick={() => setLayout(activeFrame.id, { offsetX: 0, offsetY: 0 })}>当前帧居中</Button>
                    </>
                  ) : (
                    <>
                      <Text strong>当前帧：无</Text>
                      <Text type="secondary">请先在流程 1 上传或切分图片。</Text>
                    </>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    辅助线显示在画布顶层，用于定位对齐；选中后按 Delete 删除。
                  </Text>
                </Space>
              </div>
          </Card>
        </Space>
      </Card>

      <PlaybackPanel
        frames={frames}
        selectedCount={selectedFrameIds.length}
        fps={fps}
        playbackMode={playbackMode}
        playing={playing}
        previewFrame={previewFrame}
        playbackFrameCount={playbackFrames.length}
        playIndex={playIndex}
        visibleFrameCount={visibleFrames.length}
        selectedFrameIds={selectedFrameIdSet}
        playbackFrameIds={playbackFrameIdSet}
        onStartAll={startAllPlayback}
        onStartSelected={startSelectedPlayback}
        onPause={() => setPlaying(false)}
        onFpsChange={setFps}
        onPlaybackModeChange={setPlaybackMode}
        onBatchHideSelected={batchHideSelected}
        onDragStart={handlePlaybackRowDragStart}
        onDrop={handlePlaybackRowDrop}
        onSelect={selectFrameTag}
        onToggleHidden={handlePlaybackRowToggleHidden}
      />

      <ExportPanel
        columns={columns}
        visibleFrameCount={visibleFrames.length}
        exporting={exporting}
        onColumnsChange={setColumns}
        onExport={() => void exportAll()}
      />

      <Divider />
      <Text type="secondary">
        当前帧数：{frames.length}，公共画布：{canvasWidth} × {canvasHeight}
      </Text>

      <MatteDefaultsModal
        open={matteDefaultsOpen}
        draft={matteDefaultsDraft}
        onDraftChange={setMatteDefaultsDraft}
        onSave={saveMatteDefaults}
        onCancel={() => setMatteDefaultsOpen(false)}
      />

      <LayoutDefaultsModal
        open={layoutDefaultsOpen}
        draft={layoutDefaultsDraft}
        onDraftChange={setLayoutDefaultsDraft}
        onSave={saveLayoutDefaults}
        onCancel={() => setLayoutDefaultsOpen(false)}
      />

      <DetailPreviewModal
        preview={detailPreview}
        zoom={detailZoom}
        onZoomChange={setDetailZoom}
        onClose={() => setDetailPreview(null)}
      />
    </Space>
  )
}

