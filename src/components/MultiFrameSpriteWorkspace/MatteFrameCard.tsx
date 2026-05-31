import type { MouseEvent } from 'react'
import { Button, Card, ColorPicker, Input, Select, Slider, Space, Typography } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

import { hexToRgb, rgbToHex } from './imagePipeline'
import { getSpillColorHex, normalizePickerColor, type SpillColorMode } from './matteModel'
import { spillOptionLabel } from './matteControls'
import type { FrameItem, MatteParams } from './types'

const { Text } = Typography

const MATTE_SLIDERS: Array<[string, keyof Pick<MatteParams, 'tolerance' | 'smoothness' | 'spill' | 'erosion'>]> = [
  ['容差', 'tolerance'],
  ['边缘平滑', 'smoothness'],
  ['抑色', 'spill'],
  ['侵蚀', 'erosion'],
]

export interface MatteFrameCardProps {
  item: FrameItem
  title?: string
  index: number
  frameCount: number
  active: boolean
  onActivate: (id: string) => void
  onRemove: (id: string) => void
  onSampleColor: (item: FrameItem, event: MouseEvent<HTMLImageElement>) => void
  onPreview: (url: string, name: string) => void
  onMatteParamChange: <K extends keyof MatteParams>(id: string, key: K, value: MatteParams[K]) => void
  onApplyToFollowing: (id: string) => void
  onCustomSpillPickerColor: (id: string, color: unknown, hex: string | undefined) => void
  onCustomSpillColor: (id: string, hex: string) => void
  applyButtonLabel?: string
  applyButtonLoading?: boolean
  applyButtonDisabled?: boolean
}

export function MatteFrameCard({
  item,
  title,
  index,
  frameCount,
  active,
  onActivate,
  onRemove,
  onSampleColor,
  onPreview,
  onMatteParamChange,
  onApplyToFollowing,
  onCustomSpillPickerColor,
  onCustomSpillColor,
  applyButtonLabel = '应用到后续所有帧',
  applyButtonLoading = false,
  applyButtonDisabled,
}: MatteFrameCardProps) {
  return (
    <Card
      size="small"
      title={title ?? `帧 ${index + 1}`}
      extra={<Button danger size="small" icon={<DeleteOutlined />} onClick={() => onRemove(item.id)} />}
      onClick={() => onActivate(item.id)}
      style={{ borderColor: active ? '#b55233' : undefined }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>原图（点击取背景色）</Text>
            <img
              src={item.sourceUrl}
              alt={item.sourceName}
              onClick={(event) => onSampleColor(item, event)}
              style={{ width: '100%', height: 120, objectFit: 'contain', background: '#eee', cursor: 'crosshair' }}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>抠图结果 {item.processing ? '处理中...' : ''}</Text>
            {item.matteUrl ? (
              <img
                src={item.matteUrl}
                alt={`${item.sourceName} result`}
                title="点击放大查看"
                onClick={(event) => {
                  event.stopPropagation()
                  onPreview(item.matteUrl!, item.sourceName)
                }}
                style={{
                  width: '100%',
                  height: 120,
                  objectFit: 'contain',
                  background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px',
                  cursor: 'zoom-in',
                }}
              />
            ) : (
              <div style={{ height: 120, display: 'grid', placeItems: 'center', background: '#f3f0ea' }}>等待处理</div>
            )}
          </div>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          结果宽高：{item.matteWidth} × {item.matteHeight}
        </Text>
        <Space align="center" wrap>
          <Text>背景色</Text>
          <ColorPicker
            value={rgbToHex(item.matte.keyColor)}
            onChange={(color, hex) => onMatteParamChange(
              item.id,
              'keyColor',
              hexToRgb(normalizePickerColor(color, hex, rgbToHex(item.matte.keyColor)))
            )}
          />
          <Button
            type="primary"
            size="small"
            loading={applyButtonLoading}
            disabled={applyButtonDisabled ?? index === frameCount - 1}
            onClick={() => onApplyToFollowing(item.id)}
          >
            {applyButtonLabel}
          </Button>
        </Space>
        {MATTE_SLIDERS.map(([label, key]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 36px', alignItems: 'center', gap: 8 }}>
            <Text>{label}</Text>
            <Slider
              min={0}
              max={100}
              value={item.matte[key]}
              onChange={(value) => onMatteParamChange(item.id, key, value)}
            />
            <Text type="secondary">{item.matte[key]}</Text>
          </div>
        ))}
        <Space align="center" wrap>
          <Text>抑制颜色</Text>
          <Select<SpillColorMode>
            value={item.matte.spillColorMode}
            style={{ width: 150 }}
            onChange={(value) => onMatteParamChange(item.id, 'spillColorMode', value)}
            options={[
              { value: 'key', label: spillOptionLabel(rgbToHex(item.matte.keyColor), '跟随当前取色') },
              { value: 'green', label: spillOptionLabel('#00ff00', '绿色 #00ff00') },
              { value: 'blue', label: spillOptionLabel('#0000ff', '蓝色 #0000ff') },
              { value: 'magenta', label: spillOptionLabel('#ff00ff', '品红 #ff00ff') },
              { value: 'custom', label: '自定义十六进制' },
            ]}
          />
          <ColorPicker
            value={getSpillColorHex(item.matte.spillColorMode, item.matte.customSpillHex, item.matte.keyColor)}
            onChange={(color, hex) => onCustomSpillPickerColor(item.id, color, hex)}
          />
          {item.matte.spillColorMode === 'custom' && (
            <Input
              value={item.matte.customSpillHex}
              onChange={(event) => onCustomSpillColor(item.id, event.target.value)}
              placeholder="#00ff00"
              style={{ width: 110 }}
            />
          )}
        </Space>
      </Space>
    </Card>
  )
}
