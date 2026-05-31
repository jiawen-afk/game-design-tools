import type { Dispatch, SetStateAction } from 'react'
import { Button, Modal, Space, Typography } from 'antd'

import { clampPreviewZoom } from './layoutModel'

const { Text } = Typography

export interface DetailPreviewModalProps {
  preview: { url: string; name: string } | null
  zoom: number
  onZoomChange: Dispatch<SetStateAction<number>>
  onClose: () => void
}

export function DetailPreviewModal({ preview, zoom, onZoomChange, onClose }: DetailPreviewModalProps) {
  return (
    <Modal
      open={!!preview}
      title={preview?.name ?? '抠图结果'}
      footer={
        <Space>
          <Text type="secondary">滚轮缩放：{Math.round(zoom * 100)}%</Text>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
      onCancel={onClose}
      keyboard
      width="min(92vw, 960px)"
      centered
    >
      <div
        onWheel={(event) => {
          event.preventDefault()
          const delta = event.deltaY < 0 ? 0.15 : -0.15
          onZoomChange((value) => clampPreviewZoom(value + delta))
        }}
        style={{
          height: 'min(70vh, 720px)',
          overflow: 'auto',
          display: 'grid',
          placeItems: 'center',
          background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px',
          border: '1px solid #b8a898',
        }}
      >
        {preview && (
          <img
            src={preview.url}
            alt={preview.name}
            style={{
              width: `${zoom * 100}%`,
              maxWidth: 'none',
              height: 'auto',
              display: 'block',
            }}
          />
        )}
      </div>
    </Modal>
  )
}
