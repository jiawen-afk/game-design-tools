import type { MouseEvent, RefObject } from 'react'
import { Button, Card, InputNumber, Slider, Space, Typography, Upload } from 'antd'
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ScissorOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'

import { clampInt } from './numberUtils'
import { VideoFramePreviewPanel } from './VideoFramePreviewPanel'
import { formatVideoTime } from './videoFramePipeline'
import type {
  ContainedImageRect,
  CropBoxRect,
  ExtractedVideoFrame,
  VideoCropHandle,
  VideoDraft,
} from './types'

const { Text } = Typography

export interface VideoUploadPanelProps {
  videoAccept: string[]
  loading: boolean
  operationLabel: string
  draft: VideoDraft | null
  error: string | null
  previewRef: RefObject<HTMLVideoElement | null>
  framePreviewBoxRef: RefObject<HTMLDivElement | null>
  clipStart: number
  clipEnd: number
  fps: number
  frameCount: number
  limitMessage: string | null
  playing: boolean
  looping: boolean
  extracting: boolean
  extractProgress: number
  previewFrame: ExtractedVideoFrame | undefined
  cropMode: boolean
  cropImageRect: ContainedImageRect | null
  cropBox: CropBoxRect | null
  cropOutputSize: { width: number; height: number } | null
  extractedFrames: ExtractedVideoFrame[]
  framePreviewIndex: number
  adding: boolean
  onUpload: (file: File) => void
  onLoadedMetadata: () => void
  onTimeUpdate: () => void
  onPreviewError: () => void
  onPlayingChange: (playing: boolean) => void
  onLoopingChange: (looping: boolean) => void
  onPlayClip: () => void
  onClipRangeChange: (start: number, end: number) => void
  onFpsChange: (fps: number) => void
  onResetExtraction: () => void
  onResetSegmentPreview: () => void
  onExtractFrames: () => void
  onSelectPreviewFrame: (index: number) => void
  onCropModeChange: (updater: (active: boolean) => boolean) => void
  onConfirmFrames: () => void
  onStartCropDrag: (event: MouseEvent<HTMLElement>, handle: VideoCropHandle) => void
}

