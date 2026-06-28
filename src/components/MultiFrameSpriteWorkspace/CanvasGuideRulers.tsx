import {
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getGuideRulerLabel,
} from './guideModel'
import type { LayoutWorkspaceViewModel } from './useLayoutWorkspace'

export interface CanvasGuideRulersProps {
  createGuideLine: LayoutWorkspaceViewModel['createGuideLine']
}

export function CanvasGuideRulers({ createGuideLine }: CanvasGuideRulersProps) {
  return (
    <>
      <div
        onPointerDown={(e) => createGuideLine(getGuideRulerDragAxis('x'), e)}
        title="从 X 轴向下拖出横向辅助线"
        style={{
          position: 'absolute',
          top: 0,
          left: 18,
          right: 0,
          height: 18,
          background: '#c9bfaf',
          border: '1px solid #9a8b78',
          borderBottom: 0,
          cursor: getGuideRulerCursor('x'),
          display: 'grid',
          placeItems: 'center',
          color: '#574838',
          fontSize: 11,
          fontWeight: 600,
          zIndex: 30,
        }}
      >
        {getGuideRulerLabel('x')}
      </div>
      <div
        onPointerDown={(e) => createGuideLine(getGuideRulerDragAxis('y'), e)}
        title="从 Y 轴向右拖出竖向辅助线"
        style={{
          position: 'absolute',
          top: 18,
          left: 0,
          bottom: 0,
          width: 18,
          background: '#c9bfaf',
          border: '1px solid #9a8b78',
          borderRight: 0,
          cursor: getGuideRulerCursor('y'),
          display: 'grid',
          placeItems: 'center',
          color: '#574838',
          fontSize: 10,
          fontWeight: 600,
          writingMode: 'vertical-rl',
          zIndex: 30,
        }}
      >
        {getGuideRulerLabel('y')}
      </div>
    </>
  )
}
