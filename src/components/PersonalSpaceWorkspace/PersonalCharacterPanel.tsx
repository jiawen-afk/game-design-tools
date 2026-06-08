import type { UploadProps } from 'antd'
import { useEffect, useState } from 'react'
import { Button, Empty, Input, Popconfirm, Space, Upload } from 'antd'
import { DeleteOutlined, DisconnectOutlined, DownOutlined, EditOutlined, PlusOutlined, StarFilled, StarOutlined, UpOutlined, UploadOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { CharacterAssetPicker } from './CharacterAssetPicker'
import { PersonalAssetPreview } from './PersonalAssetPreview'
import { PersonalSpaceFilterControl } from './PersonalSpaceFilterControl'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'

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
  getVoiceUploadProps: (characterId: string) => UploadProps
  onNewCharacterNameChange: (name: string) => void
  onCreateCharacter: () => void
  onRenameCharacter: (characterId: string, name: string) => void
  onToggleCharacterStar: (characterId: string) => void
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
  getVoiceUploadProps,
  onNewCharacterNameChange,
  onCreateCharacter,
  onRenameCharacter,
  onToggleCharacterStar,
  onReorderCharacter,
  onDeleteCharacter,
  onAssignAsset,
  onUnassignAsset,
  onUpdateAssetNote,
  onMoveCharacterVoice,
}: PersonalCharacterPanelProps) {
  const [creatingCharacter, setCreatingCharacter] = useState(false)
  const [selectedCharacterFilter, setSelectedCharacterFilter] = useState('全部角色')
  const [onlyStarredCharacters, setOnlyStarredCharacters] = useState(false)
  const [renamingCharacterId, setRenamingCharacterId] = useState('')
  const [characterNameDrafts, setCharacterNameDrafts] = useState<Record<string, string>>({})
  const orderedCharacters = [...characters].sort((a, b) => a.order - b.order)
  const starFilteredCharacters = onlyStarredCharacters ? orderedCharacters.filter((character) => character.starred) : orderedCharacters
  const recentCharacterOptions = starFilteredCharacters.slice(-20).reverse()
  const characterFilterOptions = [
    { label: '最近创建的20个角色', value: '全部角色' },
    ...orderedCharacters.map((character) => ({ label: character.name, value: character.id })),
  ]
  const visibleCharacters = selectedCharacterFilter === '全部角色'
    ? recentCharacterOptions
    : starFilteredCharacters.filter((character) => character.id === selectedCharacterFilter)

  const confirmCreateCharacter = () => {
    if (!newCharacterName.trim()) return
    onCreateCharacter()
    setCreatingCharacter(false)
  }

  const cancelCreateCharacter = () => {
    onNewCharacterNameChange('')
    setCreatingCharacter(false)
  }

  useEffect(() => {
    if (selectedCharacterFilter !== '全部角色' && !characters.some((character) => character.id === selectedCharacterFilter)) {
      setSelectedCharacterFilter('全部角色')
    }
  }, [characters, selectedCharacterFilter])

  return (
    <section className="space-panel">
      <div className="character-panel-toolbar">
        <div className="character-toolbar-left">
          <PersonalSpaceTextPopover
            open={creatingCharacter}
            onOpenChange={(open) => {
              if (open) setCreatingCharacter(true)
              else cancelCreateCharacter()
            }}
            className="character-create-popover"
            value={newCharacterName}
            ariaLabel="新角色名称"
            placeholder="新角色名称"
            confirmIcon={<PlusOutlined />}
            confirmDisabled={!newCharacterName.trim()}
            onValueChange={onNewCharacterNameChange}
            onConfirm={confirmCreateCharacter}
            onCancel={cancelCreateCharacter}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatingCharacter(true)}>创建角色</Button>
          </PersonalSpaceTextPopover>
          <PersonalSpaceFilterControl
            className="character-filter-control"
            value={selectedCharacterFilter}
            defaultValue="全部角色"
            options={characterFilterOptions}
            onlyStarred={onlyStarredCharacters}
            onChange={setSelectedCharacterFilter}
            onOnlyStarredChange={setOnlyStarredCharacters}
          />
        </div>
      </div>
      {characters.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有角色。创建后可继续关联肖像、精灵图和配音。" />
      ) : (
        <div className="form-stack">
          {visibleCharacters.map((item) => (
            <article className="space-record" key={item.id}>
              <div className="character-record-header">
                <div className="record-name-view character-name-view">
                  <span className="field-label">角色名称</span>
                  <Button
                    size="small"
                    type="text"
                    className="star-toggle-button"
                    icon={item.starred ? <StarFilled /> : <StarOutlined />}
                    aria-label={item.starred ? '取消星标角色' : '星标角色'}
                    onClick={() => onToggleCharacterStar(item.id)}
                  />
                  <strong>{item.name}</strong>
                  <PersonalSpaceTextPopover
                    open={renamingCharacterId === item.id}
                    onOpenChange={(open) => {
                      setRenamingCharacterId(open ? item.id : '')
                      setCharacterNameDrafts((drafts) => ({ ...drafts, [item.id]: open ? (drafts[item.id] ?? item.name) : '' }))
                    }}
                    className="character-name-rename-popover"
                    value={characterNameDrafts[item.id] ?? item.name}
                    ariaLabel={`${item.name}角色名称`}
                    placeholder="角色名称"
                    confirmDisabled={!(characterNameDrafts[item.id] ?? '').trim()}
                    onValueChange={(value) => setCharacterNameDrafts((drafts) => ({ ...drafts, [item.id]: value }))}
                    onConfirm={() => {
                      onRenameCharacter(item.id, characterNameDrafts[item.id] ?? item.name)
                      setCharacterNameDrafts((drafts) => ({ ...drafts, [item.id]: '' }))
                      setRenamingCharacterId('')
                    }}
                    onCancel={() => {
                      setCharacterNameDrafts((drafts) => ({ ...drafts, [item.id]: '' }))
                      setRenamingCharacterId('')
                    }}
                  >
                    <Button size="small" icon={<EditOutlined />} aria-label="重命名角色" />
                  </PersonalSpaceTextPopover>
                </div>
                <div className="character-record-tools">
                  <span className="field-note character-asset-counts">肖像 {item.portraitAssetIds.length} · 精灵图 {item.spriteAssetIds.length} · 配音 {item.voiceAssetIds.length}</span>
                  <Space className="character-record-actions">
                    <Button size="small" icon={<UpOutlined />} onClick={() => onReorderCharacter(item.id, 'up')} />
                    <Button size="small" icon={<DownOutlined />} onClick={() => onReorderCharacter(item.id, 'down')} />
                    <Popconfirm title="删除角色" description="会移除该角色与素材、剧情组的关联。" onConfirm={() => onDeleteCharacter(item.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
              </div>
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
                          <div className="linked-asset-note-row">
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
                          <div className="linked-asset-note-row">
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
                      </div>
                    )
                  })}
                </div>
                <div className="space-column">
                  <strong>角色配音</strong>
                  <div className="character-link-actions">
                    <Upload {...getVoiceUploadProps(item.id)}>
                      <Button icon={<UploadOutlined />}>上传配音</Button>
                    </Upload>
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
