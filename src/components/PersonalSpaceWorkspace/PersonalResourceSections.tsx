import type { UploadProps } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { Button, Empty, Input, Modal, Popconfirm, Select, Space, Tag, Upload } from 'antd'
import { DeleteOutlined, PauseCircleOutlined, PlayCircleOutlined, UploadOutlined } from '@ant-design/icons'

import type { AssetGroupKind, PersonalSpaceAsset } from './personalSpaceModel'

export interface PersonalResourceSectionConfig {
  kind: AssetGroupKind
  title: string
  description: string
  importLabel: string
  emptyDescription: string
  groupNames: string[]
  assets: PersonalSpaceAsset[]
}

interface PersonalResourceSectionProps {
  section: PersonalResourceSectionConfig
  voiceAssets: PersonalSpaceAsset[]
  characterOptions: Array<{ label: string; value: string }>
  storyboardOptions: Array<{ label: string; value: string }>
  uploadProps: UploadProps
  getAssetOptions: (assets: PersonalSpaceAsset[]) => Array<{ label: string; value: string }>
  getAssetKindLabel: (kind: string) => string
  getStoryboardVoiceRefs: (assetId: string) => string[]
  onRenameAsset: (assetId: string, name: string) => void
  onChangeGroupName: (assetId: string, groupName: string) => void
  onChangeTags: (assetId: string, tags: string[]) => void
  onChangeDialogueText: (assetId: string, dialogueText: string) => void
  onChangeEffectVoiceLinks: (assetId: string, voiceIds: string[]) => void
  onChangeVoiceCharacterLinks: (assetId: string, characterIds: string[]) => void
  onChangeVoiceStoryboardLinks: (assetId: string, storyboardIds: string[]) => void
  onAddGroup: (kind: AssetGroupKind, name: string) => void
  onRenameGroup: (kind: AssetGroupKind, fromName: string, toName: string) => void
  onTransferGroup: (kind: AssetGroupKind, fromName: string, toName: string) => void
  onDeleteGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => void
  onDeleteAsset: (assetId: string) => void
}

function EmptyBlock({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
}

function splitTags(value: string) {
  return value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean)
}

function PersonalAssetGroupControls({
  kind,
  groupNames,
  selectedGroup,
  onSelectedGroupChange,
  onAddGroup,
  onRenameGroup,
  onTransferGroup,
  onDeleteGroup,
}: {
  kind: AssetGroupKind
  groupNames: string[]
  selectedGroup: string
  onSelectedGroupChange: (groupName: string) => void
  onAddGroup: (kind: AssetGroupKind, name: string) => void
  onRenameGroup: (kind: AssetGroupKind, fromName: string, toName: string) => void
  onTransferGroup: (kind: AssetGroupKind, fromName: string, toName: string) => void
  onDeleteGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => void
}) {
  const [newGroupName, setNewGroupName] = useState('')
  const [renameTo, setRenameTo] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const groupOptions = groupNames.map((group) => ({ label: group, value: group }))
  const transferOptions = groupNames.filter((group) => group !== selectedGroup).map((group) => ({ label: group, value: group }))
  const canDelete = groupNames.length > 1

  return (
    <div className="asset-group-controls">
      <Space.Compact>
        <Input
          value={newGroupName}
          aria-label="新分组名称"
          placeholder="新分组名称"
          onChange={(event) => setNewGroupName(event.target.value)}
          onPressEnter={() => {
            onAddGroup(kind, newGroupName)
            setNewGroupName('')
          }}
        />
        <Button
          onClick={() => {
            onAddGroup(kind, newGroupName)
            setNewGroupName('')
          }}
        >
          创建分组
        </Button>
      </Space.Compact>
      <Select
        value={selectedGroup}
        options={groupOptions}
        aria-label="选择分组"
        onChange={(value) => {
          onSelectedGroupChange(value)
          setRenameTo('')
          setTransferTo('')
        }}
      />
      <Space.Compact>
        <Input
          value={renameTo}
          aria-label="重命名分组"
          placeholder="重命名分组"
          onChange={(event) => setRenameTo(event.target.value)}
        />
        <Button
          onClick={() => {
            onRenameGroup(kind, selectedGroup, renameTo)
            setRenameTo('')
          }}
        >
          重命名分组
        </Button>
      </Space.Compact>
      <Space.Compact>
        <Select
          value={transferTo || undefined}
          options={transferOptions}
          placeholder="转移到"
          aria-label="转移资产目标分组"
          onChange={setTransferTo}
        />
        <Button disabled={!transferTo} onClick={() => onTransferGroup(kind, selectedGroup, transferTo)}>
          转移资产
        </Button>
      </Space.Compact>
      <Popconfirm
        title="删除分组"
        description={canDelete ? '删除分组会同时删除分组下的资产。' : '至少保留一个分组。'}
        okText="删除分组"
        cancelText="取消"
        onConfirm={() => onDeleteGroup(kind, selectedGroup, { deleteAssets: true })}
      >
        <Button danger disabled={!canDelete}>删除分组</Button>
      </Popconfirm>
      {!canDelete && <span className="field-note">至少保留一个分组</span>}
    </div>
  )
}

function formatImportedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '未知时间'
  return date.toLocaleString('zh-CN', { hour12: false })
}

function assetPreviewSource(asset: PersonalSpaceAsset) {
  return asset.resourcePaths[0] ?? ''
}

interface SpritePreviewFrame {
  x: number
  y: number
  w: number
  h: number
}

interface SpritePreviewIndex {
  sheet_size?: { w: number; h: number }
  fps?: number
  frames?: SpritePreviewFrame[]
}

function useSpritePreviewIndex(asset: PersonalSpaceAsset) {
  const [index, setIndex] = useState<SpritePreviewIndex | null>(null)
  const indexSource = asset.resourcePaths[1] ?? ''

  useEffect(() => {
    if (asset.kind !== 'sprite' || !indexSource) {
      setIndex(null)
      return
    }
    let alive = true
    void fetch(indexSource)
      .then((response) => response.json())
      .then((value: SpritePreviewIndex) => {
        if (alive && Array.isArray(value.frames)) setIndex(value)
      })
      .catch(() => {
        if (alive) setIndex(null)
      })
    return () => {
      alive = false
    }
  }, [asset.kind, indexSource])

  return index
}

export function PersonalAssetPreview({ asset }: { asset: PersonalSpaceAsset }) {
  const [imageOpen, setImageOpen] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [spritePlaying, setSpritePlaying] = useState(false)
  const [spriteFrameIndex, setSpriteFrameIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const source = assetPreviewSource(asset)
  const spriteIndex = useSpritePreviewIndex(asset)
  const spriteFrames = spriteIndex?.frames ?? []
  const spriteFrame = spriteFrames[spriteFrameIndex % Math.max(1, spriteFrames.length)]

  useEffect(() => {
    if (!spritePlaying || spriteFrames.length <= 1) return undefined
    const delay = Math.max(40, Math.round(1000 / Math.max(1, spriteIndex?.fps ?? 12)))
    const timer = window.setInterval(() => {
      setSpriteFrameIndex((index) => (index + 1) % spriteFrames.length)
    }, delay)
    return () => window.clearInterval(timer)
  }, [spriteFrames.length, spriteIndex?.fps, spritePlaying])

  if (asset.kind === 'voice') {
    const toggleAudio = () => {
      const audio = audioRef.current
      if (!audio) return
      if (audio.paused) {
        void audio.play()
        setAudioPlaying(true)
      } else {
        audio.pause()
        setAudioPlaying(false)
      }
    }
    return (
      <div className="asset-preview asset-preview-audio">
        <Button
          type="text"
          icon={audioPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={toggleAudio}
          aria-label={audioPlaying ? '暂停声音预览' : '播放声音预览'}
        />
        <audio ref={audioRef} src={source} onEnded={() => setAudioPlaying(false)} />
      </div>
    )
  }

  if (asset.kind === 'sprite') {
    const scale = spriteFrame ? Math.min(56 / spriteFrame.w, 56 / spriteFrame.h) : 1
    const backgroundSize = spriteFrame && spriteIndex?.sheet_size
      ? `${spriteIndex.sheet_size.w * scale}px ${spriteIndex.sheet_size.h * scale}px`
      : undefined
    const backgroundPosition = spriteFrame ? `${-spriteFrame.x * scale}px ${-spriteFrame.y * scale}px` : undefined
    return (
      <button
        type="button"
        className={`asset-preview asset-preview-image ${spritePlaying ? 'is-playing' : ''}`}
        onClick={() => setSpritePlaying((playing) => !playing)}
        aria-label={spritePlaying ? '暂停精灵图预览' : '播放精灵图预览'}
      >
        {source && spriteFrame ? (
          <span
            className="asset-preview-sprite-frame"
            style={{
              width: `${spriteFrame.w * scale}px`,
              height: `${spriteFrame.h * scale}px`,
              backgroundImage: `url(${source})`,
              backgroundPosition,
              backgroundSize,
            }}
          />
        ) : source ? <img src={source} alt="" /> : <span>精灵</span>}
        {spritePlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        className="asset-preview asset-preview-image preview-image"
        onClick={() => setImageOpen(true)}
        aria-label="查看图片预览"
      >
        {source ? <img src={source} alt="" /> : <span>预览</span>}
      </button>
      <Modal
        title={asset.name}
        open={imageOpen}
        footer={null}
        onCancel={() => setImageOpen(false)}
      >
        {source ? <img className="asset-preview-large" src={source} alt="" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有可预览资源" />}
      </Modal>
    </>
  )
}

export function PersonalResourceSection({
  section,
  voiceAssets,
  characterOptions,
  storyboardOptions,
  uploadProps,
  getAssetOptions,
  getAssetKindLabel,
  getStoryboardVoiceRefs,
  onRenameAsset,
  onChangeGroupName,
  onChangeTags,
  onChangeDialogueText,
  onChangeEffectVoiceLinks,
  onChangeVoiceCharacterLinks,
  onChangeVoiceStoryboardLinks,
  onAddGroup,
  onRenameGroup,
  onTransferGroup,
  onDeleteGroup,
  onDeleteAsset,
}: PersonalResourceSectionProps) {
  const [selectedGroup, setSelectedGroup] = useState(section.groupNames[0] ?? '默认分组')
  const groupOptions = section.groupNames.map((group) => ({ label: group, value: group }))
  const isVoiceSection = section.kind === 'voice'
  const groupAssets = section.assets.filter((item) => item.groupName === selectedGroup)

  useEffect(() => {
    if (!section.groupNames.includes(selectedGroup)) {
      setSelectedGroup(section.groupNames[0] ?? '默认分组')
    }
  }, [section.groupNames, selectedGroup])

  return (
    <section className="space-panel">
      <section className="resource-section" aria-labelledby={`resource-${section.kind}-title`}>
        <div className="resource-section-head">
          <div>
            <h3 id={`resource-${section.kind}-title`}>{section.title}</h3>
            <p className="panel-copy">{section.description}</p>
          </div>
          <div className="resource-section-actions">
            <Tag>{section.assets.length} 个</Tag>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>{section.importLabel}</Button>
            </Upload>
          </div>
        </div>
        <PersonalAssetGroupControls
          kind={section.kind}
          groupNames={section.groupNames}
          selectedGroup={selectedGroup}
          onSelectedGroupChange={setSelectedGroup}
          onAddGroup={onAddGroup}
          onRenameGroup={onRenameGroup}
          onTransferGroup={onTransferGroup}
          onDeleteGroup={onDeleteGroup}
        />

        {section.assets.length === 0 ? (
          <EmptyBlock description={section.emptyDescription} />
        ) : groupAssets.length === 0 ? (
          <EmptyBlock description="当前分组还没有资源。" />
        ) : (
          <div className={`resource-list${isVoiceSection ? ' voice-resource-list' : ''}`}>
            <section className="asset-group-block" key={selectedGroup} aria-label={`${section.title}-${selectedGroup}`}>
              <div className="asset-group-title">
                <strong>{selectedGroup}</strong>
                <Tag>{groupAssets.length} 个</Tag>
              </div>
              <div className={isVoiceSection ? 'voice-asset-grid' : 'asset-group-records'}>
                {groupAssets.map((item) => (
                  <article className={`space-record${item.kind === 'voice' ? ' voice-space-record' : ''}`} key={item.id}>
                    <div className="asset-record-row">
                      <PersonalAssetPreview asset={item} />
                      <div className="asset-record-main">
                        <div className="asset-record-heading">
                          <Input
                            value={item.name}
                            aria-label={`${section.title}名称`}
                            onChange={(event) => onRenameAsset(item.id, event.target.value)}
                          />
                          <Tag>{getAssetKindLabel(item.kind)}</Tag>
                        </div>
                        <span className="field-note">导入时间：{formatImportedAt(item.createdAt)}</span>
                      </div>
                      <Popconfirm title="删除资源" description="会移除角色和剧情中的关联；勾选设置后会尝试同步删除存储目录资源。" onConfirm={() => onDeleteAsset(item.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                    <div className={`form-stack asset-record-fields${item.kind === 'voice' ? ' voice-record-fields' : ''}`}>
                      <Select
                        value={item.groupName}
                        aria-label={`${section.title}分组`}
                        options={groupOptions}
                        onChange={(value) => onChangeGroupName(item.id, value)}
                      />
                      <Input
                        value={item.tags.join('、')}
                        aria-label={`${section.title}标签`}
                        addonBefore="标签"
                        onChange={(event) => onChangeTags(item.id, splitTags(event.target.value))}
                      />
                      {item.storageResourcePaths.length > 0 && (
                        <span className="field-note">已写入分类存储目录</span>
                      )}
                      {item.kind === 'image' && item.tags.includes('特效') && (
                        <label className="form-field">
                          <span className="field-label">关联配音素材</span>
                          <Select
                            mode="multiple"
                            value={item.linkedVoiceAssetIds}
                            options={getAssetOptions(voiceAssets)}
                            onChange={(voiceIds) => onChangeEffectVoiceLinks(item.id, voiceIds)}
                          />
                        </label>
                      )}
                      {item.kind === 'voice' && (
                        <>
                          <Input
                            className="voice-dialogue-input"
                            value={item.dialogueText ?? ''}
                            aria-label={`${section.title}台词文本`}
                            addonBefore="台词"
                            placeholder="外部音频没有生成文本时，在这里填写台词文本"
                            onChange={(event) => onChangeDialogueText(item.id, event.target.value)}
                          />
                          <label className="form-field">
                            <span className="field-label">关联角色</span>
                            <Select
                              mode="multiple"
                              value={item.linkedCharacterIds}
                              options={characterOptions}
                              onChange={(characterIds) => onChangeVoiceCharacterLinks(item.id, characterIds)}
                            />
                          </label>
                          <label className="form-field">
                            <span className="field-label">关联剧情组</span>
                            <Select
                              mode="multiple"
                              value={item.linkedStoryboardIds}
                              options={storyboardOptions}
                              onChange={(storyboardIds) => onChangeVoiceStoryboardLinks(item.id, storyboardIds)}
                            />
                          </label>
                          <span className="field-note">剧情顺序：{getStoryboardVoiceRefs(item.id).join('、') || '未编排到剧情组'}</span>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </section>
  )
}
