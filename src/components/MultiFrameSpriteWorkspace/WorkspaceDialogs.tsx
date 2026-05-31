import { DetailPreviewModal } from './DetailPreviewModal'
import { LayoutDefaultsModal } from './LayoutDefaultsModal'
import { MatteDefaultsModal } from './MatteDefaultsModal'
import type { FrameWorkspaceViewModel } from './useFrameWorkspaceState'
import type { LayoutWorkspaceViewModel } from './useLayoutWorkspace'
import type { MattePipelineViewModel } from './useMattePipeline'

export interface WorkspaceDialogsProps {
  frame: FrameWorkspaceViewModel
  matte: MattePipelineViewModel
  layout: LayoutWorkspaceViewModel
}

export function WorkspaceDialogs({
  frame,
  matte,
  layout,
}: WorkspaceDialogsProps) {
  return (
    <>
      <MatteDefaultsModal
        open={matte.matteDefaultsOpen}
        draft={matte.matteDefaultsDraft}
        onDraftChange={matte.setMatteDefaultsDraft}
        onSave={matte.saveMatteDefaults}
        onCancel={() => matte.setMatteDefaultsOpen(false)}
      />

      <LayoutDefaultsModal
        open={layout.layoutDefaultsOpen}
        draft={layout.layoutDefaultsDraft}
        onDraftChange={layout.setLayoutDefaultsDraft}
        onSave={layout.saveLayoutDefaults}
        onCancel={() => layout.setLayoutDefaultsOpen(false)}
      />

      <DetailPreviewModal
        preview={frame.detailPreview}
        zoom={frame.detailZoom}
        onZoomChange={frame.setDetailZoom}
        onClose={() => frame.setDetailPreview(null)}
      />
    </>
  )
}
