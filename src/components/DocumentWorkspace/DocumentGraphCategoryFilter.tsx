import React from 'react'
import { Button, Checkbox, Input, Tag } from 'antd'

import {
  buildDocumentCategoryTree,
  type DocumentCategoryBranch,
  type DocumentCategoryFilter,
  type DocumentGraphFilterState,
} from './documentGraphViewModel'
import type { DocumentCollectionGraph } from '../ProjectStorage'

interface DocumentGraphCategoryFilterProps {
  graph: DocumentCollectionGraph
  filter: DocumentGraphFilterState
  categoryTreeQuery: string
  onCategoryTreeQueryChange: (value: string) => void
  onFilterChange: (filter: DocumentGraphFilterState) => void
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

function categoryFilterKey(filter: DocumentCategoryFilter) {
  return `${filter.level}:${filter.grandparent ?? ''}:${filter.parent ?? ''}:${filter.value}`
}

function categoryTreeMatches(branch: DocumentCategoryBranch, keyword: string): DocumentCategoryBranch | undefined {
  if (!keyword) return branch
  const branchMatches = branch.name.includes(keyword)
  const children = branch.children
    .map((second) => {
      const secondMatches = second.name.includes(keyword)
      const thirds = branchMatches || secondMatches
        ? second.children
        : second.children.filter((third) => third.includes(keyword))
      if (branchMatches || secondMatches || thirds.length > 0) {
        return { ...second, children: thirds }
      }
      return undefined
    })
    .filter((item): item is DocumentCategoryBranch['children'][number] => Boolean(item))
  if (branchMatches || children.length > 0) return { ...branch, children }
  return undefined
}

function visibleCategoryTree(graph: DocumentCollectionGraph, query: string) {
  const keyword = query.trim()
  return buildDocumentCategoryTree(graph)
    .map((branch) => categoryTreeMatches(branch, keyword))
    .filter((item): item is DocumentCategoryBranch => Boolean(item))
}

export function DocumentGraphCategoryFilter({
  graph,
  filter,
  categoryTreeQuery,
  onCategoryTreeQueryChange,
  onFilterChange,
}: DocumentGraphCategoryFilterProps) {
  const categoryTree = visibleCategoryTree(graph, categoryTreeQuery)
  const activeCategoryFilters = filter.categoryFilters ?? []
  const categoryTreeExpanded = Boolean(categoryTreeQuery.trim())
  const hasActiveCategory = (category: DocumentCategoryFilter) => activeCategoryFilters.some((item) => sameCategoryFilter(item, category))
  const hasActiveDescendant = (branch: DocumentCategoryBranch, secondName?: string) => activeCategoryFilters.some((item) => {
    if (secondName) {
      return (item.parent === branch.name && item.value === secondName)
        || (item.grandparent === branch.name && item.parent === secondName)
    }
    return item.value === branch.name || item.parent === branch.name || item.grandparent === branch.name
  })
  const updateCategoryFilters = (nextCategoryFilters: DocumentCategoryFilter[]) => {
    onFilterChange({
      ...filter,
      focusNodeId: undefined,
      focusRecordId: undefined,
      categoryLevel: nextCategoryFilters.at(-1)?.level,
      categories: nextCategoryFilters.map((item) => item.value),
      categoryFilters: nextCategoryFilters,
    })
  }
  const toggleCategoryFilter = (category: DocumentCategoryFilter) => {
    const active = hasActiveCategory(category)
    updateCategoryFilters(active
      ? activeCategoryFilters.filter((item) => !sameCategoryFilter(item, category))
      : [...activeCategoryFilters, category])
  }
  const stopSummaryToggle = (event: React.MouseEvent) => {
    event.stopPropagation()
  }

  return (
    <div className="document-filter-section">
      <label className="field-label">层级类目关联展示筛选</label>
      <Input
        allowClear
        value={categoryTreeQuery}
        placeholder="筛选类目"
        onChange={(event) => onCategoryTreeQueryChange(event.target.value)}
      />
      {activeCategoryFilters.length > 0 ? (
        <div className="document-active-category-filters">
          <div>
            <span>已筛选类目</span>
            <Button size="small" type="link" onClick={() => updateCategoryFilters([])}>
              清空类目筛选
            </Button>
          </div>
          <div className="document-active-category-tags">
            {activeCategoryFilters.map((category) => (
              <Tag key={categoryFilterKey(category)}>{categoryFilterLabel(category)}</Tag>
            ))}
          </div>
        </div>
      ) : null}
      <div className="document-category-tree">
        {categoryTree.length > 0 ? categoryTree.map((branch) => {
          const branchFilter: DocumentCategoryFilter = { level: 1, value: branch.name }
          return (
            <details
              className="document-category-branch"
              key={branch.name}
              open={categoryTreeExpanded || hasActiveDescendant(branch)}
            >
              <summary className="document-category-summary">
                <span onClick={stopSummaryToggle}>
                  <Checkbox
                    checked={hasActiveCategory(branchFilter)}
                    onChange={() => toggleCategoryFilter(branchFilter)}
                  >
                    {branch.name}
                  </Checkbox>
                </span>
                <Tag>{branch.children.length} 类</Tag>
              </summary>
              <div className="document-category-children">
                {branch.children.map((second) => {
                  const secondFilter: DocumentCategoryFilter = { level: 2, parent: branch.name, value: second.name }
                  return (
                    <details
                      className="document-category-branch document-category-branch-nested"
                      key={`${branch.name}:${second.name}`}
                      open={categoryTreeExpanded || hasActiveDescendant(branch, second.name)}
                    >
                      <summary className="document-category-summary">
                        <span onClick={stopSummaryToggle}>
                          <Checkbox
                            checked={hasActiveCategory(secondFilter)}
                            onChange={() => toggleCategoryFilter(secondFilter)}
                          >
                            {second.name}
                          </Checkbox>
                        </span>
                        <Tag>{second.children.length} 项</Tag>
                      </summary>
                      {second.children.length > 0 ? (
                        <div className="document-category-leaves">
                          {second.children.map((third) => {
                            const thirdFilter: DocumentCategoryFilter = {
                              level: 3,
                              grandparent: branch.name,
                              parent: second.name,
                              value: third,
                            }
                            return (
                              <div className="document-category-leaf" key={`${branch.name}:${second.name}:${third}`}>
                                <Checkbox
                                  checked={hasActiveCategory(thirdFilter)}
                                  onChange={() => toggleCategoryFilter(thirdFilter)}
                                >
                                  {third}
                                </Checkbox>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </details>
                  )
                })}
              </div>
            </details>
          )
        }) : <span className="document-muted">暂无类目</span>}
      </div>
    </div>
  )
}
