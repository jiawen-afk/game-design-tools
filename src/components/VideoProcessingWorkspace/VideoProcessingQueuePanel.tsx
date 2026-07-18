import {
  CloseCircleOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Empty, Progress, Table, Tag, Tooltip, type TableColumnsType } from 'antd'

import type { VideoJobPhase, VideoProcessingJob } from './videoProcessingModel'
import type { VideoProcessingWorkspaceViewModel } from './useVideoProcessingWorkspace'

const phaseLabels: Record<VideoJobPhase, string> = {
  checking: '环境检查',
  queued: '等待处理',
  probing: '读取信息',
  decoding: '拆分帧',
  upscaling: 'GPU 超分',
  'encoding-pass-1': '双遍编码 1/2',
  'encoding-pass-2': '双遍编码 2/2',
  encoding: 'Theora 编码',
  verifying: 'Godot 验证',
  completed: '已完成',
  failed: '失败',
  canceled: '已取消',
}

function phaseColor(phase: VideoJobPhase) {
  if (phase === 'completed') return 'success'
  if (phase === 'failed') return 'error'
  if (phase === 'canceled') return 'default'
  if (phase === 'queued') return 'blue'
  return 'processing'
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function VideoProcessingQueuePanel({ workspace }: { workspace: VideoProcessingWorkspaceViewModel }) {
  const columns: TableColumnsType<VideoProcessingJob> = [
    {
      title: '视频',
      key: 'video',
      width: 260,
      render: (_, job) => (
        <button
          type="button"
          className={`video-queue-file${workspace.selectedJobId === job.id ? ' is-selected' : ''}`}
          onClick={() => workspace.setSelectedJobId(job.id)}
        >
          <strong>{job.input.name}</strong>
          <span>{job.input.width} × {job.input.height} · {formatBytes(job.input.size)}</span>
        </button>
      ),
    },
    {
      title: '输出设置',
      key: 'settings',
      width: 220,
      render: (_, job) => (
        <div className="video-queue-settings">
          <strong>{job.settings.percent}% · {job.settings.width} × {job.settings.height}</strong>
          <span>{job.settings.qualityMode === 'quality' ? `固定质量 · ${job.settings.qualityPreset}` : `目标 ${job.settings.targetMb ?? '—'} MB`}</span>
        </div>
      ),
    },
    {
      title: '阶段',
      dataIndex: 'phase',
      width: 132,
      render: (phase: VideoJobPhase) => <Tag color={phaseColor(phase)}>{phaseLabels[phase]}</Tag>,
    },
    {
      title: '进度',
      key: 'progress',
      width: 250,
      render: (_, job) => (
        <div className="video-queue-progress">
          <Progress
            percent={Math.round(job.progress)}
            size="small"
            status={job.phase === 'failed' ? 'exception' : job.phase === 'completed' ? 'success' : 'active'}
          />
          <Tooltip title={job.error || job.message}>
            <span className={job.error ? 'is-error' : ''}>{job.error || job.message || phaseLabels[job.phase]}</span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: '结果',
      key: 'result',
      width: 130,
      render: (_, job) => job.phase === 'completed' ? formatBytes(job.outputSize) : '—',
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 190,
      render: (_, job) => (
        <div className="video-queue-actions">
          {workspace.activeJobId === job.id && (
            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => void workspace.cancelActive()}>
              取消
            </Button>
          )}
          {['failed', 'canceled'].includes(job.phase) && (
            <Button size="small" icon={<ReloadOutlined />} onClick={() => workspace.retryJob(job.id)}>
              重试
            </Button>
          )}
          {job.phase === 'completed' && workspace.outputDirectory && (
            <Tooltip title={job.outputPath}>
              <Button size="small" icon={<FolderOpenOutlined />} onClick={() => void workspace.openOutputDirectory()}>
                目录
              </Button>
            </Tooltip>
          )}
          {workspace.activeJobId !== job.id && (
            <Button
              size="small"
              type="text"
              danger
              aria-label={`移除 ${job.input.name}`}
              icon={<DeleteOutlined />}
              onClick={() => workspace.removeJob(job.id)}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <section className="video-processing-panel video-queue-panel" aria-labelledby="video-queue-title">
      <div className="video-panel-heading video-queue-heading">
        <div>
          <h2 id="video-queue-title">批量队列</h2>
          <span>任务按顺序执行，单项失败不会中断后续任务。</span>
        </div>
        <div className="video-queue-summary">
          <Tag>{workspace.jobs.length} 项</Tag>
          <span>{workspace.paused ? '队列已暂停' : '队列执行中'}</span>
        </div>
      </div>
      {workspace.jobs.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未导入视频" />
      ) : (
        <Table<VideoProcessingJob>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={workspace.jobs}
          pagination={false}
          scroll={{ x: 1180 }}
          rowClassName={(job) => workspace.selectedJobId === job.id ? 'video-queue-row-selected' : ''}
        />
      )}
    </section>
  )
}
