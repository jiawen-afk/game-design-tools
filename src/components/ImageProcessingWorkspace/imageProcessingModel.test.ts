import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('image processing model tests stay split by model responsibility', () => {
  const source = readFileSync('src/components/ImageProcessingWorkspace/imageProcessingModel.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ImageProcessingWorkspace/imageProcessingFileModel.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingCropModel.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingExportModel.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingSourceModel.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingPreviewZoomModel.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingPreviewPixelModel.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingPreviewGeometryModel.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingUpscalePreviewModel.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'imageProcessingModel.test.ts should only keep split guards')
  for (const delegatedToken of [
    'isSupported' + 'ImageFile',
    'clamp' + 'CropBox',
    'getExportSize' + 'AfterScaleChange',
    'applyWheel' + 'Zoom',
    'shouldInvalidate' + 'UpscalePreview',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
