import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { indexHtmlSource, openSourceSoftwareSource, packageJsonSource, siteFooterSource, viteConfigSource } from './appStructureTestHelpers.test'

test('Electron shell exposes a hardened desktop bridge for local system features', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const personalSpaceIpcSource = readFileSync('electron/personalSpaceIpcHandlers.cjs', 'utf8')
  const voxcpmIpcSource = readFileSync('electron/voxcpmIpcHandlers.cjs', 'utf8')

  assert.match(mainSource, /contextIsolation:\s*true/)
  assert.match(mainSource, /nodeIntegration:\s*false/)
  assert.match(mainSource, /preload:/)
  assert.match(personalSpaceIpcSource, /dialog\.showOpenDialog/)
  assert.match(mainSource, /nvidia-smi/)
  assert.match(voxcpmIpcSource, /deploy-voxcpm\.ps1/)
  assert.match(voxcpmIpcSource, /voxcpm-service\.ps1/)
  assert.match(mainSource, /shell\.openPath/)
  assert.doesNotMatch(preloadSource, /ipcRenderer\s*,/)
  for (const apiName of [
    'selectPersonalSpaceDirectory',
    'readPersonalSpaceFile',
    'writePersonalSpaceFile',
    'removePersonalSpaceEntry',
    'saveFile',
    'openPath',
    'detectHardware',
    'runVoxcpmSetup',
    'queryVoxcpmSetupStatus',
    'controlVoxcpmService',
  ]) {
    assert.match(preloadSource, new RegExp(apiName))
  }
})

test('desktop bridge is integrated into personal space and VoxCPM setup workflows', () => {
  const desktopApiSource = readFileSync('src/desktopApi.ts', 'utf8')
  const storageSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceFileStorage.ts', 'utf8')
  const nativeStorageSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceNativeFileStorage.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.ts', 'utf8')
  const storyboardExportTargetSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceStoryboardExportTarget.ts', 'utf8')
  const settingsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8')
  const setupHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentSetup.ts', 'utf8')
  const panelsSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.match(desktopApiSource, /gameDesignToolsDesktop/)
  assert.match(storageSource, /createNativePersonalSpaceDirectoryHandle/)
  assert.match(storageSource, /from '\.\/personalSpaceNativeFileStorage'/)
  assert.match(nativeStorageSource, /desktop-native-directory/)
  assert.match(actionsSource, /selectPersonalSpaceDirectory/)
  assert.doesNotMatch(actionsSource, /saveFile/)
  assert.match(storyboardExportTargetSource, /saveFile/)
  assert.match(settingsHookSource, /openPath/)
  assert.match(setupHookSource, /detectHardware/)
  assert.match(setupHookSource, /runVoxcpmSetup/)
  assert.match(setupHookSource, /queryVoxcpmSetupStatus/)
  assert.match(setupHookSource, /controlVoxcpmService/)
  assert.match(panelsSource, /桌面增强/)
  assert.match(panelsSource, /检测本机配置/)
  assert.match(panelsSource, /安装依赖/)
  assert.match(panelsSource, /依赖安装查询/)
})

test('VoxCPM setup dependency query checks local installation artifacts', () => {
  const voxcpmIpcSource = readFileSync('electron/voxcpmIpcHandlers.cjs', 'utf8')
  const desktopVoiceRuntimeApiSource = readFileSync('src/desktopVoiceRuntimeApi.ts', 'utf8')
  const hookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentSetup.ts', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.match(voxcpmIpcSource, /voxcpm:setup-status/)
  assert.match(voxcpmIpcSource, /voxcpm-config\.json/)
  assert.match(voxcpmIpcSource, /replace\(\s*\/\^\\uFEFF\//)
  assert.match(voxcpmIpcSource, /PythonCommand/)
  assert.match(voxcpmIpcSource, /RepoDir/)
  assert.match(voxcpmIpcSource, /import voxcpm/)
  assert.match(voxcpmIpcSource, /import torch/)
  assert.match(voxcpmIpcSource, /config\.PythonArgs/)
  assert.match(voxcpmIpcSource, /VoxCPM 依赖已安装/)
  assert.match(voxcpmIpcSource, /尚未完成 VoxCPM 依赖安装/)
  assert.match(desktopVoiceRuntimeApiSource, /queryVoxcpmSetupStatus/)
  assert.match(hookSource, /desktopDependencyStatusBusy/)
  assert.match(hookSource, /desktopDependencyStatusResult/)
  assert.match(hookSource, /queryDesktopDependencyStatus/)
  assert.match(panelSource, /desktopDependencyStatusResult/)
  assert.match(panelSource, /onQueryDesktopDependencyStatus/)
})

test('app-only branch removes web deployment surfaces and browser-only fallbacks', () => {
  const pkg = JSON.parse(packageJsonSource())
  const voiceModelSource = readFileSync('src/components/VoiceDeploymentWorkspace/voiceDeploymentModel.ts', 'utf8')
  const personalStorageSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceFileStorage.ts', 'utf8')
  const personalActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.ts', 'utf8')
  const spriteExportSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts', 'utf8')
  const mattePipelineSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const matteGroupActionsSource = readFileSync('src/components/MultiFrameSpriteWorkspace/matteGroupActions.ts', 'utf8')
  const settingsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8')
  const appOnlySources = [
    indexHtmlSource(),
    siteFooterSource(),
    openSourceSoftwareSource(),
    viteConfigSource(),
    voiceModelSource,
    personalStorageSource,
    personalActionsSource,
    spriteExportSource,
    mattePipelineSource,
    matteGroupActionsSource,
    settingsHookSource,
  ].join('\n')

  assert.equal(pkg.scripts.preview, undefined)
  assert.equal(pkg.scripts.dev, undefined)
  for (const removedPath of ['Dockerfile', 'docker-compose.yml', 'DOCKER.md', 'docs/voxcpm-docker-deploy.md', 'scripts/deploy-voxcpm.sh']) {
    assert.equal(existsSync(removedPath), false)
  }
  for (const pattern of [
    /showDirectoryPicker/,
    /indexedDB/,
    /document\.createElement\('a'\)/,
    /window\.open/,
    /tools\.linjiawen\.com/,
    /curl -fsSL/,
    /\birm\b/,
    /Busuanzi/i,
  ]) {
    assert.doesNotMatch(appOnlySources, pattern)
  }
})

test('Ant Design alerts use v6 title prop instead of deprecated message prop', () => {
  const source = [
    readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8'),
    readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8'),
  ].join('\n')

  assert.doesNotMatch(source, /<Alert[^>]*\bmessage=/)
})
