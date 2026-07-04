import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const files = {
  index: 'src/components/VoiceDeploymentWorkspace/index.tsx',
  tabs: 'src/components/VoiceDeploymentWorkspace/VoiceWorkspaceTabs.tsx',
  setup: 'src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx',
  generator: 'src/components/VoiceDeploymentWorkspace/SoundEffectGenerationPanel.tsx',
  library: 'src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx',
  cssHub: 'src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css',
  soundCss: 'src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.css',
}

function read(path: string) {
  return readFileSync(path, 'utf8')
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
  assert.match(read(files.setup), /small-sfx/)
  assert.match(read(files.setup), /small-music/)
  assert.match(read(files.setup), /medium/)
  assert.match(read(files.setup), /安装依赖/)
  assert.match(read(files.setup), /启动服务/)
  assert.match(read(files.generator), /提示词/)
  assert.match(read(files.generator), /生成音效/)
  assert.match(read(files.library), /收藏到音效素材/)
  assert.match(read(files.library), /关联精灵图/)
})

test('sound effect CSS stays in a focused module imported by the workspace CSS hub', () => {
  assert.match(read(files.cssHub), /voiceDeployment\.sound\.css/)
})

test('sound effect mobile layout prevents long controls from forcing horizontal overflow', () => {
  const css = read(files.soundCss)

  assert.match(css, /@media \(max-width: 900px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /\.sound-setup-panel \.ant-segmented[\s\S]*max-width: 100%/)
  assert.match(css, /\.sound-setup-panel \.ant-segmented-item[\s\S]*flex: 1 1 0/)
})

test('sound effect workspace collects generated sounds and derives sprite link options from project space', () => {
  const hookSource = read('src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts')

  assert.match(hookSource, /readCurrentProjectSpaceState/)
  assert.match(hookSource, /collectSoundEffectRecordToPersonalSpace/)
  assert.match(hookSource, /currentProjectSpace\.assets/)
  assert.match(hookSource, /asset\.kind === 'sprite'/)
  assert.match(hookSource, /onCollectAndLinkSprite/)
})
