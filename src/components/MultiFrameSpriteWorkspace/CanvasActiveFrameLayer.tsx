import type { CSSProperties } from 'react'

import {
  HANDLE_CURSORS,
  HANDLE_SIZE,
} from './constants'
import type { ResizeHandle } from './layoutModel'
import type { FrameItem } from './types'
import type { LayoutWorkspaceViewModel } from './useLayoutWorkspace'

const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export interface CanvasActiveFrameLayerProps {
  activeFrame: FrameItem
  canvasWidth: number
  canvasHeight: number
  setDragState: LayoutWorkspaceViewModel['setDragState']
}

export function CanvasActiveFrameLayer({
  activeFrame,
  canvasWidth,
  canvasHeight,
  setDragState,
}: CanvasActiveFrameLayerProps) {
  return (
    <div
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragState({
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
        left: canvasWidth / 2 - activeFrame.layout.width / 2 + activeFrame.layout.offsetX,
        top: canvasHeight / 2 - activeFrame.layout.height / 2 + activeFrame.layout.offsetY,
        width: activeFrame.layout.width,
        height: activeFrame.layout.height,
        cursor: 'move',
        outline: '1px solid #b55233',
        zIndex: 2,
      }}
    >
      <img
        src={activeFrame.composedUrl ?? activeFrame.matteUrl ?? undefined}
        alt="active composed"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      {RESIZE_HANDLES.map((handle) => {
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
              setDragState({
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
  )
}
