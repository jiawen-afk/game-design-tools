import type {
  CSSProperties,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
  WheelEvent as ReactWheelEvent,
} from 'react'
import { Button, Card, Checkbox, InputNumber, Segmented, Space, Typography } from 'antd'
import {
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons'

import { CanvasPublicParamsPanel, ACTIVE_RATIO_GROUP_STYLE, RATIO_PERCENT_INPUT_STYLE } from './CanvasPublicParamsPanel'
import { FrameThumbnailStrip } from './FrameThumbnailStrip'
import {
  HANDLE_CURSORS,
  HANDLE_SIZE,
} from './constants'
import {
  getGuideActionLabel,
  getGuideEmptyStateText,
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getGuideRulerLabel,
} from './guideModel'
import {
  getWheelScalingButtonLabel,
  type ResizeHandle,
} from './layoutModel'
import type { DragState, FrameItem, FrameLayout, GuideAxis, GuideDragState, GuideLine } from './types'

const { Text } = Typography

export interface LayoutWorkspacePanelProps {
  frames: FrameItem[]
  activeFrame: FrameItem | null
  activeFrameIndex: number
  canvasWidth: number
  setCanvasWidth: (width: number) => void
  canvasHeight: number
  setCanvasHeight: (height: number) => void
  canvasRatioPercent: number
  setCanvasRatioPercent: (percent: number) => void
  canvasRatioBasis: 'width' | 'height'
  setCanvasRatioBasis: (basis: 'width' | 'height') => void
  activeRatioPercent: number
  activeRatioBasis: 'width' | 'height'
  strokeColor: string
  setStrokeColor: (color: string) => void
  strokeWidth: number
  setStrokeWidth: (width: number) => void
  outlineColor: string
  setOutlineColor: (color: string) => void
  outlineWidth: number
  setOutlineWidth: (width: number) => void
  layoutWheelScalingEnabled: boolean
  setLayoutWheelScalingEnabled: Dispatch<SetStateAction<boolean>>
  guideLines: GuideLine[]
  setGuideLines: Dispatch<SetStateAction<GuideLine[]>>
  selectedGuideLineId: string | null
  setSelectedGuideLineId: Dispatch<SetStateAction<string | null>>
  setGuideDragState: Dispatch<SetStateAction<GuideDragState | null>>
  canvasStageRef: RefObject<HTMLDivElement | null>
  setActiveId: (id: string) => void
  setDragState: Dispatch<SetStateAction<DragState>>
  setLayout: (id: string, patch: Partial<FrameLayout>) => void
  handleLayoutWheel: (event: ReactWheelEvent<HTMLDivElement>) => void
  createGuideLine: (axis: GuideAxis, event: ReactPointerEvent<HTMLElement>) => void
  addGuideLine: (axis: GuideAxis) => void
  applyAllCenter: () => void
  applyPresetSize: (mode: string) => void
  applyCanvasRatio: (percent: number, basis: 'width' | 'height') => void
  updateActiveRatio: (next: { percent?: number; basis?: 'width' | 'height' }) => void
  openLayoutDefaults: () => void
}

export function LayoutWorkspacePanel({
  frames,
  activeFrame,
  activeFrameIndex,
  canvasWidth,
  setCanvasWidth,
  canvasHeight,
  setCanvasHeight,
  canvasRatioPercent,
  setCanvasRatioPercent,
  canvasRatioBasis,
  setCanvasRatioBasis,
  activeRatioPercent,
  activeRatioBasis,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  outlineColor,
  setOutlineColor,
  outlineWidth,
  setOutlineWidth,
  layoutWheelScalingEnabled,
  setLayoutWheelScalingEnabled,
  guideLines,
  setGuideLines,
  selectedGuideLineId,
  setSelectedGuideLineId,
  setGuideDragState,
  canvasStageRef,
  setActiveId,
  setDragState,
  setLayout,
  handleLayoutWheel,
  createGuideLine,
  addGuideLine,
  applyAllCenter,
  applyPresetSize,
  applyCanvasRatio,
  updateActiveRatio,
  openLayoutDefaults,
}: LayoutWorkspacePanelProps) {
  return (
    <Card title="3. 统一画布、缩放与对齐">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <CanvasPublicParamsPanel
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          ratioPercent={canvasRatioPercent}
          ratioBasis={canvasRatioBasis}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          outlineColor={outlineColor}
          outlineWidth={outlineWidth}
          onOpenDefaults={openLayoutDefaults}
          onCanvasWidthChange={setCanvasWidth}
          onCanvasHeightChange={setCanvasHeight}
          onRatioPercentChange={setCanvasRatioPercent}
          onRatioBasisChange={setCanvasRatioBasis}
          onApplyRatio={() => applyCanvasRatio(canvasRatioPercent, canvasRatioBasis)}
          onApplyAllCenter={applyAllCenter}
          onApplyPresetSize={applyPresetSize}
          onStrokeColorChange={setStrokeColor}
          onStrokeWidthChange={setStrokeWidth}
          onOutlineColorChange={setOutlineColor}
          onOutlineWidthChange={setOutlineWidth}
        />

        <FrameThumbnailStrip frames={frames} activeId={activeFrame?.id ?? null} onSelect={setActiveId} />

        <Card size="small" title="当前图片调整">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <Space wrap>
              <Button
                icon={layoutWheelScalingEnabled ? <LockOutlined /> : <UnlockOutlined />}
                type={layoutWheelScalingEnabled ? 'default' : 'primary'}
                aria-pressed={layoutWheelScalingEnabled}
                onClick={() => setLayoutWheelScalingEnabled((value) => !value)}
              >
                {getWheelScalingButtonLabel(layoutWheelScalingEnabled)}
              </Button>
              <Text type="secondary">
                当前：{layoutWheelScalingEnabled ? '开放' : '禁止'}
              </Text>
              <Button size="small" onClick={() => addGuideLine('x')}>
                {getGuideActionLabel('x')}
              </Button>
              <Button size="small" onClick={() => addGuideLine('y')}>
                {getGuideActionLabel('y')}
              </Button>
              <Button size="small" disabled={guideLines.length === 0} onClick={() => {
                setGuideLines([])
                setSelectedGuideLineId(null)
              }}>
                清空辅助线
              </Button>
            </Space>
            {activeFrame && (
              <div style={ACTIVE_RATIO_GROUP_STYLE}>
                <Segmented
                  value={activeRatioBasis}
                  onChange={(value) => updateActiveRatio({ basis: value as 'width' | 'height' })}
                  options={[
                    { label: '宽度', value: 'width' },
                    { label: '高度', value: 'height' },
                  ]}
                />
                <Text>占画布</Text>
                <InputNumber
                  min={1}
                  max={300}
                  value={activeRatioPercent}
                  onChange={(v) => updateActiveRatio({ percent: v ?? 80 })}
                  addonAfter="%"
                  style={RATIO_PERCENT_INPUT_STYLE}
                />
                <Text>大小</Text>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) 150px', gap: 16, alignItems: 'start' }}>
            <div
              onWheel={activeFrame ? handleLayoutWheel : undefined}
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
                <div
                  ref={canvasStageRef}
                  onPointerDown={() => setSelectedGuideLineId(null)}
                  style={{
                    position: 'relative',
                    width: canvasWidth,
                    height: canvasHeight,
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
                </div>
              </div>
            </div>

            <Space direction="vertical" size={12} style={{ minWidth: 0 }}>
              {activeFrame ? (
                <>
                  <Text strong>帧 {activeFrameIndex + 1} / {frames.length}</Text>
                  <Checkbox
                    checked={activeFrame.layout.keepAspect}
                    onChange={(e) => setLayout(activeFrame.id, { keepAspect: e.target.checked })}
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
                        setLayout(activeFrame.id, patch)
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
                        setLayout(activeFrame.id, patch)
                      }}
                    />
                  </Space>
                  <Space>
                    <Text>X</Text>
                    <InputNumber value={activeFrame.layout.offsetX} onChange={(v) => setLayout(activeFrame.id, { offsetX: v ?? 0 })} />
                  </Space>
                  <Space>
                    <Text>Y</Text>
                    <InputNumber value={activeFrame.layout.offsetY} onChange={(v) => setLayout(activeFrame.id, { offsetY: v ?? 0 })} />
                  </Space>
                  <Button onClick={() => setLayout(activeFrame.id, { offsetX: 0, offsetY: 0 })}>当前帧居中</Button>
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
          </div>
        </Card>
      </Space>
    </Card>
  )
}
