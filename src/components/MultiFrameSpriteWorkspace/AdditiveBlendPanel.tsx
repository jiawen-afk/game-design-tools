import { useState } from 'react'
import type { PointerEvent } from 'react'
import { Button, Checkbox, Input, Segmented, Slider, Space, Typography } from 'antd'
import {
  ArrowRightOutlined,
  CheckOutlined,
  CloseOutlined,
  SwapOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

import {
  parseFrameRangeSelection,
  resolveAdditiveTargetFrameIds,
  type AdditiveTargetFrameMode,
  type MatteFrameGroup,
} from './model'
import type { FrameItem } from './types'
import type {
  AdditiveBlendRegionMode,
  AdditiveBlendWorkspaceViewModel,
} from './useAdditiveBlendWorkspace'

const { Text } = Typography

const regionModeOptions: Array<{ label: string; value: AdditiveBlendRegionMode }> = [
  { label: '画笔', value: 'brush' },
  { label: '全选', value: 'full' },
  { label: '清空', value: 'clear' },
]

const targetModeOptions: Array<{ label: string; value: AdditiveTargetFrameMode }> = [
  { label: '当前帧', value: 'current' },
  { label: '本组全部帧', value: 'group' },
  { label: '自定义选择', value: 'custom' },
]

export interface AdditiveBlendPanelProps {
  group: MatteFrameGroup<FrameItem>
  currentFrame: FrameItem
  currentFrameNumber: number
  additiveBlend: AdditiveBlendWorkspaceViewModel
}

interface PreviewContentRect {
  left: number
  top: number
  width: number
  height: number
}

function computePreviewContentRect(
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  imageWidth: number,
  imageHeight: number
): PreviewContentRect {
  const safeWidth = Math.max(1, bounds.width)
  const safeHeight = Math.max(1, bounds.height)
  const imageAspect = Math.max(1, imageWidth) / Math.max(1, imageHeight)
  const previewAspect = safeWidth / safeHeight
  if (previewAspect > imageAspect) {
    const width = safeHeight * imageAspect
    return {
      left: bounds.left + (safeWidth - width) / 2,
      top: bounds.top,
      width,
      height: safeHeight,
    }
  }
  const height = safeWidth / imageAspect
  return {
    left: bounds.left,
    top: bounds.top + (safeHeight - height) / 2,
    width: safeWidth,
    height,
  }
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function AdditiveBlendPanel({
  group,
  currentFrame,
  currentFrameNumber,
  additiveBlend,
}: AdditiveBlendPanelProps) {
  const [brushing, setBrushing] = useState(false)
  const state = additiveBlend.getGroupState(group.id)
  const rangeResult = parseFrameRangeSelection(state.customRangeInput, group.frameCount)
  const target = resolveAdditiveTargetFrameIds({
    mode: state.targetMode,
    frames: group.frames,
    currentFrameId: currentFrame.id,
    customSelectedFrameIds: state.customSelectedFrameIds,
    customRangeInput: state.customRangeInput,
  })
  const applying = target.frameIds.some((frameId) => additiveBlend.processingFrameIds.has(frameId))
  const hasMask = state.maskRects.length > 0
  const applyDisabled = applying || !hasMask || (state.targetMode === 'custom' && !target.canApply)
  const previewImageWidth = currentFrame.matteWidth || currentFrame.sourceWidth
  const previewImageHeight = currentFrame.matteHeight || currentFrame.sourceHeight

  const setRegionMode = (mode: AdditiveBlendRegionMode) => {
    if (mode === 'full') {
      additiveBlend.setFullMask(group.id)
      return
    }
    if (mode === 'clear') {
      additiveBlend.clearMask(group.id)
      return
    }
    additiveBlend.setRegionMode(group.id, mode)
  }

  const addBrushRect = (event: PointerEvent<HTMLDivElement>) => {
    if (state.regionMode !== 'brush' || !currentFrame.matteUrl) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const contentRect = computePreviewContentRect(
      bounds,
      previewImageWidth,
      previewImageHeight
    )
    const x = (event.clientX - contentRect.left) / contentRect.width
    const y = (event.clientY - contentRect.top) / contentRect.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    const width = state.brushSize / Math.max(1, contentRect.width)
    const height = state.brushSize / Math.max(1, contentRect.height)
    additiveBlend.addMaskRect(group.id, {
      x: clampUnit(x - width / 2),
      y: clampUnit(y - height / 2),
      width,
      height,
    })
  }

  const allFrameIds = group.frames.map((frame) => frame.id)
  const selectedIdSet = new Set(state.customSelectedFrameIds)
  const currentIndex = group.frames.findIndex((frame) => frame.id === currentFrame.id)

  return (
    <div
      style={{
        border: '1px solid #e6e0d8',
        borderTop: 0,
        padding: 10,
        background: '#fffdf9',
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space align="center" wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space align="center" wrap>
            <Text strong>加色去黑</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              第 {currentFrameNumber} 帧预览，已选 {target.frameIds.length} 帧
            </Text>
          </Space>
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            loading={applying}
            disabled={applyDisabled}
            title={!hasMask ? '请先选择区域' : undefined}
            onClick={() => void additiveBlend.applyToFrames({
              groupId: group.id,
              frames: group.frames,
              currentFrameId: currentFrame.id,
            })}
          >
            应用加色去黑
          </Button>
        </Space>

        <Space align="center" wrap>
          <Text>区域模式</Text>
          <Segmented
            size="small"
            value={state.regionMode}
            options={regionModeOptions}
            onChange={(value) => setRegionMode(value as AdditiveBlendRegionMode)}
          />
          <Text>画笔大小</Text>
          <Slider
            min={4}
            max={120}
            value={state.brushSize}
            disabled={state.regionMode !== 'brush'}
            style={{ width: 120 }}
            onChange={(value) => additiveBlend.setBrushSize(group.id, value)}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>{state.maskRects.length} 个区域</Text>
        </Space>

        <div
          role="presentation"
          style={{
            position: 'relative',
            height: 140,
            border: '1px dashed #d7cec2',
            background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px',
            overflow: 'hidden',
            cursor: state.regionMode === 'brush' && currentFrame.matteUrl ? 'crosshair' : 'default',
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
            setBrushing(true)
            event.currentTarget.setPointerCapture(event.pointerId)
            addBrushRect(event)
          }}
          onPointerMove={(event) => {
            if (brushing) addBrushRect(event)
          }}
          onPointerUp={() => setBrushing(false)}
          onPointerCancel={() => setBrushing(false)}
        >
          {currentFrame.matteUrl ? (
            <img
              src={currentFrame.matteUrl}
              alt={`${currentFrame.sourceName} additive preview`}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none' }}
            />
          ) : (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
              <Text type="secondary">等待抠图结果</Text>
            </div>
          )}
          <svg
            viewBox={`0 0 ${Math.max(1, previewImageWidth)} ${Math.max(1, previewImageHeight)}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            {state.maskRects.map((rect, index) => (
              <rect
                key={`${index}:${rect.x}:${rect.y}:${rect.width}:${rect.height}`}
                x={rect.x * previewImageWidth}
                y={rect.y * previewImageHeight}
                width={rect.width * previewImageWidth}
                height={rect.height * previewImageHeight}
                fill="rgba(47, 115, 217, 0.18)"
                stroke="#2f73d9"
                strokeWidth={Math.max(1, Math.max(previewImageWidth, previewImageHeight) / 220)}
              />
            ))}
          </svg>
        </div>

        <Space align="center" wrap>
          <Text>帧范围</Text>
          <Segmented
            size="small"
            value={state.targetMode}
            options={targetModeOptions}
            onChange={(value) => additiveBlend.setTargetMode(group.id, value as AdditiveTargetFrameMode)}
          />
          <Text>黑场阈值</Text>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={state.threshold}
            style={{ width: 120 }}
            onChange={(value) => additiveBlend.setThreshold(group.id, value)}
          />
          <Text type="secondary" style={{ width: 36 }}>{state.threshold.toFixed(2)}</Text>
          <Text>强度</Text>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={state.strength}
            style={{ width: 120 }}
            onChange={(value) => additiveBlend.setStrength(group.id, value)}
          />
          <Text type="secondary" style={{ width: 36 }}>{state.strength.toFixed(2)}</Text>
        </Space>

        {state.targetMode === 'custom' ? (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space align="center" wrap>
              <Text>选择帧</Text>
              <Button
                size="small"
                icon={<CheckOutlined />}
                onClick={() => additiveBlend.setCustomSelectedFrameIds(group.id, allFrameIds)}
              >
                全选
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={() => additiveBlend.setCustomSelectedFrameIds(group.id, [])}
              >
                清空
              </Button>
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={() => additiveBlend.setCustomSelectedFrameIds(
                  group.id,
                  allFrameIds.filter((frameId) => !selectedIdSet.has(frameId))
                )}
              >
                反选
              </Button>
              <Button
                size="small"
                icon={<ArrowRightOutlined />}
                onClick={() => additiveBlend.setCustomSelectedFrameIds(
                  group.id,
                  currentIndex >= 0 ? allFrameIds.slice(currentIndex) : []
                )}
              >
                选择当前帧之后
              </Button>
              <Input
                value={state.customRangeInput}
                placeholder="1-8, 12, 20-24"
                style={{ width: 180 }}
                onChange={(event) => additiveBlend.setCustomRangeInput(group.id, event.target.value)}
              />
            </Space>
            {rangeResult.invalidTokens.length > 0 ? (
              <Text type="warning" style={{ fontSize: 12 }}>
                已忽略无效范围：{rangeResult.invalidTokens.join(', ')}
              </Text>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 6 }}>
              {group.frames.map((frame, index) => (
                <label
                  key={frame.id}
                  style={{
                    border: frame.id === currentFrame.id ? '1px solid #2f73d9' : '1px solid #e6e0d8',
                    padding: 4,
                    background: frame.id === currentFrame.id ? '#eef5ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Checkbox
                      checked={selectedIdSet.has(frame.id)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...state.customSelectedFrameIds, frame.id]
                          : state.customSelectedFrameIds.filter((id) => id !== frame.id)
                        additiveBlend.setCustomSelectedFrameIds(group.id, next)
                      }}
                    >
                      {index + 1}
                    </Checkbox>
                    <img
                      src={frame.matteUrl ?? frame.sourceUrl}
                      alt={`${frame.sourceName} frame ${index + 1}`}
                      style={{
                        width: '100%',
                        height: 44,
                        objectFit: 'contain',
                        background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 12px 12px',
                      }}
                    />
                  </Space>
                </label>
              ))}
            </div>
          </Space>
        ) : null}
      </Space>
    </div>
  )
}
