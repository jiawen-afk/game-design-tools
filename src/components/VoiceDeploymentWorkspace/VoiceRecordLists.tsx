import { Button, Dropdown, Empty, Input, Space, Tag } from 'antd'
import { DeleteOutlined, DownOutlined, ScissorOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup } from '../PersonalSpaceWorkspace/personalSpaceModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import { voiceModeMeta } from './voiceDeploymentModel'
import { ProjectSpaceAudioPlayer } from './ProjectSpaceAudioPlayer'
import type { VoiceProjectResourceReadOptions } from './useVoiceProjectResourceReadOptions'
import type { VoiceCollectLinkTarget } from './voicePersonalSpaceCollector'

interface VoiceRecordListProps {
  records: VoiceGenerationRecord[]
  lastGeneratedId: string | null
  onLoad: (record: VoiceGenerationRecord) => void
  onClone: (record: VoiceGenerationRecord) => void
  onClip: (record: VoiceGenerationRecord) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onCollect: (record: VoiceGenerationRecord) => void
  onCollectWithLink: (record: VoiceGenerationRecord, target: VoiceCollectLinkTarget) => void
  personalSpaceCollectEnabled: boolean
  personalSpaceCollectDisabledReason?: string
}

export function VoiceRecordList({
  records,
  lastGeneratedId,
  onLoad,
  onClone,
  onClip,
  onDelete,
  onRename,
  onCollect,
  onCollectWithLink,
  personalSpaceCollectEnabled,
  personalSpaceCollectDisabledReason,
}: VoiceRecordListProps) {
  if (records.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有生成音频" />
  }

  return (
    <div className="voice-record-list">
      {records.map((record) => {
        const mode = voiceModeMeta.find((item) => item.id === record.params.mode)?.label ?? '语音'
        return (
          <article key={record.id} className={record.id === lastGeneratedId ? 'voice-record is-new' : 'voice-record'}>
            <div className="record-heading">
              <Input
                value={record.name}
                aria-label="音频名称"
                onChange={(e) => onRename(record.id, e.target.value)}
              />
            </div>

            <div className="record-meta">
              <Tag>{mode}</Tag>
              <span>{new Date(record.createdAt).toLocaleString()}</span>
            </div>

            <audio controls src={record.audioUrl} />

            <p className="record-text">{record.params.text}</p>

            <div className="record-actions">
              <Button size="small" onClick={() => onLoad(record)}>载入参数</Button>
              <Button size="small" disabled={!record.audioPath} onClick={() => onClone(record)}>克隆音频</Button>
              <Button size="small" icon={<ScissorOutlined />} onClick={() => onClip(record)}>剪辑片段</Button>
              <Space.Compact className="record-collect-action">
                <Button
                  size="small"
                  disabled={!personalSpaceCollectEnabled}
                  title={personalSpaceCollectDisabledReason}
                  onClick={() => onCollect(record)}
                >
                  收藏到项目空间
                </Button>
                <Dropdown
                  menu={{
                    items: [
                      { key: 'character', label: '收藏并关联角色', disabled: !personalSpaceCollectEnabled },
                      { key: 'effect', label: '收藏并关联特效', disabled: !personalSpaceCollectEnabled },
                      { key: 'storyboard', label: '收藏并关联剧情', disabled: !personalSpaceCollectEnabled },
                    ],
                    onClick: ({ key }) => onCollectWithLink(record, key as VoiceCollectLinkTarget),
                  }}
                  trigger={['click']}
                >
                  <Button
                    size="small"
                    disabled={!personalSpaceCollectEnabled}
                    title={personalSpaceCollectDisabledReason}
                    aria-label="展开收藏关联方式"
                    icon={<DownOutlined />}
                  />
                </Dropdown>
              </Space.Compact>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(record.id)}>删除</Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

interface PersonalSpaceVoiceAssetListProps {
  assets: PersonalSpaceAsset[]
  characters: CharacterProfile[]
  storyboardGroups: StoryboardGroup[]
  projectResourceReadOptions: VoiceProjectResourceReadOptions
}

function linkedNames(ids: string[], items: Array<{ id: string; name: string }>) {
  const namesById = new Map(items.map((item) => [item.id, item.name]))
  return ids.map((id) => namesById.get(id) ?? id)
}

export function PersonalSpaceVoiceAssetList({
  assets,
  characters,
  storyboardGroups,
  projectResourceReadOptions,
}: PersonalSpaceVoiceAssetListProps) {
  if (assets.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有收藏到项目空间的配音" />
  }

  return (
    <div className="voice-record-list">
      {assets.map((asset) => {
        const characterNames = linkedNames(asset.linkedCharacterIds, characters)
        const storyboardNames = linkedNames(asset.linkedStoryboardIds, storyboardGroups)

        return (
          <article key={asset.id} className="voice-record">
            <div className="record-heading">
              <strong className="record-asset-title">{asset.name}</strong>
            </div>
            <div className="record-meta">
              <Tag>配音素材</Tag>
              <span>{new Date(asset.createdAt).toLocaleString()}</span>
            </div>
            <ProjectSpaceAudioPlayer
              asset={asset}
              emptyText="没有可播放音频"
              {...projectResourceReadOptions}
            />
            {asset.dialogueText && <p className="record-text">{asset.dialogueText}</p>}
            {(characterNames.length > 0 || storyboardNames.length > 0) && (
              <div className="record-meta record-link-names">
                {characterNames.length > 0 && <span>角色：{characterNames.join('、')}</span>}
                {storyboardNames.length > 0 && <span>剧情：{storyboardNames.join('、')}</span>}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
