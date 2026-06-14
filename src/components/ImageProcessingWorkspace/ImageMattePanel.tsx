import { Card, ColorPicker, Empty, Slider, Space, Typography } from 'antd'

import { hexToRgb, rgbToHex } from '../MultiFrameSpriteWorkspace/imagePipeline'
import { normalizePickerColor } from '../MultiFrameSpriteWorkspace/matteModel'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

export interface ImageMattePanelProps {
  workspace: ImageProcessingWorkspaceViewModel
}

export function ImageMattePanel({ workspace }: ImageMattePanelProps) {
  return (
    <Card title="2. 色键抠图">
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <label className="image-field">
          <span>关键色</span>
          <ColorPicker
            value={rgbToHex(workspace.matte.keyColor)}
            showText
            onChange={(color, hex) => workspace.updateMatte('keyColor', hexToRgb(normalizePickerColor(color, hex, '#00ff00')))}
          />
        </label>
        <div
          className="image-color-picker-preview"
          aria-label="点击原图取色"
        >
          {workspace.draft ? (
            <Space orientation="vertical" size={8} style={{ width: '100%', alignItems: 'center' }}>
              <img
                src={workspace.draft.sourceUrl}
                alt="点击原图取色"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  void workspace.pickKeyColorFromSource(
                    { x: event.clientX, y: event.clientY },
                    { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                  )
                }}
              />
              <Text type="secondary">点击原图背景取关键色。</Text>
            </Space>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="上传图片后可点击原图取关键色。" />
          )}
        </div>
        <label className="image-field">
          <span>容差：{workspace.matte.tolerance}</span>
          <Slider
            min={0}
            max={100}
            value={workspace.matte.tolerance}
            onChange={(value) => workspace.updateMatte('tolerance', value)}
          />
        </label>
        <label className="image-field">
          <span>平滑：{workspace.matte.smoothness}</span>
          <Slider
            min={0}
            max={100}
            value={workspace.matte.smoothness}
            onChange={(value) => workspace.updateMatte('smoothness', value)}
          />
        </label>
        <label className="image-field">
          <span>去溢色：{workspace.matte.spill}</span>
          <Slider
            min={0}
            max={100}
            value={workspace.matte.spill}
            onChange={(value) => workspace.updateMatte('spill', value)}
          />
        </label>
        <label className="image-field">
          <span>边缘腐蚀：{workspace.matte.erosion}</span>
          <Slider
            min={0}
            max={100}
            value={workspace.matte.erosion}
            onChange={(value) => workspace.updateMatte('erosion', value)}
          />
        </label>
        <Text type="secondary">参数调整会自动刷新处理结果。JPEG 导出会自动铺白底。</Text>
      </Space>
    </Card>
  )
}
