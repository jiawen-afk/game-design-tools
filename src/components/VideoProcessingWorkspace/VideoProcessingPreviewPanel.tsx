import { EyeOutlined, PictureOutlined } from '@ant-design/icons'
import { Button, Empty, InputNumber, Skeleton } from 'antd'

import type { VideoProcessingWorkspaceViewModel } from './useVideoProcessingWorkspace'

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const remainder = whole % 60
  return hours > 0
    ? [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':')
    : [minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':')
}

export function VideoProcessingPreviewPanel({ workspace }: { workspace: VideoProcessingWorkspaceViewModel }) {
  const job = workspace.selectedJob
  if (!job) {
    return (
      <section className="video-processing-panel video-preview-panel">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="导入并选择一个视频以查看源视频和处理预览" />
      </section>
    )
  }

  return (
    <section className="video-processing-panel video-preview-panel" aria-labelledby="video-preview-title">
      <div className="video-panel-heading video-preview-heading">
        <div>
          <h2 id="video-preview-title">画面预览</h2>
          <span>{job.input.name}</span>
        </div>
        <div className="video-preview-actions">
          <label>
            <span>取帧时间</span>
            <InputNumber
              min={0}
              max={Math.max(0, job.input.durationSeconds)}
              step={0.5}
              precision={2}
              addonAfter="秒"
              value={workspace.previewTimestamp}
              onChange={(value) => workspace.setPreviewTimestamp(Number(value ?? 0))}
            />
          </label>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            loading={workspace.previewLoading}
            disabled={workspace.validationErrors.length > 0}
            onClick={() => void workspace.generatePreview()}
          >
            生成单帧对比
          </Button>
        </div>
      </div>

      <div className="video-source-player">
        <video key={workspace.sourceVideoUrl} src={workspace.sourceVideoUrl} controls preload="metadata">
          当前环境无法播放此源视频。
        </video>
      </div>

      <dl className="video-source-facts">
        <div><dt>源视频</dt><dd>{job.input.width} × {job.input.height}</dd></div>
        <div><dt>输出</dt><dd>{job.settings.width} × {job.settings.height}</dd></div>
        <div><dt>时长</dt><dd>{formatDuration(job.input.durationSeconds)}</dd></div>
        <div><dt>帧率</dt><dd>{job.input.averageFps.toFixed(2)} → {job.settings.targetFps} FPS</dd></div>
        <div><dt>编码</dt><dd>{job.input.videoCodec || '未知'} → Theora</dd></div>
        <div><dt>音频</dt><dd>{job.settings.audioMode === 'mute' ? '静音' : `Vorbis ${job.settings.audioKbps} kbps`}</dd></div>
      </dl>

      {workspace.previewLoading ? (
        <div className="video-preview-loading"><Skeleton.Image active /><Skeleton active paragraph={{ rows: 2 }} /></div>
      ) : workspace.preview ? (
        <div className="video-frame-comparison">
          <figure>
            <figcaption>源视频帧</figcaption>
            <img src={workspace.preview.sourceUrl} alt={`源视频 ${workspace.previewTimestamp} 秒画面`} />
          </figure>
          <figure>
            <figcaption>处理后 · {workspace.preview.width} × {workspace.preview.height}</figcaption>
            <img src={workspace.preview.processedUrl} alt={`处理后 ${workspace.previewTimestamp} 秒画面`} />
          </figure>
        </div>
      ) : (
        <div className="video-preview-placeholder">
          <PictureOutlined />
          <strong>按需生成单帧对比</strong>
          <span>大于 100% 时会实际调用 Upscayl GPU，生成可能需要一些时间。</span>
          {workspace.previewError && <span className="video-preview-error">{workspace.previewError}</span>}
        </div>
      )}
    </section>
  )
}
