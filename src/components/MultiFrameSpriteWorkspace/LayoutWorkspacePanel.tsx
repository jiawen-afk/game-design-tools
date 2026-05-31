import { Card, Space } from 'antd'

import { ActiveFrameInspector } from './ActiveFrameInspector'
import { CanvasStage } from './CanvasStage'
import { LayoutWorkspaceToolbar } from './LayoutWorkspaceToolbar'
import type { useLayoutWorkspace } from './useLayoutWorkspace'
import type { FrameItem } from './types'

export interface LayoutWorkspacePanelProps {
  frames: FrameItem[]
  activeFrame: FrameItem | null
  activeFrameIndex: number
  layout: ReturnType<typeof useLayoutWorkspace>
  setActiveId: (id: string) => void
}

export function LayoutWorkspacePanel({
  frames,
  activeFrame,
  activeFrameIndex,
  layout,
  setActiveId,
}: LayoutWorkspacePanelProps) {
  return (
    <Card title="3. 统一画布、缩放与对齐">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <LayoutWorkspaceToolbar
          frames={frames}
          activeFrame={activeFrame}
          layout={layout}
          setActiveId={setActiveId}
        />

        <Card size="small" title="当前图片调整">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) 150px', gap: 16, alignItems: 'start' }}>
            <CanvasStage activeFrame={activeFrame} layout={layout} />
            <ActiveFrameInspector
              frames={frames}
              activeFrame={activeFrame}
              activeFrameIndex={activeFrameIndex}
              layout={layout}
            />
          </div>
        </Card>
      </Space>
    </Card>
  )
}
