export interface ShjGraphNode {
  id: string
  label: string
  type: string
  records?: string[]
  data?: Record<string, unknown>
}

export interface ShjGraphEdge {
  id: string
  source: string
  target: string
  type: string
  label?: string
  weight?: number
  record_ids?: string[]
  source_kind?: string
  data?: Record<string, unknown>
}

export interface ShjGraphData {
  nodes: Record<string, ShjGraphNode>
  edges: Record<string, ShjGraphEdge>
}

export const shjGraphSourceType = 'shj_nlc_graph'
export const acceptedFileName = 'entity_graph.json'

export const nodeTypeLabels: Record<string, string> = {
  book: '书目',
  chapter: '篇章',
  descriptor: '描述',
  entity: '实体',
  version: '版本',
}

export const edgeTypeLabels: Record<string, string> = {
  HAS_CATEGORY_1: '一级类目',
  HAS_CATEGORY_2: '二级类目',
  HAS_CATEGORY_3: '三级类目',
  HAS_VERSION: '版本',
  IN_BOOK: '书目',
  IN_CHAPTER: '篇章',
  LOCATED_IN: '地点',
  PART_OF_PLACE: '地点层级',
  site_relation: '站点关系',
}
