import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('desktop API exposes typed video processing operations', () => {
  const apiPath = 'src/desktopVideoProcessingApi.ts'
  assert.ok(existsSync(apiPath), `${apiPath} should exist`)
  const apiSource = readFileSync(apiPath, 'utf8')
  const desktopApiSource = readFileSync('src/desktopApi.ts', 'utf8')

  assert.match(apiSource, /export interface DesktopVideoProcessingApi/)
  assert.match(apiSource, /chooseVideoFiles\(\)/)
  assert.match(apiSource, /chooseVideoOutputDirectory\(\)/)
  assert.match(apiSource, /queryVideoRuntimeStatus\(\)/)
  assert.match(apiSource, /installVideoRuntime\(\)/)
  assert.match(apiSource, /probeVideoFile\(filePath: string\)/)
  assert.match(apiSource, /createVideoFramePreview/)
  assert.match(apiSource, /startVideoProcessingJob/)
  assert.match(apiSource, /cancelVideoProcessingJob\(jobId: string\)/)
  assert.match(apiSource, /onVideoRuntimeInstallProgress/)
  assert.match(apiSource, /onVideoProcessingProgress/)
  assert.match(desktopApiSource, /DesktopVideoProcessingApi/)
})

test('preload maps video operations to focused IPC channels', () => {
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')

  assert.match(preloadSource, /chooseVideoFiles: \(\) => invoke\('video-processing:choose-files'\)/)
  assert.match(preloadSource, /chooseVideoOutputDirectory: \(\) => invoke\('video-processing:choose-output-directory'\)/)
  assert.match(preloadSource, /queryVideoRuntimeStatus: \(\) => invoke\('video-processing:runtime-status'\)/)
  assert.match(preloadSource, /installVideoRuntime: \(\) => invoke\('video-processing:install-runtime'\)/)
  assert.match(preloadSource, /probeVideoFile: \(filePath\) => invoke\('video-processing:probe', filePath\)/)
  assert.match(preloadSource, /createVideoFramePreview: \(options\) => invoke\('video-processing:preview', options\)/)
  assert.match(preloadSource, /startVideoProcessingJob: \(options\) => invoke\('video-processing:start', options\)/)
  assert.match(preloadSource, /cancelVideoProcessingJob: \(jobId\) => invoke\('video-processing:cancel', jobId\)/)
  assert.match(preloadSource, /onVideoRuntimeInstallProgress: \(listener\) => on\('video-processing:runtime-progress', listener\)/)
  assert.match(preloadSource, /onVideoProcessingProgress: \(listener\) => on\('video-processing:progress', listener\)/)
})

test('electron main delegates video processing IPC to a focused module', () => {
  const handlerPath = 'electron/videoProcessingIpcHandlers.cjs'
  assert.ok(existsSync(handlerPath), `${handlerPath} should exist`)
  const handlerSource = readFileSync(handlerPath, 'utf8')
  const mainSource = readFileSync('electron/main.cjs', 'utf8')

  assert.match(mainSource, /registerVideoProcessingIpcHandlers/)
  assert.doesNotMatch(mainSource, /video-processing:choose-files/)
  assert.doesNotMatch(mainSource, /video-processing:start/)
  assert.doesNotMatch(mainSource, /buildTheoraEncodeArgs/)
  assert.match(handlerSource, /videoProcessingRuntime\.cjs/)
  assert.match(handlerSource, /videoProcessingCommands\.cjs/)
  assert.match(handlerSource, /videoProcessingJobs\.cjs/)
  assert.match(handlerSource, /video-processing:choose-files/)
  assert.match(handlerSource, /video-processing:choose-output-directory/)
  assert.match(handlerSource, /video-processing:runtime-status/)
  assert.match(handlerSource, /video-processing:install-runtime/)
  assert.match(handlerSource, /video-processing:probe/)
  assert.match(handlerSource, /video-processing:preview/)
  assert.match(handlerSource, /video-processing:start/)
  assert.match(handlerSource, /video-processing:cancel/)
  assert.doesNotMatch(handlerSource, /Buffer\.from\(options\.data/)
})
