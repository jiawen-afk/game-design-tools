import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('image processing matte can be toggled without disabling crop and export flow', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const matteSource = readFileSync('src/components/ImageProcessingWorkspace/ImageMattePanel.tsx', 'utf8')
  const cropSource = readFileSync('src/components/ImageProcessingWorkspace/ImageCropPanel.tsx', 'utf8')
  const stageSource = readFileSync('src/components/ImageProcessingWorkspace/ImageCropResultStage.tsx', 'utf8')

  assert.match(hookSource, /matteEnabled/)
  assert.match(hookSource, /useState\(true\)/)
  assert.match(hookSource, /resolveMatteImageSource/)
  assert.match(hookSource, /activeImageSource/)
  assert.match(matteSource, /Switch/)
  assert.match(matteSource, /checked=\{workspace\.matteEnabled\}/)
  assert.match(matteSource, /onChange=\{workspace\.setMatteEnabled\}/)
  assert.match(cropSource, /workspace\.activeImageSource/)
  assert.match(stageSource, /workspace\.activeImageSource\?\.url/)
  assert.match(stageSource, /workspace\.matteEnabled/)
})

test('image processing workspace delegates matte processing to a focused hook', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const matteHookPath = 'src/components/ImageProcessingWorkspace/useImageMatteProcessing.ts'

  assert.ok(existsSync(matteHookPath), 'matte processing hook should exist')
  const matteHookSource = readFileSync(matteHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/useImageMatteProcessing'/)
  assert.match(hookSource, /useImageMatteProcessing\(/)
  assert.doesNotMatch(hookSource, /applyImageMatte/)
  assert.doesNotMatch(hookSource, /const \[processed, setProcessed\] = useState/)
  assert.doesNotMatch(hookSource, /const \[processing, setProcessing\] = useState/)
  assert.match(matteHookSource, /export function useImageMatteProcessing/)
  assert.match(matteHookSource, /applyImageMatte/)
  assert.match(matteHookSource, /revokeProcessedImageDraftUrl/)
  assert.match(matteHookSource, /createFullImageCrop/)
})

test('image processing workspace delegates source key color picking to a focused hook', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const keyColorHookPath = 'src/components/ImageProcessingWorkspace/useImageKeyColorPicker.ts'

  assert.ok(existsSync(keyColorHookPath), 'image key color picker hook should exist')
  const keyColorHookSource = readFileSync(keyColorHookPath, 'utf8')

  assert.match(hookSource, /from '\.\/useImageKeyColorPicker'/)
  assert.match(hookSource, /useImageKeyColorPicker\(/)
  assert.doesNotMatch(hookSource, /sampleSourceImagePixel/)
  assert.doesNotMatch(hookSource, /mapPreviewPointToImagePixel/)
  assert.doesNotMatch(hookSource, /message\.(success|error)/)
  assert.match(keyColorHookSource, /export function useImageKeyColorPicker/)
  assert.match(keyColorHookSource, /mapPreviewPointToImagePixel/)
  assert.match(keyColorHookSource, /sampleSourceImagePixel/)
  assert.match(keyColorHookSource, /message\.success\(`已取色：rgb/)
  assert.match(keyColorHookSource, /message\.error\(`取色失败：/)
})
