import type { CSSProperties } from 'react'
import { Typography } from 'antd'

import {
  HANDLE_CURSORS,
  HANDLE_SIZE,
} from './constants'
import {
  getGuideEmptyStateText,
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getGuideRulerLabel,
} from './guideModel'
import type { ResizeHandle } from './layoutModel'
import type { useLayoutWorkspace } from './useLayoutWorkspace'
import type { FrameItem } from './types'

const { Text } = Typography

export interface CanvasStageProps {
  activeFrame: FrameItem | null
  layout: ReturnType<typeof useLayoutWorkspace>
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
        <div
          onPointerDown={(e) => layout.createGuideLine(getGuideRulerDragAxis('x'), e)}
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
          onPointerDown={(e) => layout.createGuideLine(getGuideRulerDragAxis('y'), e)}
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
            <div
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                layout.setDragState({
                  kind: 'move',
                  id: activeFrame.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  startOffsetX: activeFrame.layout.offsetX,
                  startOffsetY: activeFrame.layout.offsetY,
                })
              }}
              style={{
                position: 'absolute',
                left: layout.canvasWidth / 2 - activeFrame.layout.width / 2 + activeFrame.layout.offsetX,
                top: layout.canvasHeight / 2 - activeFrame.layout.height / 2 + activeFrame.layout.offsetY,
                width: activeFrame.layout.width,
                height: activeFrame.layout.height,
                cursor: 'move',
                outline: '1px solid #b55233',
                zIndex: 2,
              }}
            >
              <img
                src={activeFrame.composedUrl ?? activeFrame.matteUrl}
                alt="active composed"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
              {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map((handle) => {
                const pos: CSSProperties = {
                  position: 'absolute',
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  background: '#fff',
                  border: '1px solid #b55233',
                  borderRadius: 2,
                  cursor: HANDLE_CURSORS[handle],
                }
                if (handle.includes('n')) pos.top = -HANDLE_SIZE / 2
                if (handle.includes('s')) pos.bottom = -HANDLE_SIZE / 2
                if (handle.includes('w')) pos.left = -HANDLE_SIZE / 2
                if (handle.includes('e')) pos.right = -HANDLE_SIZE / 2
                if (handle === 'n' || handle === 's') pos.left = `calc(50% - ${HANDLE_SIZE / 2}px)`
                if (handle === 'e' || handle === 'w') pos.top = `calc(50% - ${HANDLE_SIZE / 2}px)`
                return (
                  <span
                    key={handle}
                    style={pos}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      layout.setDragState({
                        kind: 'resize',
                        id: activeFrame.id,
                        handle,
                        startX: e.clientX,
                        startY: e.clientY,
                        startWidth: activeFrame.layout.width,
                        startHeight: activeFrame.layout.height,
                      })
                    }}
                  />
                )
              })}
            </div>
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
          {layout.guideLines.map((line) => {
            const selected = layout.selectedGuideLineId === line.id
            const lineColor = selected ? '#d63384' : '#ff7ab6'
            const positionPercent = line.axis === 'x'
              ? (line.position / Math.max(1, layout.canvasWidth)) * 100
              : (line.position / Math.max(1, layout.canvasHeight)) * 100
            return (
              <span
                key={`canvas-${line.id}`}
                data-guide-line-overlay={line.axis}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  layout.setSelectedGuideLineId(line.id)
                  layout.setGuideDragState({ id: line.id, axis: line.axis })
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
        </div>
      </div>
    </div>
  )
}
