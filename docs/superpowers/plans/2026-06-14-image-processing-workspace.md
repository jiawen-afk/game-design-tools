# Image Processing Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new home-page image processing workspace for single-image upload, chroma-key matte, crop preview/zoom, and export as PNG/WebP/JPEG.

**Architecture:** Add a focused `ImageProcessingWorkspace` directory with pure model helpers, canvas pipeline helpers, a state hook, and compact UI panels. Update `App.tsx` only for navigation and lazy-loading; keep processing logic out of the app shell and out of the sprite workspace flow.

**Tech Stack:** React 19, TypeScript, Ant Design 6, browser canvas APIs, Node test runner with `tsx`.

---

## Files

- Create: `src/components/ImageProcessingWorkspace/imageProcessingModel.ts`
- Create: `src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`
- Create: `src/components/ImageProcessingWorkspace/imageProcessingPipeline.ts`
- Create: `src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts`
- Create: `src/components/ImageProcessingWorkspace/ImageUploadPanel.tsx`
- Create: `src/components/ImageProcessingWorkspace/ImageMattePanel.tsx`
- Create: `src/components/ImageProcessingWorkspace/ImageCropPanel.tsx`
- Create: `src/components/ImageProcessingWorkspace/ImageExportPanel.tsx`
- Create: `src/components/ImageProcessingWorkspace/index.tsx`
- Create: `src/components/ImageProcessingWorkspace/workspace.css`
- Modify: `src/App.tsx`
- Modify: `src/appStructure.test.ts`
- Modify: `package.json`

## Task 1: Model Helpers

**Files:**
- Create: `src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`
- Create: `src/components/ImageProcessingWorkspace/imageProcessingModel.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing model tests**

Create `src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clampCropBox,
  deriveExportFileName,
  getExportFormatInfo,
  isSupportedImageFile,
  normalizeCropBox,
} from './imageProcessingModel'

test('image processing workspace accepts common raster image formats', () => {
  assert.equal(isSupportedImageFile({ name: 'hero.PNG', type: 'image/png' }), true)
  assert.equal(isSupportedImageFile({ name: 'portrait.webp', type: 'image/webp' }), true)
  assert.equal(isSupportedImageFile({ name: 'photo.jpeg', type: 'image/jpeg' }), true)
  assert.equal(isSupportedImageFile({ name: 'photo.jpg', type: '' }), true)
  assert.equal(isSupportedImageFile({ name: 'notes.txt', type: 'text/plain' }), false)
  assert.equal(isSupportedImageFile({ name: 'vector.svg', type: 'image/svg+xml' }), false)
})

test('image processing workspace maps export formats to mime and alpha behavior', () => {
  assert.deepEqual(getExportFormatInfo('png'), { extension: 'png', mimeType: 'image/png', preservesAlpha: true })
  assert.deepEqual(getExportFormatInfo('webp'), { extension: 'webp', mimeType: 'image/webp', preservesAlpha: true })
  assert.deepEqual(getExportFormatInfo('jpg'), { extension: 'jpg', mimeType: 'image/jpeg', preservesAlpha: false })
  assert.deepEqual(getExportFormatInfo('jpeg'), { extension: 'jpeg', mimeType: 'image/jpeg', preservesAlpha: false })
})

test('image processing workspace clamps crop boxes inside image bounds', () => {
  assert.deepEqual(
    clampCropBox({ x: -20, y: 30, width: 260, height: 180 }, 200, 120, 16),
    { x: 0, y: 30, width: 200, height: 90 }
  )
  assert.deepEqual(
    clampCropBox({ x: 190, y: 110, width: 4, height: 5 }, 200, 120, 16),
    { x: 184, y: 104, width: 16, height: 16 }
  )
})

test('image processing workspace normalizes crop boxes from drag coordinates', () => {
  assert.deepEqual(
    normalizeCropBox({ x: 120, y: 90, width: -80, height: -50 }, 200, 120, 16),
    { x: 40, y: 40, width: 80, height: 50 }
  )
})

