import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('voice deployment model delegates hardware evaluation to a focused module', () => {
  const modelSource = readFileSync('src/components/VoiceDeploymentWorkspace/voiceDeploymentModel.ts', 'utf8')
  const hardwareModelPath = 'src/components/VoiceDeploymentWorkspace/voiceHardwareModel.ts'

  assert.ok(existsSync(hardwareModelPath), 'voice hardware model should exist')
  const hardwareModelSource = readFileSync(hardwareModelPath, 'utf8')

  assert.match(modelSource, /from '\.\/voiceHardwareModel'/)
  assert.doesNotMatch(modelSource, /export const modelVramRequirements/)
  assert.doesNotMatch(modelSource, /export const voxcpmModels/)
  assert.doesNotMatch(modelSource, /export function parseNvidiaSmiReport/)
  assert.doesNotMatch(modelSource, /export function evaluateHardware/)
  assert.match(hardwareModelSource, /export const modelVramRequirements/)
  assert.match(hardwareModelSource, /export const voxcpmModels/)
  assert.match(hardwareModelSource, /export function parseNvidiaSmiReport/)
  assert.match(hardwareModelSource, /export function evaluateHardware/)
})

test('voice deployment workspace delegates disconnected setup panels', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const panelsSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.match(source, /from '\.\/VoiceSetupPanels'/)
  assert.match(source, /<VoiceSetupPanels/)
  assert.doesNotMatch(source, /id="hw-title"/)
  assert.doesNotMatch(source, /id="deploy-title"/)
  assert.doesNotMatch(source, /gpuCheckCommand/)
  assert.doesNotMatch(source, /latencyDisclaimer/)
  assert.match(panelsSource, /function VoiceSetupPanels/)
  assert.doesNotMatch(panelsSource, /id="hw-title"/)
  assert.doesNotMatch(panelsSource, /环境检测/)
  assert.doesNotMatch(panelsSource, /deviceOptions/)
  assert.doesNotMatch(panelsSource, /gpuCheckCommand/)
  assert.doesNotMatch(panelsSource, /onDeviceTypeChange/)
  assert.doesNotMatch(panelsSource, /onGpuInputChange/)
  assert.match(panelsSource, /id="deploy-title"/)
  assert.match(panelsSource, /latencyDisclaimer/)
  assert.match(panelsSource, /modelOptions/)
  assert.doesNotMatch(panelsSource, /disabledPlatformValues/)
  assert.match(panelsSource, /disabledModelIds/)
  assert.doesNotMatch(panelsSource, /macOS \/ Linux/)
  assert.doesNotMatch(panelsSource, /oneClickCommand/)
  assert.doesNotMatch(panelsSource, /复制命令/)
  assert.match(panelsSource, /VoxCPM1\.5 · 约/)
  assert.match(panelsSource, /VoxCPM-0\.5B · 约/)
  assert.match(panelsSource, /sourceOptions/)
})

test('VoxCPM dependency setup reports visible results and validates its install script', () => {
  const voxcpmIpcSource = readFileSync('electron/voxcpmIpcHandlers.cjs', 'utf8')
  const scriptRuntimeSource = readFileSync('electron/scriptServiceRuntime.cjs', 'utf8')
  const hookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentSetup.ts', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.match(voxcpmIpcSource, /fs\.existsSync\(scriptPath\)/)
  assert.match(voxcpmIpcSource, /VoxCPM 安装脚本不存在/)
  assert.match(voxcpmIpcSource, /launchSetupTerminal/)
  assert.match(scriptRuntimeSource, /cmd\.exe/)
  assert.match(scriptRuntimeSource, /start/)
  assert.match(hookSource, /desktopSetupResult/)
  assert.match(hookSource, /desktopSetupError/)
  assert.match(hookSource, /setDesktopSetupResult\(result\)/)
  assert.match(hookSource, /setDesktopSetupError/)
  assert.match(panelSource, /desktopSetupResult/)
  assert.match(panelSource, /desktopSetupError/)
  assert.match(panelSource, /安装终端已打开/)
  assert.match(panelSource, /安装依赖启动失败/)
})
