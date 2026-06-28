import type { DocumentCollectionGraph } from '../ProjectStorage'
import type { DocumentCategoryBranch } from './documentGraphTypes'
import { categoryPathsForDocumentGraphNode } from './documentGraphCoreModel'

export function buildDocumentCategoryTree(graph: DocumentCollectionGraph): DocumentCategoryBranch[] {
  const branches = new Map<string, Map<string, Set<string>>>()
  Object.values(graph.nodes).forEach((node) => {
    categoryPathsForDocumentGraphNode(node).forEach((path) => {
      const [first = '', second = '', third = ''] = path.map((item) => item.trim())
      if (!first) return
      const seconds = branches.get(first) ?? new Map<string, Set<string>>()
      if (second) {
        const thirds = seconds.get(second) ?? new Set<string>()
        if (third) thirds.add(third)
        seconds.set(second, thirds)
      }
      branches.set(first, seconds)
    })
  })
  return Array.from(branches.entries())
    .map(([name, seconds]) => ({
      name,
      children: Array.from(seconds.entries())
        .map(([secondName, thirds]) => ({
          name: secondName,
          children: Array.from(thirds).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN')),
        }))
        .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN')),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
}
