import { Button, Empty, Space, Typography } from 'antd'

import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

export interface ImageBatchListPanelProps {
  workspace: ImageProcessingWorkspaceViewModel
}

export function ImageBatchListPanel({ workspace }: ImageBatchListPanelProps) {
  return (
    <section className="image-batch-list">
      <div className="image-batch-list-heading">
        <Text strong>待处理图片</Text>
        <Text type="secondary">{workspace.batchImages.length} 张</Text>
      </div>
      {workspace.batchImages.length > 0 ? (
        <div className="image-batch-items">
          {workspace.batchImages.map((item) => {
            const active = item.id === workspace.activeBatchImageId
            return (
              <Button
                key={item.id}
                type={active ? 'primary' : 'default'}
                className="image-batch-item"
                onClick={() => workspace.selectBatchImage(item.id)}
                title={item.draft.sourceName}
              >
                <img src={item.draft.sourceUrl} alt="" />
                <span>
                  <Text strong={active}>{item.draft.sourceName}</Text>
                  <Text type="secondary">{item.draft.width} × {item.draft.height}</Text>
                </span>
              </Button>
            )
          })}
        </div>
      ) : (
        <Space direction="vertical" size={6} className="image-batch-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待处理图片" />
          <Text type="secondary">从顶部上传入口选择多张图片，或拖入右侧预览区。</Text>
        </Space>
      )}
    </section>
  )
}
