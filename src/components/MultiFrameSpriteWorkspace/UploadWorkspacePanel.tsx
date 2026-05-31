import { Button, Card, Divider, Space, Tabs, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

import { SpriteSheetUploadPanel } from './SpriteSheetUploadPanel'
import { VideoUploadPanel } from './VideoUploadPanel'
import type { UploadWorkspaceViewModel } from './useUploadWorkspace'
import type { VideoWorkspaceViewModel } from './useVideoWorkspace'

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
  return (
    <Card title="1. 文件上传">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Tabs
          items={[
            {
              key: 'sprite-sheet',
              label: '上传精灵图处理',
              children: (
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
                />
              ),
            },
            {
              key: 'video',
              label: '上传视频处理',
              children: (
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
                  framePreviewIndex={video.videoFramePreviewIndex}
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
                  onCropModeChange={video.setVideoCropMode}
                  onConfirmFrames={() => void video.confirmVideoFrames()}
                  onStartCropDrag={video.startVideoCropDrag}
                />
              ),
            },
          ]}
        />

        <Divider plain style={{ margin: '4px 0' }}>或</Divider>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Upload
            accept={imageAccept.join(',')}
            multiple
            fileList={upload.uploadFileList}
            beforeUpload={() => false}
            onChange={upload.handleUploadChange}
            showUploadList={false}
          >
            <Button type="primary" icon={<UploadOutlined />}>批量添加图片</Button>
          </Upload>
        </div>
      </Space>
    </Card>
  )
}
