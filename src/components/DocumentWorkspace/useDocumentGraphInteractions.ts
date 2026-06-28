import { useCallback } from 'react'
import type * as React from 'react'

import type { DocumentCollectionGraph } from '../ProjectStorage'
import {
  createDefaultDocumentGraphFilter,
  focusTargetForDocumentNode,
  type DocumentDescriptionFilter,
  type DocumentGraphFilterState,
  type DocumentNodeAction,
} from './documentGraphViewModel'

export interface UseDocumentGraphInteractionsParams {
  collectionGraph: DocumentCollectionGraph
  visibleGraph: DocumentCollectionGraph
  graphFilter: DocumentGraphFilterState
  setGraphFilter: React.Dispatch<React.SetStateAction<DocumentGraphFilterState>>
  searchDraft: string
  setSearchDraft: React.Dispatch<React.SetStateAction<string>>
  setCategoryTreeQuery: React.Dispatch<React.SetStateAction<string>>
}

export function useDocumentGraphInteractions({
  collectionGraph,
  visibleGraph,
  graphFilter,
  setGraphFilter,
  searchDraft,
  setSearchDraft,
  setCategoryTreeQuery,
}: UseDocumentGraphInteractionsParams) {
  const focusNode = useCallback((nodeId: string, recordId?: string) => {
    const target = focusTargetForDocumentNode(collectionGraph, visibleGraph, nodeId, recordId ?? graphFilter.focusRecordId)
    if (!target) return
    setGraphFilter((current) => ({
      ...current,
      focusNodeId: target.nodeId,
      focusRecordId: target.recordId,
    }))
  }, [collectionGraph, graphFilter.focusRecordId, setGraphFilter, visibleGraph])

  const applyNodeAction = useCallback((action: DocumentNodeAction) => {
    if (action.type === 'focus') {
      focusNode(action.nodeId, action.recordId)
      return
    }
    setGraphFilter((current) => ({
      ...current,
      focusNodeId: undefined,
      focusRecordId: undefined,
      categoryLevel: action.categoryLevel,
      categories: [action.category],
      categoryFilters: [{
        level: action.categoryLevel,
        value: action.category,
        parent: action.parent,
        grandparent: action.grandparent,
      }],
    }))
  }, [focusNode, setGraphFilter])

  const submitGraphSearch = useCallback(() => {
    setGraphFilter((current) => ({
      ...current,
      query: searchDraft.trim(),
      focusNodeId: undefined,
      focusRecordId: undefined,
    }))
  }, [searchDraft, setGraphFilter])

  const resetGraphView = useCallback(() => {
    setSearchDraft('')
    setCategoryTreeQuery('')
    setGraphFilter(createDefaultDocumentGraphFilter(collectionGraph))
  }, [collectionGraph, setCategoryTreeQuery, setGraphFilter, setSearchDraft])

  const toggleGraphNodeType = useCallback((nodeType: string) => {
    setGraphFilter((current) => {
      const nodeTypes = current.nodeTypes.includes(nodeType)
        ? current.nodeTypes.filter((item) => item !== nodeType)
        : [...current.nodeTypes, nodeType]
      return { ...current, nodeTypes }
    })
  }, [setGraphFilter])

  const toggleGraphEdgeType = useCallback((edgeType: string) => {
    setGraphFilter((current) => {
      const edgeTypes = current.edgeTypes.includes(edgeType)
        ? current.edgeTypes.filter((item) => item !== edgeType)
        : [...current.edgeTypes, edgeType]
      return { ...current, edgeTypes }
    })
  }, [setGraphFilter])

  const toggleGraphEntityRole = useCallback((role: string) => {
    setGraphFilter((current) => {
      const currentRoles = current.entityRoles ?? []
      const entityRoles = currentRoles.includes(role)
        ? currentRoles.filter((item) => item !== role)
        : [...currentRoles, role]
      return { ...current, entityRoles }
    })
  }, [setGraphFilter])

  const changeDescriptionFilter = useCallback((value: DocumentDescriptionFilter) => {
    setGraphFilter((current) => ({ ...current, description: value }))
  }, [setGraphFilter])

  return {
    applyNodeAction,
    changeDescriptionFilter,
    focusNode,
    resetGraphView,
    submitGraphSearch,
    toggleGraphEdgeType,
    toggleGraphEntityRole,
    toggleGraphNodeType,
  }
}
