import React from 'react'
import { DeleteOutlined, ImportOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Popconfirm, Select, Upload } from 'antd'

import type { DocumentWorkspaceState } from './documentWorkspaceTypes'

interface DocumentCollectionToolbarProps {
  workspace: DocumentWorkspaceState
}

export function DocumentCollectionToolbar({ workspace }: DocumentCollectionToolbarProps) {
  return (
    <section className="document-collection-toolbar" aria-label="知识库集合">
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
        <Button icon={<ReloadOutlined />} loading={workspace.loading} onClick={workspace.refreshCollections}>
          刷新
        </Button>
      </div>
    </section>
  )
}
