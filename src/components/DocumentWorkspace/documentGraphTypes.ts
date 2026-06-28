import type { DocumentGraphNode } from '../ProjectStorage'

export type DocumentDescriptionFilter = 'all' | 'with' | 'without'
export type DocumentCategoryLevel = 1 | 2 | 3

export interface DocumentCategoryFilter {
  level: DocumentCategoryLevel
  value: string
  grandparent?: string
  parent?: string
}

export interface DocumentGraphFilterState {
  query: string
  categories: string[]
  categoryLevel?: DocumentCategoryLevel
  categoryFilters?: DocumentCategoryFilter[]
  entityRoles?: string[]
  description: DocumentDescriptionFilter
  nodeTypes: string[]
  edgeTypes: string[]
  focusNodeId?: string
  focusRecordId?: string
}

export type DocumentNodeAction =
  | { type: 'focus'; nodeId: string; recordId?: string }
  | { type: 'category_filter'; categoryLevel: DocumentCategoryLevel; category: string; parent?: string; grandparent?: string }

export interface DocumentCategoryBranch {
  name: string
  children: Array<{ name: string; children: string[] }>
}

export interface DocumentGraphNodeDetails {
  node: DocumentGraphNode
  neighbors: Array<{
    id: string
    label: string
    edgeLabel: string
    focusable: boolean
    children?: Array<{ id: string; label: string; edgeLabel: string; focusable: boolean }>
  }>
}

export interface DocumentGraphChartNode {
  id: string
  name: string
  category: number
  symbolSize: number
  itemStyle?: { color: string }
}

export interface DocumentGraphChartLink {
  source: string
  target: string
  value: string
  silent: boolean
}

export interface DocumentGraphChartOption {
  legend: { data: string[]; y: string }
  tooltip: { show: boolean }
  series: Array<{
    type: 'graph'
    layout: 'force'
    roam: boolean
    symbolSize: number
    categories: Array<{ name: string }>
    data: DocumentGraphChartNode[]
    links: DocumentGraphChartLink[]
    draggable: boolean
    force: { gravity: number; edgeLength: number; layoutAnimation: boolean; repulsion: number }
    lineStyle: { color: string; width: number; type: 'solid'; curveness: number; opacity: number }
    label: { show: boolean; position: string; distance: number; fontSize: number; align: string }
    edgeSymbol: [string, string]
    legendHoverLink: boolean
    focusNodeAdjacency: boolean
    edgeLabel: { show: boolean; position: string; fontSize: number; formatter: string }
  }>
}
