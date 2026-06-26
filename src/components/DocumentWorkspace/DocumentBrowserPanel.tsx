import { Button, Descriptions, Empty, Input, Popconfirm, Select, Skeleton, Space, Table, Tabs, Tag, Upload } from 'antd'
import {
  DeleteOutlined,
  FileSearchOutlined,
  ImportOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'

import type { DocumentWorkspaceState } from './documentWorkspaceTypes'
import type { DocumentNode } from '../ProjectStorage'

interface DocumentBrowserPanelProps {
  workspace: DocumentWorkspaceState
}

export function DocumentBrowserPanel({ workspace }: DocumentBrowserPanelProps) {
  const resultsLoading = workspace.loading || workspace.searching
  const nodeColumns = [
    {
      title: '节点',
      dataIndex: 'label',
      key: 'label',
      render: (value: string, record: DocumentNode) => (
        <Space size={6} wrap>
          <span className="document-node-label">{value}</span>
          <Tag>{record.node_type}</Tag>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value: string) => value || '无',
    },
  ]

  return (
    <section className="document-browser-panel" aria-label="知识库浏览">
      <div className="document-panel-heading">
        <div>
          <h2>知识库</h2>
          <p>{workspace.activeProject ? workspace.activeProject.name : '未选择项目'}</p>
        </div>
        <Button icon={<ReloadOutlined />} loading={workspace.loading} onClick={workspace.loadProjects}>
          刷新
        </Button>
      </div>

      <div className="document-control-grid">
        <label>
          <span className="field-label">项目</span>
          <Select
            value={workspace.selectedProjectId || undefined}
            placeholder="选择项目"
            options={workspace.projects.map((project) => ({
              label: project.name,
              value: project.id,
            }))}
            onChange={workspace.changeProject}
          />
        </label>
        <label>
          <span className="field-label">集合</span>
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
      </div>

      <div className="document-import-row">
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
            导入 entity_graph.json
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
      </div>

      <div className="document-summary-row">
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

      <Space.Compact className="document-search">
        <Input
          allowClear
          prefix={<FileSearchOutlined />}
          placeholder="搜索节点、类目、出处"
          value={workspace.query}
          onChange={(event) => workspace.setQuery(event.target.value)}
          onPressEnter={() => void workspace.runSearch()}
        />
        <Button icon={<SearchOutlined />} loading={workspace.searching} onClick={() => void workspace.runSearch()}>
          搜索
        </Button>
      </Space.Compact>

      {workspace.sources.length > 0 ? (
        <div className="document-source-list">
          {workspace.sources.map((source) => (
            <span key={source.id}>
              {source.file_name} · {Math.round(source.size_bytes / 1024)} KB · {source.hash_sha256?.slice(0, 10) ?? '无指纹'}
            </span>
          ))}
        </div>
      ) : null}

      <Skeleton active loading={resultsLoading} paragraph={{ rows: 8 }} className="document-result-skeleton">
        <Tabs
          className="document-result-tabs"
          size="small"
          items={[
            {
              key: 'nodes',
              label: `节点 ${workspace.nodeResults.total}`,
              children: (
                <Table
                  className="document-node-table"
                  columns={nodeColumns}
                  dataSource={workspace.nodeResults.items}
                  loading={workspace.searching}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无节点" /> }}
                  pagination={false}
                  rowClassName={(record) => (record.id === workspace.selectedNodeDetails?.node.id ? 'document-node-row-selected' : '')}
                  rowKey="id"
                  size="small"
                  onRow={(record) => ({
                    onClick: () => void workspace.selectNode(record.id),
                  })}
                />
              ),
            },
            {
              key: 'records',
              label: `记录 ${workspace.recordResults.total}`,
              children: workspace.recordResults.items.length > 0 ? (
                <div className="document-record-list" role="list">
                  {workspace.recordResults.items.map((record) => (
                    <div className="document-record-item" role="listitem" key={record.id}>
                      <div>
                        <strong>{record.title}</strong>
                        <Tag>{record.record_type}</Tag>
                      </div>
                      <span>
                        {[record.category_1, record.category_2, record.place_path, record.book_title]
                          .filter(Boolean)
                          .join(' / ') || '无补充字段'}
                      </span>
                      {record.description ? <p>{record.description}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记录" />
              ),
            },
            {
              key: 'details',
              label: '详情',
              children: (
                <section className="document-detail-panel" aria-label="节点详情">
                  {workspace.selectedNodeDetails ? (
                    <>
                      <div className="document-detail-title">
                        <div>
                          <h3>{workspace.selectedNodeDetails.node.label}</h3>
                          <Tag color="processing">{workspace.selectedNodeDetails.node.node_type}</Tag>
                        </div>
                        <span>{workspace.neighbors.length} 个相邻节点</span>
                      </div>
                      <p>{workspace.selectedNodeDetails.node.description || '无描述'}</p>
                      <Descriptions size="small" column={1}>
                        {workspace.selectedNodeDetails.records.slice(0, 3).map((record) => (
                          <Descriptions.Item key={record.id} label={record.title}>
                            {[record.category_1, record.category_2, record.place_path, record.book_title]
                              .filter(Boolean)
                              .join(' / ') || '无补充字段'}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                      {workspace.recordResults.items.length > 0 ? (
                        <div className="document-record-hints">
                          {workspace.recordResults.items.map((record) => (
                            <Tag key={record.id}>{record.title}</Tag>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未选择节点" />
                  )}
                </section>
              ),
            },
          ]}
        />
      </Skeleton>
    </section>
  )
}
