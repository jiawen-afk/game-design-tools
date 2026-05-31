import { Button, Card, InputNumber, Space, Typography, Upload } from 'antd'

import { clampInt } from './numberUtils'
import type { SpriteSheetDraft, SpriteSlicePreview } from './types'

const { Text } = Typography

export interface SpriteSheetUploadPanelProps {
  imageAccept: string[]
  rows: number
  columns: number
  processing: boolean
  slices: SpriteSlicePreview[]
  draft: SpriteSheetDraft | null
  onUpload: (file: File) => void
  onRowsChange: (rows: number) => void
  onColumnsChange: (columns: number) => void
  onConfirm: () => void
}

export function SpriteSheetUploadPanel({
  imageAccept,
  rows,
  columns,
  processing,
  slices,
  draft,
  onUpload,
  onRowsChange,
  onColumnsChange,
  onConfirm,
}: SpriteSheetUploadPanelProps) {
  return (
    <Card className="video-tab-card" size="small">
      <Space className="video-tab-content" direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap align="center">
          <Upload
            accept={imageAccept.join(',')}
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              onUpload(file as File)
              return false
            }}
          >
            <Button>上传精灵图</Button>
          </Upload>
          <Text>行数</Text>
          <InputNumber min={1} max={128} value={rows} onChange={(value) => onRowsChange(clampInt(value ?? 1, 1, 128))} />
          <Text>列数</Text>
          <InputNumber min={1} max={128} value={columns} onChange={(value) => onColumnsChange(clampInt(value ?? 1, 1, 128))} />
          <Button
            type="primary"
            loading={processing}
            disabled={processing || slices.length === 0}
            onClick={onConfirm}
          >
            确认切分并添加到流程 2
          </Button>
        </Space>
        {draft ? (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text type="secondary">
              {draft.sourceName}，{draft.width} × {draft.height}，预计切分 {slices.length} 帧
            </Text>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.max(1, Math.min(columns, 12))}, minmax(64px, 1fr))`,
                gap: 8,
                maxHeight: 280,
                overflow: 'auto',
                padding: 8,
                border: '1px solid #b8a898',
                background: '#f7f1e8',
              }}
            >
              {slices.map((slice) => (
                <div
                  key={slice.url}
                  style={{
                    minWidth: 0,
                    padding: 6,
                    border: '1px solid #d8cabc',
                    background: '#fff',
                    textAlign: 'center',
                  }}
                >
                  <img
                    src={slice.url}
                    alt={slice.name}
                    style={{ width: '100%', height: 72, objectFit: 'contain', display: 'block' }}
                  />
                  <Text style={{ fontSize: 12 }}>帧 {slice.index + 1}</Text>
                </div>
              ))}
            </div>
          </Space>
        ) : (
          <Text type="secondary">上传整张精灵图后，输入行数和列数进行网格切分预览。</Text>
        )}
      </Space>
    </Card>
  )
}
