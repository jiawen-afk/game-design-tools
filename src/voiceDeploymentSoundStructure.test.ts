import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const files = {
  index: 'src/components/VoiceDeploymentWorkspace/index.tsx',
  tabs: 'src/components/VoiceDeploymentWorkspace/VoiceWorkspaceTabs.tsx',
  setup: 'src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx',
  generator: 'src/components/VoiceDeploymentWorkspace/SoundEffectGenerationPanel.tsx',
  library: 'src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx',
  cssHub: 'src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css',
  soundCss: 'src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.css',
  soundSetupActions: 'src/components/VoiceDeploymentWorkspace/SoundEffectSetupActions.tsx',
  soundSetupStatus: 'src/components/VoiceDeploymentWorkspace/SoundEffectSetupStatus.tsx',
  soundModelInstall: 'src/components/VoiceDeploymentWorkspace/SoundEffectModelInstallPanel.tsx',
  soundSetupCss: 'src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.setup.css',
  soundStudioCss: 'src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.studio.css',
  soundLibraryCss: 'src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.library.css',
  soundResponsiveCss: 'src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.responsive.css',
}

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function readSoundCssModules() {
  return [
    files.soundSetupCss,
    files.soundStudioCss,
    files.soundLibraryCss,
    files.soundResponsiveCss,
  ].filter((path) => existsSync(path)).map(read).join('\n')
}

test('voice deployment workspace renders voice and sound effect tabs through focused components', () => {
  assert.match(read(files.index), /VoiceWorkspaceTabs/)
  assert.match(read(files.tabs), /生成配音/)
  assert.match(read(files.tabs), /生成音效/)
  assert.match(read(files.tabs), /SoundEffectSetupPanel/)
  assert.match(read(files.tabs), /SoundEffectGenerationPanel/)
  assert.match(read(files.tabs), /SoundEffectLibraryPanel/)
})

test('sound effect panels expose model install generation and collection controls', () => {
  const setupSurfaceSource = [
    files.setup,
    files.soundSetupActions,
    files.soundModelInstall,
  ].filter((path) => existsSync(path)).map(read).join('\n')

  assert.match(setupSurfaceSource, /small-sfx/)
  assert.match(setupSurfaceSource, /small-music/)
  assert.match(setupSurfaceSource, /medium/)
  assert.match(setupSurfaceSource, /安装依赖/)
  assert.match(setupSurfaceSource, /安装模型/)
  assert.match(setupSurfaceSource, /未安装模型/)
  assert.match(setupSurfaceSource, /启动服务/)
  assert.match(read(files.generator), /提示词/)
  assert.match(read(files.generator), /模型/)
  assert.match(read(files.generator), /Select/)
  assert.match(read(files.generator), /生成音效/)
  assert.match(read(files.library), /收藏到音效素材/)
  assert.match(read(files.library), /关联精灵图/)
})

test('sound effect CSS stays in a focused module imported by the workspace CSS hub', () => {
  assert.match(read(files.cssHub), /voiceDeployment\.sound\.css/)
})

