import { Alert, Button, Input, Segmented } from 'antd'
import { DesktopOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons'

import {
  type DownloadSource,
  type HardwareEvaluation,
  type HardwareReport,
  type ModelVersion,
  downloadSources,
  latencyDisclaimer,
  voxcpmModels,
} from './voiceDeploymentModel'
import type { DesktopCommandResult, DesktopVoxcpmSetupResult } from '../../desktopApi'

const disabledModelIds = new Set<ModelVersion>(['VoxCPM1.5', 'VoxCPM-0.5B'])

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
  selectedModel: ModelVersion
  downloadSource: DownloadSource
  modelPath: string
  modelPathValid: boolean
  desktopRuntime: boolean
  desktopHardware: HardwareReport | null
  desktopHardwareEvaluation: HardwareEvaluation | null
  desktopHardwareBusy: boolean
  desktopSetupBusy: boolean
  desktopSetupResult: DesktopVoxcpmSetupResult | null
  desktopSetupError: string
  desktopDependencyStatusBusy: boolean
  desktopDependencyStatusResult: DesktopCommandResult | null
  onModelChange: (model: ModelVersion) => void
  onDownloadSourceChange: (source: DownloadSource) => void
  onModelPathChange: (modelPath: string) => void
  onDetectDesktopHardware: () => void
  onRunDesktopSetup: () => void
  onQueryDesktopDependencyStatus: () => void
}

export function VoiceSetupPanels({
  selectedModel,
  downloadSource,
  modelPath,
  modelPathValid,
  desktopRuntime,
  desktopHardware,
  desktopHardwareEvaluation,
  desktopHardwareBusy,
  desktopSetupBusy,
  desktopSetupResult,
  desktopSetupError,
  desktopDependencyStatusBusy,
  desktopDependencyStatusResult,
  onModelChange,
  onDownloadSourceChange,
  onModelPathChange,
  onDetectDesktopHardware,
  onRunDesktopSetup,
  onQueryDesktopDependencyStatus,
}: VoiceSetupPanelsProps) {
  return (
      <section className="voice-panel" aria-labelledby="deploy-title">
        <div className="panel-title">
          <ThunderboltOutlined />
          <h3 id="deploy-title">Windows 本机安装</h3>
        </div>
        <p className="panel-copy">
          通过桌面应用直接检测硬件、打开安装终端、安装 VoxCPM 依赖，并写入本机服务管理命令。
        </p>

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
          placeholder="D:\\models\\VoxCPM2（留空则自动下载）"
          status={modelPath && !modelPathValid ? 'warning' : undefined}
        />

        <div className="desktop-boost" aria-label="桌面增强">
          <div className="desktop-boost-title">
            <DesktopOutlined />
            <span>桌面增强</span>
          </div>
          <p className="model-select-note">
            直接调用本机能力检测硬件、打开安装终端，并管理已安装的 VoxCPM 服务。
          </p>
          <div className="desktop-boost-actions">
            <Button icon={<SearchOutlined />} loading={desktopHardwareBusy} disabled={!desktopRuntime} onClick={onDetectDesktopHardware}>
              检测本机配置
            </Button>
            <Button type="primary" icon={<ThunderboltOutlined />} loading={desktopSetupBusy} disabled={!desktopRuntime} onClick={onRunDesktopSetup}>
              安装依赖
            </Button>
            <Button icon={<SearchOutlined />} loading={desktopDependencyStatusBusy} disabled={!desktopRuntime} onClick={onQueryDesktopDependencyStatus}>
              依赖安装查询
            </Button>
          </div>
          {!desktopRuntime ? (
            <Alert type="error" showIcon title="桌面运行时未就绪" description="请从 Windows 应用包启动，Web 运行环境不再提供安装与服务管理能力。" />
          ) : null}
          {desktopHardwareEvaluation ? (
            <Alert
              type={desktopHardwareEvaluation.status === 'blocked' ? 'error' : desktopHardwareEvaluation.status === 'ready' ? 'success' : 'warning'}
              showIcon
              title={desktopHardwareEvaluation.title}
              description={desktopHardwareEvaluation.detail}
            />
          ) : desktopHardware ? (
            <Alert type="info" showIcon title="已读取本机配置" description={`${desktopHardware.gpuName}，约 ${desktopHardware.vramGb}GB 显存。`} />
          ) : null}
          {desktopSetupResult ? (
            <Alert
              type="success"
              showIcon
              title="安装终端已打开"
              description={`已启动 VoxCPM 依赖安装脚本：${desktopSetupResult.scriptPath}`}
            />
          ) : null}
          {desktopSetupError ? (
            <Alert
              type="error"
              showIcon
              title="安装依赖启动失败"
              description={desktopSetupError}
            />
          ) : null}
          {desktopDependencyStatusResult ? (
            <Alert
              type={desktopDependencyStatusResult.ok ? 'success' : 'warning'}
              showIcon
              title={desktopDependencyStatusResult.ok ? '依赖安装已完成' : '依赖安装未完成'}
              description={desktopDependencyStatusResult.output || '没有返回详细信息。'}
            />
          ) : null}
        </div>

        <Alert
          type="info"
          showIcon
          title="由 App 打开 PowerShell 安装终端"
          description={`脚本使用清华/阿里云镜像源安装 Python 依赖和模型；准备完成后不会自动启动服务，可用桌面按钮或 voxcpm-start、voxcpm-stop、voxcpm-restart 和 voxcpm-status 管理本地 Gradio 服务。${latencyDisclaimer}`}
        />
      </section>
  )
}
