import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('voice deployment workspace delegates connected generation panel', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceGenerationPanel.tsx', 'utf8')
  const advancedPanelPath = 'src/components/VoiceDeploymentWorkspace/VoiceAdvancedParamsPanel.tsx'
  const advancedPanelSource = existsSync(advancedPanelPath) ? readFileSync(advancedPanelPath, 'utf8') : ''

  assert.match(source, /from '\.\/VoiceGenerationPanel'/)
  assert.match(source, /<VoiceGenerationPanel/)
  assert.doesNotMatch(source, /quickDesignPrompts/)
  assert.doesNotMatch(source, /生成方式/)
  assert.doesNotMatch(source, /高级控制/)
  assert.doesNotMatch(source, /参考音频文本/)
  assert.match(panelSource, /function VoiceGenerationPanel/)
  assert.match(panelSource, /quickDesignPrompts/)
  assert.match(panelSource, /生成方式/)
  assert.match(panelSource, /台词文本/)
  assert.match(panelSource, /参考音频/)
  assert.match(panelSource, /from '\.\/VoiceAdvancedParamsPanel'/)
  assert.match(panelSource, /<VoiceAdvancedParamsPanel/)
  assert.match(panelSource, /onGenerate/)
  assert.match(panelSource, /onResetParams/)
  assert.ok(existsSync(advancedPanelPath), 'voice advanced params panel should exist')
  assert.match(advancedPanelSource, /function VoiceAdvancedParamsPanel/)
  assert.match(advancedPanelSource, /高级控制/)
  assert.match(advancedPanelSource, /CFG 强度/)
  assert.match(advancedPanelSource, /DiT 步数/)
  assert.match(advancedPanelSource, /文本归一化/)
  assert.match(advancedPanelSource, /参考音频降噪/)
  assert.doesNotMatch(panelSource, /advanced-grid/)
  assert.doesNotMatch(panelSource, /CFG 强度/)
  assert.doesNotMatch(panelSource, /DiT 步数/)
  assert.doesNotMatch(panelSource, /onCopyApiExample/)
  assert.doesNotMatch(panelSource, /复制 Python 示例/)
})

test('voice generation form shares field labels across generator subpanels', () => {
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceGenerationPanel.tsx', 'utf8')
  const advancedPanelPath = 'src/components/VoiceDeploymentWorkspace/VoiceAdvancedParamsPanel.tsx'
  const fieldLabelPath = 'src/components/VoiceDeploymentWorkspace/VoiceFieldLabel.tsx'

  assert.ok(existsSync(advancedPanelPath), 'voice advanced params panel should exist')
  assert.ok(existsSync(fieldLabelPath), 'voice field label component should exist')
  const advancedPanelSource = readFileSync(advancedPanelPath, 'utf8')
  const fieldLabelSource = readFileSync(fieldLabelPath, 'utf8')

  assert.match(panelSource, /from '\.\/VoiceFieldLabel'/)
  assert.match(advancedPanelSource, /from '\.\/VoiceFieldLabel'/)
  assert.match(panelSource, /<VoiceFieldLabel/)
  assert.match(advancedPanelSource, /<VoiceFieldLabel/)
  assert.doesNotMatch(panelSource, /function HelpTip/)
  assert.doesNotMatch(panelSource, /function FieldLabel/)
  assert.doesNotMatch(advancedPanelSource, /function HelpTip/)
  assert.doesNotMatch(advancedPanelSource, /function FieldLabel/)
  assert.match(fieldLabelSource, /function VoiceFieldLabel/)
  assert.match(fieldLabelSource, /QuestionCircleOutlined/)
  assert.match(fieldLabelSource, /Tooltip/)
})

test('voice generation panel delegates character selector state to a focused component', () => {
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceGenerationPanel.tsx', 'utf8')
  const selectorPath = 'src/components/VoiceDeploymentWorkspace/VoiceCharacterSelector.tsx'

  assert.ok(existsSync(selectorPath), 'voice character selector should exist')
  const selectorSource = readFileSync(selectorPath, 'utf8')

  assert.match(panelSource, /from '\.\/VoiceCharacterSelector'/)
  assert.match(panelSource, /<VoiceCharacterSelector/)
  assert.doesNotMatch(panelSource, /function VoiceCharacterSelector/)
  assert.doesNotMatch(panelSource, /const \[keyword, setKeyword\]/)
  assert.doesNotMatch(panelSource, /const \[newCharacterName, setNewCharacterName\]/)
  assert.match(selectorSource, /function VoiceCharacterSelector/)
  assert.match(selectorSource, /const \[keyword, setKeyword\]/)
  assert.match(selectorSource, /const \[newCharacterName, setNewCharacterName\]/)
})

test('voice deployment workspace delegates generation request workflow', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const workspaceHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts', 'utf8')
  const hookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceGenerationWorkflow.ts', 'utf8')

  assert.match(source, /from '\.\/useVoiceDeploymentWorkspace'/)
  assert.match(workspaceHookSource, /from '\.\/useVoiceGenerationWorkflow'/)
  assert.match(workspaceHookSource, /useVoiceGenerationWorkflow/)
  assert.doesNotMatch(source, /pendingReferenceFile/)
  assert.doesNotMatch(source, /setGenerating/)
  assert.doesNotMatch(source, /setGenerationError/)
  assert.doesNotMatch(source, /const generateVoice = async/)
  assert.doesNotMatch(source, /uploadReferenceAudio/)
  assert.match(hookSource, /pendingReferenceFile/)
  assert.match(hookSource, /setGenerating/)
  assert.match(hookSource, /setGenerationError/)
  assert.match(hookSource, /generateVoice/)
  assert.match(hookSource, /uploadReferenceAudio/)
  assert.match(hookSource, /generateVoiceAudio/)
})
