import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { readBirefnetDeploymentSources } from './aiMattingTestHelpers.test'

test('BiRefNet service detection waits for model readiness instead of process health', () => {
  const script = readBirefnetDeploymentSources()

  assert.match(script, /def model_status\(\):[\s\S]*"ready": model is not None/)
  assert.match(script, /@app\.get\("\/health"\)[\s\S]*status\["ok"\] = True/)
  assert.match(script, /@app\.get\("\/ready"\)[\s\S]*start_model_load\(\)[\s\S]*return model_status\(\)/)
})

test('BiRefNet ready checks trigger model loading without blocking service startup polling', () => {
  const script = readBirefnetDeploymentSources()
  const birefnetIpc = readFileSync('electron/birefnetIpcHandlers.cjs', 'utf8')
  const birefnetServiceClient = readFileSync('electron/birefnetServiceClient.cjs', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useAiMattingSetup.ts', 'utf8')
  const setupPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteAiSetupPanel.tsx', 'utf8')

  assert.match(script, /from threading import Condition, Lock, Thread/)
  assert.match(script, /def start_model_load\(\):[\s\S]*Thread\(/)
  assert.match(script, /@app\.get\("\/ready"\)[\s\S]*start_model_load\(\)/)
  assert.match(script, /"loading": model_loading/)
  assert.match(birefnetIpc, /checkBirefnetReady\(servicePort\)/)
  assert.match(birefnetServiceClient, /getJson\(port,\s*'\/ready',\s*15000\)/)
  assert.match(hook, /正在通过 \/ready 加载并检测 BiRefNet 模型/)
  assert.match(hook, /BiRefNet 模型已就绪，AI 抠图服务可用/)
  assert.match(setupPanel, /模型加载中/)
})

test('BiRefNet sidecar aligns inference input dtype with loaded model weights', () => {
  const script = readBirefnetDeploymentSources()

  assert.match(script, /if DEVICE == "cpu":\s*[\r\n]+\s*loaded\.float\(\)/)
  assert.match(script, /def get_model_dtype\(loaded_model\):[\s\S]*next\(loaded_model\.parameters\(\)\)\.dtype/)
  assert.match(script, /active_model = get_model\(\)/)
  assert.match(script, /input_tensor = input_tensor\.to\(device=DEVICE,\s*dtype=get_model_dtype\(active_model\)\)/)
  assert.match(script, /pred = active_model\(input_tensor\)\[-1\]\.sigmoid\(\)/)
  assert.doesNotMatch(script, /torch\.amp\.autocast/)
})

test('BiRefNet sidecar defaults to automatic CUDA selection and exposes requested device status', () => {
  const script = readBirefnetDeploymentSources()

  assert.match(script, /\[ValidateSet\("auto", "cuda", "cpu"\)\]\s*\[string\]\$Device = "auto"/)
  assert.match(script, /REQUESTED_DEVICE = "__DEVICE__"/)
  assert.match(script, /def resolve_device\(requested_device\):[\s\S]*if normalized == "cpu":[\s\S]*return "cpu"/)
  assert.match(script, /def resolve_device\(requested_device\):[\s\S]*if torch\.cuda\.is_available\(\):[\s\S]*return "cuda"/)
  assert.match(script, /DEVICE = resolve_device\(REQUESTED_DEVICE\)/)
  assert.match(script, /"requested_device": REQUESTED_DEVICE/)
  assert.match(script, /"device": DEVICE/)
  assert.match(script, /parser\.add_argument\("--device", choices=\["auto", "cuda", "cpu"\], default=REQUESTED_DEVICE\)/)
  assert.match(script, /Device = \$Device/)
  assert.match(script, /"--device", \[string\]\$config\.Device/)
})

test('BiRefNet installer prefers CUDA PyTorch wheels when NVIDIA is detected', () => {
  const script = readBirefnetDeploymentSources()

  assert.match(script, /function Test-NvidiaAvailable/)
  assert.match(script, /\$nvidiaAvailable = Test-NvidiaAvailable/)
  assert.match(script, /if \(\$nvidiaAvailable\) {[\s\S]*https:\/\/download\.pytorch\.org\/whl\/cu128/)
  assert.match(script, /--force-reinstall/)
  assert.match(script, /torchvision/)
  assert.match(script, /else {[\s\S]*torch>=2\.5\.0[\s\S]*torchvision/)
})

test('BiRefNet sidecar enables CORS for Electron renderer health checks', () => {
  const script = readBirefnetDeploymentSources()

  assert.match(script, /CORSMiddleware/)
  assert.match(script, /allow_origins=\["\*"\]/)
  assert.match(script, /allow_methods=\["\*"\]/)
  assert.match(script, /allow_headers=\["\*"\]/)
})

test('BiRefNet deployment delegates helpers and generated templates to focused files', () => {
  const deploySource = readFileSync('scripts/deploy-birefnet.ps1', 'utf8')
  const viteConfig = readFileSync('vite.config.ts', 'utf8')
  const helperPaths = [
    'scripts/birefnet-deploy-common.ps1',
    'scripts/birefnet-python-runtime.ps1',
    'scripts/birefnet-service-install.ps1',
  ]
  const templatePaths = [
    'scripts/birefnet-server.template.py',
    'scripts/birefnet-service.template.ps1',
  ]

  for (const path of [...helperPaths, ...templatePaths]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }
  for (const path of helperPaths) {
    const fileName = path.split('/').pop()
    assert.match(deploySource, new RegExp(`Join-Path \\$PSScriptRoot "${fileName}"`))
    assert.match(viteConfig, new RegExp(fileName!.replace('.', '\\.')))
  }
  for (const path of templatePaths) {
    const fileName = path.split('/').pop()
    assert.match(viteConfig, new RegExp(fileName!.replace('.', '\\.')))
  }

  assert.doesNotMatch(deploySource, /function (?:Resolve-Python|Invoke-Python|Test-NvidiaAvailable|Install-BirefnetServiceFiles)\b/)
  assert.doesNotMatch(deploySource, /\$serverSource = @'/)
  assert.doesNotMatch(deploySource, /\$serviceSource = @'/)
  assert.ok(deploySource.split(/\r?\n/).length <= 150)
})

test('AI matting serializes CPU BiRefNet inference while allowing GPU parallel requests', () => {
  const pipelineHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts', 'utf8')
  const processingHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useMatteProcessingQueue.ts', 'utf8')
  const birefnetServiceClient = readFileSync('electron/birefnetServiceClient.cjs', 'utf8')
  const script = readBirefnetDeploymentSources()

  assert.match(pipelineHook, /const CPU_AI_MATTING_CONCURRENCY = 1/)
  assert.match(pipelineHook, /cpuAiMattingConcurrency: CPU_AI_MATTING_CONCURRENCY/)
  assert.match(processingHook, /const matteConcurrency = matteMode === 'ai' && aiMatting\.activeDevice === 'cpu'\s*\?\s*cpuAiMattingConcurrency\s*:\s*pipelineConcurrency/)
  assert.match(processingHook, /matteActiveRef\.current\.size < matteConcurrency/)
  assert.match(birefnetServiceClient, /const BIREFNET_MATTE_TIMEOUT_MS = 600000/)
  assert.match(birefnetServiceClient, /postJson\(port, '\/matte', \{[\s\S]*\}, BIREFNET_MATTE_TIMEOUT_MS\)/)
  assert.match(script, /from threading import Condition, Lock, Thread/)
  assert.match(script, /inference_lock = Lock\(\)/)
  assert.match(script, /def inference_context\(\):[\s\S]*if DEVICE == "cpu":[\s\S]*return inference_lock/)
  assert.match(script, /return nullcontext\(\)/)
  assert.match(script, /with inference_context\(\):[\s\S]*active_model = get_model\(\)/)
})
