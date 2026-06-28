import { Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import type { DocumentWorkspaceState } from './documentWorkspaceTypes'
import { DocumentCollectionToolbar } from './DocumentCollectionToolbar'
import { DocumentSearchResults } from './DocumentSearchResults'

interface DocumentBrowserPanelProps {
  workspace: DocumentWorkspaceState
}

export function DocumentBrowserPanel({ workspace }: DocumentBrowserPanelProps) {
  return (
    <section className="document-browser-panel" aria-label="知识库浏览">
      <div className="document-panel-heading">
        <div>
          <h2>知识库</h2>
          <p>按集合检索节点、记录与邻域图谱。</p>
        </div>
        <Button icon={<ReloadOutlined />} loading={workspace.loading} onClick={workspace.loadProjects}>
          刷新
        </Button>
      </div>

      <DocumentCollectionToolbar workspace={workspace} showRefresh={false} />
      <DocumentSearchResults workspace={workspace} />
    </section>
  )
}
