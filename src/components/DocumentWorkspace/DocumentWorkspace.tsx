import { useEffect } from 'react'
import { Alert, message } from 'antd'

import { DocumentBrowserPanel } from './DocumentBrowserPanel'
import { DocumentGraphPanel } from './DocumentGraphPanel'
import { useDocumentWorkspace } from './useDocumentWorkspace'
import './documentWorkspace.css'

export function DocumentWorkspace() {
  const [messageApi, contextHolder] = message.useMessage()
  const workspace = useDocumentWorkspace(messageApi)

  useEffect(() => {
    void workspace.loadProjects()
  }, [])

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

      <div className="document-workspace-layout">
        <DocumentBrowserPanel workspace={workspace} />
        <DocumentGraphPanel view={workspace.graphView} onSelectNode={(nodeId) => void workspace.selectNode(nodeId)} />
      </div>
    </section>
  )
}
