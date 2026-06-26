import { Empty, Tag } from 'antd'
import { ApartmentOutlined } from '@ant-design/icons'

import type { DocumentGraphView } from './documentKnowledgeModel'

interface DocumentGraphPanelProps {
  view: DocumentGraphView
  onSelectNode: (nodeId: string) => void
}

export function DocumentGraphPanel({ view, onSelectNode }: DocumentGraphPanelProps) {
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
        <svg
          className="document-graph-canvas"
          role="img"
          aria-label="知识库图谱"
          viewBox={`0 0 ${view.width} ${view.height}`}
        >
          <defs>
            <marker id="document-graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>
          {view.edges.map((edge) => (
            <g className="document-graph-edge" key={edge.id}>
              <line
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                markerEnd="url(#document-graph-arrow)"
              />
              {edge.label ? (
                <text x={(edge.source.x + edge.target.x) / 2} y={(edge.source.y + edge.target.y) / 2 - 6}>
                  {shortLabel(edge.label, 10)}
                </text>
              ) : null}
            </g>
          ))}
          {view.nodes.map((node) => (
            <g
              className={`document-graph-node${node.selected ? ' is-selected' : ''}`}
              key={node.id}
              role="button"
              tabIndex={0}
              transform={`translate(${node.x} ${node.y})`}
              onClick={() => onSelectNode(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectNode(node.id)
                }
              }}
            >
              <title>{node.label}</title>
              <circle r={node.selected ? 23 : 18} />
              <text y={node.selected ? 38 : 34}>{shortLabel(node.label, 8)}</text>
            </g>
          ))}
        </svg>
      )}
    </section>
  )
}

function shortLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}
