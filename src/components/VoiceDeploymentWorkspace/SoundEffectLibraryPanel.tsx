import { useState } from 'react'
import { Alert, Button, Empty, Input, Select, Tag } from 'antd'
import {
  DeleteOutlined,
  LinkOutlined,
  SaveOutlined,
  SoundOutlined,
} from '@ant-design/icons'

import type { SoundEffectRecord } from './soundEffectModel'

interface SoundEffectLibraryPanelProps {
  records: SoundEffectRecord[]
  lastGeneratedId: string | null
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

export function SoundEffectLibraryPanel({
  records,
  lastGeneratedId,
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

  return (
    <section className="voice-panel voice-library sound-library-panel" aria-labelledby="sound-library-title">
      <div className="panel-title">
        <SoundOutlined />
        <h3 id="sound-library-title">音效记录</h3>
      </div>

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
          {records.map((record) => (
            <article key={record.id} className={record.id === lastGeneratedId ? 'voice-record is-new' : 'voice-record'}>
              <div className="record-heading">
                <Input
                  value={record.name}
                  aria-label="音效名称"
                  onChange={(event) => onRenameRecord(record.id, event.target.value)}
                />
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
          ))}
        </div>
      )}
    </section>
  )
}
