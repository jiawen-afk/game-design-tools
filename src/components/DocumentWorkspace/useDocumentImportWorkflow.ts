import { useCallback, useState } from 'react'

import type { DocumentCollection, Project, ProjectRepository } from '../ProjectStorage'
import {
  importKnowledgeBaseFile,
  type KnowledgeBaseFileLike,
  type KnowledgeBaseImportProgress,
} from './documentKnowledgeImportService'

interface DocumentImportWorkflowMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

export interface UseDocumentImportWorkflowParams {
  activeProject: Project | null
  selectedCollection: DocumentCollection | null
  defaultCollectionName: string
  repositoryForProject: (project: Project) => ProjectRepository
  loadCollectionsForProject: (project: Project, preferredCollectionId?: string) => Promise<void>
  messageApi: DocumentImportWorkflowMessageApi
}

export function useDocumentImportWorkflow({
  activeProject,
  selectedCollection,
  defaultCollectionName,
  repositoryForProject,
  loadCollectionsForProject,
  messageApi,
}: UseDocumentImportWorkflowParams) {
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<KnowledgeBaseImportProgress | null>(null)

  const clearImportProgress = useCallback(() => {
    setImportProgress(null)
  }, [])

  const importFile = useCallback(async (file: KnowledgeBaseFileLike) => {
    if (!activeProject) {
      messageApi.warning('请先选择项目。')
      return
    }
    setImporting(true)
    setImportProgress(null)
    try {
      const repository = repositoryForProject(activeProject)
      const result = await importKnowledgeBaseFile({
        repository,
        projectId: activeProject.id,
        collectionName: selectedCollection?.name ?? defaultCollectionName,
        file,
        onProgress: setImportProgress,
      })
      messageApi.success('知识库导入完成。')
      await loadCollectionsForProject(activeProject, result.collection.id)
    } catch (error) {
      setImportProgress({
        stage: 'failed',
        message: '导入失败',
        percent: 100,
      })
      messageApi.error(`导入失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setImporting(false)
    }
  }, [
    activeProject,
    defaultCollectionName,
    loadCollectionsForProject,
    messageApi,
    repositoryForProject,
    selectedCollection,
  ])

  return {
    clearImportProgress,
    importFile,
    importing,
    importProgress,
  }
}