test('image processing workspace derives export filenames from source image names', () => {
  assert.equal(deriveExportFileName('hero.walk.png', 'webp'), 'hero.walk-processed.webp')
  assert.equal(deriveExportFileName('bad/name?.jpg', 'png'), 'bad_name_-processed.png')
  assert.equal(deriveExportFileName('', 'jpeg'), 'image-processed.jpeg')
})
```

Update `package.json` test script to include the new test:

```json
"test": "tsx --test src/appStructure.test.ts src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts src/components/MultiFrameSpriteWorkspace/model.test.ts src/components/VoiceDeploymentWorkspace/voiceDeploymentModel.test.ts src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.test.ts src/components/PersonalSpaceWorkspace/personalSpaceModel.test.ts src/components/PersonalSpaceWorkspace/personalSpaceFileStorage.test.ts"
```

- [ ] **Step 2: Run model tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because `src/components/ImageProcessingWorkspace/imageProcessingModel.ts` does not exist.

- [ ] **Step 3: Implement model helpers**

Create `src/components/ImageProcessingWorkspace/imageProcessingModel.ts`:

```ts
export type ImageExportFormat = 'png' | 'webp' | 'jpg' | 'jpeg'

export interface ImageFileLike {
  name: string
  type?: string
}

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ExportFormatInfo {
  extension: ImageExportFormat
  mimeType: 'image/png' | 'image/webp' | 'image/jpeg'
  preservesAlpha: boolean
}

export const IMAGE_PROCESSING_ACCEPT = ['.webp', '.jpg', '.jpeg', '.png']
export const MIN_IMAGE_CROP_SIZE = 16

const supportedExtensions = new Set(['webp', 'jpg', 'jpeg', 'png'])
const supportedMimeTypes = new Set(['image/webp', 'image/jpeg', 'image/png'])

export function getImageFileExtension(name: string): string {
  const match = /\.([^.]+)$/.exec(name.trim())
  return match ? match[1]!.toLowerCase() : ''
}

export function isSupportedImageFile(file: ImageFileLike): boolean {
  const extension = getImageFileExtension(file.name)
  const mime = (file.type ?? '').toLowerCase()
  return supportedExtensions.has(extension) && (mime === '' || supportedMimeTypes.has(mime))
}

