import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, message, Modal, Select, Tag } from 'antd'
import {
  CheckCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons'

import './voiceDeploymentWorkspace.css'
import {
  type ConnectionStatus,
  type DeviceType,
  type DownloadSource,
  type HardwareReport,
  type ModelVersion,
  type Platform,
  type VoiceAdvancedParams,
  type VoiceGenerationMode,
  type VoiceGenerationParams,
  type VoiceGenerationRecord,
  buildGradioApiCall,
  buildOneClickCommand,
  buildServiceUrl,
  cloneVoiceParams,
  createVoiceRecordName,
  defaultPort,
  defaultVoiceGenerationParams,
  deleteVoiceRecord,
  evaluateHardware,
  parseNvidiaSmiReport,
  prepareCloneFromRecord,
  updateRecordName,
  validateModelPath,
  voiceModeMeta,
} from './voiceDeploymentModel'
import {
  readPersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  checkConnection,
  generateVoiceAudio,
  uploadReferenceAudio,
} from './voiceDeploymentService'
import { readStoredRecords, writeStoredRecords } from './voiceRecordStorage'
import {
  collectVoiceRecordToPersonalSpace,
  type VoiceCollectLinkTarget,
} from './voicePersonalSpaceCollector'
import { VoiceGenerationPanel } from './VoiceGenerationPanel'
import { VoiceLibraryPanel } from './VoiceLibraryPanel'
import { VoiceSetupPanels } from './VoiceSetupPanels'
import { useVoiceCollectLinkDialog } from './useVoiceCollectLinkDialog'

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function VoiceDeploymentWorkspace() {
  const [messageApi, messageContextHolder] = message.useMessage()
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
  const [personalSpaceSnapshot, setPersonalSpaceSnapshot] = useState(() => readPersonalSpaceState())
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
  const personalSpaceVoiceAssets = personalSpaceSnapshot.assets.filter((asset) => asset.kind === 'voice')
  const characterLinkOptions = personalSpaceSnapshot.characters.map((character) => ({ label: character.name, value: character.id }))
  const effectLinkOptions = personalSpaceSnapshot.assets
    .filter((asset) => asset.kind === 'effect')
    .map((asset) => ({ label: asset.name, value: asset.id }))
  const storyboardLinkOptions = personalSpaceSnapshot.storyboardGroups.map((group) => ({ label: group.name, value: group.id }))

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

  const selectReferenceFile = (file: File) => {
    setPendingReferenceFile(file)
    updateParams({
      referenceAudioName: file.name,
      referenceAudioPath: null,
    })
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

      const audio = await generateVoiceAudio(serviceUrl, paramsForRequest)
      const record: VoiceGenerationRecord = {
        id: randomId(),
        name: createVoiceRecordName(paramsForRequest, records.length + 1),
        createdAt: new Date().toISOString(),
        audioUrl: audio.audioUrl,
        audioPath: audio.audioPath,
        params: cloneVoiceParams(paramsForRequest),
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

  const collectRecordToPersonalSpace = useCallback(async (
    record: VoiceGenerationRecord,
    link?: { target: VoiceCollectLinkTarget; targetId: string },
  ) => {
    try {
      const nextSpace = await collectVoiceRecordToPersonalSpace(record, link)
      setPersonalSpaceSnapshot(nextSpace)
      const linkLabel = link?.target === 'character' ? '并关联角色'
        : link?.target === 'effect' ? '并关联特效'
        : link?.target === 'storyboard' ? '并关联剧情'
        : ''
      void messageApi.success(`已收藏到个人空间${linkLabel}`)
    } catch {
      void messageApi.error('收藏到个人空间失败，请检查浏览器存储权限。')
    }
  }, [messageApi])

  const {
    pendingCollectLink,
    collectLinkMeta,
    openCollectLinkDialog,
    closeCollectLinkDialog,
    updateCollectLinkTargetId,
    confirmCollectLink,
  } = useVoiceCollectLinkDialog({
    characterLinkOptions,
    effectLinkOptions,
    storyboardLinkOptions,
    onOpen: () => setPersonalSpaceSnapshot(readPersonalSpaceState()),
    onConfirm: (record, link) => void collectRecordToPersonalSpace(record, link),
  })

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

  return (
    <section className="voice-workspace" aria-labelledby="voice-workspace-title">
      {messageContextHolder}
      <Modal
        title={collectLinkMeta?.title}
        open={Boolean(pendingCollectLink)}
        okText="收藏并关联"
        cancelText="取消"
        okButtonProps={{ disabled: !pendingCollectLink?.targetId }}
        onOk={confirmCollectLink}
        onCancel={closeCollectLinkDialog}
      >
        {collectLinkMeta && (
          <div className="modal-grid">
            <label className="form-field">
              <span className="field-label">{collectLinkMeta.label}</span>
              <Select
                value={pendingCollectLink?.targetId}
                options={collectLinkMeta.options}
                placeholder={collectLinkMeta.label}
                notFoundContent={collectLinkMeta.empty}
                onChange={updateCollectLinkTargetId}
              />
            </label>
            <p className="field-note">会先把当前配音收藏到个人空间，再建立这条关联。</p>
          </div>
        )}
      </Modal>
      <div className="voice-hero">
        <div>
          <p className="kicker">本地语音部署</p>
          <h2 id="voice-workspace-title">配音工作台</h2>
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
          <VoiceGenerationPanel
            voiceParams={voiceParams}
            selectedModeNote={selectedMode.note}
            generationError={generationError}
            generating={generating}
            canGenerate={canGenerate}
            copiedKey={copiedKey}
            onModeChange={setMode}
            onParamsChange={updateParams}
            onAdvancedChange={updateAdvanced}
            onReferenceFileSelected={selectReferenceFile}
            onGenerate={() => void generateVoice()}
            onResetParams={() => setVoiceParams(cloneVoiceParams(defaultVoiceGenerationParams))}
            onCopyApiExample={() => void copy('api', apiCallExample)}
          />

          <VoiceLibraryPanel
            records={records}
            lastGeneratedId={lastGeneratedId}
            personalSpaceVoiceAssets={personalSpaceVoiceAssets}
            onLoad={loadParams}
            onClone={cloneFromRecord}
            onDelete={deleteRecord}
            onRename={renameRecord}
            onCollect={(record) => void collectRecordToPersonalSpace(record)}
            onCollectWithLink={openCollectLinkDialog}
          />
        </div>
      ) : (
        <div className="voice-grid">
          <VoiceSetupPanels
            deviceType={deviceType}
            gpuInput={gpuInput}
            hardware={hardware}
            alertType={alertType}
            copiedKey={copiedKey}
            platform={platform}
            selectedModel={selectedModel}
            downloadSource={downloadSource}
            modelPath={modelPath}
            modelPathValid={modelValidation.valid}
            oneClickCommand={oneClickCommand}
            onDeviceTypeChange={setDeviceType}
            onGpuInputChange={setGpuInput}
            onPlatformChange={setPlatform}
            onModelChange={(model) => { setSelectedModel(model); setModelTouched(true) }}
            onDownloadSourceChange={setDownloadSource}
            onModelPathChange={setModelPath}
            onCopy={(key, text) => void copy(key, text)}
          />

          <VoiceLibraryPanel
            records={records}
            lastGeneratedId={lastGeneratedId}
            personalSpaceVoiceAssets={personalSpaceVoiceAssets}
            onLoad={loadParams}
            onClone={cloneFromRecord}
            onDelete={deleteRecord}
            onRename={renameRecord}
            onCollect={(record) => void collectRecordToPersonalSpace(record)}
            onCollectWithLink={openCollectLinkDialog}
          />
        </div>
      )}
    </section>
  )
}
