import { Button, Descriptions, Empty, Input, Skeleton, Space, Table, Tabs, Tag } from 'antd'
import { FileSearchOutlined, SearchOutlined } from '@ant-design/icons'

import type { DocumentWorkspaceState } from './documentWorkspaceTypes'
import type { DocumentNode } from '../ProjectStorage'

interface DocumentSearchResultsProps {
  workspace: DocumentWorkspaceState
}

export function DocumentSearchResults({ workspace }: DocumentSearchResultsProps) {
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
    <>
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
    </>
  )
}
