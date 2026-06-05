import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UploadProps } from 'antd'
import { Alert, Button, Empty, Input, InputNumber, Segmented, Slider, Switch, Tabs, Tag, Tooltip, Upload } from 'antd'
import {
  ApiOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  DesktopOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import './voiceDeploymentWorkspace.css'
import {
  type ConnectionStatus,
  type DeviceType,
  type DownloadSource,
  type GradioFileData,
  type HardwareReport,
  type ModelVersion,
  type Platform,
  type VoiceAdvancedParams,
  type VoiceGenerationMode,
  type VoiceGenerationParams,
  type VoiceGenerationRecord,
  buildGradioApiCall,
  buildGradioGeneratePayload,
  buildOneClickCommand,
  buildServiceUrl,
  cloneVoiceParams,
  createVoiceRecordName,
  defaultPort,
  defaultVoiceGenerationParams,
  deleteVoiceRecord,
  downloadSources,
  evaluateHardware,
  gpuCheckCommand,
  latencyDisclaimer,
  parseNvidiaSmiReport,
  prepareCloneFromRecord,
  toggleRecordFavorite,
  updateRecordName,
  validateModelPath,
  voiceModeMeta,
  voxcpmModels,
} from './voiceDeploymentModel'

const recordsStorageKey = 'game-design-tools.voxcpm.records.v1'

const platformOptions: Array<{ label: string; value: Platform }> = [
  { label: 'Windows', value: 'windows' },
  { label: 'macOS / Linux', value: 'mac' },
]

const deviceOptions: Array<{ label: string; value: DeviceType }> = [
  { label: 'NVIDIA GPU', value: 'nvidia' },
  { label: 'Apple Silicon', value: 'apple' },
  { label: 'CPU', value: 'cpu' },
]

const modelOptions = voxcpmModels.map((m) => ({
  label: `${m.id} · 约 ${m.vramGb}GB`,
  value: m.id,
}))

const sourceOptions = downloadSources.map((s) => ({
  label: s.label,
  value: s.id,
}))

const modeOptions = voiceModeMeta.map((m) => ({
  label: m.label,
  value: m.id,
}))

const quickDesignPrompts = [
  '年轻女性，明亮，语速自然，带一点笑意',
  '中年男性，沉稳，低音，适合旁白',
  '少年角色，精力充沛，语速稍快',
  '机械助手，清晰，冷静，轻微电子质感',
]

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function checkConnection(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/config`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

function readStoredRecords(): VoiceGenerationRecord[] {
  try {
    const raw = localStorage.getItem(recordsStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredRecords(records: VoiceGenerationRecord[]) {
  try {
    localStorage.setItem(recordsStorageKey, JSON.stringify(records.slice(0, 80)))
  } catch {}
}

async function uploadReferenceAudio(port: number, file: File): Promise<GradioFileData> {
  const form = new FormData()
  form.append('files', file)
  const res = await fetch(`http://127.0.0.1:${port}/gradio_api/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`参考音频上传失败：${res.status}`)
  const data = await res.json()
  const first = Array.isArray(data) ? data[0] : data
  if (typeof first === 'string') {
    return { path: first, orig_name: file.name, mime_type: file.type, meta: { _type: 'gradio.FileData' } }
  }
  if (first && typeof first.path === 'string') {
    return {
      path: first.path,
      orig_name: first.orig_name || file.name,
      mime_type: first.mime_type || file.type,
      meta: { _type: 'gradio.FileData' },
    }
  }
  throw new Error('参考音频上传结果无法识别')
}

async function readGradioEventResult(res: Response): Promise<unknown[]> {
  if (!res.ok) throw new Error(`生成请求失败：${res.status}`)
  if (!res.body) {
    const text = await res.text()
    return parseGradioEventText(text)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    const blocks = buffer.split(/\n\n/)
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const parsed = parseGradioEventBlock(block)
      if (!parsed) continue
      if (parsed.event === 'error') throw new Error(String(parsed.data || 'VoxCPM 生成失败'))
      if (parsed.event === 'complete') return Array.isArray(parsed.data) ? parsed.data : [parsed.data]
    }

    if (done) break
  }

  return parseGradioEventText(buffer)
}

function parseGradioEventText(text: string): unknown[] {
  for (const block of text.split(/\n\n/)) {
    const parsed = parseGradioEventBlock(block)
    if (!parsed) continue
    if (parsed.event === 'error') throw new Error(String(parsed.data || 'VoxCPM 生成失败'))
    if (parsed.event === 'complete') return Array.isArray(parsed.data) ? parsed.data : [parsed.data]
  }
  throw new Error('没有收到 VoxCPM 生成结果')
}

