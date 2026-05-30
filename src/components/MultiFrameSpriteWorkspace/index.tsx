import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  ColorPicker,
  Divider,
  Input,
  InputNumber,
  Modal,
  Radio,
  Segmented,
  Select,
  Slider,
  Space,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  HolderOutlined,
  LockOutlined,
  PlayCircleOutlined,
  UnlockOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import JSZip from 'jszip'
import {
  buildMultiFrameSpriteIndex,
  applyMatteParamsToFollowingFrames,
  applyComposedFrameUrl,
  applyFrameTagSelection,
  applyCanvasRatioToFrameLayouts,
  advancePlaybackCursor,
  batchHideSelectedFrames,
  buildPlaybackFrameIds,
  buildSpriteSheetGridCells,
  buildUploadFileKey,
  clearFrameCollection,
  clampInt,
  clampPreviewZoom,
  coerceLayoutDefaults,
  coerceMatteDefaults,
  computeAutoSpriteColumns,
  computeHandleResize,
  computeKeyboardOffset,
  computeWheelFrameResize,
  filterVisibleFrames,
  filterNewUploadFiles,
  getGuideActionLabel,
  getGuideEmptyStateText,
  getGuideLineEdgeStartPosition,
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getGuideRulerLabel,
  getSpillColorHex,
  getWheelScalingButtonLabel,
  normalizeGuideLinePosition,
  resolveSpillColor,
  shouldIgnoreInitialGuideDrag,
  type PlaybackMode,
  type ResizeHandle,
  type SpillColorMode,
  type MatteDefaults,
  type LayoutDefaults,
} from './model'

const { Text, Title } = Typography

const IMAGE_ACCEPT = ['.png', '.jpg', '.jpeg', '.webp']
const HANDLE_SIZE = 12
const MATTE_DEFAULTS_STORAGE_KEY = 'gameDesignTools.multiFrameSprite.matteDefaults.v1'
const LAYOUT_DEFAULTS_STORAGE_KEY = 'gameDesignTools.multiFrameSprite.layoutDefaults.v1'
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

type MatteParams = {
  keyColor: [number, number, number]
  tolerance: number
  smoothness: number
  spill: number
  spillColorMode: SpillColorMode
  customSpillHex: string
  erosion: number
}

type FrameLayout = {
  width: number
  height: number
  keepAspect: boolean
  offsetX: number
  offsetY: number
}

type FrameItem = {
  id: string
  file: File
  sourceName: string
  sourceUrl: string
  sourceWidth: number
  sourceHeight: number
  matte: MatteParams
  matteUrl: string | null
  matteWidth: number
  matteHeight: number
  matteRevision: number
  layout: FrameLayout
  composedUrl: string | null
  composedRevision: number
  processing: boolean
  hidden: boolean
}

type SpriteSheetDraft = {
  file: File
  sourceUrl: string
  sourceName: string
  width: number
  height: number
}

type SpriteSlicePreview = {
  index: number
  name: string
  url: string
  blob: Blob
  width: number
  height: number
}

type DragState =
  | { kind: 'move'; id: string; startX: number; startY: number; startOffsetX: number; startOffsetY: number }
  | {
      kind: 'resize'
      id: string
      handle: ResizeHandle
      startX: number
      startY: number
      startWidth: number
      startHeight: number
    }
  | null

type GuideAxis = 'x' | 'y'

type GuideLine = {
  id: string
  axis: GuideAxis
  position: number
}

type GuideDragState = {
  id: string
  axis: GuideAxis
}

const DEFAULT_MATTE: MatteParams = {
  keyColor: [0, 255, 0],
  tolerance: 5,
  smoothness: 5,
  spill: 0,
  spillColorMode: 'key',
  customSpillHex: '#00ff00',
  erosion: 5,
}

function readStoredMatteDefaults(): MatteDefaults {
  try {
    const raw = localStorage.getItem(MATTE_DEFAULTS_STORAGE_KEY)
    if (!raw) return coerceMatteDefaults({})
    return coerceMatteDefaults(JSON.parse(raw) as Partial<MatteDefaults>)
  } catch {
    return coerceMatteDefaults({})
  }
}

function readStoredLayoutDefaults(): LayoutDefaults {
  try {
    const raw = localStorage.getItem(LAYOUT_DEFAULTS_STORAGE_KEY)
    if (!raw) return coerceLayoutDefaults({})
    return coerceLayoutDefaults(JSON.parse(raw) as Partial<LayoutDefaults>)
  } catch {
    return coerceLayoutDefaults({})
  }
}

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `mf-${Date.now()}-${Math.random()}`
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(clean)) return [0, 255, 0]
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('导出失败'))), 'image/png')
  })
}

function erodeAlpha(canvas: HTMLCanvasElement, passes: number): HTMLCanvasElement {
  if (passes <= 0) return canvas
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const w = canvas.width
  const h = canvas.height
  let read = ctx.getImageData(0, 0, w, h)
  let write = new ImageData(new Uint8ClampedArray(read.data), w, h)
  const dx = [-1, -1, -1, 0, 0, 1, 1, 1]
  const dy = [-1, 0, 1, -1, 1, -1, 0, 1]
  for (let p = 0; p < passes; p += 1) {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4
        write.data[i] = read.data[i]!
        write.data[i + 1] = read.data[i + 1]!
        write.data[i + 2] = read.data[i + 2]!
        let minA = read.data[i + 3]!
        for (let k = 0; k < 8; k += 1) {
          const nx = x + dx[k]!
          const ny = y + dy[k]!
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            minA = Math.min(minA, read.data[(ny * w + nx) * 4 + 3]!)
          }
        }
        write.data[i + 3] = minA
      }
    }
    ;[read, write] = [write, read]
  }
  ctx.putImageData(read, 0, 0)
  return canvas
}

