import type { LayoutWorkspaceViewModel } from './useLayoutWorkspace'

export interface CanvasGuideLineOverlaysProps {
  guideLines: LayoutWorkspaceViewModel['guideLines']
  selectedGuideLineId: LayoutWorkspaceViewModel['selectedGuideLineId']
  canvasWidth: number
  canvasHeight: number
  setSelectedGuideLineId: LayoutWorkspaceViewModel['setSelectedGuideLineId']
  setGuideDragState: LayoutWorkspaceViewModel['setGuideDragState']
}

export function CanvasGuideLineOverlays({
  guideLines,
  selectedGuideLineId,
  canvasWidth,
  canvasHeight,
  setSelectedGuideLineId,
  setGuideDragState,
}: CanvasGuideLineOverlaysProps) {
  return (
    <>
      {guideLines.map((line) => {
        const selected = selectedGuideLineId === line.id
        const lineColor = selected ? '#d63384' : '#ff7ab6'
        const positionPercent = line.axis === 'x'
          ? (line.position / Math.max(1, canvasWidth)) * 100
          : (line.position / Math.max(1, canvasHeight)) * 100
        return (
          <span
            key={`canvas-${line.id}`}
            data-guide-line-overlay={line.axis}
            onPointerDown={(e) => {
              e.stopPropagation()
              setSelectedGuideLineId(line.id)
              setGuideDragState({ id: line.id, axis: line.axis })
            }}
            title="拖动辅助线，按 Delete 删除"
            style={line.axis === 'x'
              ? {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${positionPercent}%`,
                  width: 9,
                  transform: 'translateX(-50%)',
                  cursor: 'ew-resize',
                  pointerEvents: 'auto',
                  zIndex: 60,
                }
              : {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${positionPercent}%`,
                  height: 9,
                  transform: 'translateY(-50%)',
                  cursor: 'ns-resize',
                  pointerEvents: 'auto',
                  zIndex: 60,
                }}
          >
            <span
              aria-hidden="true"
              style={line.axis === 'x'
                ? {
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: `${selected ? 2 : 1}px dashed ${lineColor}`,
                    pointerEvents: 'none',
                  }
                : {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderTop: `${selected ? 2 : 1}px dashed ${lineColor}`,
                    pointerEvents: 'none',
                  }}
            />
          </span>
        )
      })}
    </>
  )
}
