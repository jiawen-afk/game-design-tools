import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyWheelZoom,
  clampCropBox,
  deriveExportFileName,
  getAspectRatioValue,
  getExportScaleAfterDimensionChange,
  getExportSizeAfterScaleChange,
  resolveExportBaseSize,
  resolveMatteImageSource,
  getAnchoredWheelZoomTransform,
  getExportFormatInfo,
  getCropBoxAfterAspectRatioChange,
  isSupportedImageFile,
  mapPreviewPointToImagePixel,
  normalizeCropBox,
  normalizeExportScale,
  normalizeExportSize,
  clampPreviewRect,
  fitContainedImageRect,
  getDraggedPreviewRect,
  getCropBoxFromPreviewRect,
  getPreviewRectFromCropBox,
  sampleImagePixel,
  getPreviewAnchorFromStagePoint,
  shouldInvalidateUpscalePreview,
  MAX_IMAGE_EXPORT_SCALE,
  MAX_PREVIEW_ZOOM,
  MIN_IMAGE_EXPORT_SCALE,
  MIN_IMAGE_EXPORT_SIZE,
  MIN_PREVIEW_ZOOM,
  PREVIEW_ZOOM_STEP,
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
  assert.deepEqual(
    clampCropBox({ x: 20, y: 30, width: 260, height: 180 }, 200, 120, 16),
    { x: 20, y: 30, width: 180, height: 90 }
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

test('image processing workspace normalizes export sizes for image output', () => {
  assert.deepEqual(normalizeExportSize({ width: 120.4, height: 64.6 }), { width: 120, height: 65 })
  assert.deepEqual(normalizeExportSize({ width: 0, height: Number.NaN }, { width: 320, height: 180 }), { width: 320, height: 180 })
})

test('image processing workspace reports image aspect ratio values', () => {
  const size = { width: 1920, height: 1080 }
  assert.equal(getAspectRatioValue(size), Number((size.width / size.height).toFixed(4)))
})

test('image processing workspace adjusts crop boxes by aspect ratio', () => {
  assert.deepEqual(
    getCropBoxAfterAspectRatioChange({ x: 10, y: 20, width: 120, height: 80 }, 300, 220, 1),
    { x: 10, y: 20, width: 120, height: 120 }
  )
  assert.deepEqual(
    getCropBoxAfterAspectRatioChange({ x: 10, y: 150, width: 180, height: 40 }, 300, 200, 1),
    { x: 10, y: 150, width: 50, height: 50 }
  )
})

test('image processing workspace scales export size proportionally from the crop size', () => {
  const baseSize = { width: 320, height: 180 }
  const doubled = getExportSizeAfterScaleChange(baseSize, 2)
  const halved = getExportSizeAfterScaleChange(baseSize, 0.5)
  const clamped = getExportSizeAfterScaleChange(baseSize, 0)

  assert.equal(doubled.width / baseSize.width, doubled.height / baseSize.height)
  assert.equal(halved.width / baseSize.width, halved.height / baseSize.height)
  assert.equal(clamped.width / baseSize.width, clamped.height / baseSize.height)
  assert.equal(clamped.width / baseSize.width, MIN_IMAGE_EXPORT_SCALE)
})

test('image processing workspace keeps export scale at three-decimal precision', () => {
  const scale = 0.1234
  assert.equal(normalizeExportScale(scale), Number(scale.toFixed(3)))
  assert.equal(normalizeExportScale(MIN_IMAGE_EXPORT_SCALE / 100), MIN_IMAGE_EXPORT_SCALE)
})

test('image processing workspace derives export scale from a target width', () => {
  const baseSize = { width: 320, height: 180 }
  const targetWidth = baseSize.width * 2
  const scale = getExportScaleAfterDimensionChange(baseSize, 'width', targetWidth)

  assert.equal(scale, targetWidth / baseSize.width)
  assert.equal(getExportSizeAfterScaleChange(baseSize, scale).width, targetWidth)
})

test('image processing workspace derives export scale from a target height', () => {
  const baseSize = { width: 320, height: 180 }
  const targetHeight = baseSize.height / 2
  const scale = getExportScaleAfterDimensionChange(baseSize, 'height', targetHeight)

  assert.equal(scale, targetHeight / baseSize.height)
  assert.equal(getExportSizeAfterScaleChange(baseSize, scale).height, targetHeight)
})

test('image processing workspace clamps derived export scale to the export limits', () => {
  const baseSize = { width: 320, height: 180 }
  const scale = getExportScaleAfterDimensionChange(baseSize, 'width', 9999)
  const exportSize = getExportSizeAfterScaleChange(baseSize, scale)

  assert.equal(scale, MAX_IMAGE_EXPORT_SCALE)
  assert.equal(exportSize.width / baseSize.width, exportSize.height / baseSize.height)
  assert.equal(exportSize.width / baseSize.width, MAX_IMAGE_EXPORT_SCALE)
})

test('image processing workspace resolves upscale preview as the export base size', () => {
  assert.deepEqual(resolveExportBaseSize({ width: 400, height: 200 }, true, { width: 800, height: 400 }), { width: 800, height: 400 })
  assert.deepEqual(resolveExportBaseSize({ width: 400, height: 200 }, false, { width: 800, height: 400 }), { width: 400, height: 200 })
  assert.deepEqual(resolveExportBaseSize(null, true, null), { width: MIN_IMAGE_EXPORT_SIZE, height: MIN_IMAGE_EXPORT_SIZE })
})

test('image processing workspace resolves the active image source from matte state', () => {
  const draft = { url: 'blob://source', width: 320, height: 180 }
  const processed = { url: 'blob://matte', width: 320, height: 180 }

  assert.equal(resolveMatteImageSource(draft, processed, true), processed)
  assert.equal(resolveMatteImageSource(draft, processed, false), draft)
  assert.equal(resolveMatteImageSource(draft, null, false), draft)
  assert.equal(resolveMatteImageSource(draft, null, true), null)
})

test('image processing workspace keeps an upscale preview until its source inputs change', () => {
  const previewInputs = {
    crop: { x: 12, y: 8, width: 320, height: 180 },
    exportFormat: 'png' as const,
    processedUrl: 'processed://source',
    upscaleOptions: { model: 'upscayl-standard-4x' as const, scale: 4, tileSize: 0, ttaMode: false },
  }

  assert.equal(shouldInvalidateUpscalePreview(previewInputs, previewInputs), false)
  assert.equal(shouldInvalidateUpscalePreview(previewInputs, { ...previewInputs, crop: { ...previewInputs.crop, width: 300 } }), true)
  assert.equal(shouldInvalidateUpscalePreview(previewInputs, { ...previewInputs, exportFormat: 'webp' }), true)
  assert.equal(shouldInvalidateUpscalePreview(previewInputs, { ...previewInputs, processedUrl: 'processed://next' }), true)
  assert.equal(shouldInvalidateUpscalePreview(previewInputs, { ...previewInputs, upscaleOptions: { ...previewInputs.upscaleOptions, model: 'digital-art-4x' } }), true)
})

test('image processing workspace zooms with mouse wheel and clamps the result', () => {
  assert.equal(applyWheelZoom(1, -120), 1 + PREVIEW_ZOOM_STEP)
  assert.equal(applyWheelZoom(1, 120), 1 - PREVIEW_ZOOM_STEP)
  assert.equal(applyWheelZoom(MIN_PREVIEW_ZOOM, 120), MIN_PREVIEW_ZOOM)
  assert.equal(applyWheelZoom(MAX_PREVIEW_ZOOM, -120), MAX_PREVIEW_ZOOM)
})

test('image processing workspace anchors wheel zoom around the pointer', () => {
  const pointer = { x: 200, y: 100 }
  const firstPan = {
    x: -pointer.x * PREVIEW_ZOOM_STEP,
    y: -pointer.y * PREVIEW_ZOOM_STEP,
  }

  assert.deepEqual(
    getAnchoredWheelZoomTransform(1, { x: 0, y: 0 }, -120, pointer),
    { zoom: 1 + PREVIEW_ZOOM_STEP, pan: firstPan }
  )
  assert.deepEqual(
    getAnchoredWheelZoomTransform(1 + PREVIEW_ZOOM_STEP, firstPan, 120, pointer),
    { zoom: 1, pan: { x: 0, y: 0 } }
  )
})

test('image processing workspace keeps the same image point under the pointer after repeated anchored zooms', () => {
  const pointerFromImageCenter = { x: 200, y: 100 }
  const first = getAnchoredWheelZoomTransform(1, { x: 0, y: 0 }, -120, pointerFromImageCenter)
  const second = getAnchoredWheelZoomTransform(
    first.zoom,
    first.pan,
    -120,
    pointerFromImageCenter
  )

  assert.equal(second.zoom, 1 + PREVIEW_ZOOM_STEP * 2)
  assert.deepEqual(second.pan, {
    x: -pointerFromImageCenter.x * PREVIEW_ZOOM_STEP * 2,
    y: -pointerFromImageCenter.y * PREVIEW_ZOOM_STEP * 2,
  })
})

test('image processing workspace derives wheel anchor from the untransformed preview rect', () => {
  assert.deepEqual(
    getPreviewAnchorFromStagePoint(
      { x: 520, y: 260 },
      { x: 100, y: 40, width: 640, height: 360 }
    ),
    { x: 100, y: 40 }
  )
})

test('image processing workspace keeps zoom changes bounded for repeated wheel input', () => {
  let zoom = 1
  const zoomInCount = Math.ceil((MAX_PREVIEW_ZOOM - zoom) / PREVIEW_ZOOM_STEP) + 1
  for (let i = 0; i < zoomInCount; i += 1) {
    zoom = applyWheelZoom(zoom, -120)
  }
  assert.equal(zoom, MAX_PREVIEW_ZOOM)
  const zoomOutCount = Math.ceil((MAX_PREVIEW_ZOOM - MIN_PREVIEW_ZOOM) / PREVIEW_ZOOM_STEP) + 1
  for (let i = 0; i < zoomOutCount; i += 1) {
    zoom = applyWheelZoom(zoom, 120)
  }
  assert.equal(zoom, MIN_PREVIEW_ZOOM)
})

test('image processing workspace maps preview clicks back to source pixels', () => {
  const previewRect = { x: 10, y: 20, width: 200, height: 100 }
  const imageSize = { width: 400, height: 200 }
  const insidePreviewPoint = { x: 60, y: 45 }
  const insidePoint = mapPreviewPointToImagePixel(insidePreviewPoint, previewRect, imageSize)
  const outsidePoint = mapPreviewPointToImagePixel({ x: 260, y: 140 }, previewRect, imageSize)
  const expectedInsideRatio = {
    x: (insidePreviewPoint.x - previewRect.x) / previewRect.width,
    y: (insidePreviewPoint.y - previewRect.y) / previewRect.height,
  }

  assert.equal(insidePoint.x / imageSize.width, expectedInsideRatio.x)
  assert.equal(insidePoint.y / imageSize.height, expectedInsideRatio.y)
  assert.equal(outsidePoint.x, imageSize.width - 1)
  assert.equal(outsidePoint.y, imageSize.height - 1)
})

test('image processing workspace samples rgb values from image data', () => {
  const data = new Uint8ClampedArray([
    12, 34, 56, 255,
    80, 90, 100, 255,
    130, 140, 150, 255,
    200, 210, 220, 255,
  ])
  const imageData = { data, width: 2, height: 2 }
  const topRight = sampleImagePixel(imageData, { x: imageData.width - 1, y: 0 })
  const clampedBottomRight = sampleImagePixel(imageData, { x: 9, y: 9 })

  assert.deepEqual(topRight, Array.from(data.slice(4, 7)))
  assert.deepEqual(clampedBottomRight, Array.from(data.slice(data.length - 4, data.length - 1)))
})

test('image processing workspace fits the preview image inside its container', () => {
  const wideImage = { width: 960, height: 540 }
  const squareContainer = { width: 400, height: 400 }
  const wideFit = fitContainedImageRect(wideImage, squareContainer)
  assert.equal(wideFit.width, squareContainer.width)
  assert.equal(wideFit.width / wideFit.height, wideImage.width / wideImage.height)
  assert.equal(wideFit.x, 0)
  assert.equal(wideFit.y > 0, true)

  const tallContainer = { width: 640, height: 200 }
  const tallFit = fitContainedImageRect({ width: 320, height: 240 }, tallContainer)
  assert.equal(tallFit.height, tallContainer.height)
  assert.equal(tallFit.x > 0, true)
  assert.equal(tallFit.y, 0)
})

test('image processing workspace clamps preview crop boxes inside the preview rect', () => {
  assert.deepEqual(
    clampPreviewRect({ x: -20, y: 10, width: 520, height: 220 }, { width: 400, height: 300 }),
    { x: 0, y: 10, width: 400, height: 220 }
  )
})

test('image processing workspace derives crop boxes from preview coordinates', () => {
  assert.deepEqual(
    getCropBoxFromPreviewRect(
      { x: 70, y: 60, width: 50, height: 25 },
      { x: 20, y: 20, width: 200, height: 100 },
      { width: 400, height: 200 }
    ),
    { x: 100, y: 80, width: 100, height: 50 }
  )
})

test('image processing workspace projects crop boxes into preview coordinates', () => {
  assert.deepEqual(
    getPreviewRectFromCropBox(
      { x: 100, y: 80, width: 100, height: 50 },
      { x: 20, y: 20, width: 200, height: 100 },
      { width: 400, height: 200 }
    ),
    { x: 70, y: 60, width: 50, height: 25 }
  )
})

test('image processing workspace drags preview crop boxes by handle', () => {
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'move', 12, -8, 16),
    { x: 52, y: 22, width: 120, height: 80 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'tl', 20, 10, 16),
    { x: 60, y: 40, width: 100, height: 70 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'right', -200, 0, 16),
    { x: 40, y: 30, width: 16, height: 80 }
  )
})