export function VideoUploadPanel({
  videoAccept,
  loading,
  operationLabel,
  draft,
  error,
  previewRef,
  framePreviewBoxRef,
  clipStart,
  clipEnd,
  fps,
  frameCount,
  limitMessage,
  playing,
  looping,
  extracting,
  extractProgress,
  previewFrame,
  cropMode,
  cropImageRect,
  cropBox,
  cropOutputSize,
  extractedFrames,
  framePreviewIndex,
  adding,
  onUpload,
  onLoadedMetadata,
  onTimeUpdate,
  onPreviewError,
  onPlayingChange,
  onLoopingChange,
  onPlayClip,
  onClipRangeChange,
  onFpsChange,
  onResetExtraction,
  onResetSegmentPreview,
  onExtractFrames,
  onSelectPreviewFrame,
  onCropModeChange,
  onConfirmFrames,
  onStartCropDrag,
}: VideoUploadPanelProps) {
  return (
    <Card size="small">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap align="center">
          <Upload
            accept={videoAccept.join(',')}
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              onUpload(file as File)
              return false
            }}
          >
            <Button icon={<VideoCameraOutlined />}>上传视频</Button>
          </Upload>
          <Text type="secondary">使用浏览器原生 video 预览与提帧，兼容性取决于当前浏览器解码能力。</Text>
        </Space>

        {loading ? (
          <Text type="secondary">{operationLabel || '正在加载视频'}</Text>
        ) : draft ? (
          <div className="video-workspace-grid">
            <div className="video-controls-column">
              <div className="video-source-panel">
                <div className="video-source-box">
                  <video
                    ref={previewRef}
                    src={draft.sourceUrl}
                    controls
                    playsInline
                    onLoadedMetadata={onLoadedMetadata}
                    onTimeUpdate={onTimeUpdate}
                    onPlay={() => onPlayingChange(true)}
                    onPause={() => onPlayingChange(false)}
                    onEnded={() => onPlayingChange(false)}
                    onError={onPreviewError}
                  />
                </div>
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  {draft.sourceName}
                  {draft.width > 0 && draft.height > 0 && draft.duration > 0
                    ? `，${draft.width} × ${draft.height}，时长 ${formatVideoTime(draft.duration)}`
                    : '，正在读取视频信息'}
                </Text>
                {error && <Text type="danger">{error}</Text>}
              </div>

              <div className="video-parameter-panel">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Slider
                      range
                      min={0}
                      max={Math.max(0, draft.duration)}
                      step={0.01}
                      value={[clipStart, clipEnd]}
                      disabled={draft.duration <= 0}
                      tooltip={{ formatter: (value) => formatVideoTime(value ?? 0) }}
                      onChange={(value) => {
                        if (Array.isArray(value)) onClipRangeChange(value[0] ?? 0, value[1] ?? 0)
                      }}
                    />
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text type="secondary">开始 {formatVideoTime(clipStart)}</Text>
                      <Text type={limitMessage ? 'danger' : 'secondary'}>
                        预计提取 {frameCount} 帧
                      </Text>
                      <Text type="secondary">结束 {formatVideoTime(clipEnd)}</Text>
                    </Space>
                  </div>

                  <Space wrap align="center">
                    <Button
                      icon={playing && !looping ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      disabled={draft.duration <= 0 || !!error || extracting}
                      onClick={() => {
                        if (playing && !looping) {
                          previewRef.current?.pause()
                          onPlayingChange(false)
                          return
                        }
                        onLoopingChange(false)
                        onPlayClip()
                      }}
                    >
                      {playing && !looping ? '暂停片段' : '播放片段'}
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      type={looping && playing ? 'primary' : 'default'}
                      disabled={draft.duration <= 0 || !!error || extracting}
                      onClick={() => {
                        if (looping && playing) {
                          onLoopingChange(false)
                          previewRef.current?.pause()
                          onPlayingChange(false)
                          return
                        }
                        onLoopingChange(true)
                        onPlayClip()
                      }}
                    >
                      {looping && playing ? '停止重播' : '自动重播'}
                    </Button>
                  </Space>

                  <Space wrap align="center">
                    <Text>FPS</Text>
                    <InputNumber
                      min={1}
                      max={60}
                      value={fps}
                      onChange={(value) => {
                        onFpsChange(clampInt(value ?? 12, 1, 60))
                        onResetExtraction()
                        onResetSegmentPreview()
                      }}
                    />
                    <Text>开始时间</Text>
                    <InputNumber
                      min={0}
                      max={Math.max(0, draft.duration)}
                      step={0.01}
                      precision={2}
                      value={clipStart}
                      onChange={(value) => onClipRangeChange(Number(value ?? 0), clipEnd)}
                    />
                    <Text>结束时间</Text>
                    <InputNumber
                      min={0}
                      max={Math.max(0, draft.duration)}
                      step={0.01}
                      precision={2}
                      value={clipEnd}
                      onChange={(value) => onClipRangeChange(clipStart, Number(value ?? 0))}
                    />
                    <Button
                      type="primary"
                      icon={<ScissorOutlined />}
                      loading={extracting}
                      disabled={draft.duration <= 0 || !!error || extracting}
                      onClick={onExtractFrames}
                    >
                      确定提取帧
                    </Button>
                  </Space>
                  {limitMessage && <Text type="danger">{limitMessage}</Text>}
                  {(extracting || operationLabel) && (
                    <Text type="secondary">
                      {operationLabel || '正在处理视频'}{extractProgress > 0 ? `：${extractProgress}%` : ''}
                    </Text>
                  )}
                </Space>
              </div>
            </div>

            <VideoFramePreviewPanel
              framePreviewBoxRef={framePreviewBoxRef}
              previewFrame={previewFrame}
              cropMode={cropMode}
              cropImageRect={cropImageRect}
              cropBox={cropBox}
              cropOutputSize={cropOutputSize}
              extractedFrames={extractedFrames}
              framePreviewIndex={framePreviewIndex}
              adding={adding}
              onSelectPreviewFrame={onSelectPreviewFrame}
              onCropModeChange={onCropModeChange}
              onConfirmFrames={onConfirmFrames}
              onStartCropDrag={onStartCropDrag}
            />
          </div>
        ) : (
          <Text type="secondary">上传浏览器可播放的视频后，拖动时间范围并按 FPS 提取帧，再确认添加到流程 2。</Text>
        )}
      </Space>
    </Card>
  )
}