test('sound effect mobile layout prevents long controls from forcing horizontal overflow', () => {
  const css = readSoundCssModules()

  assert.match(css, /@media \(max-width: 900px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /\.sound-setup-panel \.ant-segmented[\s\S]*max-width: 100%/)
  assert.match(css, /\.sound-setup-panel \.ant-segmented-item[\s\S]*flex: 1 1 0/)
})

test('sound effect workspace collects generated sounds and derives sprite link options from project space', () => {
  const hookSource = read('src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts')

  assert.match(hookSource, /readCurrentProjectSpaceState/)
  assert.match(hookSource, /useSoundEffectRecordLibrary/)
  assert.match(hookSource, /collectSoundEffectRecordToPersonalSpace/)
  assert.match(hookSource, /currentProjectSpace\.assets/)
  assert.match(hookSource, /asset\.kind === 'sprite'/)
  assert.match(hookSource, /asset\.kind === 'sound'/)
  assert.match(hookSource, /personalSpaceSoundAssets/)
  assert.match(hookSource, /onCollectAndLinkSprite/)
  assert.doesNotMatch(hookSource, /useState<SoundEffectRecord\[\]>\(\[\]\)/)
})

test('sound effect library mirrors voice history and project space tabs', () => {
  const librarySource = read(files.library)

  assert.match(librarySource, /Tabs/)
  assert.match(librarySource, /key:\s*'history'/)
  assert.match(librarySource, /label:\s*`历史 \$\{records\.length\}`/)
  assert.match(librarySource, /key:\s*'personal-space'/)
  assert.match(librarySource, /label:\s*`项目空间 \$\{personalSpaceSoundAssets\.length\}`/)
  assert.match(librarySource, /PersonalSpaceSoundAssetList/)
  assert.match(librarySource, /还没有收藏到项目空间的音效/)
})

test('sound effect records use a focused persistent record library', () => {
  const libraryHookSource = read('src/components/VoiceDeploymentWorkspace/useSoundEffectRecordLibrary.ts')
  const storageSource = read('src/components/VoiceDeploymentWorkspace/soundEffectRecordStorage.ts')

  assert.match(libraryHookSource, /readStoredSoundEffectRecords/)
  assert.match(libraryHookSource, /writeStoredSoundEffectRecords\(records\)/)
  assert.match(libraryHookSource, /addRecord/)
  assert.match(libraryHookSource, /updateSoundEffectRecordName/)
  assert.match(storageSource, /game-design-tools\.stable-audio\.records\.v1/)
  assert.match(storageSource, /records\.slice\(0, 80\)/)
})

test('sound effect workspace keeps the generation model aligned with the setup selection', () => {
  const hookSource = read('src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts')
  const generationHookSource = read('src/components/VoiceDeploymentWorkspace/useSoundEffectGenerationWorkflow.ts')

  assert.match(hookSource, /changeSoundEffectModel/)
  assert.match(hookSource, /generation\.updateModel\(model\)/)
  assert.match(hookSource, /onGenerationModelChange: changeSoundEffectModel/)
  assert.match(hookSource, /loadSoundEffectRecord/)
  assert.match(hookSource, /onLoad: loadSoundEffectRecord/)
  assert.match(generationHookSource, /updateModel/)
  assert.match(generationHookSource, /clampSoundDuration\(model, current\.durationSeconds\)/)
})

test('sound effect setup collapses installed dependency controls and exposes missing model install', () => {
  const setupSource = read(files.setup)
  const modelInstallSource = existsSync(files.soundModelInstall) ? read(files.soundModelInstall) : ''
  const actionsSource = existsSync(files.soundSetupActions) ? read(files.soundSetupActions) : ''
  const soundCss = existsSync(files.soundSetupCss) ? read(files.soundSetupCss) : read(files.soundCss)
  const workspaceSource = read('src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts')
  const setupHookSource = read('src/components/VoiceDeploymentWorkspace/useStableAudioSetup.ts')

  assert.match(setupSource, /dependenciesReady/)
  assert.match(modelInstallSource, /missingModelOptions/)
  assert.match(actionsSource, /compact-service-controls/)
  assert.match(setupSource, /sound-compact-service-toolbar/)
  assert.match(setupSource, /sound-service-address/)
  assert.match(modelInstallSource, /sound-model-status-inline/)
  assert.match(soundCss, /\.sound-compact-service-toolbar[\s\S]*grid-template-columns: minmax\(220px, auto\) minmax\(140px, 0\.45fr\) minmax\(240px, 0\.65fr\) auto/)
  assert.match(workspaceSource, /installState/)
  assert.match(workspaceSource, /availableGenerationModels/)
  assert.match(setupHookSource, /modelStatusResults/)
  assert.match(setupHookSource, /queryStableAudioModelStatuses/)
})

test('sound effect setup uses a compact grid for service path source and model facts', () => {
  const setupSource = read(files.setup)
  const soundCss = existsSync(files.soundSetupCss) ? read(files.soundSetupCss) : read(files.soundCss)

  assert.match(setupSource, /sound-setup-grid/)
  assert.match(setupSource, /sound-service-compact-row/)
  assert.match(setupSource, /sound-model-path-field/)
  assert.match(setupSource, /sound-model-detail-grid/)
  assert.match(setupSource, /<dt>下载源<\/dt>/)
  assert.match(setupSource, /selectedDownloadSource/)
  assert.doesNotMatch(setupSource, /<div className="sound-service-row">/)
  assert.match(soundCss, /\.sound-setup-grid[\s\S]*grid-template-columns: minmax\(260px, 1fr\) minmax\(280px, 1\.05fr\) minmax\(180px, 0\.7fr\)/)
  assert.match(soundCss, /\.sound-model-detail-grid[\s\S]*grid-template-columns: minmax\(56px, 0\.48fr\) minmax\(96px, 0\.85fr\) minmax\(56px, 0\.48fr\) minmax\(160px, 1\.45fr\) minmax\(88px, 0\.72fr\)/)
  assert.match(soundCss, /\.sound-service-compact-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) 126px auto/)
  assert.match(soundCss, /\.sound-setup-title-actions[\s\S]*justify-content: flex-end/)
})

