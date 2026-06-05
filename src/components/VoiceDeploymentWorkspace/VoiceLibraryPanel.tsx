import { Tabs } from 'antd'
import { UserOutlined } from '@ant-design/icons'

import type { PersonalSpaceAsset } from '../PersonalSpaceWorkspace/personalSpaceModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import type { VoiceCollectLinkTarget } from './voicePersonalSpaceCollector'
import { PersonalSpaceVoiceAssetList, VoiceRecordList } from './VoiceRecordLists'

interface VoiceLibraryPanelProps {
  records: VoiceGenerationRecord[]
  lastGeneratedId: string | null
  personalSpaceVoiceAssets: PersonalSpaceAsset[]
  onLoad: (record: VoiceGenerationRecord) => void
  onClone: (record: VoiceGenerationRecord) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onCollect: (record: VoiceGenerationRecord) => void
  onCollectWithLink: (record: VoiceGenerationRecord, target: VoiceCollectLinkTarget) => void
}

export function VoiceLibraryPanel({
  records,
  lastGeneratedId,
  personalSpaceVoiceAssets,
  onLoad,
  onClone,
  onDelete,
  onRename,
  onCollect,
  onCollectWithLink,
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
              <VoiceRecordList
                records={records}
                lastGeneratedId={lastGeneratedId}
                onLoad={onLoad}
                onClone={onClone}
                onDelete={onDelete}
                onRename={onRename}
                onCollect={onCollect}
                onCollectWithLink={onCollectWithLink}
              />
            ),
          },
          {
            key: 'personal-space',
            label: `个人空间 ${personalSpaceVoiceAssets.length}`,
            children: (
              <PersonalSpaceVoiceAssetList assets={personalSpaceVoiceAssets} />
            ),
          },
        ]}
      />
    </section>
  )
}
