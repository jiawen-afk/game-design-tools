import { Button, Input, Segmented, Tag } from 'antd'
import {
  CheckCircleOutlined,
  FolderOpenOutlined,
  LoadingOutlined,
  SoundOutlined,
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
import {
  SoundEffectSetupActions,
  type StableAudioServiceAction,
} from './SoundEffectSetupActions'
import { SoundEffectSetupStatus } from './SoundEffectSetupStatus'
import { SoundEffectModelInstallPanel } from './SoundEffectModelInstallPanel'

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
  const sourceOptions = downloadSources.map((source) => ({
    label: source.label,
    value: source.id,
  }))
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
  const selectedDownloadSource = downloadSources.find((source) => source.id === downloadSource)

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
            <SoundEffectSetupActions
              connected={connected}
              connectionStatus={connectionStatus}
              desktopDependencyStatusBusy={desktopDependencyStatusBusy}
              desktopHfLoginBusy={desktopHfLoginBusy}
              desktopRuntime={desktopRuntime}
              desktopServiceBusy={desktopServiceBusy}
              desktopSetupBusy={desktopSetupBusy}
              variant="title"
              onControlDesktopService={onControlDesktopService}
              onQueryDesktopDependencyStatus={onQueryDesktopDependencyStatus}
              onRunCheck={onRunCheck}
              onRunDesktopHfLogin={onRunDesktopHfLogin}
              onRunDesktopSetup={onRunDesktopSetup}
              onStartDesktopService={onStartDesktopService}
            />
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
            <SoundEffectModelInstallPanel
              desktopRuntime={desktopRuntime}
              desktopSetupBusy={desktopSetupBusy}
              installedModelIds={installedModelIds}
              missingModelIds={missingModelIds}
              selectedModel={selectedModel}
              stableAudioModels={stableAudioModels}
              onModelChange={onModelChange}
              onRunDesktopSetup={onRunDesktopSetup}
            />
            <SoundEffectSetupActions
              connected={connected}
              connectionStatus={connectionStatus}
              desktopDependencyStatusBusy={desktopDependencyStatusBusy}
              desktopHfLoginBusy={desktopHfLoginBusy}
              desktopRuntime={desktopRuntime}
              desktopServiceBusy={desktopServiceBusy}
              desktopSetupBusy={desktopSetupBusy}
              variant="compact"
              onControlDesktopService={onControlDesktopService}
              onQueryDesktopDependencyStatus={onQueryDesktopDependencyStatus}
              onRunCheck={onRunCheck}
              onRunDesktopHfLogin={onRunDesktopHfLogin}
              onRunDesktopSetup={onRunDesktopSetup}
              onStartDesktopService={onStartDesktopService}
            />
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

      <SoundEffectSetupStatus
        connected={connected}
        dependenciesReady={dependenciesReady}
        desktopDependencyStatusResult={desktopDependencyStatusResult}
        desktopHfLoginError={desktopHfLoginError}
        desktopHfLoginResult={desktopHfLoginResult}
        desktopRuntime={desktopRuntime}
        desktopServiceBusy={desktopServiceBusy}
        desktopServiceResult={desktopServiceResult}
        desktopSetupError={desktopSetupError}
        desktopSetupResult={desktopSetupResult}
      />
    </section>
  )
}
