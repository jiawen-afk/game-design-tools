import type { UploadProps } from 'antd'
import { Button, Popconfirm, Space } from 'antd'
import { DeleteOutlined, DownOutlined, EditOutlined, StarFilled, StarOutlined, UpOutlined } from '@ant-design/icons'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { CharacterLinkedAssetColumn } from './CharacterLinkedAssetColumn'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'

type CharacterAssetColumnKind = 'portrait' | 'sprite' | 'voice'

interface CharacterProfileCardProps {
  item: CharacterProfile
  portraitAssets: PersonalSpaceAsset[]
  spriteAssets: PersonalSpaceAsset[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getStoryboardVoiceRefs: (assetId: string) => string[]
  getPortraitUploadProps: (characterId: string) => UploadProps
  getSpriteUploadProps: (characterId: string) => UploadProps
  getVoiceUploadProps: (characterId: string) => UploadProps
  isRenaming: boolean
  characterNameDraft: string
  onRenameOpenChange: (character: CharacterProfile, open: boolean) => void
  onCharacterNameDraftChange: (characterId: string, value: string) => void
  onConfirmCharacterRename: (character: CharacterProfile) => void
  onCancelCharacterRename: (characterId: string) => void
  onToggleCharacterStar: (characterId: string) => void
  onReorderCharacter: (characterId: string, direction: 'up' | 'down') => void
  onDeleteCharacter: (characterId: string) => void
  onAssignAsset: (characterId: string, assetId: string, column: CharacterAssetColumnKind) => void
  onUnassignAsset: (characterId: string, assetId: string, column: CharacterAssetColumnKind) => void
  onRenameAsset: (assetId: string, name: string) => void
  onMoveCharacterVoice: (characterId: string, draggedAssetId: string, targetAssetId: string) => void
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

export function CharacterProfileCard({
  item,
  portraitAssets,
  spriteAssets,
  voiceAssets,
  allAssets,
  getStoryboardVoiceRefs,
  getPortraitUploadProps,
  getSpriteUploadProps,
  getVoiceUploadProps,
  isRenaming,
  characterNameDraft,
  onRenameOpenChange,
  onCharacterNameDraftChange,
  onConfirmCharacterRename,
  onCancelCharacterRename,
  onToggleCharacterStar,
  onReorderCharacter,
  onDeleteCharacter,
  onAssignAsset,
  onUnassignAsset,
  onRenameAsset,
  onMoveCharacterVoice,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: CharacterProfileCardProps) {
  return (
    <article className="space-record">
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
            open={isRenaming}
            onOpenChange={(open) => onRenameOpenChange(item, open)}
            className="character-name-rename-popover"
            value={characterNameDraft}
            ariaLabel={`${item.name}角色名称`}
            placeholder="角色名称"
            confirmDisabled={!characterNameDraft.trim()}
            onValueChange={(value) => onCharacterNameDraftChange(item.id, value)}
            onConfirm={() => onConfirmCharacterRename(item)}
            onCancel={() => onCancelCharacterRename(item.id)}
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
          onRenameAsset={onRenameAsset}
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
          helperNote="一次选择 png 或 webp 和 index.json，也可以选择包含它们的 zip，会自动加入角色精灵图。"
          detailForAsset={() => '精灵图'}
          getStoryboardVoiceRefs={getStoryboardVoiceRefs}
          onAssignAsset={onAssignAsset}
          onUnassignAsset={onUnassignAsset}
          onRenameAsset={onRenameAsset}
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
          onRenameAsset={onRenameAsset}
          onMoveCharacterVoice={onMoveCharacterVoice}
          projectObjectStorage={projectObjectStorage}
          projectAssetManager={projectAssetManager}
          projectId={projectId}
          projectMode={projectMode}
        />
      </div>
    </article>
  )
}
