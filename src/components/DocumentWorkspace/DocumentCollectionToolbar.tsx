import React from 'react'
import { DeleteOutlined, ImportOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Popconfirm, Progress, Select, Upload } from 'antd'

import type { DocumentWorkspaceState } from './documentWorkspaceTypes'

interface DocumentCollectionToolbarProps {
  workspace: DocumentWorkspaceState
  showRefresh?: boolean
}

export function DocumentCollectionToolbar({ workspace, showRefresh = true }: DocumentCollectionToolbarProps) {
  return (
    <>
      <section className="document-collection-toolbar document-collection-summary-bar" aria-label="知识库集合">
        <label className="document-current-collection">
          <span className="field-label">当前集合</span>
          <Select
            value={workspace.selectedCollectionId || undefined}
            placeholder="暂无集合"
            disabled={!workspace.activeProject || workspace.collections.length === 0}
            options={workspace.collections.map((collection) => ({
              label: collection.name,
              value: collection.id,
            }))}
            onChange={workspace.changeCollection}
          />
        </label>

        <div className="document-summary-row" aria-label="集合统计">
          <div>
            <span>记录</span>
            <strong>{workspace.selectedCollection?.record_count ?? 0}</strong>
          </div>
          <div>
            <span>节点</span>
            <strong>{workspace.selectedCollection?.node_count ?? 0}</strong>
          </div>
          <div>
            <span>关系</span>
            <strong>{workspace.selectedCollection?.edge_count ?? 0}</strong>
          </div>
        </div>

        <div className="document-collection-actions">
          <Upload
            accept=".json,application/json"
            beforeUpload={(file) => {
              void workspace.importFile(file)
              return Upload.LIST_IGNORE
            }}
            disabled={!workspace.activeProject || workspace.importing}
            maxCount={1}
            showUploadList={false}
          >
            <Button type="primary" icon={<ImportOutlined />} loading={workspace.importing}>
              导入
            </Button>
          </Upload>
          <Popconfirm
            title="删除知识库集合"
            description="删除后将移除该集合的记录、节点和关系。"
            okText="删除集合"
            cancelText="取消"
            disabled={!workspace.selectedCollection}
            onConfirm={workspace.deleteSelectedCollection}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!workspace.selectedCollection}>
              删除集合
            </Button>
          </Popconfirm>
          {showRefresh ? (
            <Button icon={<ReloadOutlined />} loading={workspace.loading} onClick={workspace.refreshCollections}>
              刷新
            </Button>
          ) : null}
        </div>
      </section>
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
    </>
  )
}