async function chromaKey(sourceUrl: string, matte: MatteParams): Promise<{ url: string; width: number; height: number }> {
  const img = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const [kr, kg, kb] = matte.keyColor
  const thresh = (matte.tolerance / 100) * 100
  const smooth = 50 + (matte.smoothness / 100) * 120
  const spillStr = matte.spill / 100
  const spillColor = resolveSpillColor(matte.spillColorMode, matte.customSpillHex, matte.keyColor)
  const maxSpill = Math.max(...spillColor)
  const spillChannels = spillColor
    .map((v, idx) => (maxSpill > 0 && v === maxSpill ? idx : -1))
    .filter((idx) => idx >= 0)

  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i]!
    const g = data.data[i + 1]!
    const b = data.data[i + 2]!
    const dr = r - kr
    const dg = g - kg
    const db = b - kb
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    let alpha = 1
    if (dist <= thresh) {
      alpha = 0
    } else if (dist < thresh + smooth) {
      alpha = Math.min(1, (dist - thresh) / smooth)
    }

    if (spillStr > 0 && alpha > 0) {
      const baseMask = Math.max(0, dist - thresh)
      const spillVal = Math.pow(Math.min(1, baseMask / Math.max(1, spillStr * 120)), 1.5)
      const gray = r * 0.2126 + g * 0.7152 + b * 0.0722
      let rr = gray * (1 - spillVal) + r * spillVal
      let gg = gray * (1 - spillVal) + g * spillVal
      let bb = gray * (1 - spillVal) + b * spillVal
      const strength = Math.min(1, spillStr * (1.2 - spillVal * 0.4))
      const channels = [rr, gg, bb]
      const otherChannels = [0, 1, 2].filter((idx) => !spillChannels.includes(idx))
      const otherAvg = otherChannels.length
        ? otherChannels.reduce((sum, idx) => sum + channels[idx]!, 0) / otherChannels.length
        : gray
      for (const idx of spillChannels) {
        if (channels[idx]! > otherAvg) {
          channels[idx] = channels[idx]! - strength * (channels[idx]! - otherAvg)
        }
      }
      ;[rr, gg, bb] = channels
      data.data[i] = Math.round(Math.max(0, Math.min(255, rr)))
      data.data[i + 1] = Math.round(Math.max(0, Math.min(255, gg)))
      data.data[i + 2] = Math.round(Math.max(0, Math.min(255, bb)))
    }
    data.data[i + 3] = Math.round(alpha * 255)
  }

  ctx.putImageData(data, 0, 0)
  erodeAlpha(canvas, Math.min(5, Math.round((matte.erosion / 100) * 10)))
  return { url: URL.createObjectURL(await canvasToBlob(canvas)), width: canvas.width, height: canvas.height }
}

async function composeFrame(
  matteUrl: string,
  canvasWidth: number,
  canvasHeight: number,
  layout: FrameLayout
): Promise<string> {
  const img = await loadImage(matteUrl)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(canvasWidth))
  canvas.height = Math.max(1, Math.round(canvasHeight))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const w = Math.max(1, Math.round(layout.width))
  const h = Math.max(1, Math.round(layout.height))
  const x = Math.round(canvas.width / 2 - w / 2 + layout.offsetX)
  const y = Math.round(canvas.height / 2 - h / 2 + layout.offsetY)
  ctx.drawImage(img, x, y, w, h)
  return URL.createObjectURL(await canvasToBlob(canvas))
}

async function makeFrameFromFile(file: File, defaults: MatteDefaults): Promise<FrameItem> {
  const sourceUrl = URL.createObjectURL(file)
  const img = await loadImage(sourceUrl)
  return {
    id: uid(),
    file,
    sourceName: file.name,
    sourceUrl,
    sourceWidth: img.naturalWidth,
    sourceHeight: img.naturalHeight,
    matte: {
      ...DEFAULT_MATTE,
      tolerance: defaults.tolerance,
      smoothness: defaults.smoothness,
      spill: defaults.spill,
      erosion: defaults.erosion,
      spillColorMode: defaults.spillColorMode,
      customSpillHex: defaults.customSpillHex,
    },
    matteUrl: null,
    matteWidth: img.naturalWidth,
    matteHeight: img.naturalHeight,
    matteRevision: 0,
    layout: {
      width: img.naturalWidth,
      height: img.naturalHeight,
      keepAspect: true,
      offsetX: 0,
      offsetY: 0,
    },
    composedUrl: null,
    composedRevision: 0,
    processing: false,
    hidden: false,
  }
}

