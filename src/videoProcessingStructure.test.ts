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
  assert.match(navigationSource, /output: 'Godot 4\.6 OGV，以及 WebM 和 MP4 视频'/)
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

test('video workspace restores only its remembered output directory without renderer persistence', () => {
  const base = 'src/components/VideoProcessingWorkspace'
  const serviceSource = readFileSync(`${base}/videoProcessingService.ts`, 'utf8')
  const queueSource = readFileSync(`${base}/useVideoProcessingQueue.ts`, 'utf8')

  assert.match(serviceSource, /getVideoOutputDirectory: async \(\) => requireVideoDesktopApi\(\)\.getVideoOutputDirectory\(\)/)
  assert.match(queueSource, /outputDirectorySelectionIdRef/)
  assert.match(queueSource, /videoProcessingService\.getVideoOutputDirectory\(\)/)
  assert.match(queueSource, /let mounted = true/)
  assert.match(queueSource, /mounted && directory/)
  assert.match(queueSource, /selectionId === outputDirectorySelectionIdRef\.current/)
  assert.match(queueSource, /mounted = false/)
  assert.match(
    queueSource,
    /const directory = await videoProcessingService\.chooseVideoOutputDirectory\(\)\s+if \(directory\) \{\s+outputDirectorySelectionIdRef\.current \+= 1\s+setOutputDirectory\(directory\)/,
  )
  assert.doesNotMatch([serviceSource, queueSource].join('\n'), /localStorage/)
})

test('video queue pauses after a drained batch and selects the first newly imported job', () => {
  const queueSource = readFileSync(
    'src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts',
    'utf8',
  )

  assert.match(queueSource, /shouldAutoPauseVideoQueue/)
  assert.match(
    queueSource,
    /shouldAutoPauseVideoQueue\(jobs, paused, activeJobId, runningRef\.current\)[\s\S]*setPaused\(true\)/,
  )
  assert.match(queueSource, /let firstImportedJobId: string \| null = null/)
  assert.match(
    queueSource,
    /const files = await videoProcessingService\.chooseVideoFiles\(\)\s+if \(files\.length > 0\) setPaused\(true\)\s+let firstImportedJobId/,
  )
  assert.match(
    queueSource,
    /if \(!firstImportedJobId\) \{\s+firstImportedJobId = id\s+setSelectedJobId\(id\)\s+\}/,
  )
  assert.doesNotMatch(queueSource, /setSelectedJobId\(\(current\) => current \?\? id\)/)
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
  const workspaceSource = readFileSync(`${base}/useVideoProcessingWorkspace.ts`, 'utf8')
  const appSource = readFileSync('src/App.tsx', 'utf8')
  const guardPath = 'src/WorkspaceExitGuardContext.tsx'
  assert.ok(existsSync(guardPath), `${guardPath} should exist`)
  const guardSource = readFileSync(guardPath, 'utf8')

  assert.match(indexSource, /VideoProcessingToolbar/)
  assert.match(indexSource, /VideoProcessingSettingsPanel/)
  assert.match(indexSource, /VideoProcessingPreviewPanel/)
  assert.match(indexSource, /VideoProcessingQueuePanel/)
  assert.match(indexSource, /useVideoProcessingWorkspace/)
  assert.match(workspaceSource, /previewRequestIdRef/)
  assert.match(workspaceSource, /requestId !== previewRequestIdRef\.current/)
  assert.doesNotMatch(indexSource, /getDesktopApi|ipcRenderer|spawn\(/)
  assert.match(guardSource, /useWorkspaceExitGuard/)
  assert.match(appSource, /WorkspaceExitGuardContext\.Provider/)
  assert.match(appSource, /requestActiveSurface/)
})

test('video preview participates in renderer cancellation and queue exclusion', () => {
  const base = 'src/components/VideoProcessingWorkspace'
  const workspaceSource = readFileSync(`${base}/useVideoProcessingWorkspace.ts`, 'utf8')
  const toolbarSource = readFileSync(`${base}/VideoProcessingToolbar.tsx`, 'utf8')
  const previewSource = readFileSync(`${base}/VideoProcessingPreviewPanel.tsx`, 'utf8')

  assert.match(workspaceSource, /cancelVideoProcessingJob\('__preview__'\)/)
  assert.match(workspaceSource, /queue\.hasPendingWork \|\| previewLoading/)
  assert.match(workspaceSource, /if \(previewLoading\) return false/)
  assert.match(toolbarSource, /workspace\.previewLoading/)
  assert.match(previewSource, /workspace\.activeJobId/)
})

test('video workspace styles stay split by layout, panels, and queue', () => {
  const source = readFileSync('src/components/VideoProcessingWorkspace/video-processing-workspace.css', 'utf8')
  assert.match(source, /video-processing-layout\.css/)
  assert.match(source, /video-processing-panels\.css/)
  assert.match(source, /video-processing-queue\.css/)
  assert.doesNotMatch(source, /background-clip:\s*text|repeating-linear-gradient|border-radius:\s*(3[2-9]|[4-9]\d)px/)
})

test('video desktop startup promise methods reject asynchronously in browser preview', async () => {
  let runtimeStatus: Promise<unknown> | undefined
  assert.doesNotThrow(() => {
    runtimeStatus = videoProcessingService.queryVideoRuntimeStatus()
  })
  await assert.rejects(runtimeStatus!, /当前不是桌面运行环境/)

  let outputDirectory: Promise<unknown> | undefined
  assert.doesNotThrow(() => {
    outputDirectory = videoProcessingService.getVideoOutputDirectory()
  })
  await assert.rejects(outputDirectory!, /当前不是桌面运行环境/)
})

test('Godot 4.6 smoke fixture and video workflow documentation stay available', () => {
  const projectPath = 'test-fixtures/godot-video-smoke/project.godot'
  const scriptPath = 'test-fixtures/godot-video-smoke/video_smoke.gd'
  assert.ok(existsSync(projectPath), `${projectPath} should exist`)
  assert.ok(existsSync(scriptPath), `${scriptPath} should exist`)

  const projectSource = readFileSync(projectPath, 'utf8')
  const scriptSource = readFileSync(scriptPath, 'utf8')
  const readmeSource = readFileSync('README.md', 'utf8')
  assert.match(projectSource, /config_version=5/)
  assert.match(scriptSource, /VideoStreamTheora/)
  assert.match(scriptSource, /VideoStreamPlayer/)
  assert.match(readmeSource, /Video Processing Workbench/)
  assert.match(readmeSource, /Godot 4\.6/)
  assert.match(readmeSource, /Upscayl GPU/)
  assert.match(readmeSource, /\.ogv/)
  assert.match(readmeSource, /WebM/)
  assert.match(readmeSource, /MP4/)
})
