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

test('image processing matte exposes the shared BiRefNet AI matting controls', () => {
  const workspaceSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const panelSource = readFileSync('src/components/ImageProcessingWorkspace/ImageMattePanel.tsx', 'utf8')
  const stageSource = readFileSync('src/components/ImageProcessingWorkspace/ImageCropResultStage.tsx', 'utf8')

  assert.match(workspaceSource, /from '\.\.\/MultiFrameSpriteWorkspace\/useAiMattingSetup'/)
  assert.match(workspaceSource, /useAiMattingSetup\(\)/)
  assert.match(workspaceSource, /const \[matteMode, setMatteMode\]/)
  assert.match(workspaceSource, /matteMode,/)
  assert.match(workspaceSource, /aiMatting,/)
  assert.match(panelSource, /from '\.\.\/MultiFrameSpriteWorkspace\/MatteAiSetupPanel'/)
  assert.match(panelSource, /<Segmented/)
  assert.match(panelSource, /色键抠图/)
  assert.match(panelSource, /AI抠图/)
  assert.match(panelSource, /<MatteAiSetupPanel/)
  assert.match(stageSource, /workspace\.matteMode === 'chroma'/)
})

test('image processing matte workflow selects chroma key or BiRefNet processing', () => {
  const hookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageMatteProcessing.ts', 'utf8')
  const pipelineSource = readFileSync('src/components/ImageProcessingWorkspace/imageProcessingPipeline.ts', 'utf8')

  assert.match(hookSource, /matteMode/)
  assert.match(hookSource, /aiMattingConnected/)
  assert.match(hookSource, /mode:\s*matteMode/)
  assert.match(hookSource, /inputName:\s*draft\.sourceName/)
  assert.match(pipelineSource, /removeImageBackground/)
  assert.match(pipelineSource, /options\.mode === 'ai'/)
  assert.match(pipelineSource, /removeImageBackground\(sourceUrl/)
  assert.match(pipelineSource, /chromaKey\(sourceUrl, matte\)/)
})

test('image processing batch export uses the selected matte mode', () => {
  const workspaceSource = readFileSync('src/components/ImageProcessingWorkspace/useImageProcessingWorkspace.ts', 'utf8')
  const batchSettingsSource = readFileSync('src/components/ImageProcessingWorkspace/useImageBatchSettingsWorkspace.ts', 'utf8')
  const exportHookSource = readFileSync('src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts', 'utf8')
  const batchSource = readFileSync('src/components/ImageProcessingWorkspace/imageBatchExportWorkflow.ts', 'utf8')

  assert.match(workspaceSource, /useImageBatchSettingsWorkspace\(\{[\s\S]*matteMode,/)
  assert.match(batchSettingsSource, /matteMode,/)
  assert.match(exportHookSource, /item\.settings/)
  assert.match(batchSource, /settings\.matteMode/)
  assert.match(batchSource, /mode:\s*settings\.matteMode/)
  assert.match(batchSource, /inputName:\s*item\.draft\.sourceName/)
})

test('image processing AI status output cannot widen the left control column', () => {
  const matteStyles = readFileSync('src/components/ImageProcessingWorkspace/imageProcessing.matte.css', 'utf8')

  assert.match(matteStyles, /\.ai-matting-setup \.ant-alert-content[\s\S]*min-width:\s*0/)
  assert.match(matteStyles, /\.ai-matting-setup \.ant-alert-description[\s\S]*overflow-wrap:\s*anywhere/)
  assert.match(matteStyles, /\.ai-matting-setup \.ant-space[\s\S]*max-width:\s*100%/)
})