async function splitSpriteSheetToPreviews(
  draft: SpriteSheetDraft,
  rows: number,
  columns: number
): Promise<SpriteSlicePreview[]> {
  const img = await loadImage(draft.sourceUrl)
  const cells = buildSpriteSheetGridCells(draft.width, draft.height, rows, columns)
  const previews: SpriteSlicePreview[] = []
  for (const cell of cells) {
    const canvas = document.createElement('canvas')
    canvas.width = cell.width
    canvas.height = cell.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建切分预览画布')
    ctx.drawImage(img, cell.x, cell.y, cell.width, cell.height, 0, 0, cell.width, cell.height)
    const blob = await canvasToBlob(canvas)
    previews.push({
      index: cell.index,
      name: `${draft.sourceName.replace(/\.[^.]+$/, '')}_frame_${String(cell.index + 1).padStart(3, '0')}.png`,
      url: URL.createObjectURL(blob),
      blob,
      width: cell.width,
      height: cell.height,
    })
  }
  return previews
}

function revokeFrameUrls(item: FrameItem) {
  URL.revokeObjectURL(item.sourceUrl)
  if (item.matteUrl) URL.revokeObjectURL(item.matteUrl)
  if (item.composedUrl) URL.revokeObjectURL(item.composedUrl)
}

function revokeSpriteSlicePreviews(slices: SpriteSlicePreview[]) {
  slices.forEach((slice) => URL.revokeObjectURL(slice.url))
}

const handleCursor: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

function spillOptionLabel(color: string, label: string) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.28)',
          background: color,
          display: 'inline-block',
        }}
      />
      <span>{label}</span>
    </span>
  )
}

