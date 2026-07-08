import { useState } from 'react'
import { Button, Card, Modal, Segmented, Space, Typography, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import {
  DeleteOutlined,
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
  StarOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import { MatteAiSetupPanel } from './MatteAiSetupPanel'
import { MatteFrameCard, type MatteFrameCardProps } from './MatteFrameCard'
import { buildMatteFrameGroups, resolveMatteGroupFrameSelection } from './model'
import type { MatteMode } from './aiMattingService'
import type { FrameItem } from './types'
import type { MattePipelineViewModel } from './useMattePipeline'
import type { DesktopBirefnetDevicePreference } from '../../desktopApi'

const { Text } = Typography

const modeOptions: Array<{ label: string; value: MatteMode }> = [
  { label: '色键抠图', value: 'chroma' },
  { label: 'AI抠图', value: 'ai' },
]

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
  const [selectedFrameIndexByGroup, setSelectedFrameIndexByGroup] = useState<Record<string, number>>({})

  const selectGroupFrame = (groupId: string, nextIndex: number, nextFrameId?: string) => {
    setSelectedFrameIndexByGroup((current) => ({ ...current, [groupId]: nextIndex }))
    if (nextFrameId) onActivate(nextFrameId)
  }

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
            <MatteAiSetupPanel
              aiMatting={aiMatting}
              aiMattingProgress={aiMattingProgress}
              onAiDetectEnvironment={onAiDetectEnvironment}
              onAiInstallDependencies={onAiInstallDependencies}
              onAiQueryDependencyStatus={onAiQueryDependencyStatus}
              onAiStartService={onAiStartService}
              onAiStopService={onAiStopService}
              onAiCheckService={onAiCheckService}
              onAiDevicePreferenceChange={onAiDevicePreferenceChange}
            />
          ) : null}
        </Space>
        {groups.length > 0 ? (
          <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
            <Text type="secondary">
              每个任务组默认显示第 1 帧，可切换帧调试去背参数。确认后只会应用到该任务组内的图片帧。
            </Text>
            {groups.map((group) => {
              const selection = resolveMatteGroupFrameSelection(group, selectedFrameIndexByGroup[group.id])
              const previousFrame = group.frames[selection.index - 1]
              const nextFrame = group.frames[selection.index + 1]
              return (
                <div key={group.id} style={{ maxWidth: 620 }}>
                  <MatteFrameCard
                    key={selection.frame.id}
                    item={selection.frame}
                    title={(
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>{group.name} · 第 {selection.frameNumber} 帧</span>
                        <Space size={6} wrap>
                          <Text type="secondary">共 {group.frameCount} 帧</Text>
                          <Button
                            size="small"
                            icon={<LeftOutlined />}
                            disabled={!selection.canPrevious}
                            title="上一帧"
                            aria-label="上一帧"
                            onClick={(event) => {
                              event.stopPropagation()
                              selectGroupFrame(group.id, selection.index - 1, previousFrame?.id)
                            }}
                          />
                          <Button
                            size="small"
                            icon={<RightOutlined />}
                            disabled={!selection.canNext}
                            title="下一帧"
                            aria-label="下一帧"
                            onClick={(event) => {
                              event.stopPropagation()
                              selectGroupFrame(group.id, selection.index + 1, nextFrame?.id)
                            }}
                          />
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
                    index={selection.index}
                    frameCount={group.frameCount}
                    active={activeFrameId === selection.frame.id}
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
              )
            })}
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
