import { Alert, Button, Input, Segmented, Select, Tag } from 'antd'
import {
  CheckCircleOutlined,
  FolderOpenOutlined,
  LoginOutlined,
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
  desktopHfLoginBusy: boolean
  desktopHfLoginResult: DesktopStableAudioSetupResult | null
  desktopHfLoginError: string
  desktopDependencyStatusBusy: boolean
  desktopDependencyStatusResult: DesktopCommandResult | null
  desktopServiceBusy: boolean
  desktopServiceResult: DesktopCommandResult | null
  dependenciesReady: boolean
  installedModelIds: StableAudioModelId[]
  missingModelIds: StableAudioModelId[]
  onModelChange: (model: StableAudioModelId) => void
  onDownloadSourceChange: (source: DownloadSource) => void
  onModelPathChange: (modelPath: string) => void
  onOpenModelPath: () => void
  onPortInputChange: (portInput: string) => void
  onApplyPort: () => void
  onRunCheck: () => void
  onRunDesktopSetup: (model?: StableAudioModelId) => void
  onRunDesktopHfLogin: () => void
  onQueryDesktopDependencyStatus: () => void
  onStartDesktopService: () => void
  onControlDesktopService: (action: StableAudioServiceAction) => void
}

const sourceOptions = downloadSources.map((source) => ({
  label: source.label,
  value: source.id,
}))

function renderCommandDescription(output: string) {
  if (!output) return '没有返回详细信息。'
  const parts = output.split(/(https?:\/\/[^\s]+)/g)
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, index) => (
        /^https?:\/\//.test(part)
          ? (
              <a key={`${part}:${index}`} href={part} target="_blank" rel="noreferrer">
                {part}
              </a>
            )
          : <span key={`${part}:${index}`}>{part}</span>
      ))}
    </span>
  )
}

