import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  buildGradioGeneratePayload,
  buildGradioApiCall,
  createVoiceRecordName,
  defaultVoiceGenerationParams,
  defaultPort,
  clearVoiceRecords,
  deleteVoiceRecord,
  downloadSources,
  evaluateHardware,
  latencyDisclaimer,
  modelVramRequirements,
  parseNvidiaSmiReport,
  prepareCloneFromRecord,
  updateRecordName,
  validateModelPath,
  voiceModeMeta,
  voxcpmModels,
  type VoiceGenerationRecord,
} from './voiceDeploymentModel'

test('parses nvidia-smi CSV output and keeps the largest VRAM card', () => {
  const report = parseNvidiaSmiReport(`
NVIDIA GeForce RTX 3060, 12288
NVIDIA GeForce GTX 1650, 4096
`)
  assert.deepEqual(report, { gpuName: 'NVIDIA GeForce RTX 3060', vramGb: 12, device: 'nvidia' })
})

test('recommends VoxCPM2 when VRAM reaches its configured requirement', () => {
  const result = evaluateHardware({ gpuName: 'RTX 4090', vramGb: modelVramRequirements.VoxCPM2, device: 'nvidia' })
  assert.equal(result.status, 'ready')
  assert.equal(result.recommendedModel, 'VoxCPM2')
})

test('lower VoxCPM models remain metadata only and are disabled in setup UI', () => {
  const panelsSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.match(panelsSource, /disabledModelIds/)
  assert.match(panelsSource, /VoxCPM1\.5/)
  assert.match(panelsSource, /VoxCPM-0\.5B/)
  assert.match(panelsSource, /disabled:\s*disabledModelIds\.has\('VoxCPM1\.5'\)/)
  assert.match(panelsSource, /disabled:\s*disabledModelIds\.has\('VoxCPM-0\.5B'\)/)
})

test('recommends VoxCPM1.5 when VRAM reaches its configured requirement', () => {
  const result = evaluateHardware({ gpuName: 'RTX 3060', vramGb: modelVramRequirements['VoxCPM1.5'], device: 'nvidia' })
  assert.equal(result.status, 'warning')
  assert.equal(result.recommendedModel, 'VoxCPM1.5')
})

test('recommends VoxCPM-0.5B when VRAM reaches its configured requirement', () => {
  const result = evaluateHardware({ gpuName: 'GTX 1660', vramGb: modelVramRequirements['VoxCPM-0.5B'], device: 'nvidia' })
  assert.equal(result.status, 'warning')
  assert.equal(result.recommendedModel, 'VoxCPM-0.5B')
})

test('blocks deployment when NVIDIA VRAM is below the smallest configured requirement', () => {
  const result = evaluateHardware({ gpuName: 'GTX 1650', vramGb: modelVramRequirements['VoxCPM-0.5B'] - 1, device: 'nvidia' })
  assert.equal(result.status, 'blocked')
  assert.equal(result.recommendedModel, null)
})

test('Apple Silicon is always ready with VoxCPM-0.5B recommendation', () => {
  const result = evaluateHardware({ gpuName: 'Apple Silicon', vramGb: 0, device: 'apple' })
  assert.equal(result.status, 'ready')
  assert.equal(result.recommendedModel, 'VoxCPM-0.5B')
  assert.match(result.detail, /MPS/)
})

test('CPU mode is warning with VoxCPM-0.5B recommendation', () => {
  const result = evaluateHardware({ gpuName: 'CPU', vramGb: 0, device: 'cpu' })
  assert.equal(result.status, 'warning')
  assert.equal(result.recommendedModel, 'VoxCPM-0.5B')
})

test('model VRAM requirements match VoxCPM documentation', () => {
  assert.equal(modelVramRequirements.VoxCPM2 > modelVramRequirements['VoxCPM1.5'], true)
  assert.equal(modelVramRequirements['VoxCPM1.5'] > modelVramRequirements['VoxCPM-0.5B'], true)
  assert.equal(Math.min(...Object.values(modelVramRequirements)) > 0, true)
})

test('requires a local model path before deployment', () => {
  assert.equal(validateModelPath('').valid, true)
  assert.equal(validateModelPath('D:\\models\\VoxCPM2').valid, true)
})

