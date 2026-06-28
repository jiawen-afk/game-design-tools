import type { DocumentCollectionGraph } from '../ProjectStorage'
import { detailRelationType, siteRelationType } from './documentGraphCoreModel'

export const documentGraphNodeTypes = ['entity', 'term', 'category', 'place', 'book', 'chapter', 'version', 'descriptor', 'description_group']
export const documentGraphEntityRoles = ['term', 'place', 'category']

const documentGraphNodeTypeLabels: Record<string, string> = {
  entity: '词条实体',
  term: '术语',
  category: '类目',
  place: '属地',
  book: '出处书',
  chapter: '章节',
  version: '版本',
  descriptor: '描述特征',
  description_group: '描述',
}
const documentGraphEntityRoleLabels: Record<string, string> = {
  term: '词条',
  place: '属地',
  category: '类目',
}
const documentGraphEdgeTypeLabels: Record<string, string> = {
  HAS_CATEGORY: '类目',
  HAS_CATEGORY_1: '一级类目',
  HAS_CATEGORY_2: '二级类目',
  HAS_CATEGORY_3: '三级类目',
  LOCATED_IN: '属地',
  PART_OF_PLACE: '属地层级',
  IN_BOOK: '出处书',
  IN_CHAPTER: '出处章节',
  HAS_VERSION: '版本',
  [detailRelationType]: '详情页关系',
  [siteRelationType]: '详情页关系',
}
const documentGraphEdgeTypeOrder = [
  detailRelationType,
  siteRelationType,
  'HAS_CATEGORY_1',
  'HAS_CATEGORY_2',
  'HAS_CATEGORY_3',
  'HAS_CATEGORY',
  'LOCATED_IN',
  'PART_OF_PLACE',
  'IN_BOOK',
  'IN_CHAPTER',
  'HAS_VERSION',
]

export function documentGraphNodeTypeLabel(type: string) {
  return documentGraphNodeTypeLabels[type] ?? type
}

export function documentGraphEntityRoleLabel(role: string) {
  return documentGraphEntityRoleLabels[role] ?? role
}

export function documentGraphEdgeTypeLabel(type: string) {
  return documentGraphEdgeTypeLabels[type] ?? type
}

export function allDocumentEdgeTypes(graph: DocumentCollectionGraph): string[] {
  return Array.from(new Set(Object.values(graph.edges).map((edge) => edge.type))).sort((left, right) => {
    const leftOrder = documentGraphEdgeTypeOrder.indexOf(left)
    const rightOrder = documentGraphEdgeTypeOrder.indexOf(right)
    if (leftOrder !== -1 || rightOrder !== -1) {
      return (leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder)
        - (rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder)
    }
    return left.localeCompare(right, 'zh-Hans-CN')
  })
}
