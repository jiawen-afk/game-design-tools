import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { videoProcessingService } from './components/VideoProcessingWorkspace/videoProcessingService'

test('video processing is a first-class lazy workspace with shortcut 4', () => {
  const appSource = readFileSync('src/App.tsx', 'utf8')
  const navigationSource = readFileSync('src/appNavigation.ts', 'utf8')
  const workspacePath = 'src/components/VideoProcessingWorkspace/index.tsx'

  assert.ok(existsSync(workspacePath), `${workspacePath} should exist`)
  assert.match(navigationSource, /export type ToolId = [^\n]*'video-processing'/)
  assert.match(navigationSource, /id: 'video-processing'/)
  assert.match(navigationSource, /name: '视频处理工作台'/)
  assert.match(navigationSource, /input: 'MP4、MOV、MKV、WebM、AVI、OGV 等常见视频'/)
  assert.match(navigationSource, /output: 'Godot 4\.6 可用的 OGV 视频'/)
  assert.match(navigationSource, /shortcut: '4'/)
  assert.match(navigationSource, /personalSpaceShortcut = '5'/)
  assert.match(appSource, /const VideoProcessingWorkspace = lazy\(\(\) => import\('\.\/components\/VideoProcessingWorkspace'\)\)/)
  assert.match(appSource, /activeSurface === 'video-processing'\s*\?\s*<VideoProcessingWorkspace \/>/)
  assert.match(appSource, /<span>视频<\/span>/)
})

test('video workspace entry stays composition-only', () => {
  const workspacePath = 'src/components/VideoProcessingWorkspace/index.tsx'
  assert.ok(existsSync(workspacePath), `${workspacePath} should exist`)
  const source = readFileSync(workspacePath, 'utf8')

  assert.match(source, /视频处理工作台/)
  assert.doesNotMatch(source, /ipcRenderer|child_process|spawn\(|ffmpeg|ffprobe/)
})

test('video renderer orchestration stays behind service and focused hooks', () => {
  const base = 'src/components/VideoProcessingWorkspace'
  const servicePath = `${base}/videoProcessingService.ts`
  const runtimePath = `${base}/useVideoProcessingRuntime.ts`
  const queuePath = `${base}/useVideoProcessingQueue.ts`
  for (const filePath of [servicePath, runtimePath, queuePath]) {
    assert.ok(existsSync(filePath), `${filePath} should exist`)
  }
  const serviceSource = readFileSync(servicePath, 'utf8')
  const runtimeSource = readFileSync(runtimePath, 'utf8')
  const queueSource = readFileSync(queuePath, 'utf8')

  assert.match(serviceSource, /getDesktopApi/)
  assert.match(runtimeSource, /useUpscaleRuntime/)
  assert.match(runtimeSource, /onVideoRuntimeInstallProgress/)
  assert.match(queueSource, /videoProcessingQueueModel/)
  assert.match(queueSource, /onVideoProcessingProgress/)
  assert.doesNotMatch([runtimeSource, queueSource].join('\n'), /ipcRenderer|child_process|spawn\(/)
})

test('video workspace composes focused panels and a registered exit guard', () => {
  const base = 'src/components/VideoProcessingWorkspace'
  const expectedFiles = [
    'useVideoProcessingWorkspace.ts',
    'VideoProcessingToolbar.tsx',
    'VideoProcessingSettingsPanel.tsx',
    'VideoProcessingPreviewPanel.tsx',
    'VideoProcessingQueuePanel.tsx',
    'video-processing-workspace.css',
    'video-processing-layout.css',
    'video-processing-panels.css',
    'video-processing-queue.css',
  ]
  for (const file of expectedFiles) {
    assert.ok(existsSync(`${base}/${file}`), `${base}/${file} should exist`)
  }
  const indexSource = readFileSync(`${base}/index.tsx`, 'utf8')
  const appSource = readFileSync('src/App.tsx', 'utf8')
  const guardPath = 'src/WorkspaceExitGuardContext.tsx'
  assert.ok(existsSync(guardPath), `${guardPath} should exist`)
  const guardSource = readFileSync(guardPath, 'utf8')

  assert.match(indexSource, /VideoProcessingToolbar/)
  assert.match(indexSource, /VideoProcessingSettingsPanel/)
  assert.match(indexSource, /VideoProcessingPreviewPanel/)
  assert.match(indexSource, /VideoProcessingQueuePanel/)
  assert.match(indexSource, /useVideoProcessingWorkspace/)
  assert.doesNotMatch(indexSource, /getDesktopApi|ipcRenderer|spawn\(/)
  assert.match(guardSource, /useWorkspaceExitGuard/)
  assert.match(appSource, /WorkspaceExitGuardContext\.Provider/)
  assert.match(appSource, /requestActiveSurface/)
})

test('video workspace styles stay split by layout, panels, and queue', () => {
  const source = readFileSync('src/components/VideoProcessingWorkspace/video-processing-workspace.css', 'utf8')
  assert.match(source, /video-processing-layout\.css/)
  assert.match(source, /video-processing-panels\.css/)
  assert.match(source, /video-processing-queue\.css/)
  assert.doesNotMatch(source, /background-clip:\s*text|repeating-linear-gradient|border-radius:\s*(3[2-9]|[4-9]\d)px/)
})

test('video desktop promise methods reject asynchronously in browser preview', async () => {
  let pending: Promise<unknown> | undefined
  assert.doesNotThrow(() => {
    pending = videoProcessingService.queryVideoRuntimeStatus()
  })
  await assert.rejects(pending!, /当前不是桌面运行环境/)
})