function parseGradioEventBlock(block: string): { event: string; data: unknown } | null {
  const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim()
  const dataLine = block.match(/^data:\s*(.*)$/m)?.[1]
  if (!event) return null
  let data: unknown = dataLine ?? null
  if (dataLine) {
    try {
      data = JSON.parse(dataLine)
    } catch {}
  }
  return { event, data }
}

function normalizeAudioResult(data: unknown[], serviceUrl: string) {
  const first = data[0]
  if (first && typeof first === 'object') {
    const file = first as { url?: string; path?: string; name?: string }
    const url = file.url
      ? file.url.startsWith('http') ? file.url : `${serviceUrl}${file.url}`
      : file.path ? `${serviceUrl}/gradio_api/file=${encodeURIComponent(file.path)}` : ''
    return { audioUrl: url, audioPath: file.path ?? null }
  }
  if (typeof first === 'string') {
    const url = first.startsWith('http') ? first : `${serviceUrl}/gradio_api/file=${encodeURIComponent(first)}`
    return { audioUrl: url, audioPath: first }
  }
  throw new Error('没有找到生成音频文件')
}

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <QuestionCircleOutlined className="help-icon" aria-label={text} />
    </Tooltip>
  )
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="field-label">
      {label}
      <HelpTip text={help} />
    </span>
  )
}

