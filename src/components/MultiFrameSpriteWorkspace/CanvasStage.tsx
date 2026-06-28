import { Typography } from 'antd'

import { CanvasActiveFrameLayer } from './CanvasActiveFrameLayer'
import { CanvasGuideLineOverlays } from './CanvasGuideLineOverlays'
import { CanvasGuideRulers } from './CanvasGuideRulers'
import { getGuideEmptyStateText } from './guideModel'
import type { LayoutWorkspaceViewModel } from './useLayoutWorkspace'
import type { FrameItem } from './types'

const { Text } = Typography

export interface CanvasStageProps {
  activeFrame: FrameItem | null
  layout: LayoutWorkspaceViewModel
}

export function CanvasStage({ activeFrame, layout }: CanvasStageProps) {
  return (
    <div
      onWheel={activeFrame ? layout.handleLayoutWheel : undefined}
      tabIndex={0}
      style={{
        minHeight: 540,
        display: 'grid',
        placeItems: 'center',
        background: '#d9d0c4',
        border: '1px solid #9a8b78',
        overflow: 'auto',
        padding: 24,
        outline: 'none',
        overscrollBehavior: 'contain',
      }}
    >
      <div
        style={{
          position: 'relative',
          paddingTop: 18,
          paddingLeft: 18,
          width: 'fit-content',
          maxWidth: '100%',
          isolation: 'isolate',
          overflow: 'visible',
        }}
      >
        <CanvasGuideRulers createGuideLine={layout.createGuideLine} />
        <div
          ref={layout.canvasStageRef}
          onPointerDown={() => layout.setSelectedGuideLineId(null)}
          style={{
            position: 'relative',
            width: layout.canvasWidth,
            height: layout.canvasHeight,
            maxWidth: '100%',
            maxHeight: 780,
            background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px',
            border: '1px solid #6b5d4d',
            flexShrink: 0,
            isolation: 'isolate',
            zIndex: 10,
          }}
        >
          {activeFrame && activeFrame.matteUrl ? (
            <CanvasActiveFrameLayer
              activeFrame={activeFrame}
              canvasWidth={layout.canvasWidth}
              canvasHeight={layout.canvasHeight}
              setDragState={layout.setDragState}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                padding: 24,
                color: '#574838',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <Text type="secondary">{getGuideEmptyStateText()}</Text>
            </div>
          )}
          <CanvasGuideLineOverlays
            guideLines={layout.guideLines}
            selectedGuideLineId={layout.selectedGuideLineId}
            canvasWidth={layout.canvasWidth}
            canvasHeight={layout.canvasHeight}
            setSelectedGuideLineId={layout.setSelectedGuideLineId}
            setGuideDragState={layout.setGuideDragState}
          />
        </div>
      </div>
    </div>
  )
}
