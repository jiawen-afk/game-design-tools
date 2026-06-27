import type { Dispatch, SetStateAction } from 'react'
import { ColorPicker, Input, InputNumber, Modal, Select, Slider, Space, Typography } from 'antd'

import {
  getSpillColorHex,
  MATTE_PARAM_MAX,
  normalizeHexColor,
  normalizePickerColor,
  type MatteDefaults,
  type SpillColorMode,
} from './matteModel'
import { spillOptionLabel } from './matteControls'

const { Text } = Typography

const MATTE_DEFAULT_SLIDERS: Array<[string, keyof Pick<MatteDefaults, 'tolerance' | 'smoothness' | 'spill' | 'erosion'>]> = [
  ['容差', 'tolerance'],
  ['边缘平滑', 'smoothness'],
  ['抑色', 'spill'],
  ['侵蚀', 'erosion'],
]

export interface MatteDefaultsModalProps {
  open: boolean
  draft: MatteDefaults
  onDraftChange: Dispatch<SetStateAction<MatteDefaults>>
  onSave: () => void
  onCancel: () => void
}

export function MatteDefaultsModal({ open, draft, onDraftChange, onSave, onCancel }: MatteDefaultsModalProps) {
  return (
    <Modal
      open={open}
      title="抠图默认参数配置"
      okText="保存"
      cancelText="取消"
      onOk={onSave}
      onCancel={onCancel}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Text type="secondary">保存后，新上传图片会使用这些默认值；已有图片参数不自动覆盖。</Text>
        {MATTE_DEFAULT_SLIDERS.map(([label, key]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 64px', gap: 8, alignItems: 'center' }}>
            <Text>{label}</Text>
            <Slider
              min={0}
              max={MATTE_PARAM_MAX[key]}
              value={draft[key]}
              onChange={(value) => onDraftChange((prev) => ({ ...prev, [key]: value }))}
            />
            <InputNumber
              min={0}
              max={MATTE_PARAM_MAX[key]}
              value={draft[key]}
              onChange={(value) => onDraftChange((prev) => ({ ...prev, [key]: value ?? 0 }))}
            />
          </div>
        ))}
        <Space align="center" wrap>
          <Text>抑制颜色</Text>
          <Select<SpillColorMode>
            value={draft.spillColorMode}
            style={{ width: 180 }}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, spillColorMode: value }))}
            options={[
              { value: 'key', label: '跟随当前取色' },
              { value: 'green', label: spillOptionLabel('#00ff00', '绿色 #00ff00') },
              { value: 'blue', label: spillOptionLabel('#0000ff', '蓝色 #0000ff') },
              { value: 'magenta', label: spillOptionLabel('#ff00ff', '品红 #ff00ff') },
              { value: 'custom', label: '自定义十六进制' },
            ]}
          />
          <ColorPicker
            value={getSpillColorHex(draft.spillColorMode, draft.customSpillHex)}
            onChange={(color, hex) => onDraftChange((prev) => ({
              ...prev,
              spillColorMode: 'custom',
              customSpillHex: normalizePickerColor(color, hex, prev.customSpillHex),
            }))}
          />
          {draft.spillColorMode === 'custom' && (
            <Input
              value={draft.customSpillHex}
              onChange={(event) => onDraftChange((prev) => ({
                ...prev,
                spillColorMode: 'custom',
                customSpillHex: normalizeHexColor(event.target.value, prev.customSpillHex),
              }))}
              style={{ width: 110 }}
            />
          )}
        </Space>
      </Space>
    </Modal>
  )
}
