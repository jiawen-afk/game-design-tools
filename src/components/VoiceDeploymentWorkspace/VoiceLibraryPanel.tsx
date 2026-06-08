import { Button, Tabs } from 'antd'
import { DeleteOutlined, UserOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup } from '../PersonalSpaceWorkspace/personalSpaceModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import type { VoiceCollectLinkTarget } from './voicePersonalSpaceCollector'
import { PersonalSpaceVoiceAssetList, VoiceRecordList } from './VoiceRecordLists'

interface VoiceLibraryPanelProps {
  records: VoiceGenerationRecord[]
  lastGeneratedId: string | null
  personalSpaceVoiceAssets: PersonalSpaceAsset[]
  personalSpaceCharacters: CharacterProfile[]
  personalSpaceStoryboardGroups: StoryboardGroup[]
  onLoad: (record: VoiceGenerationRecord) => void
  onClone: (record: VoiceGenerationRecord) => void
  onDelete: (id: string) => void
  onClearHistory: () => void
  onRename: (id: string, name: string) => void
  onCollect: (record: VoiceGenerationRecord) => void
  onCollectWithLink: (record: VoiceGenerationRecord, target: VoiceCollectLinkTarget) => void
  personalSpaceCollectEnabled: boolean
  personalSpaceCollectDisabledReason?: string
}

export function VoiceLibraryPanel({
  records,
  lastGeneratedId,
  personalSpaceVoiceAssets,
  personalSpaceCharacters,
  personalSpaceStoryboardGroups,
  onLoad,
  onClone,
  onDelete,
  onClearHistory,
  onRename,
  onCollect,
  onCollectWithLink,
  personalSpaceCollectEnabled,
  personalSpaceCollectDisabledReason,
}: VoiceLibraryPanelProps) {
  return (
    <section className="voice-panel voice-library" aria-labelledby="voice-library-title">
      <div className="panel-title">
        <UserOutlined />
        <h3 id="voice-library-title">音频记录</h3>
      </div>
      <Tabs
        items={[
          {
            key: 'history',
            label: `历史 ${records.length}`,
            children: (
              <div className="voice-record-tab">
                <div className="voice-record-toolbar">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={records.length === 0}
                    onClick={onClearHistory}
                  >
                    清空历史
                  </Button>
                </div>
                <VoiceRecordList
                  records={records}
                  lastGeneratedId={lastGeneratedId}
                  onLoad={onLoad}
                  onClone={onClone}
                  onDelete={onDelete}
                  onRename={onRename}
                  onCollect={onCollect}
                  onCollectWithLink={onCollectWithLink}
                  personalSpaceCollectEnabled={personalSpaceCollectEnabled}
                  personalSpaceCollectDisabledReason={personalSpaceCollectDisabledReason}
                />
              </div>
            ),
          },
          {
            key: 'personal-space',
            label: `个人空间 ${personalSpaceVoiceAssets.length}`,
            children: (
              <PersonalSpaceVoiceAssetList
                assets={personalSpaceVoiceAssets}
                characters={personalSpaceCharacters}
                storyboardGroups={personalSpaceStoryboardGroups}
              />
            ),
          },
        ]}
      />
    </section>
  )
}
