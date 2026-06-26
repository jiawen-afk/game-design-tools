import { useEffect, useRef } from 'react'
import { Empty, Tag } from 'antd'
import { ApartmentOutlined } from '@ant-design/icons'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core'

import { buildDocumentGraphChartOption, type DocumentGraphView } from './documentKnowledgeModel'

echarts.use([GraphChart, TooltipComponent, CanvasRenderer])

interface DocumentGraphPanelProps {
  view: DocumentGraphView
  onSelectNode: (nodeId: string) => void
}

export function DocumentGraphPanel({ view, onSelectNode }: DocumentGraphPanelProps) {
  const chartElementRef = useRef<HTMLDivElement | null>(null)
  const onSelectNodeRef = useRef(onSelectNode)

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode
  }, [onSelectNode])

  useEffect(() => {
    if (!chartElementRef.current || view.nodes.length === 0) return undefined

    const chart = echarts.init(chartElementRef.current, undefined, { renderer: 'canvas' })
    const handleClick = (event: ECElementEvent) => {
      if (event.dataType !== 'node' || !event.data || typeof event.data !== 'object') return
      const nodeId = (event.data as { id?: unknown }).id
      if (typeof nodeId !== 'string') return
      onSelectNodeRef.current(nodeId)
    }
    const resizeChart = () => chart.resize()
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(resizeChart)

    chart.setOption(buildDocumentGraphChartOption(view) as unknown as EChartsCoreOption, true)
    chart.on('click', handleClick)
    if (resizeObserver) {
      resizeObserver.observe(chartElementRef.current)
    } else {
      window.addEventListener('resize', resizeChart)
    }

    return () => {
      chart.off('click', handleClick)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', resizeChart)
      chart.dispose()
    }
  }, [view])

  return (
    <section className="document-graph-panel" aria-label="图谱画布">
      <div className="document-panel-heading">
        <div>
          <h2>图谱画布</h2>
          <p>{view.nodes.length} 个节点，{view.edges.length} 条关系</p>
        </div>
        <Tag icon={<ApartmentOutlined />}>邻域视图</Tag>
      </div>

      {view.nodes.length === 0 ? (
        <div className="document-graph-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无图谱节点" />
        </div>
      ) : (
        <div
          ref={chartElementRef}
          className="document-graph-echarts"
          role="img"
          aria-label="知识库图谱"
        />
      )}
    </section>
  )
}
