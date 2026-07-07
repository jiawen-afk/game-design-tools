import type { ReactNode } from 'react'
import { Tabs } from 'antd'

import { SoundEffectGenerationPanel } from './SoundEffectGenerationPanel'
import { SoundEffectLibraryPanel } from './SoundEffectLibraryPanel'
import { SoundEffectSetupPanel } from './SoundEffectSetupPanel'
import type { SoundEffectRecord } from './soundEffectModel'
import type { useSoundEffectWorkspace } from './useSoundEffectWorkspace'

type SoundEffectWorkspaceState = ReturnType<typeof useSoundEffectWorkspace>
export type VoiceWorkspaceTabKey = 'voice' | 'sound' | 'audio-edit'

interface VoiceWorkspaceTabsProps {
  activeKey: VoiceWorkspaceTabKey
  voiceContent: ReactNode
  soundWorkspace: SoundEffectWorkspaceState
  audioEditorContent: ReactNode
  onChange: (key: VoiceWorkspaceTabKey) => void
  onClipSoundEffect: (record: SoundEffectRecord) => void
}

export function VoiceWorkspaceTabs({
  activeKey,
  voiceContent,
  soundWorkspace,
  audioEditorContent,
  onChange,
  onClipSoundEffect,
}: VoiceWorkspaceTabsProps) {
  return (
    <Tabs
      className="voice-workspace-tabs"
      activeKey={activeKey}
      onChange={(key) => onChange(key as VoiceWorkspaceTabKey)}
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
                <SoundEffectLibraryPanel {...soundWorkspace.libraryPanelProps} onClip={onClipSoundEffect} />
              </div>
            </div>
          ),
        },
        {
          key: 'audio-edit',
          label: '音频编辑',
          children: audioEditorContent,
        },
      ]}
    />
  )
}
