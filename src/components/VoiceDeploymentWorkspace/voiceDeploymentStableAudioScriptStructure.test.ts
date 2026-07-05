import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const files = {
  deploy: 'scripts/deploy-stable-audio-3.ps1',
  common: 'scripts/stable-audio-deploy-common.ps1',
  service: 'scripts/stable-audio-service.template.ps1',
  install: 'scripts/stable-audio-service-install.ps1',
  server: 'scripts/stable-audio-server.template.py',
}

function read(path: string) {
  return readFileSync(path, 'utf8')
}

test('stable audio deployment script uses official repository and uv ui extras', () => {
  const deploy = read(files.deploy)

  assert.match(deploy, /Stability-AI\/stable-audio-3/)
  assert.match(deploy, /uv\s+sync\s+--extra\s+ui/)
  assert.match(deploy, /\[ValidateSet\("small-sfx","small-music","medium"\)\]/)
  assert.match(deploy, /\$Port\s*=\s*8818/)
})

test('stable audio install prefetches selected model weights before installing service commands', () => {
  const deploy = read(files.deploy)
  const common = read(files.common)
  const downloadIndex = deploy.indexOf('Invoke-StableAudioModelDownload $RepoDir $ModelVariant $Source')
  const serviceIndex = deploy.indexOf('Install-StableAudioServiceCommands $RepoDir $ModelPath $ModelVariant $Port $Source')

  assert.ok(downloadIndex > -1, 'deploy script should download the selected model')
  assert.ok(serviceIndex > downloadIndex, 'service config should be written after model download succeeds')
  assert.match(common, /function Invoke-StableAudioModelDownload/)
  assert.match(common, /from stable_audio_3\.model_configs import models/)
  assert.match(common, /cfg\.resolve\(\)/)
  assert.match(common, /model\.safetensors/)
  assert.match(common, /https:\/\/huggingface\.co\/\{cfg\.repo_id\}/)
  assert.match(common, /uv run hf auth login/)
})

test('stable audio repository setup retries clone through fallback URLs before failing', () => {
  const common = read(files.common)

  assert.match(common, /StableAudioRepoFallbackUrls/)
  assert.match(common, /gh-proxy\.com\/https:\/\/github\.com\/Stability-AI\/stable-audio-3\.git/)
  assert.match(common, /foreach \(\$candidateRepoUrl in \$repoUrls\)/)
  assert.match(common, /请手动把仓库放到/)
})

test('stable audio repository clone has timeout and low speed guard before trying mirrors', () => {
  const common = read(files.common)

  assert.match(common, /StableAudioGitCloneTimeoutSeconds/)
  assert.match(common, /STABLE_AUDIO_GIT_CLONE_TIMEOUT_SECONDS/)
  assert.match(common, /Invoke-GitCloneWithTimeout/)
  assert.match(common, /http\.lowSpeedLimit/)
  assert.match(common, /http\.lowSpeedTime/)
  assert.match(common, /WaitForExit\(\$timeoutSeconds \* 1000\)/)
})

test('stable audio repository readiness does not accept partial git folders', () => {
  const common = read(files.common)

  assert.match(common, /Test-StableAudioRepositoryReady/)
  assert.match(common, /pyproject\.toml/)
  assert.match(common, /rev-parse --verify HEAD/)
  assert.doesNotMatch(common, /Join-Path \$repoDir "\.git"\)\) -or/)
})

test('stable audio service template exposes start stop restart and status actions', () => {
  const service = read(files.service)

  assert.match(service, /ValidateSet\("start",\s*"stop",\s*"restart",\s*"status"\)/)
  assert.match(service, /stable-audio-config\.json/)
  assert.match(service, /Start-ServiceProcess/)
  assert.match(service, /Stop-ServiceProcess/)
  assert.match(service, /Start-Sleep -Seconds 2/)
  assert.match(service, /启动后立即退出/)
  assert.match(service, /exit 1/)
})