export default function MultiFrameSpriteWorkspace() {
  const initialLayoutDefaults = useMemo(() => readStoredLayoutDefaults(), [])
  const [frames, setFrames] = useState<FrameItem[]>([])
  const framesRef = useRef(frames)
  framesRef.current = frames
  const [activeId, setActiveId] = useState<string | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(initialLayoutDefaults.canvasWidth)
  const [canvasHeight, setCanvasHeight] = useState(initialLayoutDefaults.canvasHeight)
  const [fps, setFps] = useState(12)
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('loop')
  const [playing, setPlaying] = useState(false)
  const [playIndex, setPlayIndex] = useState(0)
  const [playDirection, setPlayDirection] = useState(1)
  const [playbackFrameIds, setPlaybackFrameIds] = useState<string[]>([])
  const [columns, setColumns] = useState(4)
  const [dragState, setDragState] = useState<DragState>(null)
  const [guideLines, setGuideLines] = useState<GuideLine[]>([])
  const [selectedGuideLineId, setSelectedGuideLineId] = useState<string | null>(null)
  const [guideDragState, setGuideDragState] = useState<GuideDragState | null>(null)
  const [dragOrderId, setDragOrderId] = useState<string | null>(null)
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [detailPreview, setDetailPreview] = useState<{ url: string; name: string } | null>(null)
  const [detailZoom, setDetailZoom] = useState(1)
  const [matteDefaults, setMatteDefaults] = useState<MatteDefaults>(() => readStoredMatteDefaults())
  const [matteDefaultsOpen, setMatteDefaultsOpen] = useState(false)
  const [matteDefaultsDraft, setMatteDefaultsDraft] = useState<MatteDefaults>(() => readStoredMatteDefaults())
  const [layoutDefaultsOpen, setLayoutDefaultsOpen] = useState(false)
  const [layoutDefaultsDraft, setLayoutDefaultsDraft] = useState<LayoutDefaults>(initialLayoutDefaults)
  const [canvasRatioPercent, setCanvasRatioPercent] = useState(initialLayoutDefaults.ratioPercent)
  const [canvasRatioBasis, setCanvasRatioBasis] = useState<'width' | 'height'>(initialLayoutDefaults.ratioBasis)
  const [activeRatioPercent, setActiveRatioPercent] = useState(initialLayoutDefaults.ratioPercent)
  const [activeRatioBasis, setActiveRatioBasis] = useState<'width' | 'height'>(initialLayoutDefaults.ratioBasis)
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

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      composeTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      if (layoutRafRef.current !== null) window.cancelAnimationFrame(layoutRafRef.current)
      framesRef.current.forEach(revokeFrameUrls)
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

  const activeFrame = useMemo(
    () => frames.find((item) => item.id === activeId) ?? frames[0] ?? null,
    [activeId, frames]
  )
  const activeFrameIndex = activeFrame ? frames.findIndex((item) => item.id === activeFrame.id) : -1

  const updateFrame = useCallback((id: string, updater: (item: FrameItem) => FrameItem) => {
    setFrames((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
  }, [])

  const recomposeFrame = useCallback(
    async (id: string) => {
      const item = framesRef.current.find((x) => x.id === id)
      if (!item?.matteUrl) return
      const revision = item.matteRevision
      const runId = (composeRunRef.current.get(id) ?? 0) + 1
      composeRunRef.current.set(id, runId)
      try {
        const url = await composeFrame(item.matteUrl, canvasWidth, canvasHeight, item.layout)
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
    [canvasHeight, canvasWidth]
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

  useEffect(() => {
    frames.forEach((item) => {
      if (item.matteUrl && item.composedRevision !== item.matteRevision) {
        scheduleCompose(item.id)
      }
    })
  }, [frames, scheduleCompose])

  useEffect(() => {
    framesRef.current.forEach((item) => {
      if (item.matteUrl) scheduleCompose(item.id, 80)
    })
  }, [canvasHeight, canvasWidth, scheduleCompose])

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
    const visibleCount = filterVisibleFrames(framesRef.current).filter((item) => item.composedUrl).length
    if (!playing || visibleCount === 0) return
    const ms = 1000 / Math.max(1, fps)
    const timer = window.setInterval(() => {
      setPlayIndex((idx) => {
        const ids = playbackFrameIds.length > 0
          ? playbackFrameIds
          : buildPlaybackFrameIds(framesRef.current)
        const liveIds = ids.filter((id) => {
          const frame = framesRef.current.find((item) => item.id === id)
          return !!frame?.composedUrl
        })
        const next = advancePlaybackCursor(idx, liveIds.length, playbackMode, playDirection)
        setPlayDirection(next.direction)
        return next.index
      })
    }, ms)
    return () => window.clearInterval(timer)
  }, [fps, frames, playDirection, playbackFrameIds, playbackMode, playing])

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
      setFrames((prev) => [...prev, ...created])
      if (!activeId && created[0]) setActiveId(created[0].id)
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
      setFrames((prev) => [...prev, ...created])
      if (!activeId && created[0]) setActiveId(created[0].id)
      created.forEach((item) => scheduleMatte(item.id))
      message.success(`已添加 ${created.length} 帧到流程 2`)
    } catch (e) {
      message.error(`添加切分帧失败：${String(e)}`)
    } finally {
      setSpriteProcessing(false)
    }
  }

  const removeFrame = (id: string) => {
    setFrames((prev) => {
      const item = prev.find((x) => x.id === id)
      if (item) revokeFrameUrls(item)
      const next = prev.filter((x) => x.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
  }

  const removeAllFrames = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    composeTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current.clear()
    matteRunRef.current.clear()
    composeTimersRef.current.clear()
    composeRunRef.current.clear()
    setDetailPreview(null)
    setActiveId(null)
    setSelectedFrameIds([])
    setSelectionAnchorId(null)
    setPlaying(false)
    setPlayIndex(0)
    setPlaybackFrameIds([])
    setFrames((prev) => clearFrameCollection(prev, revokeFrameUrls))
  }

  const setMatteParam = <K extends keyof MatteParams>(id: string, key: K, value: MatteParams[K]) => {
    updateFrame(id, (item) => ({ ...item, matte: { ...item.matte, [key]: value } }))
    scheduleMatte(id)
  }

  const setCustomSpillColor = (id: string, hex: string) => {
    updateFrame(id, (item) => ({
      ...item,
      matte: { ...item.matte, spillColorMode: 'custom', customSpillHex: hex },
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
      localStorage.setItem(MATTE_DEFAULTS_STORAGE_KEY, JSON.stringify(next))
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
    try {
      localStorage.setItem(LAYOUT_DEFAULTS_STORAGE_KEY, JSON.stringify(next))
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
    const id = uid()
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
    const id = uid()
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

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return
    setFrames((prev) => {
      const from = prev.findIndex((x) => x.id === fromId)
      const to = prev.findIndex((x) => x.id === toId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved!)
      return next
    })
  }

  const toggleFrameHidden = (id: string) => {
    setFrames((prev) => prev.map((item) => (item.id === id ? { ...item, hidden: !item.hidden } : item)))
  }

  const visibleFrames = filterVisibleFrames(frames)
  const composedFrames = visibleFrames.filter((item) => item.composedUrl)
  const playbackFrames = (playbackFrameIds.length > 0
    ? playbackFrameIds
        .map((id) => frames.find((item) => item.id === id) ?? null)
        .filter((item): item is FrameItem => !!item?.composedUrl)
    : composedFrames)
  const previewFrame = playbackFrames[Math.min(playIndex, Math.max(0, playbackFrames.length - 1))]

  const selectPreviewFrame = (item: FrameItem) => {
    const visibleIndex = playbackFrames.findIndex((frame) => frame.id === item.id)
    if (visibleIndex >= 0) setPlayIndex(visibleIndex)
  }

  const selectFrameTag = (item: FrameItem, e: React.MouseEvent<HTMLDivElement>) => {
    const result = applyFrameTagSelection({
      ids: frames.map((frame) => frame.id),
      currentSelectedIds: selectedFrameIds,
      targetId: item.id,
      anchorId: selectionAnchorId,
      gesture: e.shiftKey ? 'range' : e.altKey ? 'toggle' : 'single',
    })
    setSelectedFrameIds(result.selectedIds)
    setSelectionAnchorId(result.anchorId)
    setActiveId(item.id)
    if (!playing) selectPreviewFrame(item)
  }

  const startPlayback = (ids: string[], emptyMessage: string) => {
    if (ids.length === 0) {
      message.warning(emptyMessage)
      return
    }
    setPlaybackFrameIds(ids)
    setPlayIndex(0)
    setPlayDirection(1)
    setPlaying(true)
  }

  const startAllPlayback = () => {
    startPlayback(buildPlaybackFrameIds(frames), '没有可播放的已处理图片')
  }

  const startSelectedPlayback = () => {
    startPlayback(buildPlaybackFrameIds(frames, selectedFrameIds), '请先选择已处理的图片')
  }

  const batchHideSelected = () => {
    if (selectedFrameIds.length === 0) return
    setFrames((prev) => batchHideSelectedFrames(prev, selectedFrameIds))
    setSelectedFrameIds([])
    setSelectionAnchorId(null)
    setPlaying(false)
  }

  useEffect(() => {
    if (playbackFrames.length === 0) {
      if (playIndex !== 0) setPlayIndex(0)
      return
    }
    if (playIndex >= playbackFrames.length) setPlayIndex(playbackFrames.length - 1)
  }, [playbackFrames.length, playIndex])

  const exportAll = async () => {
    if (frames.length === 0) {
      message.warning('请先上传图片')
      return
    }
    if (visibleFrames.length === 0) {
      message.warning('没有可导出的可见帧')
      return
    }
    const missing = visibleFrames.find((item) => !item.composedUrl)
    if (missing) {
      message.warning('仍有帧未处理完成，请稍后再导出')
      return
    }
    setExporting(true)
    try {
      const cols = clampInt(columns, 1, Math.max(1, visibleFrames.length))
      const index = buildMultiFrameSpriteIndex({
        canvasWidth,
        canvasHeight,
        columns: cols,
        fps,
        playbackMode,
        frames: visibleFrames.map((item) => ({ id: item.id, sourceName: item.sourceName })),
      })
      const sheet = document.createElement('canvas')
      sheet.width = index.sheet_size.w
      sheet.height = index.sheet_size.h
      const ctx = sheet.getContext('2d')
      if (!ctx) throw new Error('无法创建导出画布')
      ctx.clearRect(0, 0, sheet.width, sheet.height)
      const zip = new JSZip()
      for (let i = 0; i < visibleFrames.length; i += 1) {
        const item = visibleFrames[i]!
        const img = await loadImage(item.composedUrl!)
        const meta = index.frames[i]!
        ctx.drawImage(img, meta.x, meta.y, meta.w, meta.h)
      }
      const spriteBlob = await canvasToBlob(sheet)
      zip.file('sprite.png', spriteBlob)
      zip.file('index.json', JSON.stringify(index, null, 2))
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(zipBlob)
      a.download = 'sprite_export.zip'
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      message.success('已导出 ZIP')
    } catch (e) {
      message.error(`导出失败：${String(e)}`)
    } finally {
      setExporting(false)
    }
  }

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
          <Card size="small" title="上传精灵图处理">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap align="center">
                <Upload
                  accept={IMAGE_ACCEPT.join(',')}
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    void handleSpriteSheetUpload(file as File)
                    return false
                  }}
                >
                  <Button>上传精灵图</Button>
                </Upload>
                <Text>行数</Text>
                <InputNumber min={1} max={128} value={spriteRows} onChange={(v) => setSpriteRows(clampInt(v ?? 1, 1, 128))} />
                <Text>列数</Text>
                <InputNumber min={1} max={128} value={spriteColumns} onChange={(v) => setSpriteColumns(clampInt(v ?? 1, 1, 128))} />
                <Button
                  type="primary"
                  loading={spriteProcessing}
                  disabled={spriteProcessing || spriteSlices.length === 0}
                  onClick={() => void confirmSpriteSheetSplit()}
                >
                  确认切分并添加到流程 2
                </Button>
              </Space>
              {spriteSheetDraft ? (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text type="secondary">
                    {spriteSheetDraft.sourceName}，{spriteSheetDraft.width} × {spriteSheetDraft.height}，预计切分 {spriteSlices.length} 帧
                  </Text>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${Math.max(1, Math.min(spriteColumns, 12))}, minmax(64px, 1fr))`,
                      gap: 8,
                      maxHeight: 280,
                      overflow: 'auto',
                      padding: 8,
                      border: '1px solid #b8a898',
                      background: '#f7f1e8',
                    }}
                  >
                    {spriteSlices.map((slice) => (
                      <div
                        key={slice.url}
                        style={{
                          minWidth: 0,
                          padding: 6,
                          border: '1px solid #d8cabc',
                          background: '#fff',
                          textAlign: 'center',
                        }}
                      >
                        <img
                          src={slice.url}
                          alt={slice.name}
                          style={{ width: '100%', height: 72, objectFit: 'contain', display: 'block' }}
                        />
                        <Text style={{ fontSize: 12 }}>帧 {slice.index + 1}</Text>
                      </div>
                    ))}
                  </div>
                </Space>
              ) : (
                <Text type="secondary">上传整张精灵图后，输入行数和列数进行网格切分预览。</Text>
              )}
            </Space>
          </Card>

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
              <Card
                key={item.id}
                size="small"
                title={`帧 ${index + 1}`}
                extra={<Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeFrame(item.id)} />}
                onClick={() => setActiveId(item.id)}
                style={{ borderColor: activeFrame?.id === item.id ? '#b55233' : undefined }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>原图（点击取背景色）</Text>
                      <img
                        src={item.sourceUrl}
                        alt={item.sourceName}
                        onClick={(e) => void sampleColor(item, e)}
                        style={{ width: '100%', height: 120, objectFit: 'contain', background: '#eee', cursor: 'crosshair' }}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>抠图结果 {item.processing ? '处理中...' : ''}</Text>
                      {item.matteUrl ? (
                        <img
                          src={item.matteUrl}
                          alt={`${item.sourceName} result`}
                          title="点击放大查看"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDetailPreview({ url: item.matteUrl!, name: item.sourceName })
                            setDetailZoom(1)
                          }}
                          style={{
                            width: '100%',
                            height: 120,
                            objectFit: 'contain',
                            background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px',
                            cursor: 'zoom-in',
                          }}
                        />
                      ) : (
                        <div style={{ height: 120, display: 'grid', placeItems: 'center', background: '#f3f0ea' }}>等待处理</div>
                      )}
                    </div>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    结果宽高：{item.matteWidth} × {item.matteHeight}
                  </Text>
                  <Space align="center" wrap>
                    <Text>背景色</Text>
                    <ColorPicker
                      value={rgbToHex(item.matte.keyColor)}
                      onChange={(_, hex) => setMatteParam(item.id, 'keyColor', hexToRgb(hex))}
                    />
                    <Button
                      size="small"
                      disabled={index === frames.length - 1}
                      onClick={() => applyMatteToFollowingFrames(item.id)}
                    >
                      应用到后续所有帧
                    </Button>
                  </Space>
                  {[
                    ['容差', 'tolerance'],
                    ['边缘平滑', 'smoothness'],
                    ['抑色', 'spill'],
                    ['侵蚀', 'erosion'],
                  ].map(([label, key]) => (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 36px', alignItems: 'center', gap: 8 }}>
                      <Text>{label}</Text>
                      <Slider
                        min={0}
                        max={100}
                        value={item.matte[key as keyof MatteParams] as number}
                        onChange={(value) => setMatteParam(item.id, key as keyof MatteParams, value as never)}
                      />
                      <Text type="secondary">{item.matte[key as keyof MatteParams] as number}</Text>
                    </div>
                  ))}
                  <Space align="center" wrap>
                    <Text>抑制颜色</Text>
                    <Select<SpillColorMode>
                      value={item.matte.spillColorMode}
                      style={{ width: 150 }}
                      onChange={(value) => setMatteParam(item.id, 'spillColorMode', value)}
                      options={[
                        { value: 'key', label: spillOptionLabel(rgbToHex(item.matte.keyColor), '跟随当前取色') },
                        { value: 'green', label: spillOptionLabel('#00ff00', '绿色 #00ff00') },
                        { value: 'blue', label: spillOptionLabel('#0000ff', '蓝色 #0000ff') },
                        { value: 'magenta', label: spillOptionLabel('#ff00ff', '品红 #ff00ff') },
                        { value: 'custom', label: '自定义十六进制' },
                      ]}
                    />
                    <ColorPicker
                      value={getSpillColorHex(item.matte.spillColorMode, item.matte.customSpillHex, item.matte.keyColor)}
                      onChange={(_, hex) => setCustomSpillColor(item.id, hex)}
                    />
                    {item.matte.spillColorMode === 'custom' && (
                      <>
                        <Input
                          value={item.matte.customSpillHex}
                          onChange={(e) => setCustomSpillColor(item.id, e.target.value)}
                          placeholder="#00ff00"
                          style={{ width: 110 }}
                        />
                      </>
                    )}
                  </Space>
                </Space>
              </Card>
            ))}
          </div>
        ) : (
          <Text type="secondary">请先在流程 1 上传多张图片，或上传精灵图切分后添加到这里。</Text>
        )}
      </Card>

      <Card title="3. 统一画布、缩放与对齐">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card size="small" title="公共参数" extra={<Button onClick={openLayoutDefaults}>公共参数配置</Button>}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space wrap>
                <Text>公共画布</Text>
                <InputNumber min={1} max={4096} value={canvasWidth} onChange={(v) => setCanvasWidth(v ?? 256)} addonAfter="W" />
                <InputNumber min={1} max={4096} value={canvasHeight} onChange={(v) => setCanvasHeight(v ?? 256)} addonAfter="H" />
                <span style={RATIO_GROUP_STYLE}>
                  <Text strong>图片宽高调整：</Text>
                  <Segmented
                    value={canvasRatioBasis}
                    onChange={(value) => setCanvasRatioBasis(value as 'width' | 'height')}
                    options={[
                      { label: '宽度', value: 'width' },
                      { label: '高度', value: 'height' },
                    ]}
                  />
                  <Text>占画布</Text>
                  <InputNumber
                    min={1}
                    max={300}
                    value={canvasRatioPercent}
                    onChange={(v) => setCanvasRatioPercent(v ?? 80)}
                    addonAfter="%"
                    style={RATIO_PERCENT_INPUT_STYLE}
                  />
                  <Text>大小</Text>
                  <Button onClick={() => applyCanvasRatio(canvasRatioPercent, canvasRatioBasis)}>
                    应用
                  </Button>
                </span>
              </Space>
              <Space wrap>
                <Button onClick={applyAllCenter}>全部居中</Button>
                <Select
                  placeholder="统一大小工具"
                  style={{ width: 220 }}
                  onSelect={applyPresetSize}
                  options={[
                    { value: 'active', label: '按当前帧尺寸统一' },
                    { value: 'maxBoth', label: '按最大宽高统一' },
                    { value: 'maxWidth', label: '按最大宽度等比统一' },
                    { value: 'maxHeight', label: '按最大高度等比统一' },
                  ]}
                />
              </Space>
            </Space>
          </Card>

          <Card size="small" title="待处理图片区域">
            {frames.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {frames.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    style={{
                      width: 92,
                      padding: 6,
                      border: activeFrame?.id === item.id ? '2px solid #b55233' : '1px solid #b8a898',
                      background: activeFrame?.id === item.id ? '#f5e8df' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      flex: '0 0 auto',
                    }}
                  >
                    <img
                      src={item.composedUrl ?? item.matteUrl ?? item.sourceUrl}
                      alt={item.sourceName}
                      style={{ width: 72, height: 72, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }}
                    />
                    <Text style={{ fontSize: 12 }}>帧 {index + 1}</Text>
                  </button>
                ))}
              </div>
            ) : (
              <Text type="secondary">请先在流程 1 上传或切分图片。</Text>
            )}
          </Card>

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
                          src={activeFrame.matteUrl}
                          alt="active matte"
                          draggable={false}
                          style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                        />
                        {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map((handle) => {
                          const pos: React.CSSProperties = {
                            position: 'absolute',
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            background: '#fff',
                            border: '1px solid #b55233',
                            borderRadius: 2,
                            cursor: handleCursor[handle],
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

      <Card title="4. 预览播放与排序">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Button icon={<PlayCircleOutlined />} onClick={startAllPlayback}>
              全部播放
            </Button>
            <Button icon={<PlayCircleOutlined />} disabled={selectedFrameIds.length === 0} onClick={startSelectedPlayback}>
              播放选择的图片
            </Button>
            {playing && <Button onClick={() => setPlaying(false)}>暂停</Button>}
            <Text>FPS</Text>
            <InputNumber min={1} max={60} value={fps} onChange={(v) => setFps(clampInt(v ?? 12, 1, 60))} />
            <Segmented
              value={playbackMode}
              onChange={(v) => setPlaybackMode(v as PlaybackMode)}
              options={[
                { label: '循环', value: 'loop' },
                { label: '乒乓', value: 'pingpong' },
              ]}
            />
          </Space>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {frames.map((item, index) => (
                (() => {
                  const selected = selectedFrameIds.includes(item.id)
                  const isPreview = previewFrame?.id === item.id
                  const inPlaybackList = playbackFrameIds.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDragOrderId(item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragOrderId) reorder(dragOrderId, item.id)
                        setDragOrderId(null)
                      }}
                      onClick={(e) => selectFrameTag(item, e)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 8,
                        border: selected ? '1px solid #1677ff' : inPlaybackList ? '1px solid #ff7ab6' : '1px solid #b8a898',
                        background: inPlaybackList ? '#ffe4f0' : selected ? '#e6f4ff' : isPreview ? '#f5e8df' : '#fff',
                        boxShadow: isPreview ? `inset 3px 0 0 ${inPlaybackList ? '#d63384' : '#b55233'}` : undefined,
                        cursor: 'grab',
                        opacity: item.hidden ? 0.48 : 1,
                      }}
                    >
                      <HolderOutlined />
                      <Text>{index + 1}</Text>
                      {item.composedUrl && <img src={item.composedUrl} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />}
                      <Text ellipsis style={{ flex: 1 }}>{item.sourceName}</Text>
                      <Button
                        size="small"
                        type="text"
                        aria-label={item.hidden ? '显示此帧' : '隐藏此帧'}
                        icon={item.hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFrameHidden(item.id)
                          setPlaying(false)
                        }}
                      />
                    </div>
                  )
                })()
              ))}
            </div>
            <div style={{ minHeight: 260, display: 'grid', placeItems: 'center', background: '#d9d0c4', border: '1px solid #9a8b78' }}>
              {previewFrame?.composedUrl ? (
                <Space direction="vertical" align="center">
                  <img
                    src={previewFrame.composedUrl}
                    alt="preview"
                    style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }}
                  />
                  <Text type="secondary">帧 {Math.min(playIndex + 1, playbackFrames.length)} / {playbackFrames.length}</Text>
                </Space>
              ) : (
                <Text type="secondary">{visibleFrames.length === 0 && frames.length > 0 ? '没有可预览的可见帧' : '等待帧处理完成'}</Text>
              )}
            </div>
          </div>
          <Space wrap>
            <Button
              icon={<EyeInvisibleOutlined />}
              disabled={selectedFrameIds.length === 0}
              onClick={batchHideSelected}
            >
              批量隐藏
            </Button>
            <Text type="secondary">已选 {selectedFrameIds.length} 张</Text>
          </Space>
        </Space>
      </Card>

      <Card title="5. 合并导出">
        <Space direction="vertical" size={12}>
          <Space wrap>
            <Radio.Group
              value="manual"
              options={[{ label: '精灵图列数', value: 'manual' }]}
            />
            <InputNumber min={1} max={128} value={columns} onChange={(v) => setColumns(v ?? 1)} />
            <Button onClick={() => setColumns(computeAutoSpriteColumns(visibleFrames.length))}>自动接近正方形</Button>
            <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={() => void exportAll()}>
              导出 ZIP
            </Button>
          </Space>
          <Text type="secondary">
            ZIP 包含 sprite.png 和 index.json。导出与预览均使用平滑绘制。
          </Text>
        </Space>
      </Card>

      <Divider />
      <Text type="secondary">
        当前帧数：{frames.length}，公共画布：{canvasWidth} × {canvasHeight}
      </Text>

      <Modal
        open={matteDefaultsOpen}
        title="抠图默认参数配置"
        okText="保存"
        cancelText="取消"
        onOk={saveMatteDefaults}
        onCancel={() => setMatteDefaultsOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">保存后，新上传图片会使用这些默认值；已有图片参数不自动覆盖。</Text>
          {[
            ['容差', 'tolerance'],
            ['边缘平滑', 'smoothness'],
            ['抑色', 'spill'],
            ['侵蚀', 'erosion'],
          ].map(([label, key]) => (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 64px', gap: 8, alignItems: 'center' }}>
              <Text>{label}</Text>
              <Slider
                min={0}
                max={100}
                value={matteDefaultsDraft[key as keyof MatteDefaults] as number}
                onChange={(value) => setMatteDefaultsDraft((prev) => ({ ...prev, [key]: value }))}
              />
              <InputNumber
                min={0}
                max={100}
                value={matteDefaultsDraft[key as keyof MatteDefaults] as number}
                onChange={(value) => setMatteDefaultsDraft((prev) => ({ ...prev, [key]: value ?? 0 }))}
              />
            </div>
          ))}
          <Space align="center" wrap>
            <Text>抑制颜色</Text>
            <Select<SpillColorMode>
              value={matteDefaultsDraft.spillColorMode}
              style={{ width: 180 }}
              onChange={(value) => setMatteDefaultsDraft((prev) => ({ ...prev, spillColorMode: value }))}
              options={[
                { value: 'key', label: '跟随当前取色' },
                { value: 'green', label: spillOptionLabel('#00ff00', '绿色 #00ff00') },
                { value: 'blue', label: spillOptionLabel('#0000ff', '蓝色 #0000ff') },
                { value: 'magenta', label: spillOptionLabel('#ff00ff', '品红 #ff00ff') },
                { value: 'custom', label: '自定义十六进制' },
              ]}
            />
            <ColorPicker
              value={getSpillColorHex(matteDefaultsDraft.spillColorMode, matteDefaultsDraft.customSpillHex)}
              onChange={(_, hex) => setMatteDefaultsDraft((prev) => ({ ...prev, spillColorMode: 'custom', customSpillHex: hex }))}
            />
            {matteDefaultsDraft.spillColorMode === 'custom' && (
              <Input
                value={matteDefaultsDraft.customSpillHex}
                onChange={(e) => setMatteDefaultsDraft((prev) => ({ ...prev, spillColorMode: 'custom', customSpillHex: e.target.value }))}
                style={{ width: 110 }}
              />
            )}
          </Space>
        </Space>
      </Modal>

      <Modal
        open={layoutDefaultsOpen}
        title="公共参数配置"
        okText="保存"
        cancelText="取消"
        onOk={saveLayoutDefaults}
        onCancel={() => setLayoutDefaultsOpen(false)}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">保存后会作为下次打开工作台的默认公共参数；当前页面也会立即应用。</Text>
          <Space wrap>
            <Text>公共画布</Text>
            <InputNumber
              min={1}
              max={4096}
              value={layoutDefaultsDraft.canvasWidth}
              onChange={(v) => setLayoutDefaultsDraft((prev) => ({ ...prev, canvasWidth: v ?? 256 }))}
              addonAfter="W"
            />
            <InputNumber
              min={1}
              max={4096}
              value={layoutDefaultsDraft.canvasHeight}
              onChange={(v) => setLayoutDefaultsDraft((prev) => ({ ...prev, canvasHeight: v ?? 256 }))}
              addonAfter="H"
            />
          </Space>
          <Space wrap>
            <Text>图片宽高调整</Text>
            <Segmented
              value={layoutDefaultsDraft.ratioBasis}
              onChange={(value) => setLayoutDefaultsDraft((prev) => ({ ...prev, ratioBasis: value as 'width' | 'height' }))}
              options={[
                { label: '宽度', value: 'width' },
                { label: '高度', value: 'height' },
              ]}
            />
            <Text>占画布</Text>
            <InputNumber
              min={1}
              max={300}
              value={layoutDefaultsDraft.ratioPercent}
              onChange={(v) => setLayoutDefaultsDraft((prev) => ({ ...prev, ratioPercent: v ?? 80 }))}
              addonAfter="%"
              style={RATIO_PERCENT_INPUT_STYLE}
            />
          </Space>
        </Space>
      </Modal>

      <Modal
        open={!!detailPreview}
        title={detailPreview?.name ?? '抠图结果'}
        footer={
          <Space>
            <Text type="secondary">滚轮缩放：{Math.round(detailZoom * 100)}%</Text>
            <Button onClick={() => setDetailPreview(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetailPreview(null)}
        keyboard
        width="min(92vw, 960px)"
        centered
      >
        <div
          onWheel={(e) => {
            e.preventDefault()
            const delta = e.deltaY < 0 ? 0.15 : -0.15
            setDetailZoom((z) => clampPreviewZoom(z + delta))
          }}
          style={{
            height: 'min(70vh, 720px)',
            overflow: 'auto',
            display: 'grid',
            placeItems: 'center',
            background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px',
            border: '1px solid #b8a898',
          }}
        >
          {detailPreview && (
            <img
              src={detailPreview.url}
              alt={detailPreview.name}
              style={{
                width: `${detailZoom * 100}%`,
                maxWidth: 'none',
                height: 'auto',
                display: 'block',
              }}
            />
          )}
        </div>
      </Modal>
    </Space>
  )
}

