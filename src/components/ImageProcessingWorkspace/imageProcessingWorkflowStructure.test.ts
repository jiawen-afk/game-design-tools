import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('image processing workspace delegates source image lifecycle to a focused hook', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const sourceHookPath = 'src/components/ImageProcessingWorkspace/useImageSourceWorkspace.ts'
  const sourceHookSource = existsSync(sourceHookPath) ? readFileSync(sourceHookPath, 'utf8') : ''

  assert.ok(existsSync(sourceHookPath), 'image source lifecycle hook should exist')
  assert.match(hookSource, /from '\.\/useImageSourceWorkspace'/)
  assert.match(hookSource, /useImageSourceWorkspace\(/)
  assert.doesNotMatch(hookSource, /createImageDraft/)
  assert.doesNotMatch(hookSource, /isSupportedImageFile/)
  assert.doesNotMatch(hookSource, /revokeLoadedImageDraftUrl/)
  assert.doesNotMatch(hookSource, /const uploadImage = async/)
  assert.doesNotMatch(hookSource, /const resetWorkspace = useCallback/)
  assert.match(sourceHookSource, /export function useImageSourceWorkspace/)
  assert.match(sourceHookSource, /createImageDraft/)
  assert.match(sourceHookSource, /isSupportedImageFile/)
  assert.match(sourceHookSource, /revokeLoadedImageDraftUrl/)
  assert.match(sourceHookSource, /createFullImageCrop/)
  assert.match(sourceHookSource, /clearProcessed\(\)/)
  assert.match(sourceHookSource, /clearCropPreview\(\)/)
  assert.match(sourceHookSource, /resetUpscale\(false\)/)
})

test('image processing export target selection stays in the model', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const modelSource = readFileSync('src/components/ImageProcessingWorkspace/imageProcessingExportModel.ts', 'utf8')
  const pipelineSource = readFileSync('src/components/ImageProcessingWorkspace/imageProcessingPipeline.ts', 'utf8')
  const exportHookPath = 'src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts'
  const exportHookSource = existsSync(exportHookPath) ? readFileSync(exportHookPath, 'utf8') : hookSource
  const exportStart = hookSource.indexOf('const exportImage = async')
  const exportSource = hookSource.slice(exportStart)

  assert.match(modelSource, /function resolveImageExportTarget/)
  assert.match(pipelineSource, /function saveImageExportBlob/)
  assert.match(`${hookSource}\n${exportHookSource}`, /resolveImageExportTarget/)
  assert.match(`${hookSource}\n${exportHookSource}`, /saveImageExportBlob/)
  assert.doesNotMatch(exportSource, /const exportSource =/)
  assert.doesNotMatch(exportSource, /const exportCrop =/)
  assert.doesNotMatch(exportSource, /\.saveFile\(/)
  assert.doesNotMatch(exportSource, /document\.createElement\('a'\)/)
  assert.doesNotMatch(exportSource, /anchor\.click\(\)/)
})

