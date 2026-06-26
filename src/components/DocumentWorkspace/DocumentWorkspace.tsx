import { useEffect } from 'react'
import { Alert, message, Progress } from 'antd'

import { DocumentCollectionToolbar } from './DocumentCollectionToolbar'
import { DocumentGraphCanvasPanel } from './DocumentGraphCanvasPanel'
import { DocumentGraphControlsPanel } from './DocumentGraphControlsPanel'
import { DocumentGraphDetailsPanel } from './DocumentGraphDetailsPanel'
import { contextActionForDocumentNode } from './documentGraphViewModel'
import { useDocumentWorkspace } from './useDocumentWorkspace'
import './documentWorkspace.css'

export function DocumentWorkspace() {
  const [messageApi, contextHolder] = message.useMessage()
  const workspace = useDocumentWorkspace(messageApi)

  useEffect(() => {
    void workspace.loadProjects()
  }, [])

  const focusedNodeId = workspace.graphFilter.focusNodeId
  const focusedNode = focusedNodeId
    ? workspace.collectionGraph.nodes[focusedNodeId] ?? workspace.visibleGraph.nodes[focusedNodeId]
    : undefined

  return (
    <section className="document-workspace" aria-labelledby="document-workspace-title">
      {contextHolder}
      <div className="document-workspace-header">
        <div>
          <p className="kicker">项目知识库</p>
          <h2 id="document-workspace-title">知识库浏览与图谱</h2>
          <p>导入、检索并查看当前项目的知识节点关系。</p>
        </div>
        <div className="document-workspace-status">
          <span>集合</span>
          <strong>{workspace.collections.length}</strong>
        </div>
      </div>

      {!workspace.activeProject ? (
        <Alert type="warning" showIcon title="未选择项目" description="请先在项目空间启用或选择一个项目。" />
      ) : null}

      <DocumentCollectionToolbar workspace={workspace} />

      {workspace.importProgress ? (
        <div className="document-import-progress" role="status" aria-live="polite">
          <div>
            <strong>{workspace.importProgress.message}</strong>
            <span>
              {workspace.importProgress.counts
                ? `${workspace.importProgress.counts.records} 条记录 / ${workspace.importProgress.counts.nodes} 个节点 / ${workspace.importProgress.counts.edges} 条关系`
                : '准备知识库导入'}
            </span>
          </div>
          <Progress
            percent={workspace.importProgress.percent}
            size="small"
            status={workspace.importProgress.stage === 'failed' ? 'exception' : workspace.importing ? 'active' : 'success'}
          />
        </div>
      ) : null}

      <div className="document-graph-workspace">
        <DocumentGraphControlsPanel
          graph={workspace.collectionGraph}
          visibleGraph={workspace.visibleGraph}
          filter={workspace.graphFilter}
          searchDraft={workspace.searchDraft}
          categoryTreeQuery={workspace.categoryTreeQuery}
          onSearchDraftChange={workspace.setSearchDraft}
          onSearchSubmit={workspace.submitGraphSearch}
          onCategoryTreeQueryChange={workspace.setCategoryTreeQuery}
          onFilterChange={workspace.setGraphFilter}
          onReset={workspace.resetGraphView}
        />
        <DocumentGraphCanvasPanel
          mode={workspace.viewMode}
          graph={workspace.visibleGraph}
          focusNodeId={workspace.graphFilter.focusNodeId}
          onFocusNode={workspace.focusNode}
          onContextNode={(nodeId) => {
            const action = contextActionForDocumentNode(
              workspace.collectionGraph,
              workspace.visibleGraph,
              nodeId,
              workspace.graphFilter.focusRecordId,
            )
            if (action) workspace.applyNodeAction(action)
          }}
        />
        <DocumentGraphDetailsPanel
          graph={workspace.visibleGraph}
          node={focusedNode}
          onFocusNode={workspace.focusNode}
        />
      </div>
    </section>
  )
}
