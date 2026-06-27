import { useState } from 'react'
import { Alert, Button, Card, Modal, Progress, Segmented, Space, Typography, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { DeleteOutlined, DownloadOutlined, PlayCircleOutlined, SearchOutlined, StarOutlined, StopOutlined, ThunderboltOutlined, UploadOutlined } from '@ant-design/icons'

import { MatteFrameCard, type MatteFrameCardProps } from './MatteFrameCard'
import { buildMatteFrameGroups } from './model'
import type { MatteMode } from './aiMattingService'
import type { FrameItem } from './types'
import type { MattePipelineViewModel } from './useMattePipeline'
import type { DesktopBirefnetDevicePreference } from '../../desktopApi'

const { Text } = Typography

const modeOptions: Array<{ label: string; value: MatteMode }> = [
  { label: '色键抠图', value: 'chroma' },
  { label: 'AI抠图', value: 'ai' },
]

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

export interface MatteWorkspacePanelProps {
  frames: FrameItem[]
  imageAccept: string[]
  uploadFileList: UploadFile[]
  activeFrameId: string | null
  onOpenDefaults: () => void
  onRemoveAll: () => void
  onBatchUploadChange: UploadProps['onChange']
  onExportMatteGroup: (groupId: string) => void
  onImportMatteGroupToPersonalSpace: (groupId: string) => void
  personalSpaceCollectEnabled: boolean
  personalSpaceCollectDisabledReason?: string
  matteMode: MatteMode
  aiMatting: MattePipelineViewModel['aiMatting']
  aiMattingProgress: MattePipelineViewModel['aiMattingProgress']
  onMatteModeChange: (mode: MatteMode) => void
  onAiDetectEnvironment: () => void
  onAiInstallDependencies: () => void
  onAiQueryDependencyStatus: () => void
  onAiStartService: () => void
  onAiStopService: () => void
  onAiCheckService: () => void
  onAiDevicePreferenceChange: (device: DesktopBirefnetDevicePreference) => void
  onActivate: MatteFrameCardProps['onActivate']
  onRemoveGroup: (groupId: string) => void
  onSampleColor: MatteFrameCardProps['onSampleColor']
  onPreview: MatteFrameCardProps['onPreview']
  onMatteParamChange: MatteFrameCardProps['onMatteParamChange']
  onConfirmApplyToAll: MatteFrameCardProps['onApplyToFollowing']
  onCustomSpillPickerColor: MatteFrameCardProps['onCustomSpillPickerColor']
  onCustomSpillColor: MatteFrameCardProps['onCustomSpillColor']
  applyingGroupId: string | null
}

export function MatteWorkspacePanel({
  frames,
  imageAccept,
  uploadFileList,
  activeFrameId,
  onOpenDefaults,
  onRemoveAll,
  onBatchUploadChange,
  onExportMatteGroup,
  onImportMatteGroupToPersonalSpace,
  personalSpaceCollectEnabled,
  personalSpaceCollectDisabledReason,
  matteMode,
  aiMatting,
  aiMattingProgress,
  onMatteModeChange,
  onAiDetectEnvironment,
  onAiInstallDependencies,
  onAiQueryDependencyStatus,
  onAiStartService,
  onAiStopService,
  onAiCheckService,
  onAiDevicePreferenceChange,
  onActivate,
  onRemoveGroup,
  onSampleColor,
  onPreview,
  onMatteParamChange,
  onConfirmApplyToAll,
  onCustomSpillPickerColor,
  onCustomSpillColor,
  applyingGroupId,
}: MatteWorkspacePanelProps) {
  const groups = buildMatteFrameGroups(frames)
  const [batchUploadOpen, setBatchUploadOpen] = useState(false)
  const serviceStatusType = aiMatting.connected ? 'success' : aiMatting.connectionStatus === 'checking' ? 'info' : 'warning'

  return (
    <>
      <Card
        title="2. 抠图去背"
        extra={
          <Space wrap>
            <Button icon={<UploadOutlined />} onClick={() => setBatchUploadOpen(true)}>
              批量添加图片
            </Button>
            <Button onClick={onOpenDefaults}>抠图参数配置</Button>
            <Button danger icon={<DeleteOutlined />} disabled={frames.length === 0} onClick={onRemoveAll}>
              移除所有图片
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space align="center" wrap>
            <Text strong>处理方式</Text>
            <Segmented
              value={matteMode}
              options={modeOptions}
              onChange={(value) => onMatteModeChange(value as MatteMode)}
            />
          </Space>
          {matteMode === 'ai' ? (
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
          ) : null}
        </Space>
        {groups.length > 0 ? (
          <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
            <Text type="secondary">
              每个任务组仅显示第 1 帧用于调试去背参数。确认后只会应用到该任务组内的图片帧。
            </Text>
            {groups.map((group) => (
              <div key={group.id} style={{ maxWidth: 620 }}>
                <MatteFrameCard
                  key={group.firstFrame.id}
                  item={group.firstFrame}
                  title={(
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{group.name} · 第 1 帧</span>
                      <Space size={6} wrap>
                        <Text type="secondary">共 {group.frameCount} 帧</Text>
                        <Button size="small" icon={<DownloadOutlined />} onClick={() => onExportMatteGroup(group.id)}>
                          导出组图片
                        </Button>
                        <Button
                          size="small"
                          icon={<StarOutlined />}
                          disabled={!personalSpaceCollectEnabled}
                          title={personalSpaceCollectDisabledReason}
                          onClick={() => onImportMatteGroupToPersonalSpace(group.id)}
                        >
                          收藏到项目空间
                        </Button>
                      </Space>
                    </div>
                  )}
                  index={0}
                  frameCount={group.frameCount}
                  active={activeFrameId === group.firstFrame.id}
                  onActivate={onActivate}
                  onRemove={() => onRemoveGroup(group.id)}
                  onSampleColor={onSampleColor}
                  onPreview={onPreview}
                  onMatteParamChange={onMatteParamChange}
                  onApplyToFollowing={onConfirmApplyToAll}
                  onCustomSpillPickerColor={onCustomSpillPickerColor}
                  onCustomSpillColor={onCustomSpillColor}
                  matteMode={matteMode}
                  applyButtonLabel="应用到组所有帧"
                  applyButtonLoading={applyingGroupId === group.id}
                  applyButtonDisabled={Boolean(applyingGroupId) || group.frameCount === 0 || (matteMode === 'ai' && !aiMatting.connected)}
                  applyButtonTitle={matteMode === 'ai' && !aiMatting.connected ? '请先启动 BiRefNet 服务' : undefined}
                />
              </div>
            ))}
          </Space>
        ) : (
          <Text type="secondary">请先在流程 1 上传单个素材并添加到这里，或从标题栏批量添加图片。</Text>
        )}
      </Card>

      <Modal
        title="批量添加图片"
        open={batchUploadOpen}
        footer={null}
        onCancel={() => setBatchUploadOpen(false)}
      >
        <div className="batch-image-upload-area">
          <Upload.Dragger
            className="sprite-upload-dragger"
            accept={imageAccept.join(',')}
            multiple
            fileList={uploadFileList}
            beforeUpload={() => false}
            onChange={onBatchUploadChange}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon"><UploadOutlined /></p>
            <p className="ant-upload-text">拖拽多张图片到这里</p>
            <p className="ant-upload-hint">支持一次添加多张图片进入流程 2。</p>
            <Button icon={<UploadOutlined />}>批量添加图片</Button>
          </Upload.Dragger>
        </div>
      </Modal>
    </>
  )
}
