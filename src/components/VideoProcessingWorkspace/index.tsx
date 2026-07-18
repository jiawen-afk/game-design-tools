import './video-processing-workspace.css'

import { VideoProcessingPreviewPanel } from './VideoProcessingPreviewPanel'
import { VideoProcessingQueuePanel } from './VideoProcessingQueuePanel'
import { VideoProcessingSettingsPanel } from './VideoProcessingSettingsPanel'
import { VideoProcessingToolbar } from './VideoProcessingToolbar'
import { useVideoProcessingWorkspace } from './useVideoProcessingWorkspace'

export default function VideoProcessingWorkspace() {
  const workspace = useVideoProcessingWorkspace()
  return (
    <section className="video-processing-workspace" aria-label="视频处理工作台">
      <VideoProcessingToolbar workspace={workspace} />
      <div className="video-processing-main">
        <VideoProcessingSettingsPanel workspace={workspace} />
        <VideoProcessingPreviewPanel workspace={workspace} />
      </div>
      <VideoProcessingQueuePanel workspace={workspace} />
    </section>
  )
}