export default function VoiceDeploymentWorkspace() {
  const [port, setPort] = useState(defaultPort)
  const [portInput, setPortInput] = useState(String(defaultPort))
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [deviceType, setDeviceType] = useState<DeviceType>('nvidia')
  const [gpuInput, setGpuInput] = useState('')
  const [modelPath, setModelPath] = useState('')
  const [platform, setPlatform] = useState<Platform>('windows')
  const [selectedModel, setSelectedModel] = useState<ModelVersion>('VoxCPM2')
  const [downloadSource, setDownloadSource] = useState<DownloadSource>('auto')
  const [modelTouched, setModelTouched] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [voiceParams, setVoiceParams] = useState<VoiceGenerationParams>(() => cloneVoiceParams(defaultVoiceGenerationParams))
  const [pendingReferenceFile, setPendingReferenceFile] = useState<File | null>(null)
  const [records, setRecords] = useState<VoiceGenerationRecord[]>(readStoredRecords)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null)
  const checkRef = useRef(0)

  useEffect(() => { writeStoredRecords(records) }, [records])

  const hardwareReport = useMemo<HardwareReport | null>(() => {
    if (deviceType === 'apple') return { gpuName: 'Apple Silicon', vramGb: 0, device: 'apple' }
    if (deviceType === 'cpu') return { gpuName: 'CPU', vramGb: 0, device: 'cpu' }
    return parseNvidiaSmiReport(gpuInput)
  }, [deviceType, gpuInput])

  const hardware = useMemo(() => evaluateHardware(hardwareReport), [hardwareReport])
  const modelValidation = useMemo(() => validateModelPath(modelPath), [modelPath])
  const oneClickCommand = useMemo(() => buildOneClickCommand(platform, modelPath, selectedModel, downloadSource), [platform, modelPath, selectedModel, downloadSource])
  const apiCallExample = useMemo(() => buildGradioApiCall({ port, text: '你好，这是一段测试语音。' }), [port])
  const serviceUrl = buildServiceUrl(port)
  const connected = connectionStatus === 'connected'
  const selectedMode = voiceModeMeta.find((item) => item.id === voiceParams.mode) ?? voiceModeMeta[0]
  const favoriteRecords = records.filter((record) => record.favorite)

  const runCheck = useCallback(async (targetPort: number) => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const ok = await checkConnection(targetPort)
    if (checkRef.current !== id) return
    setConnectionStatus(ok ? 'connected' : 'disconnected')
  }, [])

  useEffect(() => { runCheck(defaultPort) }, [runCheck])

  useEffect(() => {
    if (!modelTouched && hardware.recommendedModel) {
      setSelectedModel(hardware.recommendedModel)
    }
  }, [hardware.recommendedModel, modelTouched])

  const updateParams = (patch: Partial<VoiceGenerationParams>) => {
    setVoiceParams((current) => ({ ...current, ...patch }))
  }

  const updateAdvanced = (patch: Partial<VoiceAdvancedParams>) => {
    setVoiceParams((current) => ({ ...current, advanced: { ...current.advanced, ...patch } }))
  }

  const setMode = (mode: VoiceGenerationMode) => {
    setVoiceParams((current) => ({ ...current, mode }))
  }

  const applyPort = () => {
    const n = parseInt(portInput, 10)
    if (n > 0 && n < 65536) { setPort(n); runCheck(n) }
  }

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 1600)
  }

  const uploadProps: UploadProps = {
    accept: 'audio/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      const nextFile = file as File
      setPendingReferenceFile(nextFile)
      updateParams({
        referenceAudioName: nextFile.name,
        referenceAudioPath: null,
      })
      return false
    },
  }

  const canGenerate = connected
    && !generating
    && voiceParams.text.trim().length > 0
    && (voiceParams.mode === 'blind-box' || voiceParams.mode === 'voice-design' || Boolean(pendingReferenceFile || voiceParams.referenceAudioPath))
    && (voiceParams.mode !== 'high-similarity-clone' || voiceParams.promptText.trim().length > 0)

  const generateVoice = async () => {
    if (!canGenerate) return
    setGenerating(true)
    setGenerationError('')
    try {
      let paramsForRequest = cloneVoiceParams(voiceParams)
      if (pendingReferenceFile) {
        const uploaded = await uploadReferenceAudio(port, pendingReferenceFile)
        paramsForRequest = {
          ...paramsForRequest,
          referenceAudioName: uploaded.orig_name || pendingReferenceFile.name,
          referenceAudioPath: uploaded.path,
        }
        setVoiceParams(paramsForRequest)
        setPendingReferenceFile(null)
      }

      const start = await fetch(`${serviceUrl}/gradio_api/call/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGradioGeneratePayload(paramsForRequest)),
      })
      if (!start.ok) throw new Error(`VoxCPM 队列提交失败：${start.status}`)
      const queued = await start.json() as { event_id?: string }
      if (!queued.event_id) throw new Error('VoxCPM 没有返回生成事件 ID')

      const resultResponse = await fetch(`${serviceUrl}/gradio_api/call/generate/${queued.event_id}`)
      const resultData = await readGradioEventResult(resultResponse)
      const audio = normalizeAudioResult(resultData, serviceUrl)
      const record: VoiceGenerationRecord = {
        id: randomId(),
        name: createVoiceRecordName(paramsForRequest, records.length + 1),
        createdAt: new Date().toISOString(),
        audioUrl: audio.audioUrl,
        audioPath: audio.audioPath,
        params: cloneVoiceParams(paramsForRequest),
        favorite: false,
      }
      setRecords((current) => [record, ...current].slice(0, 80))
      setLastGeneratedId(record.id)
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'VoxCPM 生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const loadParams = (record: VoiceGenerationRecord) => {
    setVoiceParams(cloneVoiceParams(record.params))
    setPendingReferenceFile(null)
  }

  const cloneFromRecord = (record: VoiceGenerationRecord) => {
    if (!record.audioPath) return
    setVoiceParams(prepareCloneFromRecord(record))
    setPendingReferenceFile(null)
  }

  const renameRecord = (id: string, name: string) => {
    setRecords((current) => updateRecordName(current, id, name))
  }

  const deleteRecord = (id: string) => {
    setRecords((current) => deleteVoiceRecord(current, id))
  }

  const connectionTag = {
    idle: <Tag>未检测</Tag>,
    checking: <Tag icon={<LoadingOutlined />} color="blue">检测中</Tag>,
    connected: <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>,
    disconnected: <Tag color="error">未连接</Tag>,
  }[connectionStatus]

  const alertType = hardware.status === 'blocked' ? 'error'
    : hardware.status === 'ready' ? 'success'
    : hardware.status === 'warning' ? 'warning'
    : 'info'

  const libraryPanel = (
    <section className="voice-panel voice-library" aria-labelledby="voice-library-title">
      <div className="panel-title">
        <StarOutlined />
        <h3 id="voice-library-title">音频记录</h3>
      </div>
      <Tabs
        items={[
          {
            key: 'history',
            label: `历史 ${records.length}`,
            children: (
              <VoiceRecordList
                records={records}
                lastGeneratedId={lastGeneratedId}
                onLoad={loadParams}
                onClone={cloneFromRecord}
                onDelete={deleteRecord}
                onRename={renameRecord}
                onToggleFavorite={(id) => setRecords((current) => toggleRecordFavorite(current, id))}
              />
            ),
          },
          {
            key: 'favorites',
            label: `收藏 ${favoriteRecords.length}`,
            children: (
              <VoiceRecordList
                records={favoriteRecords}
                lastGeneratedId={lastGeneratedId}
                onLoad={loadParams}
                onClone={cloneFromRecord}
                onDelete={deleteRecord}
                onRename={renameRecord}
                onToggleFavorite={(id) => setRecords((current) => toggleRecordFavorite(current, id))}
              />
            ),
          },
        ]}
      />
    </section>
  )

  return (
    <section className="voice-workspace" aria-labelledby="voice-workspace-title">
      <div className="voice-hero">
        <div>
          <p className="kicker">本地语音部署</p>
          <h2 id="voice-workspace-title">游戏角色语音工作台</h2>
          <p>通过 VoxCPM 在本机运行语音生成服务，工作台直接调用本地接口完成语音生成，无需把素材发送到外部服务器。</p>
        </div>
        <div className="hero-status">
          {connectionTag}
          <Button
            icon={connectionStatus === 'checking' ? <LoadingOutlined /> : <ReloadOutlined />}
            disabled={connectionStatus === 'checking'}
            onClick={() => runCheck(port)}
          >
            重新检测
          </Button>
        </div>
      </div>

      <div className="voice-panel port-row">
        <span className="port-label">服务地址</span>
        <code>{serviceUrl}</code>
        <Input
          value={portInput}
          onChange={(e) => setPortInput(e.target.value)}
          onPressEnter={applyPort}
          onBlur={applyPort}
          addonBefore="端口"
          style={{ width: 160 }}
        />
      </div>

      {connected ? (
        <div className="voice-studio">
          <section className="voice-panel voice-generator" aria-labelledby="voice-generate-title">
            <div className="panel-title">
              <ApiOutlined />
              <h3 id="voice-generate-title">生成语音</h3>
            </div>

            <div className="form-stack">
              <label className="form-field">
                <FieldLabel label="生成方式" help="四种方式使用同一个 VoxCPM /generate 接口，通过参数组合切换能力。" />
                <Segmented
                  block
                  value={voiceParams.mode}
                  options={modeOptions}
                  onChange={(value) => setMode(value as VoiceGenerationMode)}
                />
                <span className="field-note">{selectedMode.note}</span>
              </label>

              <label className="form-field">
                <FieldLabel label="台词文本" help="最终要生成的语音内容。声音盲盒只需要填写这一项。" />
                <Input.TextArea
                  value={voiceParams.text}
                  onChange={(e) => updateParams({ text: e.target.value })}
                  rows={4}
                  placeholder="输入角色要说的话"
                />
              </label>

              {(voiceParams.mode === 'voice-design' || voiceParams.mode === 'reference-clone') && (
                <label className="form-field">
                  <FieldLabel label="声音描述" help="描述年龄、性别、情绪、语速、风格或表演状态。参考音频克隆时会在保留音色基础上调整风格。" />
                  <Input.TextArea
                    value={voiceParams.controlInstruction}
                    onChange={(e) => updateParams({ controlInstruction: e.target.value })}
                    rows={2}
                    placeholder="例如：年轻女性，温柔，语速自然，带一点笑意"
                  />
                  <div className="prompt-chips">
                    {quickDesignPrompts.map((prompt) => (
                      <button key={prompt} type="button" onClick={() => updateParams({ controlInstruction: prompt })}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </label>
              )}

              {(voiceParams.mode === 'reference-clone' || voiceParams.mode === 'high-similarity-clone') && (
                <div className="form-field">
                  <FieldLabel label="参考音频" help="用于提取音色。可以上传本地音频，也可以从右侧历史或收藏中点击克隆。" />
                  <div className="reference-row">
                    <Upload {...uploadProps}>
                      <Button icon={<UploadOutlined />}>选择音频</Button>
                    </Upload>
                    <span>{voiceParams.referenceAudioName || '尚未选择参考音频'}</span>
                  </div>
                </div>
              )}

              {voiceParams.mode === 'high-similarity-clone' && (
                <label className="form-field">
                  <FieldLabel label="参考音频文本" help="填写参考音频里实际说出的文本。文本越准确，克隆相似度通常越高。" />
                  <Input.TextArea
                    value={voiceParams.promptText}
                    onChange={(e) => updateParams({ promptText: e.target.value })}
                    rows={2}
                    placeholder="输入参考音频对应的原文"
                  />
                </label>
              )}

              <div className="advanced-box">
                <div className="panel-title compact">
                  <h3>高级控制</h3>
                  <HelpTip text="这些参数会直接传给 VoxCPM。保持默认值通常即可，调试角色音色时再逐项修改。" />
                </div>

                <div className="advanced-grid">
                  <label className="form-field">
                    <FieldLabel label="CFG 强度" help="控制文本和声音条件的影响强度。常用 1 到 3，过高可能让声音不自然。" />
                    <div className="slider-row">
                      <Slider min={1} max={3} step={0.1} value={voiceParams.advanced.cfgValue} onChange={(value) => updateAdvanced({ cfgValue: value })} />
                      <InputNumber min={1} max={3} step={0.1} value={voiceParams.advanced.cfgValue} onChange={(value) => updateAdvanced({ cfgValue: Number(value ?? 2) })} />
                    </div>
                  </label>

                  <label className="form-field">
                    <FieldLabel label="DiT 步数" help="扩散推理步数。更高通常更慢，可能更稳定；默认 10 适合快速生成。" />
                    <div className="slider-row">
                      <Slider min={1} max={50} step={1} value={voiceParams.advanced.ditSteps} onChange={(value) => updateAdvanced({ ditSteps: value })} />
                      <InputNumber min={1} max={50} step={1} value={voiceParams.advanced.ditSteps} onChange={(value) => updateAdvanced({ ditSteps: Number(value ?? 10) })} />
                    </div>
                  </label>

                  <div className="switch-row">
                    <span>
                      文本归一化
                      <HelpTip text="将数字、符号等文本改写成更适合朗读的形式。游戏专有名词较多时可以关闭。" />
                    </span>
                    <Switch checked={voiceParams.advanced.normalize} onChange={(checked) => updateAdvanced({ normalize: checked })} />
                  </div>

                  <div className="switch-row">
                    <span>
                      参考音频降噪
                      <HelpTip text="对上传的参考音频先做增强处理。录音底噪明显时开启，干净音频可关闭。" />
                    </span>
                    <Switch checked={voiceParams.advanced.denoise} onChange={(checked) => updateAdvanced({ denoise: checked })} />
                  </div>
                </div>
              </div>

              {generationError && <Alert type="error" showIcon message={generationError} />}

              <div className="generate-actions">
                <Button
                  type="primary"
                  icon={generating ? <LoadingOutlined /> : <ThunderboltOutlined />}
                  disabled={!canGenerate}
                  onClick={() => void generateVoice()}
                >
                  {generating ? '正在生成' : '生成语音'}
                </Button>
                <Button onClick={() => setVoiceParams(cloneVoiceParams(defaultVoiceGenerationParams))}>
                  重置参数
                </Button>
                <Button
                  icon={copiedKey === 'api' ? <CheckCircleOutlined /> : <CopyOutlined />}
                  onClick={() => copy('api', apiCallExample)}
                >
                  复制 Python 示例
                </Button>
              </div>
            </div>
          </section>

          {libraryPanel}
        </div>
      ) : (
        <div className="voice-grid">
          <section className="voice-panel" aria-labelledby="hw-title">
            <div className="panel-title">
              <DesktopOutlined />
              <h3 id="hw-title">环境检测</h3>
            </div>
            <p className="panel-copy">
              选择当前设备类型。VoxCPM 支持 NVIDIA GPU（CUDA ≥12.0，PyTorch ≥2.5.0）、Apple Silicon（MPS）和 CPU 三种模式。
            </p>

            <Segmented
              value={deviceType}
              options={deviceOptions}
              onChange={(v) => setDeviceType(v as DeviceType)}
            />

            {deviceType === 'nvidia' && (
              <>
                <p className="panel-copy">
                  在本机终端执行检测命令，将输出粘贴到下方：
                </p>
                <div className="command-row">
                  <code>{gpuCheckCommand}</code>
                  <Button
                    icon={copiedKey === 'gpu' ? <CheckCircleOutlined /> : <CopyOutlined />}
                    onClick={() => copy('gpu', gpuCheckCommand)}
                  >
                    复制
                  </Button>
                </div>
                <Input.TextArea
                  value={gpuInput}
                  onChange={(e) => setGpuInput(e.target.value)}
                  placeholder="NVIDIA GeForce RTX 3060, 12288"
                  rows={3}
                />
              </>
            )}

            <Alert
              className="status-alert"
              type={alertType}
              message={hardware.title}
              description={
                <>
                  {hardware.detail}
                  {hardware.recommendedModel && (
                    <span className="recommended-model"> 推荐版本：<strong>{hardware.recommendedModel}</strong></span>
                  )}
                </>
              }
              showIcon
            />
          </section>

          <section className="voice-panel" aria-labelledby="deploy-title">
            <div className="panel-title">
              <ThunderboltOutlined />
              <h3 id="deploy-title">一键准备</h3>
            </div>
            <p className="panel-copy">
              选择系统和模型版本，复制命令到终端执行。脚本会自动检测环境、使用国内镜像源安装依赖，并安装本机服务管理命令。
            </p>

            <Segmented
              value={platform}
              options={platformOptions}
              onChange={(v) => setPlatform(v as Platform)}
            />

            <div className="model-select">
              <span className="model-select-label">模型版本</span>
              <Segmented
                value={selectedModel}
                options={modelOptions}
                onChange={(v) => { setSelectedModel(v as ModelVersion); setModelTouched(true) }}
              />
              <p className="model-select-note">
                {voxcpmModels.find((m) => m.id === selectedModel)?.note}
              </p>
            </div>

            <div className="model-select">
              <span className="model-select-label">下载源</span>
              <Segmented
                value={downloadSource}
                options={sourceOptions}
                onChange={(v) => setDownloadSource(v as DownloadSource)}
              />
              <p className="model-select-note">
                {downloadSources.find((s) => s.id === downloadSource)?.note}
              </p>
            </div>

            <Input
              value={modelPath}
              onChange={(e) => setModelPath(e.target.value)}
              placeholder={platform === 'windows' ? 'D:\\models\\VoxCPM2（留空则自动下载）' : '/data/models/VoxCPM2（留空则自动下载）'}
              status={modelPath && !modelValidation.valid ? 'warning' : undefined}
            />

            <div className="command-row">
              <code className="one-click-cmd">{oneClickCommand}</code>
              <Button
                type="primary"
                icon={copiedKey === 'deploy' ? <CheckCircleOutlined /> : <CopyOutlined />}
                onClick={() => copy('deploy', oneClickCommand)}
              >
                复制
              </Button>
            </div>

            <Alert
              type="info"
              showIcon
              message={platform === 'windows' ? '在 PowerShell 中以管理员身份运行' : '在 Terminal 中运行'}
              description={`脚本使用清华/阿里云镜像源安装 Python 依赖和模型；Windows 准备完成后不会自动启动服务，可用 voxcpm-start、voxcpm-stop、voxcpm-restart 和 voxcpm-status 管理本地 Gradio 服务。${latencyDisclaimer}`}
            />
          </section>

          {libraryPanel}
        </div>
      )}
    </section>
  )
}

interface VoiceRecordListProps {
  records: VoiceGenerationRecord[]
  lastGeneratedId: string | null
  onLoad: (record: VoiceGenerationRecord) => void
  onClone: (record: VoiceGenerationRecord) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onToggleFavorite: (id: string) => void
}

function VoiceRecordList({
  records,
  lastGeneratedId,
  onLoad,
  onClone,
  onDelete,
  onRename,
  onToggleFavorite,
}: VoiceRecordListProps) {
  if (records.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有生成音频" />
  }

  return (
    <div className="voice-record-list">
      {records.map((record) => {
        const mode = voiceModeMeta.find((item) => item.id === record.params.mode)?.label ?? '语音'
        return (
          <article key={record.id} className={record.id === lastGeneratedId ? 'voice-record is-new' : 'voice-record'}>
            <div className="record-heading">
              <Input
                value={record.name}
                aria-label="音频名称"
                onChange={(e) => onRename(record.id, e.target.value)}
              />
              <Button
                type="text"
                icon={record.favorite ? <StarFilled /> : <StarOutlined />}
                onClick={() => onToggleFavorite(record.id)}
                aria-label={record.favorite ? '取消收藏音频' : '收藏音频'}
              />
            </div>

            <div className="record-meta">
              <Tag>{mode}</Tag>
              <span>{new Date(record.createdAt).toLocaleString()}</span>
            </div>

            <audio controls src={record.audioUrl} />

            <p className="record-text">{record.params.text}</p>

            <div className="record-actions">
              <Button size="small" onClick={() => onLoad(record)}>载入参数</Button>
              <Button size="small" disabled={!record.audioPath} onClick={() => onClone(record)}>克隆音频</Button>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(record.id)}>删除</Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
