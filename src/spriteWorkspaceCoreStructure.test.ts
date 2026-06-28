import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('sprite workspace model delegates residual pure helpers to focused modules', () => {
  const facadePath = 'src/components/MultiFrameSpriteWorkspace/model.ts'
  const layoutModelPath = 'src/components/MultiFrameSpriteWorkspace/layoutModel.ts'
  const layoutDefaultsPath = 'src/components/MultiFrameSpriteWorkspace/layoutDefaultsModel.ts'
  const sheetModelPath = 'src/components/MultiFrameSpriteWorkspace/spriteSheetModel.ts'
  const uploadFilterPath = 'src/components/MultiFrameSpriteWorkspace/spriteUploadFilterModel.ts'
  const compositionPath = 'src/components/MultiFrameSpriteWorkspace/frameCompositionModel.ts'

  for (const path of [layoutModelPath, layoutDefaultsPath, sheetModelPath, uploadFilterPath, compositionPath]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  const facadeSource = readFileSync(facadePath, 'utf8')
  const layoutModelSource = readFileSync(layoutModelPath, 'utf8')
  const layoutDefaultsSource = readFileSync(layoutDefaultsPath, 'utf8')
  const sheetModelSource = readFileSync(sheetModelPath, 'utf8')
  const uploadFilterSource = readFileSync(uploadFilterPath, 'utf8')
  const compositionSource = readFileSync(compositionPath, 'utf8')

  for (const moduleName of [
    'layoutDefaultsModel',
    'spriteSheetModel',
    'spriteUploadFilterModel',
    'frameCompositionModel',
  ]) {
    assert.match(facadeSource, new RegExp(`from './${moduleName}'`))
  }

  assert.doesNotMatch(facadeSource, /export interface (?:LayoutDefaults|SpriteIndexFrameInput|MultiFrameSpriteIndexInput|MultiFrameSpriteIndexFrame|MultiFrameSpriteIndex|SpriteSheetGridCell|ComposedFrameState|ComposedProgressFrameState|ApplyComposedFrameUrlOptions|UploadFileIdentity|UploadFilterState)\b/)
  assert.doesNotMatch(facadeSource, /export function (?:buildUploadFileKey|filterNewUploadFiles|coerceLayoutDefaults|computeAutoSpriteColumns|buildSpriteSheetGridCells|buildMultiFrameSpriteIndex|applyComposedFrameUrl)\b/)
  assert.doesNotMatch(layoutModelSource, /ComposedProgressFrameState/)
  assert.doesNotMatch(layoutModelSource, /getPendingComposedFrameIds/)
  assert.match(layoutDefaultsSource, /export interface LayoutDefaults\b/)
  assert.match(layoutDefaultsSource, /export function coerceLayoutDefaults\b/)
  assert.match(sheetModelSource, /export function computeAutoSpriteColumns\b/)
  assert.match(sheetModelSource, /export function buildSpriteSheetGridCells\b/)
  assert.match(sheetModelSource, /export function buildMultiFrameSpriteIndex\b/)
  assert.match(uploadFilterSource, /export function buildUploadFileKey\b/)
  assert.match(uploadFilterSource, /export function filterNewUploadFiles\b/)
  assert.match(compositionSource, /export interface ComposedProgressFrameState\b/)
  assert.match(compositionSource, /export function applyComposedFrameUrl\b/)
  assert.match(compositionSource, /export function getPendingComposedFrameIds\b/)
})

test('sprite image pipeline delegates browser, matte, composition, import, slicing, and cleanup responsibilities', () => {
  const facadePath = 'src/components/MultiFrameSpriteWorkspace/imagePipeline.ts'
  const browserImagePath = 'src/components/MultiFrameSpriteWorkspace/browserImagePipeline.ts'
  const mattePipelinePath = 'src/components/MultiFrameSpriteWorkspace/spriteMattePipeline.ts'
  const compositionPath = 'src/components/MultiFrameSpriteWorkspace/spriteFrameCompositionPipeline.ts'
  const importPath = 'src/components/MultiFrameSpriteWorkspace/spriteFrameImportPipeline.ts'
  const sheetSlicePath = 'src/components/MultiFrameSpriteWorkspace/spriteSheetSlicePipeline.ts'
  const cleanupPath = 'src/components/MultiFrameSpriteWorkspace/spriteFrameUrlCleanup.ts'
  const matteColorPath = 'src/components/MultiFrameSpriteWorkspace/matteColorModel.ts'

  for (const path of [
    browserImagePath,
    mattePipelinePath,
    compositionPath,
    importPath,
    sheetSlicePath,
    cleanupPath,
    matteColorPath,
  ]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  const facadeSource = readFileSync(facadePath, 'utf8')
  const browserImageSource = readFileSync(browserImagePath, 'utf8')
  const mattePipelineSource = readFileSync(mattePipelinePath, 'utf8')
  const compositionSource = readFileSync(compositionPath, 'utf8')
  const importSource = readFileSync(importPath, 'utf8')
  const sheetSliceSource = readFileSync(sheetSlicePath, 'utf8')
  const cleanupSource = readFileSync(cleanupPath, 'utf8')
  const matteColorSource = readFileSync(matteColorPath, 'utf8')

  for (const moduleName of [
    'browserImagePipeline',
    'spriteMattePipeline',
    'spriteFrameCompositionPipeline',
    'spriteFrameImportPipeline',
    'spriteSheetSlicePipeline',
    'spriteFrameUrlCleanup',
    'matteColorModel',
  ]) {
    assert.match(facadeSource, new RegExp(`from './${moduleName}'`))
  }

  assert.doesNotMatch(facadeSource, /(?:export\s+)?const DEFAULT_MATTE\b/)
  assert.doesNotMatch(facadeSource, /export interface FrameImportGroupInput\b/)
  assert.doesNotMatch(facadeSource, /export (?:async )?function (?:createWorkspaceId|rgbToHex|hexToRgb|loadImage|canvasToBlob|chromaKey|composeFrame|makeFrameFromFile|splitSpriteSheetToPreviews|revokeFrameUrls|revokeSpriteSlicePreviews)\b/)
  assert.doesNotMatch(facadeSource, /function (?:erodeAlpha|drawImageSilhouette)\b/)
  assert.doesNotMatch(facadeSource, /document\.createElement/)

  assert.match(browserImageSource, /export function loadImage\b/)
  assert.match(browserImageSource, /export function canvasToBlob\b/)
  assert.match(matteColorSource, /export function rgbToHex\b/)
  assert.match(matteColorSource, /export function hexToRgb\b/)
  assert.match(mattePipelineSource, /export const DEFAULT_MATTE\b/)
  assert.match(mattePipelineSource, /export async function chromaKey\b/)
  assert.match(mattePipelineSource, /function erodeAlpha\b/)
  assert.match(compositionSource, /export async function composeFrame\b/)
  assert.match(compositionSource, /function drawImageSilhouette\b/)
  assert.match(importSource, /export function createWorkspaceId\b/)
  assert.match(importSource, /export interface FrameImportGroupInput\b/)
  assert.match(importSource, /export async function makeFrameFromFile\b/)
  assert.match(sheetSliceSource, /export async function splitSpriteSheetToPreviews\b/)
  assert.match(cleanupSource, /export function revokeFrameUrls\b/)
  assert.match(cleanupSource, /export function revokeSpriteSlicePreviews\b/)
})

test('sprite export delegates package building and project-space collection workflows', () => {
  const exportHookPath = 'src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts'
  const packagePath = 'src/components/MultiFrameSpriteWorkspace/spriteExportPackage.ts'
  const collectHookPath = 'src/components/MultiFrameSpriteWorkspace/useSpriteCollectWorkflow.ts'

  assert.ok(existsSync(packagePath), `${packagePath} should exist`)
  assert.ok(existsSync(collectHookPath), `${collectHookPath} should exist`)

  const exportHookSource = readFileSync(exportHookPath, 'utf8')
  const packageSource = readFileSync(packagePath, 'utf8')
  const collectHookSource = readFileSync(collectHookPath, 'utf8')

  assert.match(exportHookSource, /from '\.\/spriteExportPackage'/)
  assert.match(exportHookSource, /from '\.\/useSpriteCollectWorkflow'/)
  assert.match(exportHookSource, /useSpriteCollectWorkflow\(/)
  assert.doesNotMatch(exportHookSource, /readCurrentProjectSpaceState/)
  assert.doesNotMatch(exportHookSource, /persistCurrentProjectSpaceState/)
  assert.doesNotMatch(exportHookSource, /getPersonalSpaceDirectoryHandle/)
  assert.doesNotMatch(exportHookSource, /writeAssetResourcesWithGeneratedCoverToDirectory/)
  assert.doesNotMatch(exportHookSource, /collectPersonalSpaceAsset/)
  assert.doesNotMatch(exportHookSource, /assignAssetToCharacterColumn/)
  assert.doesNotMatch(exportHookSource, /createSpriteAssetFromExport/)
  assert.doesNotMatch(exportHookSource, /showCurrentProjectSpaceSyncWarning/)
  assert.doesNotMatch(exportHookSource, /personalSpaceDirectoryRequiredMessage/)
  assert.doesNotMatch(exportHookSource, /document\.createElement\('canvas'\)/)
  assert.match(packageSource, /export async function buildSpriteExportPackage/)
  assert.match(packageSource, /document\.createElement\('canvas'\)/)
  assert.match(packageSource, /buildMultiFrameSpriteIndex/)
  assert.match(collectHookSource, /export function useSpriteCollectWorkflow/)
  assert.match(collectHookSource, /readCurrentProjectSpaceState/)
  assert.match(collectHookSource, /persistCurrentProjectSpaceState/)
  assert.match(collectHookSource, /getPersonalSpaceDirectoryHandle/)
  assert.match(collectHookSource, /writeAssetResourcesWithGeneratedCoverToDirectory/)
  assert.match(collectHookSource, /collectPersonalSpaceAsset/)
  assert.match(collectHookSource, /assignAssetToCharacterColumn/)
  assert.match(collectHookSource, /createSpriteAssetFromExport/)
  assert.match(collectHookSource, /showCurrentProjectSpaceSyncWarning/)
  assert.match(collectHookSource, /personalSpaceDirectoryRequiredMessage/)
})

test('sprite canvas stage delegates rulers, active frame, and guide overlays', () => {
  const stagePath = 'src/components/MultiFrameSpriteWorkspace/CanvasStage.tsx'
  const guideRulersPath = 'src/components/MultiFrameSpriteWorkspace/CanvasGuideRulers.tsx'
  const activeFrameLayerPath = 'src/components/MultiFrameSpriteWorkspace/CanvasActiveFrameLayer.tsx'
  const guideOverlaysPath = 'src/components/MultiFrameSpriteWorkspace/CanvasGuideLineOverlays.tsx'

  for (const path of [guideRulersPath, activeFrameLayerPath, guideOverlaysPath]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  const stageSource = readFileSync(stagePath, 'utf8')
  const guideRulersSource = readFileSync(guideRulersPath, 'utf8')
  const activeFrameLayerSource = readFileSync(activeFrameLayerPath, 'utf8')
  const guideOverlaysSource = readFileSync(guideOverlaysPath, 'utf8')

  assert.match(stageSource, /from '\.\/CanvasGuideRulers'/)
  assert.match(stageSource, /from '\.\/CanvasActiveFrameLayer'/)
  assert.match(stageSource, /from '\.\/CanvasGuideLineOverlays'/)
  assert.match(stageSource, /<CanvasGuideRulers/)
  assert.match(stageSource, /<CanvasActiveFrameLayer/)
  assert.match(stageSource, /<CanvasGuideLineOverlays/)
  assert.doesNotMatch(stageSource, /getGuideRuler(?:Cursor|DragAxis|Label)/)
  assert.doesNotMatch(stageSource, /HANDLE_CURSORS|HANDLE_SIZE/)
  assert.doesNotMatch(stageSource, /ResizeHandle/)
  assert.doesNotMatch(stageSource, /layout\.guideLines\.map/)
  assert.doesNotMatch(stageSource, /data-guide-line-overlay/)
  assert.match(guideRulersSource, /getGuideRulerDragAxis/)
  assert.match(guideRulersSource, /getGuideRulerCursor/)
  assert.match(activeFrameLayerSource, /HANDLE_CURSORS/)
  assert.match(activeFrameLayerSource, /ResizeHandle/)
  assert.match(guideOverlaysSource, /data-guide-line-overlay/)
  assert.match(guideOverlaysSource, /setGuideDragState/)
})
