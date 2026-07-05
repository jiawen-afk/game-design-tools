import { Alert, Button, Input, Segmented, Tag } from 'antd'
import {
  CheckCircleOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SearchOutlined,
  SoundOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

import type { DesktopCommandResult, DesktopStableAudioSetupResult } from '../../desktopApi'
import {
  downloadSources,
  type DownloadSource,
} from './voiceDeploymentModel'
import type {
  StableAudioConnectionStatus,
  StableAudioModelId,
  StableAudioModelMeta,
} from './soundEffectModel'

type StableAudioServiceAction = 'start' | 'stop' | 'restart' | 'status'

interface SoundEffectSetupPanelProps {
  stableAudioModels: StableAudioModelMeta[]
  selectedModel: StableAudioModelId
  selectedModelMeta: StableAudioModelMeta
  downloadSource: DownloadSource
  modelPath: string
  port: number
  portInput: string
  serviceUrl: string
  connectionStatus: StableAudioConnectionStatus
  connected: boolean
  desktopRuntime: boolean
  desktopSetupBusy: boolean
  desktopSetupResult: DesktopStableAudioSetupResult | null
  desktopSetupError: string
  desktopDependencyStatusBusy: boolean
  desktopDependencyStatusResult: DesktopCommandResult | null
  desktopServiceBusy: boolean
  desktopServiceResult: DesktopCommandResult | null
  onModelChange: (model: StableAudioModelId) => void
  onDownloadSourceChange: (source: DownloadSource) => void
  onModelPathChange: (modelPath: string) => void
  onPortInputChange: (portInput: string) => void
  onApplyPort: () => void
  onRunCheck: () => void
  onRunDesktopSetup: () => void
  onQueryDesktopDependencyStatus: () => void
  onStartDesktopService: () => void
  onControlDesktopService: (action: StableAudioServiceAction) => void
}

const sourceOptions = downloadSources.map((source) => ({
  label: source.label,
  value: source.id,
}))

function commandAlert(result: DesktopCommandResult | null, successTitle: string, warningTitle: string) {
  if (!result) return null
  return (
    <Alert
      type={result.ok ? 'success' : 'warning'}
      showIcon
      title={result.ok ? successTitle : warningTitle}
      description={result.output || '没有返回详细信息。'}
    />
  )
}

export function SoundEffectSetupPanel({
  stableAudioModels,
  selectedModel,
  selectedModelMeta,
  downloadSource,
  modelPath,
  port,
  portInput,
  serviceUrl,
  connectionStatus,
  connected,
  desktopRuntime,
  desktopSetupBusy,
  desktopSetupResult,
  desktopSetupError,
  desktopDependencyStatusBusy,
  desktopDependencyStatusResult,
  desktopServiceBusy,
  desktopServiceResult,
  onModelChange,
  onDownloadSourceChange,
  onModelPathChange,
  onPortInputChange,
  onApplyPort,
  onRunCheck,
  onRunDesktopSetup,
  onQueryDesktopDependencyStatus,
  onStartDesktopService,
  onControlDesktopService,
}: SoundEffectSetupPanelProps) {
  const modelOptions = stableAudioModels.map((model) => ({
    label: `${model.label} · ${model.id}`,
    value: model.id,
  }))
  const connectionTag = {
    idle: <Tag>未检测</Tag>,
    checking: <Tag icon={<LoadingOutlined />} color="blue">检测中</Tag>,
    connected: <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>,
    disconnected: <Tag color="error">未连接</Tag>,
  }[connectionStatus]

  return (
    <section className="voice-panel sound-setup-panel" aria-labelledby="sound-setup-title">
      <div className="panel-title">
        <SoundOutlined />
        <h3 id="sound-setup-title">Stable Audio 3 本机服务</h3>
      </div>

      <div className="sound-service-row">
        <div>
          <span className="model-select-label">服务地址</span>
          <code>{serviceUrl}</code>
        </div>
        <Input
          value={portInput}
          onChange={(event) => onPortInputChange(event.target.value)}
          onPressEnter={onApplyPort}
          onBlur={onApplyPort}
          addonBefore="端口"
          style={{ width: 152 }}
        />
        {connectionTag}
      </div>

      <div className="model-select">
        <span className="model-select-label">模型</span>
        <Segmented
          value={selectedModel}
          options={modelOptions}
          onChange={(value) => onModelChange(value as StableAudioModelId)}
        />
        <dl className="sound-model-meta">
          <div>
            <dt>参数</dt>
            <dd>{selectedModelMeta.parameterCount}</dd>
          </div>
          <div>
            <dt>硬件</dt>
            <dd>{selectedModelMeta.hardware}</dd>
          </div>
          <div>
            <dt>最长</dt>
            <dd>{selectedModelMeta.maxDurationSeconds}s</dd>
          </div>
          <div>
            <dt>适用</dt>
            <dd>{selectedModelMeta.recommendedUse}</dd>
          </div>
        </dl>
        <p className="model-select-note">{selectedModelMeta.note}</p>
      </div>

      <div className="model-select">
        <span className="model-select-label">下载源</span>
        <Segmented
          value={downloadSource}
          options={sourceOptions}
          onChange={(value) => onDownloadSourceChange(value as DownloadSource)}
        />
        <p className="model-select-note">
          {downloadSources.find((source) => source.id === downloadSource)?.note}
        </p>
      </div>

      <Input
        value={modelPath}
        onChange={(event) => onModelPathChange(event.target.value)}
        placeholder="D:\\models\\StableAudio3"
      />

      <div className="desktop-boost" aria-label="Stable Audio 3 服务控制">
        <div className="desktop-boost-title">
          <ThunderboltOutlined />
          <span>安装与服务</span>
        </div>
        <div className="desktop-boost-actions">
          <Button icon={<SearchOutlined />} onClick={onRunCheck} disabled={connectionStatus === 'checking'}>
            检测服务
          </Button>
          <Button
            icon={<SearchOutlined />}
            loading={desktopDependencyStatusBusy}
            disabled={!desktopRuntime || desktopDependencyStatusBusy}
            onClick={onQueryDesktopDependencyStatus}
          >
            检测依赖和模型
          </Button>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={desktopSetupBusy}
            disabled={!desktopRuntime || desktopSetupBusy}
            onClick={onRunDesktopSetup}
          >
            安装依赖
          </Button>
          <Button
            icon={<PlayCircleOutlined />}
            loading={desktopServiceBusy}
            disabled={!desktopRuntime || desktopServiceBusy || connected}
            onClick={onStartDesktopService}
          >
            启动服务
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={desktopServiceBusy}
            disabled={!desktopRuntime || desktopServiceBusy}
            onClick={() => onControlDesktopService('restart')}
          >
            重启服务
          </Button>
          <Button
            danger
            icon={<PoweroffOutlined />}
            loading={desktopServiceBusy}
            disabled={!desktopRuntime || desktopServiceBusy}
            onClick={() => onControlDesktopService('stop')}
          >
            停止服务
          </Button>
        </div>
      </div>

      {!desktopRuntime ? (
        <Alert type="warning" showIcon title="当前是 Web 运行环境" description="安装、检测模型和服务控制需要从 Windows 桌面应用启动。" />
      ) : null}
      {desktopSetupResult ? (
        <Alert type="success" showIcon title="安装终端已打开" description={`脚本路径：${desktopSetupResult.scriptPath}`} />
      ) : null}
      {desktopSetupError ? (
        <Alert type="error" showIcon title="安装依赖启动失败" description={desktopSetupError} />
      ) : null}
      {commandAlert(desktopDependencyStatusResult, '依赖和模型检测完成', '依赖或模型尚未就绪')}
      {commandAlert(desktopServiceResult, desktopServiceBusy ? '服务启动中' : connected ? '服务已就绪' : '服务命令已执行', '服务未就绪')}
      <p className="field-note">
        当前端口 {port}。small-sfx 适合音效默认生成，small-music 适合 loop 和短音乐，medium 需要 CUDA GPU。
      </p>
    </section>
  )
}
