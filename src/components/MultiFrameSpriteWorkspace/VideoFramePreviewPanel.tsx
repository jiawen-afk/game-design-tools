import type { MouseEvent, RefObject } from 'react'
import { Button, Typography } from 'antd'
import { ScissorOutlined } from '@ant-design/icons'

import { VideoCropOverlay } from './VideoCropOverlay'
import { VideoFrameList } from './VideoFrameList'
import type {
  ContainedImageRect,
  CropBoxRect,
  ExtractedVideoFrame,
  VideoCropHandle,
} from './types'

const { Text } = Typography

interface VideoFramePreviewPanelProps {
  framePreviewBoxRef: RefObject<HTMLDivElement | null>
  previewFrame: ExtractedVideoFrame | undefined
  cropMode: boolean
  cropImageRect: ContainedImageRect | null
  cropBox: CropBoxRect | null
  cropOutputSize: { width: number; height: number } | null
  extractedFrames: ExtractedVideoFrame[]
  framePreviewIndex: number
  adding: boolean
  onSelectPreviewFrame: (index: number) => void
  onCropModeChange: (updater: (active: boolean) => boolean) => void
  onConfirmFrames: () => void
  onStartCropDrag: (event: MouseEvent<HTMLElement>, handle: VideoCropHandle) => void
}

export function VideoFramePreviewPanel({
  framePreviewBoxRef,
  previewFrame,
  cropMode,
  cropImageRect,
  cropBox,
  cropOutputSize,
  extractedFrames,
  framePreviewIndex,
  adding,
  onSelectPreviewFrame,
  onCropModeChange,
  onConfirmFrames,
  onStartCropDrag,
}: VideoFramePreviewPanelProps) {
  return (
    <div className="video-tab-right">
      <section className="video-preview-panel">
        <div className="video-preview-box" ref={framePreviewBoxRef}>
          {previewFrame ? (
            <>
              <img src={previewFrame.url} alt={previewFrame.name} />
              {cropMode && cropImageRect && cropBox && cropOutputSize && (
                <VideoCropOverlay
                  imageRect={cropImageRect}
                  cropBox={cropBox}
                  outputSize={cropOutputSize}
                  onStartDrag={onStartCropDrag}
                />
              )}
            </>
          ) : (
            <Text type="secondary">确定提取帧后显示循环预览</Text>
          )}
        </div>
      </section>

      <section className="video-frame-list-panel">
        <VideoFrameList
          frames={extractedFrames}
          previewIndex={framePreviewIndex}
          onSelect={onSelectPreviewFrame}
        />
      </section>

      <div className="video-confirm-action">
        <Button
          icon={<ScissorOutlined />}
          type={cropMode ? 'primary' : 'default'}
          disabled={extractedFrames.length === 0 || adding}
          onClick={() => onCropModeChange((active) => !active)}
        >
          调整裁剪范围
        </Button>
        <Button
          type="primary"
          loading={adding}
          disabled={extractedFrames.length === 0}
          onClick={onConfirmFrames}
        >
          确认添加到流程 2
        </Button>
      </div>
    </div>
  )
}
