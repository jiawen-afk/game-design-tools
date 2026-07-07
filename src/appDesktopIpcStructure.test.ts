import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('electron main delegates BiRefNet IPC handlers to a focused module', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const birefnetIpcPath = 'electron/birefnetIpcHandlers.cjs'
  const birefnetServiceClientPath = 'electron/birefnetServiceClient.cjs'

  assert.ok(existsSync(birefnetIpcPath), `${birefnetIpcPath} should exist`)
  assert.ok(existsSync(birefnetServiceClientPath), `${birefnetServiceClientPath} should exist`)
  const birefnetIpcSource = readFileSync(birefnetIpcPath, 'utf8')
  const birefnetServiceClientSource = readFileSync(birefnetServiceClientPath, 'utf8')

  assert.match(mainSource, /registerBirefnetIpcHandlers/)
  assert.doesNotMatch(mainSource, /birefnet:run-setup/)
  assert.doesNotMatch(mainSource, /birefnet:remove-background/)
  assert.doesNotMatch(mainSource, /BIREFNET_MATTE_TIMEOUT_MS/)
  assert.match(birefnetIpcSource, /birefnet:run-setup/)
  assert.match(birefnetIpcSource, /birefnet:setup-status/)
  assert.match(birefnetIpcSource, /birefnet:set-device/)
  assert.match(birefnetIpcSource, /birefnet:service/)
  assert.match(birefnetIpcSource, /birefnet:health/)
  assert.match(birefnetIpcSource, /birefnet:remove-background/)
  assert.match(birefnetIpcSource, /birefnetServiceClient\.cjs/)
  assert.match(birefnetIpcSource, /checkBirefnetReady/)
  assert.match(birefnetIpcSource, /removeBirefnetBackground/)
  assert.doesNotMatch(birefnetIpcSource, /BIREFNET_MATTE_TIMEOUT_MS/)
  assert.doesNotMatch(birefnetIpcSource, /function (getJson|postJson)\b/)
  assert.doesNotMatch(birefnetIpcSource, /http\.request/)
  assert.match(birefnetServiceClientSource, /BIREFNET_MATTE_TIMEOUT_MS/)
  assert.match(birefnetServiceClientSource, /function getJson\b/)
  assert.match(birefnetServiceClientSource, /function postJson\b/)
  assert.match(birefnetServiceClientSource, /function checkBirefnetReady\b/)
  assert.match(birefnetServiceClientSource, /function removeBirefnetBackground\b/)
})

test('electron main delegates VoxCPM IPC handlers to a focused module', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const voxcpmIpcPath = 'electron/voxcpmIpcHandlers.cjs'

  assert.ok(existsSync(voxcpmIpcPath), `${voxcpmIpcPath} should exist`)
  const voxcpmIpcSource = readFileSync(voxcpmIpcPath, 'utf8')

  assert.match(mainSource, /registerVoxcpmIpcHandlers/)
  assert.doesNotMatch(mainSource, /voxcpm:run-setup/)
  assert.doesNotMatch(mainSource, /voxcpm:setup-status/)
  assert.doesNotMatch(mainSource, /voxcpm:service/)
  assert.doesNotMatch(mainSource, /resolveVoxcpmInstallPaths/)
  assert.match(voxcpmIpcSource, /voxcpm:run-setup/)
  assert.match(voxcpmIpcSource, /voxcpm:setup-status/)
  assert.match(voxcpmIpcSource, /voxcpm:service/)
  assert.match(voxcpmIpcSource, /resolveVoxcpmInstallPaths/)
  assert.match(voxcpmIpcSource, /deploy-voxcpm\.ps1/)
})