function commandAlert(result: DesktopCommandResult | null, successTitle: string, warningTitle: string) {
  if (!result) return null
  return (
    <Alert
      type={result.ok ? 'success' : 'warning'}
      showIcon
      title={result.ok ? successTitle : warningTitle}
      description={renderCommandDescription(result.output)}
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
  desktopHfLoginBusy,
  desktopHfLoginResult,
  desktopHfLoginError,
  desktopDependencyStatusBusy,
  desktopDependencyStatusResult,
  desktopServiceBusy,
  desktopServiceResult,
  dependenciesReady,
  installedModelIds,
  missingModelIds,
  onModelChange,
  onDownloadSourceChange,
  onModelPathChange,
  onOpenModelPath,
  onPortInputChange,
  onApplyPort,
  onRunCheck,
  onRunDesktopSetup,
  onRunDesktopHfLogin,
  onQueryDesktopDependencyStatus,
  onStartDesktopService,
  onControlDesktopService,
}: SoundEffectSetupPanelProps) {
  const modelOptions = stableAudioModels.map((model) => ({
    label: `${model.label} · ${model.id}`,
    value: model.id,
  }))
  const installedModels = stableAudioModels.filter((model) => installedModelIds.includes(model.id))
  const missingModels = stableAudioModels.filter((model) => missingModelIds.includes(model.id))
  const missingModelOptions = missingModels.map((model) => ({
    label: `${model.label} · ${model.id}`,
    value: model.id,
  }))
  const installTarget = missingModelIds.includes(selectedModel)
    ? selectedModel
    : missingModels[0]?.id
  const connectionTag = {
    idle: <Tag>未检测</Tag>,
    checking: <Tag icon={<LoadingOutlined />} color="blue">检测中</Tag>,
    connected: <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>,
    disconnected: <Tag color="error">未连接</Tag>,
  }[connectionStatus]
  const selectedDownloadSource = downloadSources.find((source) => source.id === downloadSource)
  const setupActionButtons = (
    <>
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
        onClick={() => onRunDesktopSetup()}
      >
        安装依赖
      </Button>
      <Button
        icon={<LoginOutlined />}
        loading={desktopHfLoginBusy}
        disabled={!desktopRuntime || desktopHfLoginBusy}
        onClick={onRunDesktopHfLogin}
      >
        登录 HuggingFace
      </Button>
      <Button
        icon={<PlayCircleOutlined />}
        loading={desktopServiceBusy}
        disabled={!desktopRuntime || desktopServiceBusy || connected || connectionStatus === 'checking'}
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
        disabled={!desktopRuntime || desktopServiceBusy || !connected || connectionStatus === 'checking'}
        onClick={() => onControlDesktopService('stop')}
      >
        停止服务
      </Button>
    </>
  )

  return (
    <section
      className={`voice-panel sound-setup-panel${dependenciesReady ? ' sound-setup-panel-compact' : ''}`}
      aria-labelledby="sound-setup-title"
    >
      <div className="panel-title sound-setup-title-row">
        <div className="sound-setup-title-main">
          <SoundOutlined />
          <h3 id="sound-setup-title">Stable Audio 3 本机服务</h3>
          {dependenciesReady ? <Tag color="success">依赖已安装</Tag> : null}
        </div>
        {!dependenciesReady ? (
          <div className="sound-setup-title-actions" aria-label="Stable Audio 3 服务控制">
            <span className="sound-setup-title-actions-label">
              <ThunderboltOutlined />
              <span>安装与服务</span>
            </span>
            <div className="desktop-boost-actions">
              {setupActionButtons}
            </div>
          </div>
        ) : null}
      </div>

      {dependenciesReady ? (
        <div className="sound-compact-service">
          <div className="sound-compact-service-toolbar">
            <div className="sound-service-address">
              <span className="model-select-label">服务</span>
              <code>{serviceUrl}</code>
              {connectionTag}
            </div>
            <div className="sound-model-status-line sound-model-status-inline">
              <span className="model-select-label">已安装模型</span>
              <span>{installedModels.map((model) => model.id).join('、') || '无'}</span>
            </div>
            <div className="sound-model-install-row">
              <span className="model-select-label">未安装模型</span>
              {missingModels.length > 0 ? (
                <>
                  <Select
                    value={installTarget}
                    options={missingModelOptions}
                    onChange={(value) => onModelChange(value)}
                    className="sound-install-model-select"
                  />
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    loading={desktopSetupBusy}
                    disabled={!desktopRuntime || desktopSetupBusy || !installTarget}
                    onClick={() => installTarget ? onRunDesktopSetup(installTarget) : undefined}
                  >
                    安装模型
                  </Button>
                </>
              ) : (
                <Tag color="success">无</Tag>
              )}
            </div>
            <div className="compact-service-controls">
              <Button
                icon={<PlayCircleOutlined />}
                loading={desktopServiceBusy}
                disabled={!desktopRuntime || desktopServiceBusy || connected || connectionStatus === 'checking'}
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
                disabled={!desktopRuntime || desktopServiceBusy || !connected || connectionStatus === 'checking'}
                onClick={() => onControlDesktopService('stop')}
              >
                停止服务
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="sound-setup-grid">
            <div className="sound-setup-field sound-service-field">
              <span className="model-select-label">服务地址</span>
              <div className="sound-service-compact-row">
                <code>{serviceUrl}</code>
                <Input
                  value={portInput}
                  onChange={(event) => onPortInputChange(event.target.value)}
                  onPressEnter={onApplyPort}
                  onBlur={onApplyPort}
                  addonBefore="端口"
                  className="sound-port-input"
                />
                {connectionTag}
              </div>
            </div>

            <div className="sound-setup-field sound-model-select-field">
              <span className="model-select-label">模型</span>
              <Segmented
                value={selectedModel}
                options={modelOptions}
                onChange={(value) => onModelChange(value as StableAudioModelId)}
              />
            </div>

            <div className="sound-setup-field sound-download-source-field">
              <span className="model-select-label">下载源</span>
              <Segmented
                value={downloadSource}
                options={sourceOptions}
                onChange={(value) => onDownloadSourceChange(value as DownloadSource)}
              />
            </div>

            <div className="sound-setup-field sound-model-path-field">
              <span className="model-select-label">模型路径</span>
              <div className="sound-model-path-row">
                <Input
                  value={modelPath}
                  onChange={(event) => onModelPathChange(event.target.value)}
                  placeholder="D:\\models\\StableAudio3"
                />
                <Button
                  icon={<FolderOpenOutlined />}
                  disabled={!desktopRuntime || !modelPath.trim()}
                  onClick={onOpenModelPath}
                >
                  打开文件夹
                </Button>
              </div>
            </div>

            <dl className="sound-model-detail-grid">
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
              <div>
                <dt>下载源</dt>
                <dd>{selectedDownloadSource?.label ?? downloadSource}</dd>
              </div>
            </dl>

            <p className="model-select-note sound-setup-hint">
              {selectedModelMeta.note}
              {selectedDownloadSource?.note ? ` 下载源：${selectedDownloadSource.note}` : ''}
            </p>
          </div>

          <p className="field-note">
            当前端口 {port}。small-sfx 适合音效默认生成，small-music 适合 loop 和短音乐，medium 需要 CUDA GPU。
          </p>
        </>
      )}

      {!desktopRuntime ? (
        <Alert type="warning" showIcon title="当前是 Web 运行环境" description="安装、检测模型和服务控制需要从 Windows 桌面应用启动。" />
      ) : null}
      {desktopSetupResult ? (
        <Alert type="success" showIcon title="安装终端已打开" description={`脚本路径：${desktopSetupResult.scriptPath}`} />
      ) : null}
      {desktopSetupError ? (
        <Alert type="error" showIcon title="安装依赖启动失败" description={desktopSetupError} />
      ) : null}
      {desktopHfLoginResult ? (
        <Alert type="success" showIcon title="HuggingFace 登录终端已打开" description={`脚本路径：${desktopHfLoginResult.scriptPath}`} />
      ) : null}
      {desktopHfLoginError ? (
        <Alert type="error" showIcon title="HuggingFace 登录终端启动失败" description={desktopHfLoginError} />
      ) : null}
      {!dependenciesReady ? commandAlert(desktopDependencyStatusResult, '依赖和模型检测完成', '依赖或模型尚未就绪') : null}
      {commandAlert(desktopServiceResult, desktopServiceBusy ? '服务启动中' : connected ? '服务已就绪' : '服务命令已执行', '服务未就绪')}
    </section>
  )
}
