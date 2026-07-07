import './voiceDeploymentWorkspace.css'
import { useState } from 'react'
import { AudioClipEditorPanel } from './AudioClipEditorPanel'
import { VoiceCollectLinkModal } from './VoiceCollectLinkModal'
import { VoiceGenerationPanel } from './VoiceGenerationPanel'
import { VoiceLibraryPanel } from './VoiceLibraryPanel'
import { VoiceSetupPanels } from './VoiceSetupPanels'
import { VoiceWorkspaceHeader } from './VoiceWorkspaceHeader'
import { VoiceWorkspaceTabs, type VoiceWorkspaceTabKey } from './VoiceWorkspaceTabs'
import {
  createAudioClipSourceFromSoundEffectRecord,
  createAudioClipSourceFromVoiceRecord,
} from './audioClipModel'
import type { SoundEffectRecord } from './soundEffectModel'
import { useAudioClipEditorWorkspace } from './useAudioClipEditorWorkspace'
import { useSoundEffectWorkspace } from './useSoundEffectWorkspace'
import { useVoiceDeploymentWorkspace } from './useVoiceDeploymentWorkspace'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'

export default function VoiceDeploymentWorkspace() {
  const [activeTab, setActiveTab] = useState<VoiceWorkspaceTabKey>('voice')
  const workspace = useVoiceDeploymentWorkspace()
  const soundWorkspace = useSoundEffectWorkspace()
  const audioClipEditor = useAudioClipEditorWorkspace({
    onVoiceClipCreated: workspace.audioClipActions.addVoiceClipRecord,
    onSoundEffectClipCreated: soundWorkspace.audioClipActions.addSoundEffectClipRecord,
  })

  const openVoiceClipEditor = (record: VoiceGenerationRecord) => {
    audioClipEditor.loadSource(createAudioClipSourceFromVoiceRecord(record))
    setActiveTab('audio-edit')
  }

  const openSoundClipEditor = (record: SoundEffectRecord) => {
    audioClipEditor.loadSource(createAudioClipSourceFromSoundEffectRecord(record))
    setActiveTab('audio-edit')
  }

  const renderVoiceLibraryPanel = (libraryVariant: 'sticky' | 'embedded') => (
    <VoiceLibraryPanel
      libraryVariant={libraryVariant}
      {...workspace.libraryPanelProps}
      onClip={openVoiceClipEditor}
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
  const audioEditorContent = (
    <>
      {audioClipEditor.messageContextHolder}
      <AudioClipEditorPanel {...audioClipEditor.panelProps} />
    </>
  )

  return (
    <section className="voice-workspace" aria-labelledby="voice-workspace-title">
      {workspace.messageContextHolder}
      <VoiceCollectLinkModal {...workspace.collectLinkModalProps} />
      <VoiceWorkspaceTabs
        activeKey={activeTab}
        voiceContent={voiceContent}
        soundWorkspace={soundWorkspace}
        audioEditorContent={audioEditorContent}
        onChange={setActiveTab}
        onClipSoundEffect={openSoundClipEditor}
      />
    </section>
  )
}
