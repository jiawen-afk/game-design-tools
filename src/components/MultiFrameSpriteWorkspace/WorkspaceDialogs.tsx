import type { Dispatch, SetStateAction } from 'react'

import { DetailPreviewModal } from './DetailPreviewModal'
import { LayoutDefaultsModal } from './LayoutDefaultsModal'
import { MatteDefaultsModal } from './MatteDefaultsModal'
import type { useLayoutWorkspace } from './useLayoutWorkspace'
import type { useMattePipeline } from './useMattePipeline'

export interface WorkspaceDialogsProps {
  matte: ReturnType<typeof useMattePipeline>
  layout: ReturnType<typeof useLayoutWorkspace>
  detailPreview: { url: string; name: string } | null
  detailZoom: number
  setDetailZoom: Dispatch<SetStateAction<number>>
  setDetailPreview: Dispatch<SetStateAction<{ url: string; name: string } | null>>
}

export function WorkspaceDialogs({
  matte,
  layout,
  detailPreview,
  detailZoom,
  setDetailZoom,
  setDetailPreview,
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
        preview={detailPreview}
        zoom={detailZoom}
        onZoomChange={setDetailZoom}
        onClose={() => setDetailPreview(null)}
      />
    </>
  )
}
