import {
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
} from './constants'
import { LayoutWorkspacePanel } from './LayoutWorkspacePanel'
import { MatteWorkspacePanel } from './MatteWorkspacePanel'
import { OutputWorkspacePanel } from './OutputWorkspacePanel'
import { UploadWorkspacePanel } from './UploadWorkspacePanel'
import { WorkspaceDialogs } from './WorkspaceDialogs'
import { WorkspaceShell } from './WorkspaceShell'
import { useSpriteWorkspaceController } from './useSpriteWorkspaceController'
import './workspace.css'

export default function MultiFrameSpriteWorkspace() {
  const workspace = useSpriteWorkspaceController()

  return (
    <WorkspaceShell>
      <UploadWorkspacePanel
        imageAccept={IMAGE_ACCEPT}
        videoAccept={VIDEO_ACCEPT}
        upload={workspace.upload}
        video={workspace.video}
      />

      <MatteWorkspacePanel
        frames={workspace.frame.frames}
        activeFrameId={workspace.frame.activeFrame?.id ?? null}
        onOpenDefaults={workspace.matte.openMatteDefaults}
        onRemoveAll={workspace.resetAllFrames}
        onActivate={workspace.frame.setActiveId}
        onRemove={workspace.frame.removeFrame}
        onSampleColor={(frame, event) => void workspace.matte.sampleColor(frame, event)}
        onPreview={workspace.frame.openDetailPreview}
        onMatteParamChange={workspace.matte.setMatteParam}
        onConfirmApplyToAll={workspace.matte.applyMatteGroupToFrames}
        onCustomSpillPickerColor={workspace.matte.setCustomSpillPickerColor}
        onCustomSpillColor={workspace.matte.setCustomSpillColor}
        applyingGroupId={workspace.matte.bulkMatteGroupId}
      />

      <LayoutWorkspacePanel
        frames={workspace.frame.frames}
        activeFrame={workspace.frame.activeFrame}
        activeFrameIndex={workspace.frame.activeFrameIndex}
        layout={workspace.layout}
        setActiveId={workspace.frame.setActiveId}
      />
      <OutputWorkspacePanel
        frames={workspace.frame.frames}
        playback={workspace.playback}
        spriteExport={workspace.spriteExport}
        canvasWidth={workspace.layout.canvasWidth}
        canvasHeight={workspace.layout.canvasHeight}
      />

      <WorkspaceDialogs
        frame={workspace.frame}
        matte={workspace.matte}
        layout={workspace.layout}
      />
    </WorkspaceShell>
  )
}
