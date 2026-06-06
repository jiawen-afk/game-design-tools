import { Button, Dropdown, Empty, Input, Space, Tag } from 'antd'
import { DeleteOutlined, DownOutlined } from '@ant-design/icons'

import type { PersonalSpaceAsset } from '../PersonalSpaceWorkspace/personalSpaceModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import { voiceModeMeta } from './voiceDeploymentModel'
import type { VoiceCollectLinkTarget } from './voicePersonalSpaceCollector'

interface VoiceRecordListProps {
  records: VoiceGenerationRecord[]
  lastGeneratedId: string | null
  onLoad: (record: VoiceGenerationRecord) => void
  onClone: (record: VoiceGenerationRecord) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onCollect: (record: VoiceGenerationRecord) => void
  onCollectWithLink: (record: VoiceGenerationRecord, target: VoiceCollectLinkTarget) => void
}

export function VoiceRecordList({
  records,
  lastGeneratedId,
  onLoad,
  onClone,
  onDelete,
  onRename,
  onCollect,
  onCollectWithLink,
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
              <Space.Compact className="record-collect-action">
                <Button size="small" onClick={() => onCollect(record)}>收藏到个人空间</Button>
                <Dropdown
                  menu={{
                    items: [
                      { key: 'character', label: '收藏并关联角色' },
                      { key: 'effect', label: '收藏并关联特效' },
                      { key: 'storyboard', label: '收藏并关联剧情' },
                    ],
                    onClick: ({ key }) => onCollectWithLink(record, key as VoiceCollectLinkTarget),
                  }}
                  trigger={['click']}
                >
                  <Button size="small" aria-label="展开收藏关联方式" icon={<DownOutlined />} />
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

export function PersonalSpaceVoiceAssetList({ assets }: { assets: PersonalSpaceAsset[] }) {
  if (assets.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有收藏到个人空间的配音" />
  }

  return (
    <div className="voice-record-list">
      {assets.map((asset) => (
        <article key={asset.id} className="voice-record">
          <div className="record-heading">
            <strong className="record-asset-title">{asset.name}</strong>
          </div>
          <div className="record-meta">
            <Tag>配音素材</Tag>
            <span>{new Date(asset.createdAt).toLocaleString()}</span>
          </div>
          <p className="record-text">{asset.resourcePaths.join('、') || '未绑定本地文件'}</p>
          <div className="record-meta">
            <span>角色 {asset.linkedCharacterIds.length}</span>
            <span>剧情 {asset.linkedStoryboardIds.length}</span>
          </div>
        </article>
      ))}
    </div>
  )
}
