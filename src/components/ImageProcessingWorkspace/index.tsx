import { Tabs } from 'antd'

import { ImageCropPanel } from './ImageCropPanel'
import { ImageCropResultStage } from './ImageCropResultStage'
import { ImageExportPanel } from './ImageExportPanel'
import { ImageMattePanel } from './ImageMattePanel'
import { ImageProcessingStatusBar } from './ImageProcessingStatusBar'
import { ImageProcessingToolbar } from './ImageProcessingToolbar'
import { useImageProcessingWorkspace } from './useImageProcessingWorkspace'
import './workspace.css'

export default function ImageProcessingWorkspace() {
  const workspace = useImageProcessingWorkspace()
  const controlTabs = [
    { key: 'matte', label: '抠图', children: <ImageMattePanel workspace={workspace} /> },
    { key: 'crop', label: '裁剪', children: <ImageCropPanel workspace={workspace} /> },
    { key: 'export', label: '导出', children: <ImageExportPanel workspace={workspace} /> },
  ]

  return (
    <div className="image-processing-workspace">
      <ImageProcessingToolbar workspace={workspace} />
      <div className="image-processing-grid">
        <div className="image-processing-side">
          <Tabs className="image-processing-tabs" defaultActiveKey="matte" items={controlTabs} />
        </div>
        <div className="image-processing-main">
          <ImageCropResultStage workspace={workspace} />
        </div>
      </div>
      <ImageProcessingStatusBar workspace={workspace} />
    </div>
  )
}
