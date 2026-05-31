import { Card, Typography } from 'antd'

import type { FrameItem } from './types'

const { Text } = Typography

export interface FrameThumbnailStripProps {
  frames: FrameItem[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function FrameThumbnailStrip({ frames, activeId, onSelect }: FrameThumbnailStripProps) {
  return (
    <Card size="small" title="待处理图片区域">
      {frames.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {frames.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              style={{
                width: 92,
                padding: 6,
                border: activeId === item.id ? '2px solid #b55233' : '1px solid #b8a898',
                background: activeId === item.id ? '#f5e8df' : '#fff',
                cursor: 'pointer',
                textAlign: 'center',
                flex: '0 0 auto',
              }}
            >
              <img
                src={item.composedUrl ?? item.matteUrl ?? item.sourceUrl}
                alt={item.sourceName}
                style={{ width: 72, height: 72, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }}
              />
              <Text style={{ fontSize: 12 }}>帧 {index + 1}</Text>
            </button>
          ))}
        </div>
      ) : (
        <Text type="secondary">请先在流程 1 上传或切分图片。</Text>
      )}
    </Card>
  )
}
