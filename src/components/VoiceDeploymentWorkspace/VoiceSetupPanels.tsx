import { Alert, Button, Input, Segmented } from 'antd'
import { CheckCircleOutlined, CopyOutlined, DesktopOutlined, ThunderboltOutlined } from '@ant-design/icons'

import {
  type DeviceType,
  type DownloadSource,
  type HardwareEvaluation,
  type ModelVersion,
  type Platform,
  downloadSources,
  gpuCheckCommand,
  latencyDisclaimer,
  voxcpmModels,
} from './voiceDeploymentModel'

const deviceOptions: Array<{ label: string; value: DeviceType }> = [
  { label: 'NVIDIA GPU', value: 'nvidia' },
  { label: 'Apple Silicon', value: 'apple' },
  { label: 'CPU', value: 'cpu' },
]

const platformOptions: Array<{ label: string; value: Platform }> = [
  { label: 'Windows', value: 'windows' },
  { label: 'macOS / Linux', value: 'mac' },
]

const modelOptions = voxcpmModels.map((m) => ({
  label: `${m.id} · 约 ${m.vramGb}GB`,
  value: m.id,
}))

const sourceOptions = downloadSources.map((s) => ({
  label: s.label,
  value: s.id,
}))

interface VoiceSetupPanelsProps {
  deviceType: DeviceType
  gpuInput: string
  hardware: HardwareEvaluation
  alertType: 'error' | 'success' | 'warning' | 'info'
  copiedKey: string | null
  platform: Platform
  selectedModel: ModelVersion
  downloadSource: DownloadSource
  modelPath: string
  modelPathValid: boolean
  oneClickCommand: string
  onDeviceTypeChange: (deviceType: DeviceType) => void
  onGpuInputChange: (gpuInput: string) => void
  onPlatformChange: (platform: Platform) => void
  onModelChange: (model: ModelVersion) => void
  onDownloadSourceChange: (source: DownloadSource) => void
  onModelPathChange: (modelPath: string) => void
  onCopy: (key: string, text: string) => void
}

export function VoiceSetupPanels({
  deviceType,
  gpuInput,
  hardware,
  alertType,
  copiedKey,
  platform,
  selectedModel,
  downloadSource,
  modelPath,
  modelPathValid,
  oneClickCommand,
  onDeviceTypeChange,
  onGpuInputChange,
  onPlatformChange,
  onModelChange,
  onDownloadSourceChange,
  onModelPathChange,
  onCopy,
}: VoiceSetupPanelsProps) {
  return (
    <>
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
          onChange={(v) => onDeviceTypeChange(v as DeviceType)}
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
                onClick={() => onCopy('gpu', gpuCheckCommand)}
              >
                复制
              </Button>
            </div>
            <Input.TextArea
              value={gpuInput}
              onChange={(e) => onGpuInputChange(e.target.value)}
              placeholder="NVIDIA GeForce RTX 3060, 12288"
              rows={3}
            />
          </>
        )}

        <Alert
          className="status-alert"
          type={alertType}
          title={hardware.title}
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
          onChange={(v) => onPlatformChange(v as Platform)}
        />

        <div className="model-select">
          <span className="model-select-label">模型版本</span>
          <Segmented
            value={selectedModel}
            options={modelOptions}
            onChange={(v) => onModelChange(v as ModelVersion)}
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
    </>
  )
}
