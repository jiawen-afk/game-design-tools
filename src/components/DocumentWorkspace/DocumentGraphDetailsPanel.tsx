import React from 'react'
import { LinkOutlined } from '@ant-design/icons'
import { Button, Descriptions, Empty, Space, Tag } from 'antd'

import {
  describeDocumentGraphNode,
  documentGraphEntityRoleLabel,
  documentGraphNodeTypeLabel,
} from './documentGraphViewModel'
import type { DocumentCollectionGraph, DocumentGraphNode } from '../ProjectStorage'

interface DocumentGraphDetailsPanelProps {
  graph: DocumentCollectionGraph
  node?: DocumentGraphNode
  onFocusNode: (nodeId: string) => void
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function recordForNode(node: DocumentGraphNode) {
  const record = node.data.record
  return record && typeof record === 'object' && !Array.isArray(record) ? record as Record<string, unknown> : {}
}

function categoryPath(node: DocumentGraphNode, record: Record<string, unknown>) {
  const groups = Array.isArray(node.data.categoryPathGroups)
    ? node.data.categoryPathGroups
      .filter(Array.isArray)
      .map((path) => path.map((item) => String(item)).filter(Boolean).join(' / '))
      .filter(Boolean)
    : []
  if (groups.length > 0) return groups.join('；')
  return [record.category_1, record.category_2, record.category_3].filter(Boolean).join(' / ')
}

function textValue(value: unknown) {
  return String(value ?? '').trim() || '无'
}

export function DocumentGraphDetailsPanel({ graph, node, onFocusNode }: DocumentGraphDetailsPanelProps) {
  if (!node) {
    return (
      <aside className="document-graph-details" aria-label="节点详情">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择一个节点查看信息。" />
      </aside>
    )
  }

  const details = describeDocumentGraphNode(graph, node)
  const record = recordForNode(node)
  const roles = stringArray(node.data.roles)
  const sourceUrl = String(record.source_url ?? '').trim()

  return (
    <aside className="document-graph-details" aria-label="节点详情">
      <div className="document-details-title">
        <div>
          <h2>{node.label}</h2>
          <Space size={6} wrap>
            <Tag color="processing">{documentGraphNodeTypeLabel(node.type)}</Tag>
            {roles.map((role) => <Tag key={role}>{documentGraphEntityRoleLabel(role)}</Tag>)}
          </Space>
        </div>
      </div>

      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="描述">{textValue(record.description ?? node.data.description)}</Descriptions.Item>
        <Descriptions.Item label="类目路径">{categoryPath(node, record) || '无'}</Descriptions.Item>
        <Descriptions.Item label="一级类目">{textValue(record.category_1 ?? node.data.category_1)}</Descriptions.Item>
        <Descriptions.Item label="二级类目">{textValue(record.category_2 ?? node.data.category_2)}</Descriptions.Item>
        <Descriptions.Item label="三级类目">{textValue(record.category_3 ?? node.data.category_3)}</Descriptions.Item>
        <Descriptions.Item label="利用方法">{textValue(record.usage ?? node.data.usage)}</Descriptions.Item>
        <Descriptions.Item label="功效">{textValue(record.effect ?? node.data.effect)}</Descriptions.Item>
        <Descriptions.Item label="属地">{textValue(record.place_path ?? node.data.place_path)}</Descriptions.Item>
        <Descriptions.Item label="出处">
          {[record.book_title, record.chapter_title, record.version_title].filter(Boolean).join(' / ') || '无'}
        </Descriptions.Item>
        <Descriptions.Item label="原站详情">
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              <LinkOutlined /> 打开
            </a>
          ) : '无'}
        </Descriptions.Item>
      </Descriptions>

      <section className="document-neighbor-section" aria-label="相邻节点">
        <div className="document-section-title">
          <h3>相邻节点</h3>
          <span>{details.neighbors.length}</span>
        </div>
        {details.neighbors.length > 0 ? (
          <div className="document-neighbor-list">
            {details.neighbors.map((neighbor) => (
              <div className="document-neighbor-item" key={neighbor.id}>
                <div>
                  <strong>{neighbor.label}</strong>
                  <span>{neighbor.edgeLabel}</span>
                </div>
                <Button
                  size="small"
                  disabled={!neighbor.focusable}
                  onClick={() => onFocusNode(neighbor.id)}
                >
                  聚焦
                </Button>
                {neighbor.children?.length ? (
                  <div className="document-neighbor-children">
                    {neighbor.children.map((child) => (
                      <button
                        type="button"
                        disabled={!child.focusable}
                        key={child.id}
                        onClick={() => onFocusNode(child.id)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无相邻节点" />
        )}
      </section>
    </aside>
  )
}
