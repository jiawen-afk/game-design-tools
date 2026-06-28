import type { MouseEvent, RefObject } from 'react'
import { Button, Typography, Upload } from 'antd'
import {
  VideoCameraOutlined,
} from '@ant-design/icons'

import { VideoFramePreviewPanel } from './VideoFramePreviewPanel'
import { VideoSourceControlsPanel } from './VideoSourceControlsPanel'
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
  visibleExtractedFrames: ExtractedVideoFrame[]
  framePreviewIndex: number
  visibilityStride: number
  visibleFrameCount: number
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
  onVisibilityStrideChange: (stride: number) => void
  onCropModeChange: (updater: (active: boolean) => boolean) => void
  onConfirmFrames: () => void
  onStartCropDrag: (event: MouseEvent<HTMLElement>, handle: VideoCropHandle) => void
  showUploadIntake?: boolean
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
  visibleExtractedFrames,
  framePreviewIndex,
  visibilityStride,
  visibleFrameCount,
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
  onVisibilityStrideChange,
  onCropModeChange,
  onConfirmFrames,
  onStartCropDrag,
  showUploadIntake = true,
}: VideoUploadPanelProps) {
  return (
    <div className="video-upload-panel">
      {showUploadIntake && (
        <div className="video-upload-intake">
          <div className="video-upload-drop">
            <Upload.Dragger
              className="sprite-upload-dragger"
              accept={videoAccept.join(',')}
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                onUpload(file as File)
                return false
              }}
            >
              <p className="ant-upload-drag-icon"><VideoCameraOutlined /></p>
              <p className="ant-upload-text">拖拽视频到这里</p>
              <p className="ant-upload-hint">支持点击选择或拖拽单个视频文件。</p>
              <Button icon={<VideoCameraOutlined />}>上传视频</Button>
            </Upload.Dragger>
          </div>
          <Text type="secondary">使用浏览器原生 video 预览与提帧，兼容性取决于当前浏览器解码能力。</Text>
        </div>
      )}

      {loading ? (
        <Text type="secondary">{operationLabel || '正在加载视频'}</Text>
      ) : draft ? (
        <div className="video-workspace-grid">
            <VideoSourceControlsPanel
              draft={draft}
              error={error}
              previewRef={previewRef}
              clipStart={clipStart}
              clipEnd={clipEnd}
              fps={fps}
              frameCount={frameCount}
              limitMessage={limitMessage}
              playing={playing}
              looping={looping}
              extracting={extracting}
              extractProgress={extractProgress}
              operationLabel={operationLabel}
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onPreviewError={onPreviewError}
              onPlayingChange={onPlayingChange}
              onLoopingChange={onLoopingChange}
              onPlayClip={onPlayClip}
              onClipRangeChange={onClipRangeChange}
              onFpsChange={onFpsChange}
              onResetExtraction={onResetExtraction}
              onResetSegmentPreview={onResetSegmentPreview}
              onExtractFrames={onExtractFrames}
            />

            <VideoFramePreviewPanel
              framePreviewBoxRef={framePreviewBoxRef}
              previewFrame={previewFrame}
              cropMode={cropMode}
              cropImageRect={cropImageRect}
              cropBox={cropBox}
              cropOutputSize={cropOutputSize}
              extractedFrames={extractedFrames}
              previewFrames={visibleExtractedFrames}
              framePreviewIndex={framePreviewIndex}
              visibilityStride={visibilityStride}
              visibleFrameCount={visibleFrameCount}
              adding={adding}
              onSelectPreviewFrame={onSelectPreviewFrame}
              onVisibilityStrideChange={onVisibilityStrideChange}
              onCropModeChange={onCropModeChange}
              onConfirmFrames={onConfirmFrames}
              onStartCropDrag={onStartCropDrag}
            />
        </div>
      ) : (
        <Text type="secondary">上传浏览器可播放的视频后，拖动时间范围并按 FPS 提取帧，再确认添加到流程 2。</Text>
      )}
    </div>
  )
}