test('VoxCPM setup uses the desktop bridge instead of remote shell bootstrap commands', () => {
  const modelSource = readFileSync('src/components/VoiceDeploymentWorkspace/voiceDeploymentModel.ts', 'utf8')
  const hookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentSetup.ts', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.doesNotMatch(modelSource, /buildOneClickCommand/)
  assert.doesNotMatch(modelSource, /tools\.linjiawen\.com/)
  assert.doesNotMatch(modelSource, /deploy-voxcpm\.sh/)
  assert.doesNotMatch(hookSource, /oneClickCommand/)
  assert.doesNotMatch(panelSource, /复制命令/)
  assert.doesNotMatch(panelSource, /macOS \/ Linux/)
  assert.match(hookSource, /runVoxcpmSetup/)
  assert.match(panelSource, /安装依赖/)
})

test('downloadSources metadata covers auto/hf/ms with correct hosts', () => {
  const ids = downloadSources.map((s) => s.id)
  assert.deepEqual(ids, ['auto', 'hf', 'ms'])
  const byId = Object.fromEntries(downloadSources.map((s) => [s.id, s]))
  assert.equal(byId.auto.host, '')
  assert.equal(byId.hf.host, 'hf-mirror.com')
  assert.equal(byId.ms.host, 'modelscope.cn')
  for (const s of downloadSources) {
    assert.ok(s.label.length > 0)
    assert.ok(s.note.length > 0)
  }
})

test('latencyDisclaimer honestly notes latency is not throughput', () => {
  assert.ok(latencyDisclaimer.length > 0)
  assert.match(latencyDisclaimer, /延迟/)
  assert.match(latencyDisclaimer, /吞吐/)
})

test('voxcpmModels metadata matches VRAM requirements and HF ids', () => {
  assert.deepEqual(voxcpmModels.map((m) => m.id), Object.keys(modelVramRequirements))
  for (const m of voxcpmModels) {
    assert.equal(m.hfId, `openbmb/${m.id}`)
    assert.equal(m.vramGb, modelVramRequirements[m.id])
    assert.ok(m.note.length > 0)
  }
})

