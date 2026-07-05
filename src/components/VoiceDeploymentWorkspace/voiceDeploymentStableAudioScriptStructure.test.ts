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
