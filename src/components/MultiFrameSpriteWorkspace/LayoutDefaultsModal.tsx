import type { Dispatch, SetStateAction } from 'react'
import { ColorPicker, InputNumber, Modal, Segmented, Space, Typography } from 'antd'

import { clampInt } from './numberUtils'
import { normalizePickerColor } from './matteModel'
import type { LayoutDefaults } from './model'

const { Text } = Typography

const RATIO_PERCENT_INPUT_STYLE = { width: 56 }

export interface LayoutDefaultsModalProps {
  open: boolean
  draft: LayoutDefaults
  onDraftChange: Dispatch<SetStateAction<LayoutDefaults>>
  onSave: () => void
  onCancel: () => void
}

export function LayoutDefaultsModal({ open, draft, onDraftChange, onSave, onCancel }: LayoutDefaultsModalProps) {
  return (
    <Modal
      open={open}
      title="公共参数配置"
      okText="保存"
      cancelText="取消"
      onOk={onSave}
      onCancel={onCancel}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Text type="secondary">保存后会作为下次打开工作台的默认公共参数；当前页面也会立即应用。</Text>
        <Space wrap>
          <Text>公共画布</Text>
          <InputNumber
            min={1}
            max={4096}
            value={draft.canvasWidth}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, canvasWidth: value ?? 256 }))}
            addonAfter="W"
          />
          <InputNumber
            min={1}
            max={4096}
            value={draft.canvasHeight}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, canvasHeight: value ?? 256 }))}
            addonAfter="H"
          />
        </Space>
        <Space wrap>
          <Text>图片宽高调整</Text>
          <Segmented
            value={draft.ratioBasis}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, ratioBasis: value as 'width' | 'height' }))}
            options={[
              { label: '宽度', value: 'width' },
              { label: '高度', value: 'height' },
            ]}
          />
          <Text>占画布</Text>
          <InputNumber
            min={1}
            max={300}
            value={draft.ratioPercent}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, ratioPercent: value ?? 80 }))}
            addonAfter="%"
            style={RATIO_PERCENT_INPUT_STYLE}
          />
        </Space>
        <Space wrap>
          <Text>描边</Text>
          <ColorPicker
            value={draft.strokeColor}
            onChange={(color, hex) => onDraftChange((prev) => ({ ...prev, strokeColor: normalizePickerColor(color, hex, prev.strokeColor) }))}
          />
          <InputNumber
            min={0}
            max={128}
            value={draft.strokeWidth}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, strokeWidth: clampInt(value ?? 0, 0, 128) }))}
            addonAfter="px"
            style={{ width: 96 }}
          />
        </Space>
        <Space wrap>
          <Text>外轮廓线</Text>
          <ColorPicker
            value={draft.outlineColor}
            onChange={(color, hex) => onDraftChange((prev) => ({ ...prev, outlineColor: normalizePickerColor(color, hex, prev.outlineColor) }))}
          />
          <InputNumber
            min={0}
            max={128}
            value={draft.outlineWidth}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, outlineWidth: clampInt(value ?? 0, 0, 128) }))}
            addonAfter="px"
            style={{ width: 96 }}
          />
        </Space>
      </Space>
    </Modal>
  )
}