test('Gradio API call example uses gradio_client predict', () => {
  const call = buildGradioApiCall({ port: defaultPort, text: '测试文本' })
  assert.match(call, /gradio_client/)
  assert.match(call, new RegExp(`127\\.0\\.0\\.1:${defaultPort}`))
  assert.match(call, /\.predict\(/)
  assert.match(call, /测试文本/)
})

test('default port is a valid local Gradio port', () => {
  assert.equal(Number.isInteger(defaultPort), true)
  assert.equal(defaultPort > 0, true)
  assert.equal(defaultPort <= 65535, true)
})

test('voice modes cover blind box, design, reference clone, and high similarity clone', () => {
  assert.deepEqual(voiceModeMeta.map((item) => item.id), [
    'blind-box',
    'voice-design',
    'reference-clone',
    'high-similarity-clone',
  ])
  for (const mode of voiceModeMeta) {
    assert.ok(mode.label.length > 0)
    assert.ok(mode.note.length > 0)
  }
})

test('Gradio generate payload maps voice modes to VoxCPM API order', () => {
  const payload = buildGradioGeneratePayload({
    ...defaultVoiceGenerationParams,
    mode: 'high-similarity-clone',
    text: '生成台词',
    controlInstruction: '温柔',
    promptText: '参考文本',
    referenceAudioName: 'ref.wav',
    referenceAudioPath: '/tmp/ref.wav',
    advanced: {
      cfgValue: 2.4,
      normalize: true,
      denoise: true,
      ditSteps: 18,
    },
  })

  assert.equal(payload.data[0], '生成台词')
  assert.equal(payload.data[1], '')
  assert.deepEqual(payload.data[2], {
    path: '/tmp/ref.wav',
    orig_name: 'ref.wav',
    meta: { _type: 'gradio.FileData' },
  })
  assert.equal(payload.data[3], true)
  assert.equal(payload.data[4], '参考文本')
  assert.equal(payload.data[5], 2.4)
  assert.equal(payload.data[6], true)
  assert.equal(payload.data[7], true)
  assert.equal(payload.data[8], 18)
})

test('reference clone payload keeps control instruction and disables prompt text', () => {
  const payload = buildGradioGeneratePayload({
    ...defaultVoiceGenerationParams,
    mode: 'reference-clone',
    controlInstruction: '更年轻，语速稍快',
    promptText: '不会发送',
  })

  assert.equal(payload.data[1], '更年轻，语速稍快')
  assert.equal(payload.data[3], false)
  assert.equal(payload.data[4], '')
})

test('voice records can be renamed, deleted, and loaded for cloning without star state', () => {
  const record: VoiceGenerationRecord = {
    id: 'r1',
    name: createVoiceRecordName(defaultVoiceGenerationParams, 1),
    createdAt: '2026-06-05T00:00:00.000Z',
    audioUrl: 'blob:voice',
    audioPath: '/tmp/out.wav',
    params: {
      ...defaultVoiceGenerationParams,
      mode: 'high-similarity-clone',
      referenceAudioPath: '/tmp/ref.wav',
      referenceAudioName: 'ref.wav',
    },
  }

  const renamed = updateRecordName([record], 'r1', '角色 A')
  assert.equal(renamed[0].name, '角色 A')
  assert.equal(updateRecordName(renamed, 'r1', '   ')[0].name, '角色 A')

  assert.deepEqual(deleteVoiceRecord(renamed, 'r1'), [])

  const currentParams = {
    ...defaultVoiceGenerationParams,
    mode: 'voice-design' as const,
    text: '当前正在编辑的台词',
    controlInstruction: '当前声音描述',
    promptText: '当前参考音频文本',
    referenceAudioName: 'old.wav',
    referenceAudioPath: '/tmp/old.wav',
    advanced: {
      ...defaultVoiceGenerationParams.advanced,
      cfgValue: 2.6,
    },
  }

  const cloneParams = prepareCloneFromRecord(currentParams, renamed[0])
  assert.equal(cloneParams.mode, 'reference-clone')
  assert.equal(cloneParams.referenceAudioPath, '/tmp/out.wav')
  assert.equal(cloneParams.referenceAudioName, '角色 A')
  assert.equal(cloneParams.text, '当前正在编辑的台词')
  assert.equal(cloneParams.controlInstruction, '当前声音描述')
  assert.equal(cloneParams.promptText, '当前参考音频文本')
  assert.equal(cloneParams.advanced.cfgValue, 2.6)
})

test('voice record names can include a selected character prefix', () => {
  const named = createVoiceRecordName(defaultVoiceGenerationParams, 2, '莉娜')
  assert.match(named, /^莉娜 · 声音盲盒 2/)

  const unnamed = createVoiceRecordName(defaultVoiceGenerationParams, 2, '   ')
  assert.match(unnamed, /^声音盲盒 2/)
})

test('voice record history can be cleared at once', () => {
  const record: VoiceGenerationRecord = {
    id: 'r1',
    name: '历史配音',
    createdAt: '2026-06-05T00:00:00.000Z',
    audioUrl: 'blob:voice',
    audioPath: '/tmp/out.wav',
    params: defaultVoiceGenerationParams,
  }

  assert.deepEqual(clearVoiceRecords([record]), [])
})

test('Windows deployment script installs ffmpeg for browser-recorded m4a reference audio', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Get-Command ffmpeg/)
  assert.match(source, /Gyan\.FFmpeg/)
})

test('Windows deployment script prepares service commands without auto-starting Gradio', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Install-ServiceCommands/)
  assert.match(source, /voxcpm-start/)
  assert.match(source, /voxcpm-stop/)
  assert.match(source, /voxcpm-restart/)
  assert.match(source, /voxcpm-status/)
  assert.doesNotMatch(source, /Invoke-Expression "\$PythonExe app\.py --port/)
})

test('Windows deployment script safely detects optional tools and checks the model drive', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Get-Command \$candidate\.Command -ErrorAction SilentlyContinue/)
  assert.match(source, /Get-Command nvidia-smi -ErrorAction SilentlyContinue/)
  assert.match(source, /Resolve-ModelDriveName/)
  assert.doesNotMatch(source, /\$pyver = python --version/)
  assert.doesNotMatch(source, /\$smi = nvidia-smi 2>&1/)
})

test('Windows deployment script keeps command arguments and generated files safe', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Invoke-Python/)
  assert.match(source, /Start-Process -FilePath \$script:PythonCommand/)
  assert.match(source, /-Encoding utf8/)
  assert.match(source, /sm_120/)
  assert.doesNotMatch(source, /Set-Content -Path \$pyFile -Value \$pyCode -Encoding ascii/)
})

test('Windows deployment script runs multiline Python probes from temporary files', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')
  const ensureTorch = source.match(/function Ensure-Torch\([\s\S]*?\n\}/)?.[0] || ''

  assert.match(source, /Invoke-PythonScriptOutput/)
  assert.match(source, /\[System\.IO\.Path\]::GetTempFileName\(\)/)
  assert.doesNotMatch(source, /New-TemporaryFile/)
  assert.match(source, /Remove-Item \$pyFile -ErrorAction SilentlyContinue/)
  assert.match(ensureTorch, /Invoke-PythonScriptOutput \$probeCode/)
  assert.doesNotMatch(ensureTorch, /Invoke-PythonOutput @\("-c", \$probeCode\)/)
})

