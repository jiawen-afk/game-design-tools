const supportedStableAudioModels = new Set(['small-sfx', 'small-music', 'medium'])
const stableAudioModelRepos = {
  'small-sfx': 'stabilityai/stable-audio-3-small-sfx',
  'small-music': 'stabilityai/stable-audio-3-small-music',
  medium: 'stabilityai/stable-audio-3-medium',
}

function normalizeStableAudioModel(model) {
  const value = String(model || '')
  return supportedStableAudioModels.has(value) ? value : 'small-sfx'
}

function resolveStableAudioStatusModel(options, config) {
  const requested = String(options?.model || '')
  if (supportedStableAudioModels.has(requested)) return requested
  return normalizeStableAudioModel(config?.ModelVariant)
}

function getRequestedStableAudioStatusModel(options) {
  const requested = String(options?.model || '')
  return supportedStableAudioModels.has(requested) ? requested : ''
}

function isStableAudioModelAccessError(output) {
  const text = String(output || '').toLowerCase()
  return (
    text.includes('gatedrepoerror') ||
    text.includes('401 unauthorized') ||
    text.includes('cannot access gated repo') ||
    text.includes('access to model') ||
    text.includes('please log in')
  )
}

function stableAudioModelUrl(model) {
  const repoId = stableAudioModelRepos[normalizeStableAudioModel(model)]
  return `https://huggingface.co/${repoId}`
}

function formatStableAudioModelAccessFailure(model, output, repoDir = '') {
  const repoId = stableAudioModelRepos[normalizeStableAudioModel(model)]
  const raw = String(output || '').trim()
  if (raw.includes('尚未下载到本机缓存')) return raw
  if (isStableAudioModelAccessError(raw)) {
    const loginLocation = repoDir
      ? `进入 ${repoDir} 后运行：uv run hf auth login`
      : '在 Stable Audio 3 安装目录运行：uv run hf auth login'
    return [
      `模型 ${model} 需要 HuggingFace 授权后才能下载：${repoId}`,
      `访问链接：${stableAudioModelUrl(model)}`,
      '操作步骤：',
      '1. 登录 HuggingFace。',
      '2. 打开上面的访问链接，申请或同意模型访问许可。',
      `3. ${loginLocation}`,
      '4. 回到本工具重新点击“检测依赖和模型”。',
    ].join('\n')
  }
  return `模型 ${model} 访问检测失败：${raw || '无法读取 HuggingFace 模型配置。'}`
}

function buildStableAudioModelProbeScript(model) {
  const normalizedModel = normalizeStableAudioModel(model)
  const repoId = stableAudioModelRepos[normalizedModel]
  const modelUrl = stableAudioModelUrl(normalizedModel)
  return [
    'from huggingface_hub import try_to_load_from_cache',
    'from stable_audio_3.model_configs import models',
    `model = ${JSON.stringify(normalizedModel)}`,
    'cfg = models[model]',
    'missing = []',
    'for label, filename in [("model_config.json", cfg.config_path), ("model.safetensors", cfg.ckpt_path)]:',
    '    cached = try_to_load_from_cache(cfg.repo_id, filename)',
    '    if not isinstance(cached, str):',
    '        missing.append(label)',
    'if missing:',
    `    print(${JSON.stringify(`模型 ${normalizedModel} 尚未下载到本机缓存：${repoId}\n访问链接：${modelUrl}\n缺少文件：`)} + ", ".join(missing) + ${JSON.stringify(`\n请先选择 ${normalizedModel} 后点击“安装依赖”。如果模型是受限仓库，请先登录 HuggingFace 并同意访问许可。`)})`,
    '    raise SystemExit(2)',
    `print(${JSON.stringify(`model installed: ${normalizedModel}`)})`,
  ].join('\n')
}

module.exports = {
  buildStableAudioModelProbeScript,
  formatStableAudioModelAccessFailure,
  getRequestedStableAudioStatusModel,
  normalizeStableAudioModel,
  resolveStableAudioStatusModel,
  stableAudioModelRepos,
}