export function getExportFormatInfo(format: ImageExportFormat): ExportFormatInfo {
  if (format === 'webp') return { extension: 'webp', mimeType: 'image/webp', preservesAlpha: true }
  if (format === 'jpg') return { extension: 'jpg', mimeType: 'image/jpeg', preservesAlpha: false }
  if (format === 'jpeg') return { extension: 'jpeg', mimeType: 'image/jpeg', preservesAlpha: false }
  return { extension: 'png', mimeType: 'image/png', preservesAlpha: true }
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

export function clampCropBox(crop: CropBox, imageWidth: number, imageHeight: number, minSize = MIN_IMAGE_CROP_SIZE): CropBox {
  const widthLimit = Math.max(1, Math.round(imageWidth))
  const heightLimit = Math.max(1, Math.round(imageHeight))
  const minimum = Math.max(1, Math.min(minSize, widthLimit, heightLimit))
  const width = Math.max(minimum, Math.min(widthLimit, Math.round(finiteOr(crop.width, widthLimit))))
  const height = Math.max(minimum, Math.min(heightLimit, Math.round(finiteOr(crop.height, heightLimit))))
  const x = Math.max(0, Math.min(widthLimit - width, Math.round(finiteOr(crop.x, 0))))
  const y = Math.max(0, Math.min(heightLimit - height, Math.round(finiteOr(crop.y, 0))))
  return { x, y, width, height }
}

export function normalizeCropBox(crop: CropBox, imageWidth: number, imageHeight: number, minSize = MIN_IMAGE_CROP_SIZE): CropBox {
  const x = crop.width < 0 ? crop.x + crop.width : crop.x
  const y = crop.height < 0 ? crop.y + crop.height : crop.y
  return clampCropBox({ x, y, width: Math.abs(crop.width), height: Math.abs(crop.height) }, imageWidth, imageHeight, minSize)
}

export function createFullImageCrop(width: number, height: number): CropBox {
  return clampCropBox({ x: 0, y: 0, width, height }, width, height)
}

export function sanitizeExportBaseName(name: string): string {
  const withoutExtension = name.trim().replace(/\.[^.]+$/, '')
  return (withoutExtension || 'image').replace(/[<>:"/\\|?*]+/g, '_')
}

export function deriveExportFileName(sourceName: string, format: ImageExportFormat): string {
  return `${sanitizeExportBaseName(sourceName)}-processed.${getExportFormatInfo(format).extension}`
}
```

- [ ] **Step 4: Run model tests and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS for the new model tests; existing tests may still fail later only if the package test script was mistyped.

- [ ] **Step 5: Commit model helpers**

```powershell
git add package.json src/components/ImageProcessingWorkspace/imageProcessingModel.ts src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts
git commit -m "feat: add image processing model helpers"
```

## Task 2: App Navigation and Structure Guards

**Files:**
- Modify: `src/appStructure.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing structure test**

Add this test near the existing home page tests in `src/appStructure.test.ts`:

```ts
test('home page exposes image processing workspace as a first-class tool', () => {
  const source = appSource()

  assert.match(source, /const ImageProcessingWorkspace = lazy\(\(\) => import\('\.\/components\/ImageProcessingWorkspace'\)\)/)
  assert.match(source, /type ToolId = 'multi-frame-sprite' \| 'image-processing' \| 'voice-deployment'/)
  assert.match(source, /图片处理工作台/)
  assert.match(source, /单张图片上传、色键抠图、裁剪预览并导出常用图片格式。/)
  assert.match(source, /activeSurface === 'image-processing'\s*\?\s*<ImageProcessingWorkspace \/>/)
  assert.match(source, /const personalSpaceShortcut = '4'/)
})
```

Update the existing `personal space is global navigation instead of a tool list item` assertion for `ToolId` and shortcut:

```ts
assert.match(source, /type ToolId = 'multi-frame-sprite' \| 'image-processing' \| 'voice-deployment'/)
assert.match(source, /const personalSpaceShortcut = '4'/)
```

- [ ] **Step 2: Run structure test and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because `App.tsx` does not yet lazy-load or expose the image processing workspace.

- [ ] **Step 3: Update App navigation**

Modify `src/App.tsx`:

```ts
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  AudioOutlined,
  PictureOutlined,
  UserOutlined,
} from '@ant-design/icons'
```

Add the lazy import:

```ts
const ImageProcessingWorkspace = lazy(() => import('./components/ImageProcessingWorkspace'))
```

Update types and shortcuts:

```ts
type ToolId = 'multi-frame-sprite' | 'image-processing' | 'voice-deployment'
type ActiveSurface = ToolId | 'personal-space'

const personalSpaceShortcut = '4'
```

Insert the new tool between sprite and voice:

```ts
{
  id: 'image-processing',
  name: '图片处理工作台',
  summary: '单张图片上传、色键抠图、裁剪预览并导出常用图片格式。',
  details: '适合先处理角色肖像、道具图和需要透明底的静态图片，再进入后续素材流程。',
  input: 'WebP、JPG、JPEG、PNG 单张图片',
  output: 'PNG、WebP、JPG、JPEG 图片',
  shortcut: '2',
},
```

Change the voice shortcut to `'3'`.

Update active workspace selection:

```tsx
const activeWorkspace = activeSurface === 'multi-frame-sprite'
  ? <MultiFrameSpriteWorkspace />
  : activeSurface === 'image-processing'
    ? <ImageProcessingWorkspace />
    : activeSurface === 'voice-deployment'
      ? <VoiceDeploymentWorkspace />
      : <PersonalSpaceWorkspace />
```

Update the shortcut row to show image and voice:

```tsx
<kbd>1</kbd>
<span>精灵</span>
<kbd>2</kbd>
<span>图片</span>
<kbd>3</kbd>
<span>配音</span>
<kbd>{personalSpaceShortcut}</kbd>
<span>个人空间</span>
```

Update the tool row tag and icon logic:

```tsx
<span>{tool.id === 'multi-frame-sprite' ? '素材整理' : tool.id === 'image-processing' ? '图片编辑' : '本地部署'}</span>
```

```tsx
icon={tool.id === 'voice-deployment' ? <AudioOutlined /> : tool.id === 'image-processing' ? <PictureOutlined /> : undefined}
```

- [ ] **Step 4: Run structure test and verify GREEN**

Run:

```powershell
npm test
```

Expected: PASS for the structure tests once the workspace placeholder exists in a later task; until then Vite build may fail because the import target does not exist. If the test runner fails only on missing import target during TypeScript compilation, continue to Task 3 immediately and rerun after creating the workspace entry.

- [ ] **Step 5: Commit navigation**

```powershell
git add src/App.tsx src/appStructure.test.ts
git commit -m "feat: add image processing navigation"
```

## Task 3: Pipeline Helpers

**Files:**
- Create: `src/components/ImageProcessingWorkspace/imageProcessingPipeline.ts`

- [ ] **Step 1: Add pipeline implementation after model tests are green**

Create `src/components/ImageProcessingWorkspace/imageProcessingPipeline.ts`:

```ts
import { chromaKey, loadImage } from '../MultiFrameSpriteWorkspace/imagePipeline'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'
import {
  clampCropBox,
  getExportFormatInfo,
  type CropBox,
  type ImageExportFormat,
} from './imageProcessingModel'

export interface LoadedImageDraft {
  file: File
  sourceName: string
  sourceUrl: string
  width: number
  height: number
}

export interface ProcessedImageDraft {
  url: string
  width: number
  height: number
}

export async function createImageDraft(file: File): Promise<LoadedImageDraft> {
  const sourceUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(sourceUrl)
    return {
      file,
      sourceName: file.name,
      sourceUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  } catch (error) {
    URL.revokeObjectURL(sourceUrl)
    throw error
  }
}

export async function applyImageMatte(sourceUrl: string, matte: MatteParams): Promise<ProcessedImageDraft> {
  return chromaKey(sourceUrl, matte)
}

export async function renderCroppedImageUrl(sourceUrl: string, crop: CropBox): Promise<ProcessedImageDraft> {
  const img = await loadImage(sourceUrl)
  const safeCrop = clampCropBox(crop, img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = safeCrop.width
  canvas.height = safeCrop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建裁剪预览画布')
  ctx.drawImage(img, safeCrop.x, safeCrop.y, safeCrop.width, safeCrop.height, 0, 0, safeCrop.width, safeCrop.height)
  const blob = await canvasToFormatBlob(canvas, 'png', '#ffffff')
  return { url: URL.createObjectURL(blob), width: safeCrop.width, height: safeCrop.height }
}

export async function exportProcessedImage(sourceUrl: string, crop: CropBox, format: ImageExportFormat, matteBackground = '#ffffff'): Promise<Blob> {
  const img = await loadImage(sourceUrl)
  const safeCrop = clampCropBox(crop, img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = safeCrop.width
  canvas.height = safeCrop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建导出画布')
  const formatInfo = getExportFormatInfo(format)
  if (!formatInfo.preservesAlpha) {
    ctx.fillStyle = matteBackground
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, safeCrop.x, safeCrop.y, safeCrop.width, safeCrop.height, 0, 0, safeCrop.width, safeCrop.height)
  return canvasToFormatBlob(canvas, format)
}

function canvasToFormatBlob(canvas: HTMLCanvasElement, format: ImageExportFormat, matteBackground: string): Promise<Blob> {
  const formatInfo = getExportFormatInfo(format)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) resolve(blob)
      else reject(new Error('图片导出失败'))
    }, formatInfo.mimeType, formatInfo.mimeType === 'image/jpeg' ? 0.92 : undefined)
  })
}
```

- [ ] **Step 2: Run build-targeted tests**

Run:

```powershell
npm test
```

Expected: PASS if Task 2 placeholder import is satisfied by Task 4, or fail only because the workspace entry has not been created yet.

- [ ] **Step 3: Commit pipeline after workspace entry compiles**

Commit this together with Task 4 if Task 3 cannot compile alone.

## Task 4: Workspace Hook and UI Panels

**Files:**
- Create: `src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts`
- Create: `src/components/ImageProcessingWorkspace/ImageUploadPanel.tsx`
- Create: `src/components/ImageProcessingWorkspace/ImageMattePanel.tsx`
- Create: `src/components/ImageProcessingWorkspace/ImageCropPanel.tsx`
- Create: `src/components/ImageProcessingWorkspace/ImageExportPanel.tsx`
- Create: `src/components/ImageProcessingWorkspace/index.tsx`
- Create: `src/components/ImageProcessingWorkspace/workspace.css`

- [ ] **Step 1: Create workspace state hook**

Create `src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts` with state for upload, matte settings, crop, preview zoom, and export:

```ts
import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createFullImageCrop,
  deriveExportFileName,
  isSupportedImageFile,
  MIN_IMAGE_CROP_SIZE,
  type CropBox,
  type ImageExportFormat,
} from './imageProcessingModel'
import {
  applyImageMatte,
  createImageDraft,
  exportProcessedImage,
  renderCroppedImageUrl,
  type LoadedImageDraft,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'

const DEFAULT_MATTE: MatteParams = {
  keyColor: [0, 255, 0],
  tolerance: 5,
  smoothness: 5,
  spill: 0,
  spillColorMode: 'key',
  customSpillHex: '#00ff00',
  erosion: 5,
}

export type ImageProcessingWorkspaceViewModel = ReturnType<typeof useImageProcessingWorkspace>

export function useImageProcessingWorkspace() {
  const [draft, setDraft] = useState<LoadedImageDraft | null>(null)
  const [matte, setMatte] = useState<MatteParams>(DEFAULT_MATTE)
  const [processed, setProcessed] = useState<ProcessedImageDraft | null>(null)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [cropPreview, setCropPreview] = useState<ProcessedImageDraft | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [exportFormat, setExportFormat] = useState<ImageExportFormat>('png')
  const [processing, setProcessing] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    return () => {
      if (draft) URL.revokeObjectURL(draft.sourceUrl)
    }
  }, [draft])

  useEffect(() => {
    return () => {
      if (processed) URL.revokeObjectURL(processed.url)
    }
  }, [processed])

  useEffect(() => {
    return () => {
      if (cropPreview) URL.revokeObjectURL(cropPreview.url)
    }
  }, [cropPreview])

  useEffect(() => {
    if (!draft) {
      setProcessed(null)
      setCrop(null)
      setCropPreview(null)
      return
    }
    let alive = true
    setProcessing(true)
    void applyImageMatte(draft.sourceUrl, matte)
      .then((result) => {
        if (!alive) {
          URL.revokeObjectURL(result.url)
          return
        }
        setProcessed((previous) => {
          if (previous) URL.revokeObjectURL(previous.url)
          return result
        })
        setCrop((current) => current ?? createFullImageCrop(result.width, result.height))
      })
      .catch((error) => message.error(`抠图失败：${String(error)}`))
      .finally(() => {
        if (alive) setProcessing(false)
      })
    return () => {
      alive = false
    }
  }, [draft, matte])

  useEffect(() => {
    if (!processed || !crop) {
      setCropPreview(null)
      return
    }
    let alive = true
    void renderCroppedImageUrl(processed.url, crop)
      .then((result) => {
        if (!alive) {
          URL.revokeObjectURL(result.url)
          return
        }
        setCropPreview((previous) => {
          if (previous) URL.revokeObjectURL(previous.url)
          return result
        })
      })
      .catch((error) => message.error(`裁剪预览失败：${String(error)}`))
    return () => {
      alive = false
    }
  }, [crop, processed])

  const canExport = Boolean(processed && crop)
  const exportName = useMemo(
    () => deriveExportFileName(draft?.sourceName ?? '', exportFormat),
    [draft?.sourceName, exportFormat]
  )

  const uploadImage = async (file: File) => {
    if (!isSupportedImageFile(file)) {
      message.error('仅支持 WebP、JPG、JPEG、PNG 图片')
      return
    }
    try {
      const nextDraft = await createImageDraft(file)
      setDraft((previous) => {
        if (previous) URL.revokeObjectURL(previous.sourceUrl)
        return nextDraft
      })
      setProcessed(null)
      setCrop(createFullImageCrop(nextDraft.width, nextDraft.height))
      setPreviewZoom(1)
      message.success('图片已载入')
    } catch (error) {
      message.error(`图片读取失败：${String(error)}`)
    }
  }

  const updateMatte = <K extends keyof MatteParams>(key: K, value: MatteParams[K]) => {
    setMatte((current) => ({ ...current, [key]: value }))
  }

  const exportImage = async () => {
    if (!processed || !crop) return
    setExporting(true)
    try {
      const blob = await exportProcessedImage(processed.url, crop, exportFormat)
      const api = getDesktopApi()
      if (api) {
        const saved = await api.saveFile(exportName, await blob.arrayBuffer())
        if (!saved) throw new Error('未选择保存位置')
      } else {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = exportName
        anchor.click()
        URL.revokeObjectURL(url)
      }
      message.success('图片已导出')
    } catch (error) {
      message.error(`导出失败：${String(error)}`)
    } finally {
      setExporting(false)
    }
  }

  return {
    draft,
    matte,
    processed,
    crop,
    setCrop,
    cropPreview,
    previewZoom,
    setPreviewZoom,
    exportFormat,
    setExportFormat,
    exportName,
    processing,
    exporting,
    canExport,
    minCropSize: MIN_IMAGE_CROP_SIZE,
    uploadImage,
    updateMatte,
    exportImage,
  }
}
```

- [ ] **Step 2: Create panels and entry**

Create compact Ant Design panels that expose the hook state. Use `Upload.Dragger` with `beforeUpload={() => false}` and call `workspace.uploadImage(file)` manually. Use `InputNumber` controls for crop `x`, `y`, `width`, `height`; use `Slider` for zoom; use `Select` for export format. The crop preview image should render in a fixed preview well with `transform: scale(workspace.previewZoom)`.

Create `src/components/ImageProcessingWorkspace/index.tsx`:

```tsx
import { Space, Typography } from 'antd'

import { ImageCropPanel } from './ImageCropPanel'
import { ImageExportPanel } from './ImageExportPanel'
import { ImageMattePanel } from './ImageMattePanel'
import { ImageUploadPanel } from './ImageUploadPanel'
import { useImageProcessingWorkspace } from './useImageProcessingWorkspace'
import './workspace.css'

const { Text, Title } = Typography

export default function ImageProcessingWorkspace() {
  const workspace = useImageProcessingWorkspace()

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ marginTop: 0 }}>图片处理工作台</Title>
        <Text type="secondary">单张图片上传、色键抠图、裁剪预览并导出 PNG、WebP 或 JPEG。</Text>
      </div>
      <div className="image-processing-grid">
        <div className="image-processing-main">
          <ImageUploadPanel workspace={workspace} />
          <ImageCropPanel workspace={workspace} />
        </div>
        <div className="image-processing-side">
          <ImageMattePanel workspace={workspace} />
          <ImageExportPanel workspace={workspace} />
        </div>
      </div>
    </Space>
  )
}
```

- [ ] **Step 3: Add workspace CSS**

Create `src/components/ImageProcessingWorkspace/workspace.css` with stable grid and preview dimensions:

```css
.image-processing-grid {
  display: grid;
  grid-template-columns: minmax(520px, 1fr) minmax(300px, 380px);
  gap: 16px;
  align-items: start;
}

.image-processing-main,
.image-processing-side {
  display: grid;
  gap: 16px;
}

.image-preview-well {
  min-height: 420px;
  display: grid;
  place-items: center;
  overflow: auto;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background:
    linear-gradient(45deg, color-mix(in oklch, var(--color-line) 45%, white) 25%, transparent 25%),
    linear-gradient(-45deg, color-mix(in oklch, var(--color-line) 45%, white) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, color-mix(in oklch, var(--color-line) 45%, white) 75%),
    linear-gradient(-45deg, transparent 75%, color-mix(in oklch, var(--color-line) 45%, white) 75%);
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
}

.image-preview-well img {
  max-width: 100%;
  max-height: 380px;
  transform-origin: center;
}

.image-crop-controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(96px, 1fr));
  gap: 10px;
}

.image-export-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

@media (max-width: 900px) {
  .image-processing-grid {
    grid-template-columns: 1fr;
  }

  .image-crop-controls {
    grid-template-columns: repeat(2, minmax(96px, 1fr));
  }
}
```

- [ ] **Step 4: Run tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: PASS. Fix type errors without changing the public behavior defined in Task 1 tests.

- [ ] **Step 5: Commit workspace UI**

```powershell
git add src/components/ImageProcessingWorkspace src/App.tsx src/appStructure.test.ts
git commit -m "feat: add image processing workspace"
```

## Task 5: Final Verification and Push

**Files:**
- All changed files

- [ ] **Step 1: Run final verification**

Run:

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: tests pass, build succeeds, diff check has no errors, and the branch is ahead of `origin/master` only by the planned commits.

- [ ] **Step 2: Start local server for visual check**

Run:

```powershell
npm run build
```

Then use a local preview server if available:

```powershell
npx vite --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173` in the in-app browser and verify:

- Home page shows 图片处理工作台.
- Shortcut row shows 1 精灵, 2 图片, 3 配音, 4 个人空间.
- The workspace opens.
- Upload panel, matte controls, crop preview, zoom, and export controls are visible without overlapping at desktop width.

- [ ] **Step 3: Commit plan if not already committed**

```powershell
git add docs/superpowers/plans/2026-06-14-image-processing-workspace.md
git commit -m "docs: plan image processing workspace"
```

- [ ] **Step 4: Push**

```powershell
git push origin master
```

Expected: push succeeds to `origin/master`.
