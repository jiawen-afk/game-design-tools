import { Button, Card, Typography, Upload, message } from 'antd'
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons'

import { SpriteSheetUploadPanel } from './SpriteSheetUploadPanel'
import { VideoUploadPanel } from './VideoUploadPanel'
import type { UploadWorkspaceViewModel } from './useUploadWorkspace'
import type { VideoWorkspaceViewModel } from './useVideoWorkspace'

const { Text } = Typography

function hasAcceptedExtension(file: File, acceptList: string[]) {
  const name = file.name.toLowerCase()
  return acceptList.some((accept) => {
    const normalized = accept.toLowerCase()
    return normalized.startsWith('.')
      ? name.endsWith(normalized)
      : file.type === normalized
  })
}

export interface UploadWorkspacePanelProps {
  imageAccept: string[]
  videoAccept: string[]
  upload: UploadWorkspaceViewModel
  video: VideoWorkspaceViewModel
}

export function UploadWorkspacePanel({
  imageAccept,
  videoAccept,
  upload,
  video,
}: UploadWorkspacePanelProps) {
  const singleUploadAccept = [...videoAccept, ...imageAccept].join(',')
  const isVideoFile = (file: File) => (
    videoAccept.includes(file.type) ||
    file.type.startsWith('video/') ||
    hasAcceptedExtension(file, videoAccept)
  )
  const isImageFile = (file: File) => (
    imageAccept.includes(file.type) ||
    file.type.startsWith('image/') ||
    hasAcceptedExtension(file, imageAccept)
  )
  const handleSingleUpload = (file: File) => {
    if (isVideoFile(file)) {
      upload.clearSpriteSheetDraft()
      video.handleVideoUpload(file)
      return false
    }
    if (isImageFile(file)) {
      video.clearVideoDraft()
      void upload.handleSpriteSheetUpload(file)
      return false
    }
    message.warning('仅支持上传单个图片或视频素材')
    return false
  }
  const handleReplaceAsset = () => {
    upload.clearSpriteSheetDraft()
    video.clearVideoDraft()
  }
  const hasActiveAsset = Boolean(video.videoDraft || upload.spriteSheetDraft)
  const activeTitle = video.videoDraft ? '视频处理' : '精灵图处理'
  const activeDescription = video.videoDraft
    ? '从单个视频素材提取连续帧'
    : '从单张图片素材切分序列帧'
  const activeSourceName = video.videoDraft?.sourceName ?? upload.spriteSheetDraft?.sourceName ?? ''

  return (
    <Card title="1. 文件上传">
      {!hasActiveAsset ? (
        <Upload.Dragger
          className="sprite-single-upload-drop"
          accept={singleUploadAccept}
          maxCount={1}
          multiple={false}
          showUploadList={false}
          beforeUpload={(file) => handleSingleUpload(file as File)}
        >
          <p className="ant-upload-drag-icon"><UploadOutlined /></p>
          <p className="ant-upload-text">拖拽或点击上传单个素材</p>
          <p className="ant-upload-hint">上传单个视频进入视频处理，上传单张图片进入序列帧处理。</p>
          <Button type="primary" icon={<UploadOutlined />}>选择素材</Button>
        </Upload.Dragger>
      ) : (
        <div className="sprite-active-upload-panel">
          <div className="sprite-active-upload-header">
            <div className="sprite-active-upload-meta">
              <Text strong>{activeTitle}</Text>
              <Text type="secondary">{activeDescription}</Text>
              {activeSourceName && <Text type="secondary">{activeSourceName}</Text>}
            </div>
            <Button icon={<ReloadOutlined />} onClick={handleReplaceAsset}>
              更换素材
            </Button>
          </div>
          {video.videoDraft ? (
          <VideoUploadPanel
            videoAccept={videoAccept}
            loading={video.videoLoading}
            operationLabel={video.videoOperationLabel}
            draft={video.videoDraft}
            error={video.videoError}
            previewRef={video.videoPreviewRef}
            framePreviewBoxRef={video.videoFramePreviewBoxRef}
            clipStart={video.videoClipStart}
            clipEnd={video.videoClipEnd}
            fps={video.videoFps}
            frameCount={video.videoFrameCount}
            limitMessage={video.videoLimitMessage}
            playing={video.videoPlaying}
            looping={video.videoLooping}
            extracting={video.videoExtracting}
            extractProgress={video.videoExtractProgress}
            previewFrame={video.previewVideoFrame}
            cropMode={video.videoCropMode}
            cropImageRect={video.videoCropImageRect}
            cropBox={video.videoCropBox}
            cropOutputSize={video.videoCropOutputSize}
            extractedFrames={video.videoExtractedFrames}
            visibleExtractedFrames={video.visibleVideoExtractedFrames}
            framePreviewIndex={video.videoFramePreviewIndex}
            visibilityStride={video.videoVisibilityStride}
            visibleFrameCount={video.visibleVideoExtractedFrames.length}
            adding={video.videoAdding}
            onUpload={(file) => void video.handleVideoUpload(file)}
            onLoadedMetadata={video.applyNativeVideoMetadata}
            onTimeUpdate={video.handleVideoTimeUpdate}
            onPreviewError={video.handleVideoPreviewError}
            onPlayingChange={video.setVideoPlaying}
            onLoopingChange={video.setVideoLooping}
            onPlayClip={video.playVideoClip}
            onClipRangeChange={video.setVideoClipRange}
            onFpsChange={video.setVideoFps}
            onResetExtraction={video.resetVideoExtraction}
            onResetSegmentPreview={video.resetVideoSegmentPreview}
            onExtractFrames={() => void video.extractVideoFrames()}
            onSelectPreviewFrame={(index) => {
              video.setVideoFramePreviewIndex(index)
              video.setVideoFramePreviewPlaying(false)
            }}
            onVisibilityStrideChange={video.setVideoVisibilityStride}
            onCropModeChange={video.setVideoCropMode}
            onConfirmFrames={() => void video.confirmVideoFrames()}
            onStartCropDrag={video.startVideoCropDrag}
            showUploadIntake={false}
          />
          ) : null}
          {upload.spriteSheetDraft ? (
            <SpriteSheetUploadPanel
              imageAccept={imageAccept}
              rows={upload.spriteRows}
              columns={upload.spriteColumns}
              processing={upload.spriteProcessing}
              slices={upload.spriteSlices}
              draft={upload.spriteSheetDraft}
              onUpload={(file) => void upload.handleSpriteSheetUpload(file)}
              onRowsChange={upload.setSpriteRows}
              onColumnsChange={upload.setSpriteColumns}
              onConfirm={() => void upload.confirmSpriteSheetSplit()}
              showUploadIntake={false}
            />
          ) : null}
        </div>
      )}
    </Card>
  )
}
