import { Button, Card, ColorPicker, InputNumber, Segmented, Select, Space, Typography } from 'antd'

import { normalizePickerColor } from './matteModel'
import { clampInt } from './numberUtils'

const { Text } = Typography

const RATIO_GROUP_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'nowrap',
  whiteSpace: 'nowrap',
  padding: '6px 8px',
  border: '1px solid #b8a898',
  borderRadius: 6,
  background: '#f7f1e8',
}
export const ACTIVE_RATIO_GROUP_STYLE = RATIO_GROUP_STYLE
export const RATIO_PERCENT_INPUT_STYLE: React.CSSProperties = { width: 56 }

export interface CanvasPublicParamsPanelProps {
  canvasWidth: number
  canvasHeight: number
  ratioPercent: number
  ratioBasis: 'width' | 'height'
  ratioApplying: boolean
  strokeColor: string
  strokeWidth: number
  outlineColor: string
  outlineWidth: number
  onOpenDefaults: () => void
  onCanvasWidthChange: (width: number) => void
  onCanvasHeightChange: (height: number) => void
  onRatioPercentChange: (percent: number) => void
  onRatioBasisChange: (basis: 'width' | 'height') => void
  onApplyRatio: () => void
  onApplyAllCenter: () => void
  onApplyPresetSize: (mode: string) => void
  onStrokeColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onOutlineColorChange: (color: string) => void
  onOutlineWidthChange: (width: number) => void
}

export function CanvasPublicParamsPanel({
  canvasWidth,
  canvasHeight,
  ratioPercent,
  ratioBasis,
  ratioApplying,
  strokeColor,
  strokeWidth,
  outlineColor,
  outlineWidth,
  onOpenDefaults,
  onCanvasWidthChange,
  onCanvasHeightChange,
  onRatioPercentChange,
  onRatioBasisChange,
  onApplyRatio,
  onApplyAllCenter,
  onApplyPresetSize,
  onStrokeColorChange,
  onStrokeWidthChange,
  onOutlineColorChange,
  onOutlineWidthChange,
}: CanvasPublicParamsPanelProps) {
  return (
    <Card size="small" title="公共参数" extra={<Button onClick={onOpenDefaults}>公共参数配置</Button>}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Text>公共画布</Text>
          <InputNumber min={1} max={4096} value={canvasWidth} onChange={(value) => onCanvasWidthChange(value ?? 256)} addonAfter="W" />
          <InputNumber min={1} max={4096} value={canvasHeight} onChange={(value) => onCanvasHeightChange(value ?? 256)} addonAfter="H" />
          <span style={RATIO_GROUP_STYLE}>
            <Text strong>图片宽高调整：</Text>
            <Segmented
              value={ratioBasis}
              onChange={(value) => onRatioBasisChange(value as 'width' | 'height')}
              options={[
                { label: '宽度', value: 'width' },
                { label: '高度', value: 'height' },
              ]}
            />
            <Text>占画布</Text>
            <InputNumber
              min={1}
              max={300}
              value={ratioPercent}
              onChange={(value) => onRatioPercentChange(value ?? 80)}
              addonAfter="%"
              style={RATIO_PERCENT_INPUT_STYLE}
            />
            <Text>大小</Text>
            <Button loading={ratioApplying} disabled={ratioApplying} onClick={onApplyRatio}>应用</Button>
          </span>
        </Space>
        <Space wrap>
          <Button onClick={onApplyAllCenter}>全部居中</Button>
          <Select
            placeholder="统一大小工具"
            style={{ width: 220 }}
            onSelect={onApplyPresetSize}
            options={[
              { value: 'active', label: '按当前帧尺寸统一' },
              { value: 'maxBoth', label: '按最大宽高统一' },
              { value: 'maxWidth', label: '按最大宽度等比统一' },
              { value: 'maxHeight', label: '按最大高度等比统一' },
            ]}
          />
        </Space>
        <Space wrap align="center">
          <Text>描边</Text>
          <ColorPicker
            value={strokeColor}
            onChange={(color, hex) => onStrokeColorChange(normalizePickerColor(color, hex, strokeColor))}
          />
          <InputNumber
            min={0}
            max={128}
            value={strokeWidth}
            onChange={(value) => onStrokeWidthChange(clampInt(value ?? 0, 0, 128))}
            addonAfter="px"
            style={{ width: 96 }}
          />
          <Text>外轮廓线</Text>
          <ColorPicker
            value={outlineColor}
            onChange={(color, hex) => onOutlineColorChange(normalizePickerColor(color, hex, outlineColor))}
          />
          <InputNumber
            min={0}
            max={128}
            value={outlineWidth}
            onChange={(value) => onOutlineWidthChange(clampInt(value ?? 0, 0, 128))}
            addonAfter="px"
            style={{ width: 96 }}
          />
        </Space>
      </Space>
    </Card>
  )
}
