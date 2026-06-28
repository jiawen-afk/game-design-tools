import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('layout workspace panel delegates canvas editing view details', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const panelPath = 'src/components/MultiFrameSpriteWorkspace/LayoutWorkspacePanel.tsx'
  const canvasStagePath = 'src/components/MultiFrameSpriteWorkspace/CanvasStage.tsx'
  const guideRulersPath = 'src/components/MultiFrameSpriteWorkspace/CanvasGuideRulers.tsx'
  const activeFrameLayerPath = 'src/components/MultiFrameSpriteWorkspace/CanvasActiveFrameLayer.tsx'
  const guideOverlaysPath = 'src/components/MultiFrameSpriteWorkspace/CanvasGuideLineOverlays.tsx'

  assert.ok(existsSync(panelPath), 'expected layout workspace panel to exist')
  assert.ok(existsSync(canvasStagePath), 'expected canvas stage component to exist')
  assert.ok(existsSync(guideRulersPath), 'expected canvas guide rulers component to exist')
  assert.ok(existsSync(activeFrameLayerPath), 'expected canvas active frame layer component to exist')
  assert.ok(existsSync(guideOverlaysPath), 'expected canvas guide overlay component to exist')
  const canvasStage = readFileSync(canvasStagePath, 'utf8')
  const guideRulers = readFileSync(guideRulersPath, 'utf8')
  const activeFrameLayer = readFileSync(activeFrameLayerPath, 'utf8')
  const guideOverlays = readFileSync(guideOverlaysPath, 'utf8')

  assert.doesNotMatch(source, /HANDLE_CURSORS/)
  assert.doesNotMatch(source, /getGuideRulerLabel/)
  assert.doesNotMatch(source, /data-guide-line-overlay/)
  assert.match(source, /from '\.\/LayoutWorkspacePanel'/)
  assert.match(canvasStage, /CanvasGuideRulers/)
  assert.match(canvasStage, /CanvasActiveFrameLayer/)
  assert.match(canvasStage, /CanvasGuideLineOverlays/)
  assert.doesNotMatch(canvasStage, /HANDLE_CURSORS/)
  assert.doesNotMatch(canvasStage, /getGuideRulerLabel/)
  assert.doesNotMatch(canvasStage, /data-guide-line-overlay/)
  assert.match(activeFrameLayer, /HANDLE_CURSORS/)
  assert.match(guideRulers, /getGuideRulerLabel/)
  assert.match(guideOverlays, /data-guide-line-overlay/)
})

test('upload and matte panels own staged card view details', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const uploadPanelPath = 'src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx'
  const mattePanelPath = 'src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx'

  assert.ok(existsSync(uploadPanelPath), 'expected upload workspace panel to exist')
  assert.ok(existsSync(mattePanelPath), 'expected matte workspace panel to exist')
  const uploadPanel = readFileSync(uploadPanelPath, 'utf8')
  const mattePanel = readFileSync(mattePanelPath, 'utf8')

  assert.doesNotMatch(source, /SpriteSheetUploadPanel/)
  assert.doesNotMatch(source, /VideoUploadPanel/)
  assert.doesNotMatch(source, /MatteFrameCard/)
  assert.doesNotMatch(source, /<Tabs/)
  assert.doesNotMatch(source, /<Upload\s/)
  assert.match(source, /from '\.\/UploadWorkspacePanel'/)
  assert.match(source, /from '\.\/MatteWorkspacePanel'/)
  assert.match(uploadPanel, /SpriteSheetUploadPanel/)
  assert.match(uploadPanel, /VideoUploadPanel/)
  assert.match(uploadPanel, /sprite-single-upload-drop/)
  assert.match(uploadPanel, /sprite-active-upload-panel/)
  assert.doesNotMatch(uploadPanel, /<Tabs/)
  assert.match(uploadPanel, /<Upload(?:\.Dragger|\s)/)
  assert.match(mattePanel, /MatteFrameCard/)
})

