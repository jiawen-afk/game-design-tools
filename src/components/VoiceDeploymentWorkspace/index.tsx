import './voiceDeploymentWorkspace.css'
import { VoiceCollectLinkModal } from './VoiceCollectLinkModal'
import { VoiceGenerationPanel } from './VoiceGenerationPanel'
import { VoiceLibraryPanel } from './VoiceLibraryPanel'
import { VoiceSetupPanels } from './VoiceSetupPanels'
import { VoiceWorkspaceHeader } from './VoiceWorkspaceHeader'
import { useVoiceDeploymentWorkspace } from './useVoiceDeploymentWorkspace'

export default function VoiceDeploymentWorkspace() {
  const workspace = useVoiceDeploymentWorkspace()
  const renderVoiceLibraryPanel = (libraryVariant: 'sticky' | 'embedded') => (
    <VoiceLibraryPanel
      libraryVariant={libraryVariant}
      {...workspace.libraryPanelProps}
    />
  )

  return (
    <section className="voice-workspace" aria-labelledby="voice-workspace-title">
      {workspace.messageContextHolder}
      <VoiceCollectLinkModal {...workspace.collectLinkModalProps} />
      <VoiceWorkspaceHeader {...workspace.headerProps} />

      {workspace.connected ? (
        <div className="voice-studio">
          <VoiceGenerationPanel {...workspace.generationPanelProps} />

          {renderVoiceLibraryPanel('sticky')}
        </div>
      ) : (
        <div className="voice-grid">
          <VoiceSetupPanels {...workspace.setupPanelsProps} />

          {renderVoiceLibraryPanel('embedded')}
        </div>
      )}
    </section>
  )
}
