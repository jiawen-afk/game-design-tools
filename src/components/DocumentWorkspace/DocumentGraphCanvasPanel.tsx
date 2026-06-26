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

export function DocumentGraphCanvasPanel({
  mode,
  graph,
  focusNodeId,
  onFocusNode,
  onContextNode,
}: DocumentGraphCanvasPanelProps) {
  const chartElementRef = useRef<HTMLDivElement | null>(null)
  const onFocusNodeRef = useRef(onFocusNode)
  const onContextNodeRef = useRef(onContextNode)

  useEffect(() => {
    onFocusNodeRef.current = onFocusNode
    onContextNodeRef.current = onContextNode
  }, [onContextNode, onFocusNode])

  useEffect(() => {
    if (mode !== 'graph' || !chartElementRef.current || Object.keys(graph.nodes).length === 0) return undefined

    const chart = echarts.init(chartElementRef.current, undefined, { renderer: 'canvas' })
    const resizeChart = () => chart.resize()
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(resizeChart)
    const handleClick = (event: ECElementEvent) => {
      const nodeId = eventNodeId(event)
      if (nodeId) onFocusNodeRef.current(nodeId)
    }
    const handleContextMenu = (event: ECElementEvent) => {
      const nodeId = eventNodeId(event)
      if (nodeId) onContextNodeRef.current(nodeId)
    }

    chart.setOption(buildDocumentGraphChartOption(graph, focusNodeId) as unknown as EChartsCoreOption, true)
    chart.on('click', handleClick)
    chart.on('contextmenu', handleContextMenu)
    if (resizeObserver) {
      resizeObserver.observe(chartElementRef.current)
    } else {
      window.addEventListener('resize', resizeChart)
    }

    return () => {
      chart.off('click', handleClick)
      chart.off('contextmenu', handleContextMenu)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', resizeChart)
      chart.dispose()
    }
  }, [focusNodeId, graph, mode])

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
                    <Tag>{node.type}</Tag>
                  </div>
                  <p>{recordLine(node.data) || '无补充字段'}</p>
                  <Button icon={<EyeOutlined />} onClick={() => onFocusNode(node.id)}>
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
        />
      )}
    </main>
  )
}
