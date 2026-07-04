import './voiceDeploymentWorkspace.css'
import { VoiceCollectLinkModal } from './VoiceCollectLinkModal'
import { VoiceGenerationPanel } from './VoiceGenerationPanel'
import { VoiceLibraryPanel } from './VoiceLibraryPanel'
import { VoiceSetupPanels } from './VoiceSetupPanels'
import { VoiceWorkspaceHeader } from './VoiceWorkspaceHeader'
import { VoiceWorkspaceTabs } from './VoiceWorkspaceTabs'
import { useSoundEffectWorkspace } from './useSoundEffectWorkspace'
import { useVoiceDeploymentWorkspace } from './useVoiceDeploymentWorkspace'

export default function VoiceDeploymentWorkspace() {
  const workspace = useVoiceDeploymentWorkspace()
  const soundWorkspace = useSoundEffectWorkspace()
  const renderVoiceLibraryPanel = (libraryVariant: 'sticky' | 'embedded') => (
    <VoiceLibraryPanel
      libraryVariant={libraryVariant}
      {...workspace.libraryPanelProps}
    />
  )
  const voiceContent = (
    <>
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
    </>
  )

  return (
    <section className="voice-workspace" aria-labelledby="voice-workspace-title">
      {workspace.messageContextHolder}
      <VoiceCollectLinkModal {...workspace.collectLinkModalProps} />
      <VoiceWorkspaceTabs voiceContent={voiceContent} soundWorkspace={soundWorkspace} />
    </section>
  )
}