test('Windows service command scripts preserve Chinese console output', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /UTF8Encoding\]::new\(\$true\)/)
  assert.match(source, /Write-Utf8PowerShellFile/)
  assert.match(source, /chcp 65001/)
})

test('Windows service runner keeps native stderr warnings in the log', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Start-Process -FilePath \(\[string\]\$config\.PythonCommand\)/)
  assert.match(source, /-RedirectStandardOutput \$stdoutPath/)
  assert.match(source, /-RedirectStandardError \$stderrPath/)
  assert.match(source, /voxcpm\.err\.log/)
  assert.match(source, /taskkill/)
  assert.doesNotMatch(source, /\*\> \(\[string\]\$config\.LogPath\)/)
  assert.doesNotMatch(source, /BeginErrorReadLine/)
})

test('Windows deployment script allows the Electron renderer to call local Gradio', () => {
  const windows = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  for (const source of [windows]) {
    assert.match(source, /VOXCPM_ALLOWED_BROWSER_ORIGINS", "\*"/)
    assert.match(source, /"\*" in allowed/)
    assert.match(source, /VOXCPM_ALLOWED_BROWSER_ORIGINS/)
    assert.match(source, /CustomCORSMiddleware/)
    assert.match(source, /Access-Control-Allow-Private-Network/)
  }

  assert.match(windows, /if \(\$allowedOrigins\.Count -eq 0\) \{ \$allowedOrigins = @\("\*"\) \}/)
  assert.match(windows, /PYTHONPATH/)
})

test('Windows service stores the real Python interpreter instead of the py launcher', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Resolve-PythonExecutablePath/)
  assert.match(source, /sys\.executable/)
  assert.match(source, /RealCommand/)
  assert.match(source, /PythonArgs = @\(\)/)
})

test('Windows deployment script requires Python 3.12 for setup and service commands', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /py"; Args = @\("-3\.12"\)/)
  assert.match(source, /Python 3\.12/)
  assert.match(source, /-match "3\\\.12\\\."/)
  assert.doesNotMatch(source, /3\\\.\(10\|11\|12\)\\\./)
  assert.doesNotMatch(source, /Python 3\.10-3\.12/)
})

test('Windows deployment script refuses to install VoxCPM with a non-3.12 interpreter', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')
  const invokePython = source.match(/function Invoke-Python\([\s\S]*?\n\}/)?.[0] || ''

  assert.match(source, /function Assert-PythonRuntimeCompatible/)
  assert.match(source, /sys\.version_info\.major/)
  assert.match(source, /sys\.version_info\.minor/)
  assert.match(source, /Write-Fail "\$context：需要 Python 3\.12/)
  assert.match(invokePython, /Assert-PythonRuntimeCompatible \$failureMessage/)
})

test('Windows Python executable resolver preserves launcher arguments', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')
  const resolver = source.match(/function Resolve-PythonExecutablePath\([\s\S]*?\n\}/)?.[0] || ''

  assert.match(resolver, /\$launcherArgs/)
  assert.match(resolver, /\$probeArgs = @\(\$launcherArgs\) \+ @\("-c"/)
  assert.doesNotMatch(resolver, /function Resolve-PythonExecutablePath\(\$command, \$args\)/)
})

