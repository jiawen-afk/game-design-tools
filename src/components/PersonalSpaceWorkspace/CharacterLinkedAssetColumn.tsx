import type { UploadProps } from 'antd'
import { Button, Upload } from 'antd'
import { DisconnectOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { CharacterAssetPicker } from './CharacterAssetPicker'
import { PersonalAssetPreview } from './PersonalAssetPreview'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'
import { useRenameDrafts } from './useRenameDrafts'

type CharacterAssetColumnKind = 'portrait' | 'sprite' | 'voice'

interface CharacterLinkedAssetColumnProps {
  character: CharacterProfile
  column: CharacterAssetColumnKind
  title: string
  uploadLabel: string
  uploadProps: UploadProps
  pickerAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  actionLabel: string
  confirmLabel: string
  searchLabel: string
  searchPlaceholder: string
  emptyDescription: string
  emptyThumb: string
  fallbackName: string
  unlinkAriaLabel: string
  helperNote?: string
  detailForAsset: (asset: PersonalSpaceAsset) => string
  getStoryboardVoiceRefs: (assetId: string) => string[]
  onAssignAsset: (characterId: string, assetId: string, column: CharacterAssetColumnKind) => void
  onUnassignAsset: (characterId: string, assetId: string, column: CharacterAssetColumnKind) => void
  onRenameAsset: (assetId: string, name: string) => void
  onMoveCharacterVoice: (characterId: string, draggedAssetId: string, targetAssetId: string) => void
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

function linkedAssetsForColumn(character: CharacterProfile, column: CharacterAssetColumnKind) {
  if (column === 'portrait') return character.portraitAssets
  if (column === 'sprite') return character.spriteAssets
  return character.voiceAssets
}

export function CharacterLinkedAssetColumn({
  character,
  column,
  title,
  uploadLabel,
  uploadProps,
  pickerAssets,
  allAssets,
  actionLabel,
  confirmLabel,
  searchLabel,
  searchPlaceholder,
  emptyDescription,
  emptyThumb,
  fallbackName,
  unlinkAriaLabel,
  helperNote,
  detailForAsset,
  getStoryboardVoiceRefs,
  onAssignAsset,
  onUnassignAsset,
  onRenameAsset,
  onMoveCharacterVoice,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: CharacterLinkedAssetColumnProps) {
  const linkedAssets = linkedAssetsForColumn(character, column)
  const assetById = new Map(allAssets.map((asset) => [asset.id, asset]))
  const isVoiceColumn = column === 'voice'
  const assetRename = useRenameDrafts<{ id: string; name: string }>(onRenameAsset)

  const renderPreview = (asset?: PersonalSpaceAsset) => (
    asset ? (
      <PersonalAssetPreview
        asset={asset}
        projectObjectStorage={projectObjectStorage}
        projectAssetManager={projectAssetManager}
        projectId={projectId}
        projectMode={projectMode}
      />
    ) : isVoiceColumn ? <div className="asset-preview character-voice-preview-placeholder">音</div> : null
  )

  const renderRenameButton = (assetId: string, asset?: PersonalSpaceAsset) => {
    const renameItem = { id: assetId, name: asset?.name ?? fallbackName }
    return (
      <PersonalSpaceTextPopover
        open={assetRename.isRenaming(assetId)}
        onOpenChange={(open) => assetRename.openRename(renameItem, open)}
        className="character-linked-asset-rename-popover"
        value={assetRename.draftFor(renameItem)}
        ariaLabel={`${asset?.name ?? fallbackName}资产名称`}
        placeholder="资产名称"
        confirmIcon={<EditOutlined />}
        confirmDisabled={!assetRename.draftFor(renameItem).trim()}
        onValueChange={(value) => assetRename.changeDraft(assetId, value)}
        onConfirm={() => assetRename.confirmRename(renameItem)}
        onCancel={() => assetRename.cancelRename(assetId)}
      >
        <Button
          size="small"
          icon={<EditOutlined />}
          aria-label="重命名资产"
          onClick={() => assetRename.openRename(renameItem, true)}
        >
          重命名
        </Button>
      </PersonalSpaceTextPopover>
    )
  }

  const renderLinkedAsset = (assetId: string) => {
    const asset = assetById.get(assetId)
    if (!isVoiceColumn) {
      return (
        <div className="linked-asset-row" key={assetId}>
          {renderPreview(asset)}
          <div className="form-stack linked-asset-main">
            <div className="linked-asset-name-block">
              <strong>{asset?.name ?? fallbackName}</strong>
              {renderRenameButton(assetId, asset)}
            </div>
            <Button
              size="small"
              danger
              icon={<DisconnectOutlined />}
              aria-label={unlinkAriaLabel}
              onClick={() => onUnassignAsset(character.id, assetId, column)}
            />
          </div>
        </div>
      )
    }

    return (
      <div
        className="character-voice-link"
        key={assetId}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', assetId)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(event) => {
          event.preventDefault()
          const draggedAssetId = event.dataTransfer.getData('text/plain')
          if (draggedAssetId) onMoveCharacterVoice(character.id, draggedAssetId, assetId)
        }}
      >
        <div className="linked-asset-row character-voice-row">
          {renderPreview(asset)}
          <div className="character-voice-main">
            <strong>{asset?.name ?? fallbackName}</strong>
            {renderRenameButton(assetId, asset)}
            <span className="character-voice-dialogue">{asset?.dialogueText || '未填写对白文本'}</span>
            <span className="field-note">剧情顺序：{getStoryboardVoiceRefs(assetId).join('、') || '未关联剧情组'}</span>
          </div>
          <Button
            size="small"
            danger
            icon={<DisconnectOutlined />}
            aria-label={unlinkAriaLabel}
            onClick={() => onUnassignAsset(character.id, assetId, column)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-column">
      <strong>{title}</strong>
      <div className="character-link-actions">
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>{uploadLabel}</Button>
        </Upload>
        <CharacterAssetPicker
          assets={pickerAssets}
          actionLabel={actionLabel}
          confirmLabel={confirmLabel}
          searchLabel={searchLabel}
          searchPlaceholder={searchPlaceholder}
          emptyDescription={emptyDescription}
          emptyThumb={emptyThumb}
          detailForAsset={detailForAsset}
          projectObjectStorage={projectObjectStorage}
          projectAssetManager={projectAssetManager}
          projectId={projectId}
          projectMode={projectMode}
          onConfirm={(assetId) => onAssignAsset(character.id, assetId, column)}
        />
      </div>
      {helperNote && <span className="field-note">{helperNote}</span>}
      {linkedAssets.map((link) => renderLinkedAsset(link.assetId))}
    </div>
  )
}