test('image processing workspace delegates export save workflow to a focused hook', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const exportHookPath = 'src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts'

  assert.ok(existsSync(exportHookPath), 'image export workflow hook should exist')
  const exportHookSource = readFileSync(exportHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/useImageExportWorkflow'/)
  assert.match(hookSource, /useImageExportWorkflow\(/)
  assert.doesNotMatch(hookSource, /getDesktopApi/)
  assert.doesNotMatch(hookSource, /exportProcessedImage/)
  assert.doesNotMatch(hookSource, /saveImageExportBlob/)
  assert.doesNotMatch(hookSource, /const \[exporting, setExporting\] = useState/)
  assert.doesNotMatch(hookSource, /const exportImage = async/)
  assert.match(exportHookSource, /export function useImageExportWorkflow/)
  assert.match(exportHookSource, /resolveImageExportTarget/)
  assert.match(exportHookSource, /exportProcessedImage/)
  assert.match(exportHookSource, /saveImageExportBlob/)
  assert.match(exportHookSource, /getDesktopApi/)
  assert.match(exportHookSource, /message\.success\('图片已导出'\)/)
  assert.match(exportHookSource, /message\.error\(`导出失败：/)
})

test('image processing export workflow delegates batch preparation and upscale preview encoding', () => {
  const exportHookPath = 'src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts'
  const batchWorkflowPath = 'src/components/ImageProcessingWorkspace/imageBatchExportWorkflow.ts'

  assert.ok(existsSync(batchWorkflowPath), 'image batch export workflow helper should exist')
  const exportHookSource = readFileSync(exportHookPath, 'utf8')
  const batchWorkflowSource = readFileSync(batchWorkflowPath, 'utf8')

  assert.match(exportHookSource, /from '\.\/imageBatchExportWorkflow'/)
  assert.match(exportHookSource, /prepareImageBatchExport/)
  assert.match(exportHookSource, /createImageBatchUpscalePreview/)
  assert.match(exportHookSource, /encodeImageUpscalePreview/)
  assert.match(exportHookSource, /revokeBatchUpscalePreview/)
  assert.doesNotMatch(exportHookSource, /applyImageMatte/)
  assert.doesNotMatch(exportHookSource, /blobFromDesktopBinaryData/)
  assert.doesNotMatch(exportHookSource, /interface PreparedBatchExport/)
  assert.match(batchWorkflowSource, /export async function prepareImageBatchExport/)
  assert.match(batchWorkflowSource, /export async function createImageBatchUpscalePreview/)
  assert.match(batchWorkflowSource, /export async function encodeImageUpscalePreview/)
  assert.match(batchWorkflowSource, /export function revokeBatchUpscalePreview/)
  assert.match(batchWorkflowSource, /applyImageMatte/)
  assert.match(batchWorkflowSource, /blobFromDesktopBinaryData/)
})

test('image processing workspace delegates export settings state to a focused hook', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const settingsHookPath = 'src/components/ImageProcessingWorkspace/useImageExportSettingsWorkspace.ts'

  assert.ok(existsSync(settingsHookPath), 'image export settings hook should exist')
  const settingsHookSource = readFileSync(settingsHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/useImageExportSettingsWorkspace'/)
  assert.match(hookSource, /useImageExportSettingsWorkspace\(/)
  assert.doesNotMatch(hookSource, /deriveExportFileName/)
  assert.doesNotMatch(hookSource, /getAspectRatioValue/)
  assert.doesNotMatch(hookSource, /getExportScaleAfterDimensionChange/)
  assert.doesNotMatch(hookSource, /normalizeExportScale/)
  assert.doesNotMatch(hookSource, /const \[exportFormat, setExportFormat\] = useState/)
  assert.doesNotMatch(hookSource, /const \[exportScale, setExportScaleState\] = useState/)
  assert.doesNotMatch(hookSource, /const setExportScale = useCallback/)
  assert.doesNotMatch(hookSource, /const updateExportDimension = useCallback/)
  assert.match(settingsHookSource, /export function useImageExportSettingsWorkspace/)
  assert.match(settingsHookSource, /deriveEncodedExportFileName/)
  assert.match(settingsHookSource, /defaultImageExportEncoding/)
  assert.match(settingsHookSource, /normalizeImageExportEncoding/)
  assert.match(settingsHookSource, /setOptimizePng/)
  assert.match(settingsHookSource, /getAspectRatioValue/)
  assert.match(settingsHookSource, /getExportScaleAfterDimensionChange/)
  assert.match(settingsHookSource, /normalizeExportScale/)
})

test('image processing model delegates focused responsibilities to model modules', () => {
  const facadeSource = readFileSync('src/components/ImageProcessingWorkspace/imageProcessingModel.ts', 'utf8')
  const modelPaths = [
    'src/components/ImageProcessingWorkspace/imageProcessingTypes.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingFileModel.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingCropModel.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingExportModel.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingSourceModel.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingPreviewModel.ts',
  ]

  for (const path of modelPaths) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  for (const moduleName of [
    'imageProcessingTypes',
    'imageProcessingFileModel',
    'imageProcessingCropModel',
    'imageProcessingExportModel',
    'imageProcessingSourceModel',
    'imageProcessingPreviewModel',
  ]) {
    assert.match(facadeSource, new RegExp(`from './${moduleName}'`))
  }

  assert.doesNotMatch(facadeSource, /function\s+(isSupportedImageFile|clampCropBox|normalizeExportSize|resolveMatteImageSource|applyWheelZoom)\b/)
})

test('image processing workspace delegates object URL cleanup to pipeline helpers', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const sourceHookPath = 'src/components/ImageProcessingWorkspace/useImageSourceWorkspace.ts'
  const sourceHookSource = existsSync(sourceHookPath) ? readFileSync(sourceHookPath, 'utf8') : ''
  const upscaleHookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageUpscaleWorkflow.ts', 'utf8')
  const cropPreviewHookPath = 'src/components/ImageProcessingWorkspace/useImageCropPreview.ts'
  const cropPreviewHookSource = existsSync(cropPreviewHookPath) ? readFileSync(cropPreviewHookPath, 'utf8') : ''
  const pipelineSource = readFileSync('src/components/ImageProcessingWorkspace/imageProcessingPipeline.ts', 'utf8')
  const directRevokes = `${hookSource}\n${sourceHookSource}\n${upscaleHookSource}\n${cropPreviewHookSource}`.match(/URL\.revokeObjectURL/g) ?? []

  assert.match(pipelineSource, /function revokeImageObjectUrl/)
  assert.match(pipelineSource, /function revokeLoadedImageDraftUrl/)
  assert.match(pipelineSource, /function revokeProcessedImageDraftUrl/)
  assert.match(`${hookSource}\n${sourceHookSource}`, /revokeLoadedImageDraftUrl/)
  assert.match(`${hookSource}\n${cropPreviewHookSource}`, /revokeProcessedImageDraftUrl/)
  assert.match(upscaleHookSource, /revokeImageObjectUrl/)
  assert.equal(directRevokes.length, 0)
  assert.match(pipelineSource, /URL\.revokeObjectURL\(url\)/)
})

test('image processing workspace delegates crop preview state to a focused hook', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const cropPreviewHookPath = 'src/components/ImageProcessingWorkspace/useImageCropPreview.ts'

  assert.ok(existsSync(cropPreviewHookPath), 'crop preview hook should exist')
  const cropPreviewHookSource = readFileSync(cropPreviewHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/useImageCropPreview'/)
  assert.match(hookSource, /useImageCropPreview\(/)
  assert.doesNotMatch(hookSource, /renderCroppedImageUrl/)
  assert.doesNotMatch(hookSource, /const \[cropPreview, setCropPreview\] = useState/)
  assert.doesNotMatch(hookSource, /const \[cropPreviewSize, setCropPreviewSize\] = useState/)
  assert.doesNotMatch(hookSource, /fitContainedImageRect/)
  assert.match(cropPreviewHookSource, /export function useImageCropPreview/)
  assert.match(cropPreviewHookSource, /renderCroppedImageUrl/)
  assert.match(cropPreviewHookSource, /revokeProcessedImageDraftUrl/)
  assert.match(cropPreviewHookSource, /fitContainedImageRect/)
  assert.match(cropPreviewHookSource, /useImageCropDrag/)
  assert.match(cropPreviewHookSource, /setCropPreviewContainerSize/)
})

test('image processing workspace delegates crop drag window interactions to a focused hook', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const dragHookPath = 'src/components/ImageProcessingWorkspace/useImageCropDrag.ts'
  const cropPreviewHookPath = 'src/components/ImageProcessingWorkspace/useImageCropPreview.ts'
  const cropPreviewHookSource = existsSync(cropPreviewHookPath) ? readFileSync(cropPreviewHookPath, 'utf8') : hookSource

  assert.ok(existsSync(dragHookPath), 'crop drag window interaction hook should exist')
  const dragHookSource = readFileSync(dragHookPath, 'utf8')

  assert.match(cropPreviewHookSource, /useImageCropDrag\(/)
  assert.doesNotMatch(hookSource, /window\.addEventListener\('mousemove'/)
  assert.doesNotMatch(hookSource, /window\.addEventListener\('mouseup'/)
  assert.match(dragHookSource, /window\.addEventListener\('mousemove'/)
  assert.match(dragHookSource, /window\.addEventListener\('mouseup'/)
  assert.match(dragHookSource, /setCropDraftRect/)
  assert.match(dragHookSource, /setCrop\(/)
})

test('image processing workspace delegates preview zoom and pan state to a focused hook', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const previewHookPath = 'src/components/ImageProcessingWorkspace/useImagePreviewTransform.ts'

  assert.ok(existsSync(previewHookPath), 'preview transform hook should exist')
  const previewHookSource = readFileSync(previewHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/useImagePreviewTransform'/)
  assert.match(hookSource, /useImagePreviewTransform\(/)
  assert.doesNotMatch(hookSource, /const \[previewTransform, setPreviewTransform\] = useState/)
  assert.doesNotMatch(hookSource, /const setPreviewZoom = useCallback/)
  assert.doesNotMatch(hookSource, /const handleWheelZoom = useCallback/)
  assert.match(previewHookSource, /export function useImagePreviewTransform/)
  assert.match(previewHookSource, /applyWheelZoom/)
  assert.match(previewHookSource, /getAnchoredWheelZoomTransform/)
  assert.match(previewHookSource, /resetPreviewTransform/)
})

test('image processing result stage delegates crop selection layer rendering', () => {
  const stageSource = readFileSync('src/components/ImageProcessingWorkspace/ImageCropResultStage.tsx', 'utf8')
  const selectionLayerPath = 'src/components/ImageProcessingWorkspace/ImageCropSelectionLayer.tsx'

  assert.ok(existsSync(selectionLayerPath), 'crop selection layer component should exist')
  const selectionLayerSource = readFileSync(selectionLayerPath, 'utf8')

  assert.match(stageSource, /from '\.\/ImageCropSelectionLayer'/)
  assert.match(stageSource, /<ImageCropSelectionLayer/)
  assert.doesNotMatch(stageSource, /image-crop-handle-corner/)
  assert.doesNotMatch(stageSource, /image-crop-handle-edge-top/)
  assert.match(selectionLayerSource, /export function ImageCropSelectionLayer/)
  assert.match(selectionLayerSource, /image-crop-mask/)
  assert.equal((selectionLayerSource.match(/onStartDrag\(event, /g) ?? []).length, 9)
})
