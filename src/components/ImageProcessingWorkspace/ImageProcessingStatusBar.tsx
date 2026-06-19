import { Typography } from 'antd'

import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

export interface ImageProcessingStatusBarProps {
  workspace: ImageProcessingWorkspaceViewModel
}

function sizeText(width?: number, height?: number) {
  if (!width || !height) return '-'
  return `${Math.round(width)} x ${Math.round(height)}`
}

export function ImageProcessingStatusBar({ workspace }: ImageProcessingStatusBarProps) {
  return (
    <div className="image-processing-status">
      <Text type="secondary">源图：{sizeText(workspace.draft?.width, workspace.draft?.height)}</Text>
      <Text type="secondary">处理后：{sizeText(workspace.activeImageSource?.width, workspace.activeImageSource?.height)}</Text>
      <Text type="secondary">裁剪：{sizeText(workspace.crop?.width, workspace.crop?.height)}</Text>
      <Text type="secondary">导出：{sizeText(workspace.exportSize.width, workspace.exportSize.height)}</Text>
      <Text type="secondary">{workspace.exporting ? '正在导出' : workspace.processing ? '正在处理' : '就绪'}</Text>
    </div>
  )
}