test('workspace entry only composes focused panels and hooks', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')
  const layoutPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspacePanel.tsx', 'utf8')

  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/useWorkspaceReset.ts'), 'expected reset hook to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspaceToolbar.tsx'), 'expected layout toolbar component to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/CanvasStage.tsx'), 'expected canvas stage component to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/ActiveFrameInspector.tsx'), 'expected active frame inspector component to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/WorkspaceDialogs.tsx'), 'expected dialogs component to exist')
  assert.ok(existsSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx'), 'expected output panel component to exist')

  assert.doesNotMatch(source, /useEffect/)
  assert.doesNotMatch(source, /removeAllFrames/)
  assert.doesNotMatch(source, /setGuideDragState/)
  assert.doesNotMatch(source, /canvasStageRef/)
  assert.doesNotMatch(source, /handleLayoutWheel/)
  assert.doesNotMatch(source, /PlaybackPanel/)
  assert.doesNotMatch(source, /ExportPanel/)
  assert.doesNotMatch(source, /MatteDefaultsModal/)
  assert.doesNotMatch(source, /LayoutDefaultsModal/)
  assert.doesNotMatch(source, /DetailPreviewModal/)
  assert.match(controller, /from '\.\/useWorkspaceReset'/)
  assert.match(source, /from '\.\/WorkspaceDialogs'/)
  assert.match(source, /from '\.\/OutputWorkspacePanel'/)
  assert.match(layoutPanel, /LayoutWorkspaceToolbar/)
  assert.match(layoutPanel, /CanvasStage/)
  assert.match(layoutPanel, /ActiveFrameInspector/)
})

test('workspace entry delegates controller shell and view model boundaries', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const controllerPath = 'src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts'
  const shellPath = 'src/components/MultiFrameSpriteWorkspace/WorkspaceShell.tsx'
  const frameHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useFrameWorkspaceState.ts', 'utf8')
  const layoutHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const uploadPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/UploadWorkspacePanel.tsx', 'utf8')
  const outputPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx', 'utf8')
  const dialogs = readFileSync('src/components/MultiFrameSpriteWorkspace/WorkspaceDialogs.tsx', 'utf8')

  assert.ok(existsSync(controllerPath), 'expected sprite workspace controller hook to exist')
  assert.ok(existsSync(shellPath), 'expected workspace shell component to exist')
  const controller = readFileSync(controllerPath, 'utf8')
  const shell = readFileSync(shellPath, 'utf8')

  assert.doesNotMatch(source, /useMemo/)
  assert.doesNotMatch(source, /readStoredLayoutDefaults/)
  assert.doesNotMatch(source, /useLayoutWorkspace/)
  assert.doesNotMatch(source, /usePlaybackWorkspace/)
  assert.doesNotMatch(source, /useSpriteExport/)
  assert.doesNotMatch(source, /useMattePipeline/)
  assert.doesNotMatch(source, /useUploadWorkspace/)
  assert.doesNotMatch(source, /useVideoWorkspace/)
  assert.doesNotMatch(source, /useWorkspaceReset/)
  assert.doesNotMatch(source, /setDetailPreview/)
  assert.doesNotMatch(source, /setDetailZoom/)
  assert.match(source, /from '\.\/useSpriteWorkspaceController'/)
  assert.match(source, /from '\.\/WorkspaceShell'/)
  assert.match(controller, /useLayoutWorkspace/)
  assert.match(controller, /usePlaybackWorkspace/)
  assert.match(controller, /useWorkspaceReset/)
  assert.match(shell, /精灵图工作台/)
  assert.doesNotMatch(shell, /多图动作精灵工作台/)
  assert.match(frameHook, /openDetailPreview/)
  assert.doesNotMatch(uploadPanel, /ReturnType/)
  assert.doesNotMatch(outputPanel, /ReturnType/)
  assert.doesNotMatch(dialogs, /ReturnType/)
  assert.match(layoutHook, /export interface LayoutWorkspaceViewModel/)
})
