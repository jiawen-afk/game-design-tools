import { Button, InputNumber, Segmented, Space, Typography } from 'antd'
import {
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons'

import { CanvasPublicParamsPanel, ACTIVE_RATIO_GROUP_STYLE, RATIO_PERCENT_INPUT_STYLE } from './CanvasPublicParamsPanel'
import { FrameThumbnailStrip } from './FrameThumbnailStrip'
import {
  getGuideActionLabel,
} from './guideModel'
import {
  getWheelScalingButtonLabel,
} from './layoutModel'
import type { LayoutWorkspaceViewModel } from './useLayoutWorkspace'
import type { FrameItem } from './types'

const { Text } = Typography

export interface LayoutWorkspaceToolbarProps {
  frames: FrameItem[]
  activeFrame: FrameItem | null
  layout: LayoutWorkspaceViewModel
  setActiveId: (id: string) => void
}

export function LayoutWorkspaceToolbar({
  frames,
  activeFrame,
  layout,
  setActiveId,
}: LayoutWorkspaceToolbarProps) {
  return (
    <>
      <CanvasPublicParamsPanel
        canvasWidth={layout.canvasWidth}
        canvasHeight={layout.canvasHeight}
        ratioPercent={layout.canvasRatioPercent}
        ratioBasis={layout.canvasRatioBasis}
        strokeColor={layout.strokeColor}
        strokeWidth={layout.strokeWidth}
        outlineColor={layout.outlineColor}
        outlineWidth={layout.outlineWidth}
        onOpenDefaults={layout.openLayoutDefaults}
        onCanvasWidthChange={layout.setCanvasWidth}
        onCanvasHeightChange={layout.setCanvasHeight}
        onRatioPercentChange={layout.setCanvasRatioPercent}
        onRatioBasisChange={layout.setCanvasRatioBasis}
        onApplyRatio={() => layout.applyCanvasRatio(layout.canvasRatioPercent, layout.canvasRatioBasis)}
        onApplyAllCenter={layout.applyAllCenter}
        onApplyPresetSize={layout.applyPresetSize}
        onStrokeColorChange={layout.setStrokeColor}
        onStrokeWidthChange={layout.setStrokeWidth}
        onOutlineColorChange={layout.setOutlineColor}
        onOutlineWidthChange={layout.setOutlineWidth}
      />

      <FrameThumbnailStrip frames={frames} activeId={activeFrame?.id ?? null} onSelect={setActiveId} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Space wrap>
          <Button
            icon={layout.layoutWheelScalingEnabled ? <LockOutlined /> : <UnlockOutlined />}
            type={layout.layoutWheelScalingEnabled ? 'default' : 'primary'}
            aria-pressed={layout.layoutWheelScalingEnabled}
            onClick={() => layout.setLayoutWheelScalingEnabled((value) => !value)}
          >
            {getWheelScalingButtonLabel(layout.layoutWheelScalingEnabled)}
          </Button>
          <Text type="secondary">
            当前：{layout.layoutWheelScalingEnabled ? '开放' : '禁止'}
          </Text>
          <Button size="small" onClick={() => layout.addGuideLine('x')}>
            {getGuideActionLabel('x')}
          </Button>
          <Button size="small" onClick={() => layout.addGuideLine('y')}>
            {getGuideActionLabel('y')}
          </Button>
          <Button size="small" disabled={layout.guideLines.length === 0} onClick={() => {
            layout.setGuideLines([])
            layout.setSelectedGuideLineId(null)
          }}>
            清空辅助线
          </Button>
        </Space>
        {activeFrame && (
          <div style={ACTIVE_RATIO_GROUP_STYLE}>
            <Segmented
              value={layout.activeRatioBasis}
              onChange={(value) => layout.updateActiveRatio({ basis: value as 'width' | 'height' })}
              options={[
                { label: '宽度', value: 'width' },
                { label: '高度', value: 'height' },
              ]}
            />
            <Text>占画布</Text>
            <InputNumber
              min={1}
              max={300}
              value={layout.activeRatioPercent}
              onChange={(v) => layout.updateActiveRatio({ percent: v ?? 80 })}
              addonAfter="%"
              style={RATIO_PERCENT_INPUT_STYLE}
            />
            <Text>大小</Text>
          </div>
        )}
      </div>
    </>
  )
}