test('service runtime IPC handlers delegate setup terminal and service command processes', () => {
  const runtimePath = 'electron/scriptServiceRuntime.cjs'
  const birefnetIpcSource = readFileSync('electron/birefnetIpcHandlers.cjs', 'utf8')
  const voxcpmIpcSource = readFileSync('electron/voxcpmIpcHandlers.cjs', 'utf8')

  assert.ok(existsSync(runtimePath), `${runtimePath} should exist`)
  const runtimeSource = readFileSync(runtimePath, 'utf8')

  assert.match(runtimeSource, /function launchSetupTerminal\b/)
  assert.match(runtimeSource, /function runServiceCommand\b/)
  for (const source of [birefnetIpcSource, voxcpmIpcSource]) {
    assert.match(source, /scriptServiceRuntime\.cjs/)
    assert.match(source, /launchSetupTerminal/)
    assert.match(source, /runServiceCommand/)
    assert.doesNotMatch(source, /spawn\('cmd\.exe'/)
    assert.doesNotMatch(source, /spawn\('powershell\.exe'/)
    assert.doesNotMatch(source, /new Set\(\['start', 'stop', 'restart', 'status'\]\)/)
  }
})

test('electron main delegates project space filesystem IPC handlers to a focused module', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const personalSpaceIpcPath = 'electron/personalSpaceIpcHandlers.cjs'

  assert.ok(existsSync(personalSpaceIpcPath), `${personalSpaceIpcPath} should exist`)
  const personalSpaceIpcSource = readFileSync(personalSpaceIpcPath, 'utf8')

  assert.match(mainSource, /registerPersonalSpaceIpcHandlers/)
  assert.doesNotMatch(mainSource, /allowedPersonalSpaceRoots/)
  assert.doesNotMatch(mainSource, /personal-space:select-directory/)
  assert.doesNotMatch(mainSource, /personal-space:write-file/)
  assert.doesNotMatch(mainSource, /assertAllowedPersonalSpacePath/)
  assert.match(personalSpaceIpcSource, /allowedPersonalSpaceRoots/)
  assert.match(personalSpaceIpcSource, /personal-space:select-directory/)
  assert.match(personalSpaceIpcSource, /personal-space:register-directory/)
  assert.match(personalSpaceIpcSource, /personal-space:ensure-directory/)
  assert.match(personalSpaceIpcSource, /personal-space:get-file/)
  assert.match(personalSpaceIpcSource, /personal-space:write-file/)
  assert.match(personalSpaceIpcSource, /personal-space:read-file/)
  assert.match(personalSpaceIpcSource, /personal-space:remove-entry/)
})

test('electron main delegates app update IPC handlers to a focused module', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const appUpdateIpcPath = 'electron/appUpdateIpcHandlers.cjs'

  assert.ok(existsSync(appUpdateIpcPath), `${appUpdateIpcPath} should exist`)
  const appUpdateIpcSource = readFileSync(appUpdateIpcPath, 'utf8')

  assert.match(mainSource, /registerAppUpdateIpcHandlers/)
  assert.doesNotMatch(mainSource, /autoUpdater/)
  assert.doesNotMatch(mainSource, /app-update:get-status/)
  assert.doesNotMatch(mainSource, /app-update:check/)
  assert.doesNotMatch(mainSource, /app-update:install/)
  assert.match(appUpdateIpcSource, /autoUpdater/)
  assert.match(appUpdateIpcSource, /app-update:get-status/)
  assert.match(appUpdateIpcSource, /app-update:check/)
  assert.match(appUpdateIpcSource, /app-update:install/)
  assert.match(appUpdateIpcSource, /app-update:status/)
  assert.match(appUpdateIpcSource, /getAppReleaseTag/)
  assert.match(appUpdateIpcSource, /windows-x64-latest/)
})

test('electron main delegates image encoding IPC handlers to a focused module', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const desktopApiSource = readFileSync('src/desktopApi.ts', 'utf8')
  const imageEncodingIpcPath = 'electron/imageEncodingIpcHandlers.cjs'
  const packageSource = readFileSync('package.json', 'utf8')

  assert.ok(existsSync(imageEncodingIpcPath), `${imageEncodingIpcPath} should exist`)
  const imageEncodingIpcSource = readFileSync(imageEncodingIpcPath, 'utf8')

  assert.match(mainSource, /registerImageEncodingIpcHandlers/)
  assert.doesNotMatch(mainSource, /image-encoding:encode/)
  assert.match(imageEncodingIpcSource, /image-encoding:encode/)
  assert.match(imageEncodingIpcSource, /scripts/)
  assert.match(imageEncodingIpcSource, /image-encoders/)
  assert.match(imageEncodingIpcSource, /cwebp/)
  assert.match(imageEncodingIpcSource, /oxipng/)
  assert.match(imageEncodingIpcSource, /-lossless/)
  assert.match(imageEncodingIpcSource, /-exact/)
  assert.match(imageEncodingIpcSource, /-alpha_q/)
  assert.match(preloadSource, /encodeImage: \(options\) => invoke\('image-encoding:encode', options\)/)
  assert.match(desktopApiSource, /DesktopImageEncodingApi/)
  assert.match(packageSource, /setup:image-encoders/)
  assert.match(packageSource, /scripts\/image-encoders\/\*\*/)
})

test('electron main delegates edited audio persistence to a focused module', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const desktopApiSource = readFileSync('src/desktopApi.ts', 'utf8')
  const audioEditIpcPath = 'electron/audioEditIpcHandlers.cjs'

  assert.ok(existsSync(audioEditIpcPath), `${audioEditIpcPath} should exist`)
  const audioEditIpcSource = readFileSync(audioEditIpcPath, 'utf8')

  assert.match(mainSource, /registerAudioEditIpcHandlers/)
  assert.doesNotMatch(mainSource, /audio-edit:save/)
  assert.doesNotMatch(mainSource, /audio-edit:read-file/)
  assert.match(audioEditIpcSource, /audio-edit:save/)
  assert.match(audioEditIpcSource, /audio-edit:read-file/)
  assert.match(audioEditIpcSource, /AudioEdits/)
  assert.match(audioEditIpcSource, /pathToFileURL/)
  assert.match(preloadSource, /saveEditedAudio: \(options\) => invoke\('audio-edit:save', options\)/)
  assert.match(preloadSource, /readAudioFile: \(filePath\) => invoke\('audio-edit:read-file', filePath\)/)
  assert.match(desktopApiSource, /DesktopAudioEditApi/)
})
