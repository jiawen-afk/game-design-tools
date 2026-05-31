import { Button, Checkbox, InputNumber, Space, Typography } from 'antd'

import type { LayoutWorkspaceViewModel } from './useLayoutWorkspace'
import type { FrameItem, FrameLayout } from './types'

const { Text } = Typography

export interface ActiveFrameInspectorProps {
  frames: FrameItem[]
  activeFrame: FrameItem | null
  activeFrameIndex: number
  layout: LayoutWorkspaceViewModel
}

export function ActiveFrameInspector({
  frames,
  activeFrame,
  activeFrameIndex,
  layout,
}: ActiveFrameInspectorProps) {
  return (
    <Space direction="vertical" size={12} style={{ minWidth: 0 }}>
      {activeFrame ? (
        <>
          <Text strong>帧 {activeFrameIndex + 1} / {frames.length}</Text>
          <Checkbox
            checked={activeFrame.layout.keepAspect}
            onChange={(e) => layout.setLayout(activeFrame.id, { keepAspect: e.target.checked })}
          >
            锁定比例
          </Checkbox>
          <Space>
            <Text>宽</Text>
            <InputNumber
              min={1}
              max={4096}
              value={Math.round(activeFrame.layout.width)}
              onChange={(v) => {
                const width = v ?? activeFrame.layout.width
                const patch: Partial<FrameLayout> = { width }
                if (activeFrame.layout.keepAspect) {
                  patch.height = Math.max(1, Math.round(width / (activeFrame.matteWidth / Math.max(1, activeFrame.matteHeight))))
                }
                layout.setLayout(activeFrame.id, patch)
              }}
            />
          </Space>
          <Space>
            <Text>高</Text>
            <InputNumber
              min={1}
              max={4096}
              value={Math.round(activeFrame.layout.height)}
              onChange={(v) => {
                const height = v ?? activeFrame.layout.height
                const patch: Partial<FrameLayout> = { height }
                if (activeFrame.layout.keepAspect) {
                  patch.width = Math.max(1, Math.round(height * (activeFrame.matteWidth / Math.max(1, activeFrame.matteHeight))))
                }
                layout.setLayout(activeFrame.id, patch)
              }}
            />
          </Space>
          <Space>
            <Text>X</Text>
            <InputNumber value={activeFrame.layout.offsetX} onChange={(v) => layout.setLayout(activeFrame.id, { offsetX: v ?? 0 })} />
          </Space>
          <Space>
            <Text>Y</Text>
            <InputNumber value={activeFrame.layout.offsetY} onChange={(v) => layout.setLayout(activeFrame.id, { offsetY: v ?? 0 })} />
          </Space>
          <Button onClick={() => layout.setLayout(activeFrame.id, { offsetX: 0, offsetY: 0 })}>当前帧居中</Button>
        </>
      ) : (
        <>
          <Text strong>当前帧：无</Text>
          <Text type="secondary">请先在流程 1 上传或切分图片。</Text>
        </>
      )}
      <Text type="secondary" style={{ fontSize: 12 }}>
        辅助线显示在画布顶层，用于定位对齐；选中后按 Delete 删除。
      </Text>
    </Space>
  )
}
