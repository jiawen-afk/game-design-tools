import { Button, Checkbox, Input, Popconfirm, Select, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { AssetGroupKind, PersonalSpaceAsset } from './personalSpaceModel'
import { PersonalAssetPreview } from './PersonalAssetPreview'

interface PersonalResourceAssetRecordProps {
  sectionTitle: string
  item: PersonalSpaceAsset
  checked: boolean
  spriteAssets: PersonalSpaceAsset[]
  voiceAssets: PersonalSpaceAsset[]
  characterOptions: Array<{ label: string; value: string }>
  storyboardOptions: Array<{ label: string; value: string }>
  getAssetOptions: (assets: PersonalSpaceAsset[]) => Array<{ label: string; value: string }>
  getAssetKindLabel: (kind: AssetGroupKind) => string
  getStoryboardVoiceRefs: (assetId: string) => string[]
  onSelectedChange: (checked: boolean) => void
  onRenameAsset: (assetId: string, name: string) => void
  onChangeDialogueText: (assetId: string, dialogueText: string) => void
  onChangeEffectVoiceLinks: (assetId: string, voiceIds: string[]) => void
  onChangeVoiceCharacterLinks: (assetId: string, characterIds: string[]) => void
  onChangeVoiceStoryboardLinks: (assetId: string, storyboardIds: string[]) => void
  onChangeSoundSpriteLinks: (assetId: string, spriteIds: string[]) => void
  onDeleteAsset: (assetId: string) => void
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

function formatImportedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '未知时间'
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function PersonalResourceAssetRecord({
  sectionTitle,
  item,
  checked,
  spriteAssets,
  voiceAssets,
  characterOptions,
  storyboardOptions,
  getAssetOptions,
  getAssetKindLabel,
  getStoryboardVoiceRefs,
  onSelectedChange,
  onRenameAsset,
  onChangeDialogueText,
  onChangeEffectVoiceLinks,
  onChangeVoiceCharacterLinks,
  onChangeVoiceStoryboardLinks,
  onChangeSoundSpriteLinks,
  onDeleteAsset,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: PersonalResourceAssetRecordProps) {
  return (
    <article className={`space-record resource-space-record${item.kind === 'voice' ? ' voice-space-record' : ''}`}>
      <div className="asset-record-row">
        <Checkbox
          className="asset-selection-checkbox"
          checked={checked}
          aria-label={`选择${item.name}`}
          onChange={(event) => onSelectedChange(event.target.checked)}
        />
        <PersonalAssetPreview
          asset={item}
          projectObjectStorage={projectObjectStorage}
          projectAssetManager={projectAssetManager}
          projectId={projectId}
          projectMode={projectMode}
        />
        <div className="asset-record-main">
          <div className="asset-record-heading">
            <Input
              value={item.name}
              aria-label={`${sectionTitle}名称`}
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
        {item.kind === 'image' && item.assetSubtype === 'effect' && (
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
              aria-label={`${sectionTitle}台词文本`}
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
        {item.kind === 'sound' && (
          <label className="form-field">
            <span className="field-label">关联精灵图</span>
            <Select
              mode="multiple"
              value={item.linkedSpriteAssetIds}
              options={getAssetOptions(spriteAssets)}
              placeholder="选择精灵图素材"
              onChange={(spriteIds) => onChangeSoundSpriteLinks(item.id, spriteIds)}
            />
          </label>
        )}
      </div>
    </article>
  )
}
