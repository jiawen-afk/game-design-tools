import type * as React from 'react'
import type { CSSProperties } from 'react'

import {
  HANDLE_CURSORS,
  HANDLE_SIZE,
} from './constants'
import { getLayoutFramePreviewUrl, getLayoutFrameSilhouettePreviewLayers } from './layoutModel'
import type { ResizeHandle } from './layoutModel'
import type { ComposeStyle, FrameItem } from './types'
import type { LayoutWorkspaceViewModel } from './useLayoutWorkspace'

const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export interface CanvasActiveFrameLayerProps {
  activeFrame: FrameItem
  canvasWidth: number
  canvasHeight: number
  composeStyle: ComposeStyle
  setDragState: LayoutWorkspaceViewModel['setDragState']
}

export function CanvasActiveFrameLayer({
  activeFrame,
  canvasWidth,
  canvasHeight,
  composeStyle,
  setDragState,
}: CanvasActiveFrameLayerProps) {
  const stopNativeDrag: React.DragEventHandler<HTMLElement> = (e) => {
    e.preventDefault()
  }
  const previewUrl = getLayoutFramePreviewUrl(activeFrame)
  const silhouetteLayers = previewUrl ? getLayoutFrameSilhouettePreviewLayers(composeStyle) : []
  const frameStyle: React.CSSProperties & { WebkitUserDrag: 'none' } = {
    position: 'absolute',
    left: canvasWidth / 2 - activeFrame.layout.width / 2 + activeFrame.layout.offsetX,
    top: canvasHeight / 2 - activeFrame.layout.height / 2 + activeFrame.layout.offsetY,
    width: activeFrame.layout.width,
    height: activeFrame.layout.height,
    cursor: 'move',
    outline: '1px solid #b55233',
    zIndex: 2,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserDrag: 'none',
    overflow: 'visible',
  }

  return (
    <div
      draggable={false}
      onDragStart={stopNativeDrag}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
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
      style={frameStyle}
    >
      {silhouetteLayers.map((layer) => (
        <span
          key={layer.id}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${layer.offsetX}px, ${layer.offsetY}px)`,
            background: layer.color,
            pointerEvents: 'none',
            zIndex: 0,
            WebkitMaskImage: `url("${previewUrl}")`,
            maskImage: `url("${previewUrl}")`,
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
        />
      ))}
      <img
        src={previewUrl}
        alt="active composed"
        draggable={false}
        onDragStart={stopNativeDrag}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 1,
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
              e.preventDefault()
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
            onDragStart={stopNativeDrag}
          />
        )
      })}
    </div>
  )
}
