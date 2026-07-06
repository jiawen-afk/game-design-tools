import { useState } from 'react'
import { Alert, Button, Empty, Input, Select, Tabs, Tag } from 'antd'
import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  SaveOutlined,
  SoundOutlined,
} from '@ant-design/icons'

import type { PersonalSpaceAsset } from '../PersonalSpaceWorkspace/personalSpaceModel'
import type { SoundEffectRecord } from './soundEffectModel'

interface SoundEffectLibraryPanelProps {
  records: SoundEffectRecord[]
  lastGeneratedId: string | null
  personalSpaceSoundAssets: PersonalSpaceAsset[]
  spriteLinkOptions: Array<{ label: string; value: string }>
  collectingRecordId: string
  collectError: string
  onLoad: (record: SoundEffectRecord) => void
  onRenameRecord: (recordId: string, name: string) => void
  onDeleteRecord: (recordId: string) => void
  onClearRecords: () => void
  onCollectRecord: (record: SoundEffectRecord) => void
  onCollectAndLinkSprite: (record: SoundEffectRecord, spriteId: string) => void
}

function linkedOptionNames(ids: string[], options: Array<{ label: string; value: string }>) {
  const namesById = new Map(options.map((item) => [item.value, item.label]))
  return ids.map((id) => namesById.get(id) ?? id)
}

function PersonalSpaceSoundAssetList({
  assets,
  spriteLinkOptions,
}: {
  assets: PersonalSpaceAsset[]
  spriteLinkOptions: Array<{ label: string; value: string }>
}) {
  if (assets.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有收藏到项目空间的音效" />
  }

  return (
    <div className="voice-record-list sound-record-list">
      {assets.map((asset) => {
        const audioSource = asset.resourcePaths[0] ?? ''
        const spriteNames = linkedOptionNames(asset.linkedSpriteAssetIds, spriteLinkOptions)
        return (
          <article key={asset.id} className="voice-record">
            <div className="record-heading">
              <strong className="record-asset-title">{asset.name}</strong>
            </div>
            <div className="record-meta">
              <Tag>音效素材</Tag>
              <span>{new Date(asset.createdAt).toLocaleString()}</span>
            </div>
            {audioSource ? <audio controls src={audioSource} /> : <p className="record-text">没有可播放音效</p>}
            {spriteNames.length > 0 && (
              <div className="record-meta record-link-names">
                <span>精灵图：{spriteNames.join('、')}</span>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

export function SoundEffectLibraryPanel({
  records,
  lastGeneratedId,
  personalSpaceSoundAssets,
  spriteLinkOptions,
  collectingRecordId,
  collectError,
  onLoad,
  onRenameRecord,
  onDeleteRecord,
  onClearRecords,
  onCollectRecord,
  onCollectAndLinkSprite,
}: SoundEffectLibraryPanelProps) {
  const [pendingLinkRecordId, setPendingLinkRecordId] = useState('')
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | undefined>(undefined)
  const [editingRecordId, setEditingRecordId] = useState('')
  const [recordNameDraft, setRecordNameDraft] = useState('')

  const openLinkPicker = (recordId: string) => {
    setPendingLinkRecordId((current) => (current === recordId ? '' : recordId))
    setSelectedSpriteId(undefined)
  }

  const collectWithSprite = (record: SoundEffectRecord) => {
    if (!selectedSpriteId) return
    onCollectAndLinkSprite(record, selectedSpriteId)
    setPendingLinkRecordId('')
    setSelectedSpriteId(undefined)
  }

  const startRename = (record: SoundEffectRecord) => {
    setEditingRecordId(record.id)
    setRecordNameDraft(record.name)
  }

  const confirmRename = (record: SoundEffectRecord) => {
    onRenameRecord(record.id, recordNameDraft)
    setEditingRecordId('')
    setRecordNameDraft('')
  }

  return (
    <section className="voice-panel voice-library sound-library-panel" aria-labelledby="sound-library-title">
      <div className="panel-title">
        <SoundOutlined />
        <h3 id="sound-library-title">音效记录</h3>
      </div>

      <Tabs
        items={[
          {
            key: 'history',
            label: `历史 ${records.length}`,
            children: (
              <div className="voice-record-tab">
                <div className="voice-record-toolbar">
                  <Button size="small" danger icon={<DeleteOutlined />} disabled={records.length === 0} onClick={onClearRecords}>
                    清空历史
                  </Button>
                </div>

                {collectError ? <Alert type="warning" showIcon title={collectError} /> : null}

                {records.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有生成音效" />
                ) : (
                  <div className="voice-record-list sound-record-list">
                    {records.map((record) => {
                      const isRenaming = editingRecordId === record.id
                      return (
                        <article key={record.id} className={record.id === lastGeneratedId ? 'voice-record is-new' : 'voice-record'}>
                          <div className="record-heading sound-record-name-row">
                            <Input
                              value={isRenaming ? recordNameDraft : record.name}
                              aria-label="音效名称"
                              disabled={!isRenaming}
                              onChange={(event) => setRecordNameDraft(event.target.value)}
                            />
                            <Button
                              size="small"
                              type={isRenaming ? 'primary' : 'default'}
                              icon={isRenaming ? <CheckOutlined /> : <EditOutlined />}
                              onClick={() => (isRenaming ? confirmRename(record) : startRename(record))}
                            >
                              {isRenaming ? '确认' : '编辑'}
                            </Button>
                          </div>
                          <div className="record-meta">
                            <Tag>{record.model}</Tag>
                            <span>{record.durationSeconds}s</span>
                            {record.seed !== null ? <span>seed {record.seed}</span> : null}
                            <span>{new Date(record.createdAt).toLocaleString()}</span>
                          </div>
                          <audio controls src={record.audioUrl} />
                          <p className="record-text">{record.prompt}</p>
                          <div className="record-actions">
                            <Button size="small" onClick={() => onLoad(record)}>
                              载入参数
                            </Button>
                            <Button
                              size="small"
                              icon={<SaveOutlined />}
                              loading={collectingRecordId === record.id}
                              onClick={() => onCollectRecord(record)}
                            >
                              收藏到音效素材
                            </Button>
                            <Button size="small" icon={<LinkOutlined />} onClick={() => openLinkPicker(record.id)}>
                              关联精灵图
                            </Button>
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDeleteRecord(record.id)}>
                              删除
                            </Button>
                          </div>
                          {pendingLinkRecordId === record.id ? (
                            <div className="sound-link-row">
                              <Select
                                value={selectedSpriteId}
                                options={spriteLinkOptions}
                                placeholder="选择精灵图"
                                notFoundContent="项目空间还没有精灵图素材"
                                onChange={setSelectedSpriteId}
                              />
                              <Button
                                type="primary"
                                loading={collectingRecordId === record.id}
                                disabled={!selectedSpriteId}
                                onClick={() => collectWithSprite(record)}
                              >
                                收藏并关联
                              </Button>
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'personal-space',
            label: `项目空间 ${personalSpaceSoundAssets.length}`,
            children: (
              <PersonalSpaceSoundAssetList
                assets={personalSpaceSoundAssets}
                spriteLinkOptions={spriteLinkOptions}
              />
            ),
          },
        ]}
      />
    </section>
  )
}
