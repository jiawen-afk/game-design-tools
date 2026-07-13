import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('image processing workspace exposes batch upload and pending image list controls', () => {
  const mattePanelSource = readFileSync('src/components/ImageProcessingWorkspace/ImageMattePanel.tsx', 'utf8')
  const workspaceSource = readFileSync('src/components/ImageProcessingWorkspace/index.tsx', 'utf8')
  const uploadPanelSource = readFileSync('src/components/ImageProcessingWorkspace/ImageUploadPanel.tsx', 'utf8')
  const batchListPath = 'src/components/ImageProcessingWorkspace/ImageBatchListPanel.tsx'

  assert.ok(existsSync(batchListPath), 'pending image list component should exist')
  const batchListSource = readFileSync(batchListPath, 'utf8')

  assert.match(uploadPanelSource, /multiple:\s*true/)
  assert.match(uploadPanelSource, /uploadImages/)
  assert.match(workspaceSource, /from '\.\/ImageBatchListPanel'/)
  assert.match(workspaceSource, /<ImageBatchListPanel workspace=\{workspace\} \/>/)
  assert.doesNotMatch(mattePanelSource, /from '\.\/ImageBatchListPanel'/)
  assert.doesNotMatch(mattePanelSource, /<ImageBatchListPanel/)
  assert.match(batchListSource, /待处理图片/)
  assert.match(batchListSource, /batchImages\.map/)
  assert.match(batchListSource, /selectBatchImage/)
})

test('image processing export panel exposes apply-all preview and batch export controls', () => {
  const exportPanelSource = readFileSync('src/components/ImageProcessingWorkspace/ImageExportPanel.tsx', 'utf8')
  const exportWorkflowSource = readFileSync('src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts', 'utf8')

  assert.match(exportPanelSource, /全部应用预览/)
  assert.match(exportPanelSource, /applyAllPreviews/)
  assert.match(exportPanelSource, /导出所有图片/)
  assert.match(exportPanelSource, /exportAllImages/)
  assert.match(exportWorkflowSource, /import\('jszip'\)/)
  assert.match(exportWorkflowSource, /deriveBatchExportFileNamesBySettings/)
  assert.match(exportWorkflowSource, /createImageProcessingBatchSettingsSignature/)
  assert.match(exportWorkflowSource, /item\.settings\.upscaleEnabled/)
  assert.match(exportWorkflowSource, /batchApplyOperationIdRef/)
  assert.match(exportWorkflowSource, /pendingBatchUpscalePreviewsRef/)
  assert.match(exportWorkflowSource, /operationId !== batchApplyOperationIdRef\.current/)
  assert.match(exportWorkflowSource, /createImageProcessingBatchSettingsSignature/)
  assert.match(exportWorkflowSource, /const preview = batchPreview \?\? await createUpscalePreviewForItem\(item\)/)
})

test('image processing result stage lets users leave upscale comparison after preview generation', () => {
  const stageSource = readFileSync('src/components/ImageProcessingWorkspace/ImageCropResultStage.tsx', 'utf8')

  assert.match(stageSource, /高清化对比/)
  assert.match(stageSource, /upscaleCompareEnabled/)
  assert.match(stageSource, /setUpscaleCompareEnabled/)
})
