import type { KnowledgeBaseImportAdapter } from './documentKnowledgeTypes'
import { convertSource } from './shjGraphImportConverter'
import {
  acceptedFileName,
  edgeTypeLabels,
  nodeTypeLabels,
  shjGraphSourceType,
} from './shjGraphTypes'
import { validateSource } from './shjGraphValidation'

export const shjGraphImportAdapter: KnowledgeBaseImportAdapter = {
  sourceType: shjGraphSourceType,
  displayName: '山海经实体图谱',
  acceptedFileNames: [acceptedFileName],
  validateSource,
  convertSource,
  getNodeTypeLabel: (nodeType) => nodeTypeLabels[nodeType] ?? nodeType,
  getEdgeTypeLabel: (edgeType) => edgeTypeLabels[edgeType] ?? edgeType,
}