test('stable audio helper exposes health and generate endpoints', () => {
  const server = read(files.server)

  assert.match(server, /@app\.get\("\/health"\)/)
  assert.match(server, /@app\.post\("\/generate"\)/)
  assert.match(server, /probe_model_access/)
  assert.match(server, /hf_hub_download/)
  assert.match(server, /HTTPException/)
  assert.match(server, /status_code=503/)
  assert.match(server, /uv/)
  assert.match(server, /stable-audio/)
})

test('stable audio setup waits for model readiness instead of plain http liveness', () => {
  const hook = read('src/components/VoiceDeploymentWorkspace/useStableAudioSetup.ts')
  const panel = read('src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx')

  assert.match(hook, /checkStableAudioService/)
  assert.match(hook, /onProbeResult/)
  assert.match(hook, /lastStableAudioProbeRef/)
  assert.match(hook, /Stable Audio 3 模型已就绪/)
  assert.match(panel, /desktopServiceBusy \? '服务启动中'/)
})

test('stable audio setup panel renders guidance URLs as clickable links', () => {
  const panel = read('src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx')

  assert.match(panel, /renderCommandDescription/)
  assert.ok(panel.includes('output.split(/(https?:\\/\\/[^\\s]+)/g)'))
  assert.match(panel, /href=\{part\}/)
  assert.match(panel, /target="_blank"/)
  assert.match(panel, /rel="noreferrer"/)
})

test('stable audio setup exposes one-click HuggingFace login through the desktop bridge', () => {
  const ipc = read('electron/stableAudioIpcHandlers.cjs')
  const preload = read('electron/preload.cjs')
  const api = read('src/desktopStableAudioRuntimeApi.ts')
  const hook = read('src/components/VoiceDeploymentWorkspace/useStableAudioSetup.ts')
  const panel = read('src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx')

  assert.match(ipc, /stable-audio:hf-login/)
  assert.match(preload, /runStableAudioHfLogin/)
  assert.match(api, /runStableAudioHfLogin/)
  assert.match(hook, /runDesktopHfLogin/)
  assert.match(panel, /登录 HuggingFace/)
})

test('stable audio dependency checks use the selected model from the setup panel', () => {
  const hook = read('src/components/VoiceDeploymentWorkspace/useStableAudioSetup.ts')
  const preload = read('electron/preload.cjs')
  const api = read('src/desktopStableAudioRuntimeApi.ts')

  assert.match(api, /queryStableAudioSetupStatus\(options\?:/)
  assert.match(preload, /queryStableAudioSetupStatus:\s*\(options\) => invoke\('stable-audio:setup-status', options\)/)
  assert.match(hook, /api\.queryStableAudioSetupStatus\(\{\s*model: selectedModel\s*\}\)/)
})

test('stable audio service start releases button loading before readiness polling', () => {
  const workflow = read('src/components/DesktopServiceRuntime/desktopServiceWorkflow.ts')
  const hook = read('src/components/VoiceDeploymentWorkspace/useStableAudioSetup.ts')
  const ipc = read('electron/stableAudioIpcHandlers.cjs')

  assert.match(workflow, /onStartCommandSettled/)
  assert.match(hook, /onStartCommandSettled:\s*\(\) => setDesktopServiceBusy\(false\)/)
  assert.match(ipc, /AbortSignal\.timeout/)
})

test('stable audio stop service refreshes health and clears connected state', () => {
  const hook = read('src/components/VoiceDeploymentWorkspace/useStableAudioSetup.ts')
  const panel = read('src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx')

  assert.match(hook, /action === 'stop'/)
  assert.match(hook, /setConnectionStatus\('disconnected'\)/)
  assert.match(hook, /runCheck\(port, true\)/)
  assert.match(panel, /disabled=\{!desktopRuntime \|\| desktopServiceBusy \|\| !connected \|\| connectionStatus === 'checking'\}/)
})

test('stable audio service stop falls back to the listening port when pid file is stale', () => {
  const service = read(files.service)

  assert.match(service, /Get-NetTCPConnection/)
  assert.match(service, /OwningProcess/)
  assert.match(service, /Get-ServiceProcesses/)
  assert.match(service, /foreach \(\$process in \$processes\)/)
})
