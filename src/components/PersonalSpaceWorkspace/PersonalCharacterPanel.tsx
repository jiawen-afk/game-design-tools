import type { UploadProps } from 'antd'
import { useState } from 'react'
import { Button, Empty, Input, Popconfirm, Space, Upload } from 'antd'
import { DeleteOutlined, DisconnectOutlined, DownOutlined, PlusOutlined, SearchOutlined, UpOutlined, UploadOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { PersonalAssetPreview } from './PersonalResourceSections'

interface PersonalCharacterPanelProps {
  characters: CharacterProfile[]
  newCharacterName: string
  portraitAssets: PersonalSpaceAsset[]
  spriteAssets: PersonalSpaceAsset[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getStoryboardVoiceRefs: (assetId: string) => string[]
  getPortraitUploadProps: (characterId: string) => UploadProps
  getSpriteUploadProps: (characterId: string) => UploadProps
  onNewCharacterNameChange: (name: string) => void
  onCreateCharacter: () => void
  onRenameCharacter: (characterId: string, name: string) => void
  onReorderCharacter: (characterId: string, direction: 'up' | 'down') => void
  onDeleteCharacter: (characterId: string) => void
  onAssignAsset: (
    characterId: string,
    assetId: string,
    column: 'portrait' | 'sprite' | 'voice',
    tags: string[],
  ) => void
  onUnassignAsset: (
    characterId: string,
    assetId: string,
    column: 'portrait' | 'sprite' | 'voice',
  ) => void
  onUpdateAssetNote: (
    characterId: string,
    assetId: string,
    column: 'portrait' | 'sprite' | 'voice',
    noteName: string,
  ) => void
  onMoveCharacterVoice: (characterId: string, draggedAssetId: string, targetAssetId: string) => void
}

function includesKeyword(values: Array<string | undefined>, keyword: string) {
  const cleanKeyword = keyword.trim().toLowerCase()
  if (!cleanKeyword) return true
  return values.some((value) => value?.toLowerCase().includes(cleanKeyword))
}

function CharacterAssetPicker({
  assets,
  actionLabel,
  confirmLabel,
  searchLabel,
  searchPlaceholder,
  emptyDescription,
  emptyThumb,
  detailForAsset,
  onConfirm,
}: {
  assets: PersonalSpaceAsset[]
  actionLabel: string
  confirmLabel: string
  searchLabel: string
  searchPlaceholder: string
  emptyDescription: string
  emptyThumb: string
  detailForAsset: (asset: PersonalSpaceAsset) => string
  onConfirm: (assetId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const filteredAssets = assets.filter((asset) => includesKeyword([asset.name, asset.dialogueText, asset.tags.join('、')], search))
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId)

  const confirmAsset = () => {
    if (!selectedAssetId) return
    onConfirm(selectedAssetId)
    setExpanded(false)
    setSearch('')
    setSelectedAssetId(null)
  }

  return (
    <div className="character-asset-picker">
      <Button icon={<PlusOutlined />} onClick={() => setExpanded((value) => !value)}>{actionLabel}</Button>
      {expanded && (
        <div className="character-portrait-picker-panel">
          <div className="portrait-picker-input-wrap">
            <Input
              size="small"
              allowClear
              prefix={<SearchOutlined />}
              value={search}
              aria-label={searchLabel}
              placeholder={searchPlaceholder}
              onClick={() => setExpanded(true)}
              onFocus={() => setExpanded(true)}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="portrait-picker-popover">
              {filteredAssets.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
              ) : filteredAssets.map((asset) => (
                <button
                  type="button"
                  className={`portrait-picker-option${asset.id === selectedAssetId ? ' is-selected' : ''}`}
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                >
                  <span className="portrait-picker-thumb">
                    {asset.kind !== 'voice' && asset.resourcePaths[0] ? <img src={asset.resourcePaths[0]} alt="" /> : emptyThumb}
                  </span>
                  <span className="portrait-picker-main">
                    <strong>{asset.name}</strong>
                    <span>{detailForAsset(asset)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="portrait-picker-actions">
            <span className="field-note">{selectedAsset ? `已选：${selectedAsset.name}` : '选择素材后确认关联。'}</span>
            <Button size="small" type="primary" disabled={!selectedAssetId} onClick={confirmAsset}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function PersonalCharacterPanel({
  characters,
  newCharacterName,
  portraitAssets,
  spriteAssets,
  voiceAssets,
  allAssets,
  getStoryboardVoiceRefs,
  getPortraitUploadProps,
  getSpriteUploadProps,
  onNewCharacterNameChange,
  onCreateCharacter,
  onRenameCharacter,
  onReorderCharacter,
  onDeleteCharacter,
  onAssignAsset,
  onUnassignAsset,
  onUpdateAssetNote,
  onMoveCharacterVoice,
}: PersonalCharacterPanelProps) {
  return (
    <section className="space-panel">
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={newCharacterName}
          onChange={(event) => onNewCharacterNameChange(event.target.value)}
          onPressEnter={onCreateCharacter}
          placeholder="新角色名称"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateCharacter}>创建角色</Button>
      </Space.Compact>
      <strong>角色列表</strong>
      {characters.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有角色。创建后可继续关联肖像、精灵图和配音。" />
      ) : (
        <div className="form-stack">
          {[...characters].sort((a, b) => a.order - b.order).map((item) => (
            <article className="space-record" key={item.id}>
              <div className="command-row">
                <Input
                  value={item.name}
                  aria-label="角色名称"
                  onChange={(event) => onRenameCharacter(item.id, event.target.value)}
                />
                <Space>
                  <Button size="small" icon={<UpOutlined />} onClick={() => onReorderCharacter(item.id, 'up')} />
                  <Button size="small" icon={<DownOutlined />} onClick={() => onReorderCharacter(item.id, 'down')} />
                  <Popconfirm title="删除角色" description="会移除该角色与素材、剧情组的关联。" onConfirm={() => onDeleteCharacter(item.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              <span className="field-note">肖像 {item.portraitAssetIds.length} · 精灵图 {item.spriteAssetIds.length} · 配音 {item.voiceAssetIds.length}</span>
              <div className="space-columns">
                <div className="space-column">
                  <strong>角色肖像</strong>
                  <div className="character-link-actions">
                    <Upload {...getPortraitUploadProps(item.id)}>
                      <Button icon={<UploadOutlined />}>上传肖像</Button>
                    </Upload>
                    <CharacterAssetPicker
                      assets={portraitAssets}
                      actionLabel="关联肖像"
                      confirmLabel="确认关联肖像"
                      searchLabel="搜索公共图片肖像"
                      searchPlaceholder="搜索公共图片"
                      emptyDescription="没有匹配的公共图片"
                      emptyThumb="图"
                      detailForAsset={() => '公共图片'}
                      onConfirm={(assetId) => onAssignAsset(item.id, assetId, 'portrait', ['肖像'])}
                    />
                  </div>
                  {item.portraitAssets.map((link) => {
                    const asset = allAssets.find((candidate) => candidate.id === link.assetId)
                    return (
                      <div className="linked-asset-row" key={link.assetId}>
                        {asset && <PersonalAssetPreview asset={asset} />}
                        <div className="form-stack linked-asset-main">
                          <strong>{asset?.name ?? '肖像'}</strong>
                          <Input
                            addonBefore="关联备注"
                            value={link.noteName ?? ''}
                            aria-label="角色肖像关联备注"
                            onChange={(event) => onUpdateAssetNote(item.id, link.assetId, 'portrait', event.target.value)}
                          />
                          <Button
                            size="small"
                            danger
                            icon={<DisconnectOutlined />}
                            aria-label="取消关联角色肖像"
                            onClick={() => onUnassignAsset(item.id, link.assetId, 'portrait')}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="space-column">
                  <strong>角色精灵图</strong>
                  <div className="character-link-actions">
                    <Upload {...getSpriteUploadProps(item.id)}>
                      <Button icon={<UploadOutlined />}>上传精灵图</Button>
                    </Upload>
                    <CharacterAssetPicker
                      assets={spriteAssets}
                      actionLabel="关联精灵图"
                      confirmLabel="确认关联精灵图"
                      searchLabel="搜索精灵图"
                      searchPlaceholder="搜索精灵图"
                      emptyDescription="没有匹配的精灵图"
                      emptyThumb="精灵"
                      detailForAsset={() => '精灵图'}
                      onConfirm={(assetId) => onAssignAsset(item.id, assetId, 'sprite', ['角色精灵图'])}
                    />
                  </div>
                  <span className="field-note">一次选择 png 和 index.json，会自动加入角色精灵图。</span>
                  {item.spriteAssets.map((link) => {
                    const asset = allAssets.find((candidate) => candidate.id === link.assetId)
                    return (
                      <div className="linked-asset-row" key={link.assetId}>
                        {asset && <PersonalAssetPreview asset={asset} />}
                        <div className="form-stack linked-asset-main">
                          <strong>{asset?.name ?? '精灵图'}</strong>
                          <Input
                            addonBefore="关联备注"
                            value={link.noteName ?? ''}
                            aria-label="角色精灵图关联备注"
                            onChange={(event) => onUpdateAssetNote(item.id, link.assetId, 'sprite', event.target.value)}
                          />
                          <Button
                            size="small"
                            danger
                            icon={<DisconnectOutlined />}
                            aria-label="取消关联角色精灵图"
                            onClick={() => onUnassignAsset(item.id, link.assetId, 'sprite')}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="space-column">
                  <strong>角色配音</strong>
                  <div className="character-link-actions">
                    <CharacterAssetPicker
                      assets={voiceAssets}
                      actionLabel="关联配音"
                      confirmLabel="确认关联配音"
                      searchLabel="搜索配音"
                      searchPlaceholder="搜索配音"
                      emptyDescription="没有匹配的配音"
                      emptyThumb="音"
                      detailForAsset={(asset) => asset.dialogueText || '未填写对白文本'}
                      onConfirm={(assetId) => onAssignAsset(item.id, assetId, 'voice', ['角色配音'])}
                    />
                  </div>
                  {item.voiceAssets.map((link) => {
                    const voiceAsset = allAssets.find((asset) => asset.id === link.assetId)
                    return (
                      <div
                        className="character-voice-link"
                        key={link.assetId}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', link.assetId)
                        }}
                        onDragOver={(event) => {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(event) => {
                          event.preventDefault()
                          const draggedAssetId = event.dataTransfer.getData('text/plain')
                          if (draggedAssetId) onMoveCharacterVoice(item.id, draggedAssetId, link.assetId)
                        }}
                      >
                        <div className="linked-asset-row character-voice-row">
                          {voiceAsset ? <PersonalAssetPreview asset={voiceAsset} /> : <div className="asset-preview character-voice-preview-placeholder">音</div>}
                          <div className="character-voice-main">
                            <strong>{voiceAsset?.name ?? '配音'}</strong>
                            <span className="character-voice-dialogue">{voiceAsset?.dialogueText || '未填写对白文本'}</span>
                            <span className="field-note">剧情顺序：{getStoryboardVoiceRefs(link.assetId).join('、') || '未关联剧情组'}</span>
                          </div>
                          <Button
                            size="small"
                            danger
                            icon={<DisconnectOutlined />}
                            aria-label="取消关联角色配音"
                            onClick={() => onUnassignAsset(item.id, link.assetId, 'voice')}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
