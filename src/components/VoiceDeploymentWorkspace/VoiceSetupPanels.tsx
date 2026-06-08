import { Alert, Button, Input, Segmented } from 'antd'
import { CheckCircleOutlined, CopyOutlined, ThunderboltOutlined } from '@ant-design/icons'

import {
  type DownloadSource,
  type ModelVersion,
  type Platform,
  downloadSources,
  latencyDisclaimer,
  voxcpmModels,
} from './voiceDeploymentModel'

const disabledPlatformValues = new Set<Platform>(['mac'])
const disabledModelIds = new Set<ModelVersion>(['VoxCPM1.5', 'VoxCPM-0.5B'])

const platformOptions: Array<{ label: string; value: Platform; disabled?: boolean }> = [
  { label: 'Windows', value: 'windows' },
  { label: 'macOS / Linux', value: 'mac', disabled: disabledPlatformValues.has('mac') },
]

const modelOptions: Array<{ label: string; value: ModelVersion; disabled?: boolean }> = [
  { label: 'VoxCPM2 · 约 8GB', value: 'VoxCPM2', disabled: disabledModelIds.has('VoxCPM2') },
  { label: 'VoxCPM1.5 · 约 6GB', value: 'VoxCPM1.5', disabled: disabledModelIds.has('VoxCPM1.5') },
  { label: 'VoxCPM-0.5B · 约 5GB', value: 'VoxCPM-0.5B', disabled: disabledModelIds.has('VoxCPM-0.5B') },
]

const sourceOptions = downloadSources.map((s) => ({
  label: s.label,
  value: s.id,
}))

interface VoiceSetupPanelsProps {
  copiedKey: string | null
  platform: Platform
  selectedModel: ModelVersion
  downloadSource: DownloadSource
  modelPath: string
  modelPathValid: boolean
  oneClickCommand: string
  onPlatformChange: (platform: Platform) => void
  onModelChange: (model: ModelVersion) => void
  onDownloadSourceChange: (source: DownloadSource) => void
  onModelPathChange: (modelPath: string) => void
  onCopy: (key: string, text: string) => void
}

export function VoiceSetupPanels({
  copiedKey,
  platform,
  selectedModel,
  downloadSource,
  modelPath,
  modelPathValid,
  oneClickCommand,
  onPlatformChange,
  onModelChange,
  onDownloadSourceChange,
  onModelPathChange,
  onCopy,
}: VoiceSetupPanelsProps) {
  return (
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
          onChange={(v) => {
            const nextPlatform = v as Platform
            if (!disabledPlatformValues.has(nextPlatform)) onPlatformChange(nextPlatform)
          }}
        />

        <div className="model-select">
          <span className="model-select-label">模型版本</span>
          <Segmented
            value={selectedModel}
            options={modelOptions}
            onChange={(v) => {
              const nextModel = v as ModelVersion
              if (!disabledModelIds.has(nextModel)) onModelChange(nextModel)
            }}
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
            onChange={(v) => onDownloadSourceChange(v as DownloadSource)}
          />
          <p className="model-select-note">
            {downloadSources.find((s) => s.id === downloadSource)?.note}
          </p>
        </div>

        <Input
          value={modelPath}
          onChange={(e) => onModelPathChange(e.target.value)}
          placeholder={platform === 'windows' ? 'D:\\models\\VoxCPM2（留空则自动下载）' : '/data/models/VoxCPM2（留空则自动下载）'}
          status={modelPath && !modelPathValid ? 'warning' : undefined}
        />

        <div className="command-row">
          <code className="one-click-cmd">{oneClickCommand}</code>
          <Button
            type="primary"
            icon={copiedKey === 'deploy' ? <CheckCircleOutlined /> : <CopyOutlined />}
            onClick={() => onCopy('deploy', oneClickCommand)}
          >
            复制
          </Button>
        </div>

        <Alert
          type="info"
          showIcon
          title={platform === 'windows' ? '在 PowerShell 中以管理员身份运行' : '在 Terminal 中运行'}
          description={`脚本使用清华/阿里云镜像源安装 Python 依赖和模型；Windows 准备完成后不会自动启动服务，可用 voxcpm-start、voxcpm-stop、voxcpm-restart 和 voxcpm-status 管理本地 Gradio 服务。${latencyDisclaimer}`}
        />
      </section>
  )
}
