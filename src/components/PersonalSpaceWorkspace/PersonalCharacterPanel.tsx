import type { UploadProps } from 'antd'
import { useEffect, useState } from 'react'
import { Button, Empty, Popconfirm, Space } from 'antd'
import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, StarFilled, StarOutlined, UpOutlined } from '@ant-design/icons'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { CharacterLinkedAssetColumn } from './CharacterLinkedAssetColumn'
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
  ) => void
  onUnassignAsset: (
    characterId: string,
    assetId: string,
    column: 'portrait' | 'sprite' | 'voice',
  ) => void
  onMoveCharacterVoice: (characterId: string, draggedAssetId: string, targetAssetId: string) => void
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
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
  onMoveCharacterVoice,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
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
                <CharacterLinkedAssetColumn
                  character={item}
                  column="portrait"
                  title="角色肖像"
                  uploadLabel="上传肖像"
                  uploadProps={getPortraitUploadProps(item.id)}
                  pickerAssets={portraitAssets}
                  allAssets={allAssets}
                  actionLabel="关联肖像"
                  confirmLabel="确认关联肖像"
                  searchLabel="搜索公共图片肖像"
                  searchPlaceholder="搜索公共图片"
                  emptyDescription="没有匹配的公共图片"
                  emptyThumb="图"
                  fallbackName="肖像"
                  unlinkAriaLabel="取消关联角色肖像"
                  detailForAsset={() => '公共图片'}
                  getStoryboardVoiceRefs={getStoryboardVoiceRefs}
                  onAssignAsset={onAssignAsset}
                  onUnassignAsset={onUnassignAsset}
                  onMoveCharacterVoice={onMoveCharacterVoice}
                  projectObjectStorage={projectObjectStorage}
                  projectAssetManager={projectAssetManager}
                  projectId={projectId}
                  projectMode={projectMode}
                />
                <CharacterLinkedAssetColumn
                  character={item}
                  column="sprite"
                  title="角色精灵图"
                  uploadLabel="上传精灵图"
                  uploadProps={getSpriteUploadProps(item.id)}
                  pickerAssets={spriteAssets}
                  allAssets={allAssets}
                  actionLabel="关联精灵图"
                  confirmLabel="确认关联精灵图"
                  searchLabel="搜索精灵图"
                  searchPlaceholder="搜索精灵图"
                  emptyDescription="没有匹配的精灵图"
                  emptyThumb="精灵"
                  fallbackName="精灵图"
                  unlinkAriaLabel="取消关联角色精灵图"
                  helperNote="一次选择 png 和 index.json，会自动加入角色精灵图。"
                  detailForAsset={() => '精灵图'}
                  getStoryboardVoiceRefs={getStoryboardVoiceRefs}
                  onAssignAsset={onAssignAsset}
                  onUnassignAsset={onUnassignAsset}
                  onMoveCharacterVoice={onMoveCharacterVoice}
                  projectObjectStorage={projectObjectStorage}
                  projectAssetManager={projectAssetManager}
                  projectId={projectId}
                  projectMode={projectMode}
                />
                <CharacterLinkedAssetColumn
                  character={item}
                  column="voice"
                  title="角色配音"
                  uploadLabel="上传配音"
                  uploadProps={getVoiceUploadProps(item.id)}
                  pickerAssets={voiceAssets}
                  allAssets={allAssets}
                  actionLabel="关联配音"
                  confirmLabel="确认关联配音"
                  searchLabel="搜索配音"
                  searchPlaceholder="搜索配音"
                  emptyDescription="没有匹配的配音"
                  emptyThumb="音"
                  fallbackName="配音"
                  unlinkAriaLabel="取消关联角色配音"
                  detailForAsset={(asset) => asset.dialogueText || '未填写对白文本'}
                  getStoryboardVoiceRefs={getStoryboardVoiceRefs}
                  onAssignAsset={onAssignAsset}
                  onUnassignAsset={onUnassignAsset}
                  onMoveCharacterVoice={onMoveCharacterVoice}
                  projectObjectStorage={projectObjectStorage}
                  projectAssetManager={projectAssetManager}
                  projectId={projectId}
                  projectMode={projectMode}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
