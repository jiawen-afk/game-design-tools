import { Alert, Button, Progress, Segmented, Space, Typography } from 'antd'
import { PlayCircleOutlined, SearchOutlined, StopOutlined, ThunderboltOutlined } from '@ant-design/icons'

import type { MattePipelineViewModel } from './useMattePipeline'
import type { DesktopBirefnetDevicePreference } from '../../desktopApi'

const { Text } = Typography

const deviceOptions: Array<{ label: string; value: DesktopBirefnetDevicePreference }> = [
  { label: '自动', value: 'auto' },
  { label: 'GPU', value: 'cuda' },
  { label: 'CPU', value: 'cpu' },
]

const deviceLabels: Record<string, string> = {
  auto: '自动',
  cuda: 'GPU',
  cpu: 'CPU',
}

export interface MatteAiSetupPanelProps {
  aiMatting: MattePipelineViewModel['aiMatting']
  aiMattingProgress: MattePipelineViewModel['aiMattingProgress']
  onAiDetectEnvironment: () => void
  onAiInstallDependencies: () => void
  onAiQueryDependencyStatus: () => void
  onAiStartService: () => void
  onAiStopService: () => void
  onAiCheckService: () => void
  onAiDevicePreferenceChange: (device: DesktopBirefnetDevicePreference) => void
}

export function MatteAiSetupPanel({
  aiMatting,
  aiMattingProgress,
  onAiDetectEnvironment,
  onAiInstallDependencies,
  onAiQueryDependencyStatus,
  onAiStartService,
  onAiStopService,
  onAiCheckService,
  onAiDevicePreferenceChange,
}: MatteAiSetupPanelProps) {
  const serviceStatusType = aiMatting.connected ? 'success' : aiMatting.connectionStatus === 'checking' ? 'info' : 'warning'

  return (
    <div className="ai-matting-setup">
      <Space align="center" wrap>
        <Text strong>设备</Text>
        <Segmented
          value={aiMatting.devicePreference}
          options={deviceOptions}
          disabled={!aiMatting.desktopRuntime || aiMatting.serviceBusy || aiMatting.setupBusy}
          onChange={(value) => onAiDevicePreferenceChange(value as DesktopBirefnetDevicePreference)}
        />
        <Text type="secondary">
          当前：{aiMatting.activeDevice ? deviceLabels[aiMatting.activeDevice] || aiMatting.activeDevice : '未连接'}
        </Text>
      </Space>
      <Space wrap>
        <Button icon={<SearchOutlined />} loading={aiMatting.hardwareBusy} disabled={!aiMatting.desktopRuntime} onClick={onAiDetectEnvironment}>
          检测环境
        </Button>
        <Button type="primary" icon={<ThunderboltOutlined />} loading={aiMatting.setupBusy} disabled={!aiMatting.desktopRuntime} onClick={onAiInstallDependencies}>
          安装依赖
        </Button>
        <Button icon={<SearchOutlined />} loading={aiMatting.dependencyStatusBusy} disabled={!aiMatting.desktopRuntime} onClick={onAiQueryDependencyStatus}>
          重新检测
        </Button>
        <Button icon={<PlayCircleOutlined />} loading={aiMatting.serviceBusy} disabled={!aiMatting.desktopRuntime || aiMatting.connected} onClick={onAiStartService}>
          启动服务
        </Button>
        <Button icon={<StopOutlined />} loading={aiMatting.serviceBusy} disabled={!aiMatting.desktopRuntime} onClick={onAiStopService}>
          停止服务
        </Button>
        <Button onClick={onAiCheckService} disabled={!aiMatting.desktopRuntime || aiMatting.connectionStatus === 'checking'}>
          检测服务
        </Button>
      </Space>
      {!aiMatting.desktopRuntime ? (
        <Alert type="error" showIcon title="桌面运行时未就绪" description="AI 抠图需要从 Windows 桌面应用启动，浏览器环境不能管理本地 Python 服务。" />
      ) : (
        <Alert
          type={serviceStatusType}
          showIcon
          title={aiMatting.connected ? 'BiRefNet 服务可用' : aiMatting.connectionStatus === 'checking' ? '正在检测 BiRefNet 服务' : 'BiRefNet 服务未连接'}
          description={`使用 ${aiMatting.model}，本地端口 ${aiMatting.port}。设备偏好：${deviceLabels[aiMatting.requestedDevice] || aiMatting.requestedDevice}，实际设备：${aiMatting.activeDevice ? deviceLabels[aiMatting.activeDevice] || aiMatting.activeDevice : '等待服务返回'}。`}
        />
      )}
      {aiMatting.hardwareResult ? (
        <Alert
          type={aiMatting.hardwareResult.nvidiaSmi ? 'success' : 'warning'}
          showIcon
          title={aiMatting.hardwareResult.nvidiaSmi ? '检测到 NVIDIA 环境' : '未检测到 NVIDIA 显卡'}
          description={aiMatting.hardwareResult.nvidiaSmi || `${aiMatting.hardwareResult.cpuModel}，CPU 模式可用但速度较慢。`}
        />
      ) : null}
      {aiMatting.setupResult ? (
        <Alert type="success" showIcon title="安装终端已打开" description={`已启动 BiRefNet 依赖安装脚本：${aiMatting.setupResult.scriptPath}`} />
      ) : null}
      {aiMatting.setupError ? (
        <Alert type="error" showIcon title="安装依赖启动失败" description={aiMatting.setupError} />
      ) : null}
      {aiMatting.dependencyStatusResult ? (
        <Alert
          type={aiMatting.dependencyStatusResult.ok ? 'success' : 'warning'}
          showIcon
          title={aiMatting.dependencyStatusResult.ok ? '依赖安装已完成' : '依赖安装未完成'}
          description={aiMatting.dependencyStatusResult.output || '没有返回详细信息。'}
        />
      ) : null}
      {aiMatting.serviceResult ? (
        <Alert
          type={aiMatting.serviceResult.ok ? 'success' : 'warning'}
          showIcon
          title={
            aiMatting.connected
              ? '服务已就绪'
              : aiMatting.serviceBusy && aiMatting.connectionStatus === 'checking'
                ? '模型加载中'
                : aiMatting.serviceResult.ok ? '服务命令已执行' : '服务命令失败'
          }
          description={aiMatting.serviceResult.output || '没有返回详细信息。'}
        />
      ) : null}
      {aiMattingProgress ? (
        <div className="ai-matting-progress">
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Space align="center" wrap>
              <Text strong>AI抠图进度</Text>
              <Text type="secondary">{aiMattingProgress.label}</Text>
            </Space>
            <Progress
              percent={aiMattingProgress.percent}
              status={aiMattingProgress.percent >= 100 ? 'success' : 'active'}
            />
          </Space>
        </div>
      ) : null}
    </div>
  )
}
