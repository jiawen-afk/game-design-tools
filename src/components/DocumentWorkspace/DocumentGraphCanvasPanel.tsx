import React, { useEffect, useRef } from 'react'
import { ApartmentOutlined, EyeOutlined } from '@ant-design/icons'
import { Button, Empty, Tag } from 'antd'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core'

import {
  buildDocumentGraphChartOption,
  documentGraphNodeTypeLabel,
  filterDocumentTermList,
} from './documentGraphViewModel'
import type { DocumentCollectionGraph } from '../ProjectStorage'

echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer])

interface DocumentGraphCanvasPanelProps {
  mode: 'list' | 'graph'
  graph: DocumentCollectionGraph
  focusNodeId?: string
  onFocusNode: (nodeId: string) => void
  onContextNode: (nodeId: string) => void
  onOpenListNode: (nodeId: string) => void
}

function nodeRecord(nodeData: Record<string, unknown>) {
  const record = nodeData.record
  return record && typeof record === 'object' && !Array.isArray(record) ? record as Record<string, unknown> : undefined
}

function recordLine(nodeData: Record<string, unknown>) {
  const record = nodeRecord(nodeData)
  return [
    record?.category_1,
    record?.category_2,
    record?.place_path,
    record?.book_title,
  ].filter(Boolean).join(' / ')
}

function eventNodeId(event: ECElementEvent) {
  if (event.dataType !== 'node' || !event.data || typeof event.data !== 'object') return ''
  const nodeId = (event.data as { id?: unknown }).id
  return typeof nodeId === 'string' ? nodeId : ''
}

function nativePointerEvent(event: ECElementEvent) {
  return (event.event as { event?: MouseEvent } | undefined)?.event
}

function preventNativeContextMenu(event: ECElementEvent) {
  const nativeEvent = nativePointerEvent(event)
  nativeEvent?.preventDefault()
  nativeEvent?.stopPropagation()
}

export function DocumentGraphCanvasPanel({
  mode,
  graph,
  focusNodeId,
  onFocusNode,
  onContextNode,
  onOpenListNode,
}: DocumentGraphCanvasPanelProps) {
  const chartElementRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null)
  const onFocusNodeRef = useRef(onFocusNode)
  const onContextNodeRef = useRef(onContextNode)
  const hasGraphNodes = Object.keys(graph.nodes).length > 0

  useEffect(() => {
    onFocusNodeRef.current = onFocusNode
    onContextNodeRef.current = onContextNode
  }, [onContextNode, onFocusNode])

  useEffect(() => {
    if (mode !== 'graph' || !chartElementRef.current || !hasGraphNodes) return undefined

    const chart = echarts.init(chartElementRef.current, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    const resizeChart = () => chart.resize()
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(resizeChart)
    const handleClick = (event: ECElementEvent) => {
      const nodeId = eventNodeId(event)
      if (nodeId) onFocusNodeRef.current(nodeId)
    }
    const handleContextMenu = (event: ECElementEvent) => {
      preventNativeContextMenu(event)
      const nodeId = eventNodeId(event)
      if (nodeId) onContextNodeRef.current(nodeId)
    }
    const handleMouseDown = (event: ECElementEvent) => {
      if (nativePointerEvent(event)?.button !== 2) return
      preventNativeContextMenu(event)
      const nodeId = eventNodeId(event)
      if (nodeId) onContextNodeRef.current(nodeId)
    }

    chart.on('click', handleClick)
    chart.on('contextmenu', handleContextMenu)
    chart.on('mousedown', handleMouseDown)
    if (resizeObserver) {
      resizeObserver.observe(chartElementRef.current)
    } else {
      window.addEventListener('resize', resizeChart)
    }

    return () => {
      chart.off('click', handleClick)
      chart.off('contextmenu', handleContextMenu)
      chart.off('mousedown', handleMouseDown)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', resizeChart)
      chart.dispose()
      if (chartRef.current === chart) chartRef.current = null
    }
  }, [hasGraphNodes, mode])

  useEffect(() => {
    if (mode !== 'graph' || !hasGraphNodes || !chartRef.current) return
    chartRef.current.setOption(buildDocumentGraphChartOption(graph, focusNodeId) as unknown as EChartsCoreOption, true)
  }, [focusNodeId, graph, hasGraphNodes, mode])

  const terms = filterDocumentTermList(graph)

  return (
    <main className="document-graph-canvas" aria-label={mode === 'graph' ? '知识库图谱' : '知识库列表'}>
      {mode === 'list' ? (
        <section className="document-graph-list-mode">
          <div className="document-canvas-heading">
            <div>
              <h2>筛选结果</h2>
              <p>{terms.length} 条术语</p>
            </div>
            <Tag icon={<ApartmentOutlined />}>列表</Tag>
          </div>
          {terms.length > 0 ? (
            <div className="document-term-list" role="list">
              {terms.map((node) => (
                <article className="document-term-item" role="listitem" key={node.id}>
                  <div>
                    <h3>{node.label}</h3>
                    <Tag>{documentGraphNodeTypeLabel(node.type)}</Tag>
                  </div>
                  <p>{recordLine(node.data) || '无补充字段'}</p>
                  <Button icon={<EyeOutlined />} onClick={() => onOpenListNode(node.id)}>
                    查看详情
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无术语" />
          )}
        </section>
      ) : Object.keys(graph.nodes).length === 0 ? (
        <div className="document-graph-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无图谱节点" />
        </div>
      ) : (
        <div
          ref={chartElementRef}
          className="document-graph-echarts"
          role="img"
          aria-label="知识库图谱画布"
          onContextMenu={(event) => event.preventDefault()}
        />
      )}
    </main>
  )
}
