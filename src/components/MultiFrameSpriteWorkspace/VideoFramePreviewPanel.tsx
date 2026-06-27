import type { MouseEvent, RefObject } from 'react'
import { Button, Segmented, Typography } from 'antd'
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
  previewFrames: ExtractedVideoFrame[]
  framePreviewIndex: number
  visibilityStride: number
  visibleFrameCount: number
  adding: boolean
  onSelectPreviewFrame: (index: number) => void
  onVisibilityStrideChange: (stride: number) => void
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
  previewFrames,
  framePreviewIndex,
  visibilityStride,
  visibleFrameCount,
  adding,
  onSelectPreviewFrame,
  onVisibilityStrideChange,
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
          frames={previewFrames}
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
        <div className="video-stride-control" aria-label="抽帧隐藏">
          <Text type="secondary">抽帧隐藏</Text>
          <Segmented
            value={visibilityStride}
            disabled={extractedFrames.length === 0 || adding}
            onChange={(value) => onVisibilityStrideChange(Number(value))}
            options={[
              { label: '1选1', value: 1 },
              { label: '2选1', value: 2 },
              { label: '3选1', value: 3 },
              { label: '4选1', value: 4 },
            ]}
          />
          <Text type="secondary">{visibleFrameCount} / {extractedFrames.length} 帧</Text>
        </div>
        <Button
          type="primary"
          loading={adding}
          disabled={visibleFrameCount === 0}
          onClick={onConfirmFrames}
        >
          确认添加到流程 2
        </Button>
      </div>
    </div>
  )
}
