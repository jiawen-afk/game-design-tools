import type { ReactNode } from 'react'
import { Tabs } from 'antd'

import { SoundEffectGenerationPanel } from './SoundEffectGenerationPanel'
import { SoundEffectLibraryPanel } from './SoundEffectLibraryPanel'
import { SoundEffectSetupPanel } from './SoundEffectSetupPanel'
import type { useSoundEffectWorkspace } from './useSoundEffectWorkspace'

type SoundEffectWorkspaceState = ReturnType<typeof useSoundEffectWorkspace>

interface VoiceWorkspaceTabsProps {
  voiceContent: ReactNode
  soundWorkspace: SoundEffectWorkspaceState
}

export function VoiceWorkspaceTabs({ voiceContent, soundWorkspace }: VoiceWorkspaceTabsProps) {
  return (
    <Tabs
      className="voice-workspace-tabs"
      items={[
        {
          key: 'voice',
          label: '生成配音',
          children: voiceContent,
        },
        {
          key: 'sound',
          label: '生成音效',
          children: (
            <div className="sound-workbench">
              <SoundEffectSetupPanel {...soundWorkspace.setupPanelProps} />
              <div className="sound-studio">
                <SoundEffectGenerationPanel {...soundWorkspace.generationPanelProps} />
                <SoundEffectLibraryPanel {...soundWorkspace.libraryPanelProps} />
              </div>
            </div>
          ),
        },
      ]}
    />
  )
}
