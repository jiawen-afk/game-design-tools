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
        imageAccept={IMAGE_ACCEPT}
        uploadFileList={workspace.upload.uploadFileList}
        activeFrameId={workspace.frame.activeFrame?.id ?? null}
        onOpenDefaults={workspace.matte.openMatteDefaults}
        onRemoveAll={workspace.resetAllFrames}
        onBatchUploadChange={workspace.upload.handleUploadChange}
        onExportMatteGroup={(groupId) => void workspace.matte.exportMatteGroup(groupId)}
        onImportMatteGroupToPersonalSpace={(groupId) => void workspace.matte.importMatteGroupToPersonalSpace(groupId)}
        personalSpaceCollectEnabled={workspace.personalSpaceCollectEnabled}
        personalSpaceCollectDisabledReason={workspace.personalSpaceCollectDisabledReason}
        onActivate={workspace.frame.setActiveId}
        onRemoveGroup={workspace.frame.removeFrameGroup}
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
        personalSpaceCollectEnabled={workspace.personalSpaceCollectEnabled}
        personalSpaceCollectDisabledReason={workspace.personalSpaceCollectDisabledReason}
      />

      <WorkspaceDialogs
        frame={workspace.frame}
        matte={workspace.matte}
        layout={workspace.layout}
      />
    </WorkspaceShell>
  )
}
