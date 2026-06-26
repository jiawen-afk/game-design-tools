import React from 'react'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, Input, Radio, Space, Tag } from 'antd'

import {
  buildDocumentCategoryTree,
  documentGraphEntityRoles,
  documentGraphNodeTypes,
  type DocumentCategoryFilter,
  type DocumentDescriptionFilter,
  type DocumentGraphFilterState,
} from './documentGraphViewModel'
import type { DocumentCollectionGraph } from '../ProjectStorage'

interface DocumentGraphControlsPanelProps {
  graph: DocumentCollectionGraph
  visibleGraph: DocumentCollectionGraph
  filter: DocumentGraphFilterState
  searchDraft: string
  categoryTreeQuery: string
  onSearchDraftChange: (value: string) => void
  onSearchSubmit: () => void
  onCategoryTreeQueryChange: (value: string) => void
  onFilterChange: (filter: DocumentGraphFilterState) => void
  onReset: () => void
}

const descriptionOptions: Array<{ label: string; value: DocumentDescriptionFilter }> = [
  { label: '全部', value: 'all' },
  { label: '有描述', value: 'with' },
  { label: '无描述', value: 'without' },
]

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function sameCategoryFilter(left: DocumentCategoryFilter, right: DocumentCategoryFilter) {
  return left.level === right.level
    && left.value === right.value
    && left.parent === right.parent
    && left.grandparent === right.grandparent
}

function categoryFilterLabel(filter: DocumentCategoryFilter) {
  return [filter.grandparent, filter.parent, filter.value].filter(Boolean).join(' / ')
}

function visibleCategoryFilters(graph: DocumentCollectionGraph, query: string) {
  const keyword = query.trim()
  return buildDocumentCategoryTree(graph).flatMap((branch) => {
    const filters: DocumentCategoryFilter[] = [{ level: 1, value: branch.name }]
    branch.children.forEach((second) => {
      filters.push({ level: 2, parent: branch.name, value: second.name })
      second.children.forEach((third) => {
        filters.push({ level: 3, grandparent: branch.name, parent: second.name, value: third })
      })
    })
    return filters
  }).filter((filter) => !keyword || categoryFilterLabel(filter).includes(keyword))
}

export function DocumentGraphControlsPanel({
  graph,
  visibleGraph,
  filter,
  searchDraft,
  categoryTreeQuery,
  onSearchDraftChange,
  onSearchSubmit,
  onCategoryTreeQueryChange,
  onFilterChange,
  onReset,
}: DocumentGraphControlsPanelProps) {
  const nodeTypes = documentGraphNodeTypes.filter((type) => (
    Object.values(graph.nodes).some((node) => node.type === type) || type === 'description_group'
  ))
  const edgeTypes = Array.from(new Set(Object.values(graph.edges).map((edge) => edge.type))).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
  const categories = visibleCategoryFilters(graph, categoryTreeQuery)
  const activeCategoryFilters = filter.categoryFilters ?? []

  return (
    <aside className="document-graph-controls" aria-label="图谱筛选">
      <div className="document-panel-heading document-panel-heading-compact">
        <div>
          <h2>山海经图谱</h2>
          <p>{Object.keys(visibleGraph.nodes).length} 个节点，{Object.keys(visibleGraph.edges).length} 条关系</p>
        </div>
      </div>

      <div className="document-filter-section">
        <label className="field-label">搜索</label>
        <Space.Compact className="document-filter-search">
          <Input
            allowClear
            value={searchDraft}
            placeholder="输入术语、类目或描述"
            onChange={(event) => onSearchDraftChange(event.target.value)}
            onPressEnter={onSearchSubmit}
          />
          <Button icon={<SearchOutlined />} onClick={onSearchSubmit}>
            搜索
          </Button>
        </Space.Compact>
        {filter.focusNodeId ? <Alert type="info" showIcon title="聚焦时暂时忽略关键词。" /> : null}
      </div>

      <div className="document-filter-section">
        <label className="field-label">是否有描述</label>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          options={descriptionOptions}
          value={filter.description}
          onChange={(event) => onFilterChange({ ...filter, description: event.target.value })}
        />
      </div>

      <div className="document-filter-section">
        <label className="field-label">层级类目关联展示筛选</label>
        <Input
          allowClear
          value={categoryTreeQuery}
          placeholder="筛选类目"
          onChange={(event) => onCategoryTreeQueryChange(event.target.value)}
        />
        <div className="document-category-filter-list">
          {categories.length > 0 ? categories.slice(0, 80).map((category) => {
            const active = activeCategoryFilters.some((item) => sameCategoryFilter(item, category))
            return (
              <button
                type="button"
                className={active ? 'document-category-filter document-category-filter-active' : 'document-category-filter'}
                key={`${category.level}:${category.grandparent ?? ''}:${category.parent ?? ''}:${category.value}`}
                onClick={() => {
                  const nextCategoryFilters = active
                    ? activeCategoryFilters.filter((item) => !sameCategoryFilter(item, category))
                    : [...activeCategoryFilters, category]
                  onFilterChange({
                    ...filter,
                    focusNodeId: undefined,
                    focusRecordId: undefined,
                    categoryLevel: category.level,
                    categories: nextCategoryFilters.map((item) => item.value),
                    categoryFilters: nextCategoryFilters,
                  })
                }}
              >
                <span>{categoryFilterLabel(category)}</span>
                <Tag>{category.level}级</Tag>
              </button>
            )
          }) : <span className="document-muted">暂无类目</span>}
        </div>
      </div>

      <div className="document-filter-section">
        <label className="field-label">实体角色</label>
        <div className="document-check-list">
          {documentGraphEntityRoles.map((role) => (
            <Checkbox
              key={role}
              checked={(filter.entityRoles ?? []).includes(role)}
              onChange={() => onFilterChange({ ...filter, entityRoles: toggleValue(filter.entityRoles ?? [], role) })}
            >
              {role}
            </Checkbox>
          ))}
        </div>
      </div>

      <div className="document-filter-section">
        <label className="field-label">节点类型</label>
        <div className="document-check-list">
          {nodeTypes.map((type) => (
            <Checkbox
              key={type}
              checked={filter.nodeTypes.includes(type)}
              onChange={() => onFilterChange({ ...filter, nodeTypes: toggleValue(filter.nodeTypes, type) })}
            >
              {type}
            </Checkbox>
          ))}
        </div>
      </div>

      <div className="document-filter-section">
        <label className="field-label">关系类型</label>
        <div className="document-check-list">
          {edgeTypes.map((type) => (
            <Checkbox
              key={type}
              checked={filter.edgeTypes.includes(type)}
              onChange={() => onFilterChange({ ...filter, edgeTypes: toggleValue(filter.edgeTypes, type) })}
            >
              {type}
            </Checkbox>
          ))}
        </div>
      </div>

      <Button block icon={<ReloadOutlined />} onClick={onReset}>
        重置视图
      </Button>
    </aside>
  )
}
