import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

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