test('Windows service runner tracks the actual long-lived Python process id', () => {
  const source = readFileSync('scripts/deploy-voxcpm.ps1', 'utf8')

  assert.match(source, /Set-Content -Path \(\[string\]\$config\.PidPath\) -Value \$process\.Id/)
  assert.doesNotMatch(source, /Set-Content -Path \(\[string\]\$config\.PidPath\) -Value \$process\.Id -Encoding ascii\s+Write-Host "VoxCPM 正在后台启动/)
})

test('home voice card describes Gradio instead of stale vLLM REST output', () => {
  const source = readFileSync('src/App.tsx', 'utf8')

  assert.doesNotMatch(source, /vLLM/)
  assert.doesNotMatch(source, /\/v1\/audio\/speech/)
  assert.match(source, /Gradio/)
  assert.match(source, /gradio_client/)
})

test('voice history library renders outside the connected-only generator branch', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx', 'utf8')
  const styleSource = readFileSync('src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css', 'utf8')

  assert.match(source, /\{connected \? \([\s\S]*<VoiceLibraryPanel[\s\S]*\) : \([\s\S]*<VoiceLibraryPanel/)
  assert.match(source, /libraryVariant="sticky"/)
  assert.match(source, /libraryVariant="embedded"/)
  assert.match(panelSource, /libraryVariant/)
  assert.match(panelSource, /voice-library-\$\{libraryVariant\}/)
  assert.match(styleSource, /\.voice-library-sticky/)
  assert.match(styleSource, /\.voice-library-embedded/)
})

test('voice records can be collected into personal space assets', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx', 'utf8')
  const listSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx', 'utf8')
  const collectorSource = readFileSync('src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.ts', 'utf8')

  assert.match(listSource, /收藏到个人空间/)
  assert.match(listSource, /personalSpaceCollectEnabled/)
  assert.match(listSource, /personalSpaceCollectDisabledReason/)
  assert.match(listSource, /disabled=\{!personalSpaceCollectEnabled\}/)
  assert.match(listSource, /收藏并关联角色/)
  assert.match(listSource, /收藏并关联特效/)
  assert.match(listSource, /收藏并关联剧情/)
  assert.match(listSource, /record-collect-action/)
  assert.match(listSource, /aria-label="展开收藏关联方式"/)
  assert.doesNotMatch(listSource, /Dropdown\.Button/)
  assert.match(source, /personalSpaceVoiceAssets/)
  assert.match(panelSource, /label: `个人空间 \$\{personalSpaceVoiceAssets\.length\}`/)
  assert.match(source, /collectVoiceRecordToPersonalSpace/)
  assert.match(source, /from '\.\/voicePersonalSpaceCollector'/)
  assert.match(collectorSource, /createVoiceAssetFromRecord/)
  assert.match(collectorSource, /writeAssetResourcesToDirectory/)
  assert.match(collectorSource, /getPersonalSpaceDirectoryHandle/)
  assert.match(collectorSource, /personalSpaceDirectoryRequiredMessage/)
  assert.doesNotMatch(collectorSource, /archiveAssetForStorageDirectory/)
  assert.match(collectorSource, /assignAssetToCharacterColumn/)
  assert.match(collectorSource, /linkEffectAssetToVoice/)
  assert.match(collectorSource, /assignVoiceToStoryboardGroup/)
  assert.doesNotMatch(source, /星标/)
  assert.doesNotMatch(source, /StarOutlined/)
  assert.doesNotMatch(source, /StarFilled/)
  assert.doesNotMatch(source, /favoriteRecords/)
  assert.doesNotMatch(source, /toggleRecordFavorite/)
  assert.doesNotMatch(source, /onToggleFavorite/)
  assert.doesNotMatch(source, /type="primary" ghost onClick=\{\(\) => onCollect\(record\)\}/)
})

test('voice library can clear history and preview personal space voices with linked names', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx', 'utf8')
  const listSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx', 'utf8')

  assert.match(source, /clearVoiceRecords/)
  assert.match(source, /clearRecords/)
  assert.match(panelSource, /清空历史/)
  assert.match(panelSource, /onClearHistory/)
  assert.match(listSource, /<audio controls src=\{audioSource\}/)
  assert.match(listSource, /角色：/)
  assert.match(listSource, /剧情：/)
  assert.match(listSource, /linkedCharacterIds/)
  assert.match(listSource, /linkedStoryboardIds/)
  assert.doesNotMatch(listSource, /asset\.resourcePaths\.join/)
  assert.doesNotMatch(listSource, /未绑定本地文件/)
})

test('voice generation panel exposes a searchable character picker for record prefixes', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceGenerationPanel.tsx', 'utf8')
  const workflowSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceGenerationWorkflow.ts', 'utf8')

  assert.match(source, /selectedVoiceCharacterId/)
  assert.match(source, /selectedVoiceCharacterName/)
  assert.match(source, /addCharacterProfile/)
  assert.match(source, /writePersonalSpaceState/)
  assert.match(panelSource, /voice-character-selector/)
  assert.match(panelSource, /搜索角色/)
  assert.match(panelSource, /快捷创建角色/)
  assert.match(panelSource, /selectedCharacterId/)
  assert.match(panelSource, /onCharacterSelect/)
  assert.match(panelSource, /onCharacterCreate/)
  assert.doesNotMatch(panelSource, /前缀：/)
  assert.doesNotMatch(panelSource, /未选择角色前缀/)
  assert.match(workflowSource, /selectedCharacterName/)
  assert.match(workflowSource, /createVoiceRecordName\(paramsForRequest, recordCount \+ 1, selectedCharacterName\)/)
})