test('sound effect setup places install service controls in the title row and swaps model path after model selector', () => {
  const setupSource = read(files.setup)
  const soundCss = readSoundCssModules() || read(files.soundCss)

  assert.match(setupSource, /sound-setup-title-row/)
  assert.match(setupSource, /sound-setup-title-actions/)
  assert.match(setupSource, /sound-setup-title-main/)
  assert.doesNotMatch(setupSource, /desktop-boost sound-setup-actions/)
  assert.ok(
    setupSource.indexOf('sound-model-select-field') < setupSource.indexOf('sound-model-path-field'),
    'model selector should render before model path',
  )
  assert.match(soundCss, /\.sound-setup-title-row[\s\S]*grid-template-columns: minmax\(0, auto\) minmax\(520px, 1fr\)/)
  assert.match(soundCss, /\.sound-setup-title-actions[\s\S]*justify-content: flex-end/)
  assert.match(soundCss, /@media \(max-width: 1180px\)[\s\S]*\.sound-setup-title-row[\s\S]*grid-template-columns: minmax\(0, 1fr\)/)
})

test('sound effect setup delegates service actions status and model installation to focused components', () => {
  for (const path of [files.soundSetupActions, files.soundSetupStatus, files.soundModelInstall]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  const setupSource = read(files.setup)
  const actionsSource = read(files.soundSetupActions)
  const statusSource = read(files.soundSetupStatus)
  const modelInstallSource = read(files.soundModelInstall)

  assert.match(setupSource, /SoundEffectSetupActions/)
  assert.match(setupSource, /SoundEffectSetupStatus/)
  assert.match(setupSource, /SoundEffectModelInstallPanel/)
  assert.doesNotMatch(setupSource, /renderCommandDescription|commandAlert/)
  assert.doesNotMatch(setupSource, /sound-model-install-row/)
  assert.doesNotMatch(setupSource, /compact-service-controls/)
  assert.match(actionsSource, /检测服务/)
  assert.match(actionsSource, /安装依赖/)
  assert.match(actionsSource, /启动服务/)
  assert.match(statusSource, /renderCommandDescription/)
  assert.match(statusSource, /commandAlert/)
  assert.match(modelInstallSource, /sound-model-install-row/)
  assert.match(modelInstallSource, /安装模型/)
})

test('sound effect CSS is split into setup studio library and responsive modules', () => {
  for (const path of [files.soundSetupCss, files.soundStudioCss, files.soundLibraryCss, files.soundResponsiveCss]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  const soundCss = read(files.soundCss)
  const setupCss = read(files.soundSetupCss)
  const studioCss = read(files.soundStudioCss)
  const libraryCss = read(files.soundLibraryCss)
  const responsiveCss = read(files.soundResponsiveCss)

  assert.equal((soundCss.match(/@import/g) ?? []).length, 4)
  assert.doesNotMatch(soundCss, /^\s*(?:\.|@media\b)/m)
  assert.match(soundCss, /@import '\.\/voiceDeployment\.sound\.setup\.css'/)
  assert.match(soundCss, /@import '\.\/voiceDeployment\.sound\.studio\.css'/)
  assert.match(soundCss, /@import '\.\/voiceDeployment\.sound\.library\.css'/)
  assert.match(soundCss, /@import '\.\/voiceDeployment\.sound\.responsive\.css'/)
  assert.match(setupCss, /\.sound-setup-grid/)
  assert.match(studioCss, /\.sound-studio/)
  assert.match(libraryCss, /\.sound-record-list/)
  assert.match(responsiveCss, /@media \(max-width: 900px\)/)
})

test('sound effect records edit names through an explicit local draft confirmation flow', () => {
  const librarySource = read(files.library)
  const soundCss = existsSync(files.soundLibraryCss) ? read(files.soundLibraryCss) : read(files.soundCss)

  assert.match(librarySource, /editingRecordId/)
  assert.match(librarySource, /recordNameDraft/)
  assert.match(librarySource, /startRename\(record\)/)
  assert.match(librarySource, /confirmRename\(record\)/)
  assert.match(librarySource, /onRenameRecord\(record\.id, recordNameDraft\)/)
  assert.match(librarySource, /disabled=\{!isRenaming\}/)
  assert.match(librarySource, /编辑/)
  assert.match(librarySource, /确认/)
  assert.doesNotMatch(librarySource, /onChange=\{\(event\) => onRenameRecord\(record\.id, event\.target\.value\)\}/)
  assert.match(soundCss, /\.sound-record-name-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/)
})

test('sound effect setup can open the Stable Audio model folder from the model path field', () => {
  const setupSource = read(files.setup)
  const workspaceSource = read('src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts')
  const soundCss = existsSync(files.soundSetupCss) ? read(files.soundSetupCss) : read(files.soundCss)

  assert.match(setupSource, /FolderOpenOutlined/)
  assert.match(setupSource, /onOpenModelPath/)
  assert.match(setupSource, /打开文件夹/)
  assert.match(setupSource, /sound-model-path-row/)
  assert.match(workspaceSource, /getDesktopApi/)
  assert.match(workspaceSource, /openStableAudioModelPath/)
  assert.match(workspaceSource, /desktopApi\.openPath\(setup\.modelPath\)/)
  assert.match(workspaceSource, /onOpenModelPath: openStableAudioModelPath/)
  assert.match(soundCss, /\.sound-model-path-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/)
})

test('sound project-space audio assets use stored project resource playback', () => {
  const workspaceSource = read('src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts')
  const librarySource = read(files.library)

  assert.match(workspaceSource, /useVoiceProjectResourceReadOptions/)
  assert.match(workspaceSource, /projectResourceReadOptions/)
  assert.match(librarySource, /projectResourceReadOptions/)
  assert.match(librarySource, /ProjectSpaceAudioPlayer/)
  assert.match(librarySource, /\{\.\.\.projectResourceReadOptions\}/)
  assert.doesNotMatch(librarySource, /const audioSource = asset\.resourcePaths\[0\]/)
})

test('voice workspace exposes an audio editor tab and sound records can open clip editing', () => {
  const indexSource = read(files.index)
  const tabsSource = read(files.tabs)
  const librarySource = read(files.library)

  assert.match(indexSource, /useAudioClipEditorWorkspace/)
  assert.match(indexSource, /AudioClipEditorPanel/)
  assert.match(tabsSource, /音频编辑/)
  assert.match(tabsSource, /activeKey/)
  assert.match(librarySource, /剪辑片段/)
  assert.match(librarySource, /onClip/)
})
