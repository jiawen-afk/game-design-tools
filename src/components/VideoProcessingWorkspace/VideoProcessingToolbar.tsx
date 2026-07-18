import {
  CloudDownloadOutlined,
  FolderOpenOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Button, Progress, Tag, Tooltip } from 'antd'

import type { VideoProcessingWorkspaceViewModel } from './useVideoProcessingWorkspace'

export function VideoProcessingToolbar({ workspace }: { workspace: VideoProcessingWorkspaceViewModel }) {
  const ffmpegProgress = workspace.videoRuntimeProgress
  const upscaylProgress = workspace.upscaleInstallProgress
  const queuedCount = workspace.jobs.filter((job) => job.phase === 'queued').length
  const startBlocked = queuedCount === 0 || workspace.queueValidationFailures.length > 0 || workspace.previewLoading

  return (
    <header className="video-processing-toolbar">
      <div className="video-processing-heading">
        <strong>视频处理工作台</strong>
        <span>缩放、GPU 超分和 Theora 压缩，固定导出 Godot 4.6 原生 OGV。</span>
      </div>

      <div className="video-processing-runtime-strip" aria-label="运行包状态">
        <div className="video-runtime-item">
          <Tag color={workspace.ffmpegInstalled ? 'success' : 'warning'}>
            FFmpeg {workspace.ffmpegInstalled ? '已就绪' : '未安装'}
          </Tag>
          {!workspace.ffmpegInstalled && (
            <Button
              size="small"
              icon={<CloudDownloadOutlined />}
              loading={workspace.videoRuntimeInstalling}
              onClick={() => void workspace.installVideoRuntime()}
            >
              安装固定版本
            </Button>
          )}
          {workspace.videoRuntimeInstalling && ffmpegProgress && (
            <Progress percent={Math.round(ffmpegProgress.percent)} size="small" showInfo={false} />
          )}
        </div>
        <div className="video-runtime-item">
          <Tag color={workspace.upscaylInstalled ? 'success' : 'warning'}>
            Upscayl GPU {workspace.upscaylInstalled ? '已就绪' : '未安装'}
          </Tag>
          {!workspace.upscaylInstalled && (
            <Button
              size="small"
              icon={<CloudDownloadOutlined />}
              loading={workspace.upscaleInstalling}
              onClick={() => void workspace.installUpscaleRuntime()}
            >
              安装 GPU 运行包
            </Button>
          )}
          {workspace.upscaleInstalling && upscaylProgress && (
            <Progress percent={Math.round(upscaylProgress.percent)} size="small" showInfo={false} />
          )}
        </div>
      </div>

      <div className="video-processing-toolbar-actions">
        <Tooltip title={workspace.outputDirectory?.path || '尚未选择输出目录'}>
          <Button icon={<FolderOpenOutlined />} onClick={() => void workspace.chooseOutputDirectory()}>
            {workspace.outputDirectory?.name || '选择输出目录'}
          </Button>
        </Tooltip>
        <Button icon={<PlusOutlined />} loading={workspace.importing} onClick={() => void workspace.importVideos()}>
          导入视频
        </Button>
        {workspace.paused ? (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            disabled={startBlocked}
            onClick={() => void workspace.startAll()}
          >
            处理队列（{queuedCount}）
          </Button>
        ) : (
          <Button icon={<PauseOutlined />} onClick={() => workspace.setPaused(true)}>
            完成本项后暂停
          </Button>
        )}
      </div>
    </header>
  )
}
