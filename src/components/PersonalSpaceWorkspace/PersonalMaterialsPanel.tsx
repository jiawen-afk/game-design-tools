import type { UploadProps } from 'antd'
import { Tabs } from 'antd'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { AssetGroupKind, PersonalResourceSectionConfig, PersonalSpaceAsset } from './personalSpaceModel'
import { PersonalResourceSection } from './PersonalResourceSections'

interface PersonalMaterialsPanelProps {
  resourceSections: PersonalResourceSectionConfig[]
  voiceAssets: PersonalSpaceAsset[]
  characterOptions: Array<{ label: string; value: string }>
  storyboardOptions: Array<{ label: string; value: string }>
  commonResourceUploadProps: (kind: AssetGroupKind, groupName?: string) => UploadProps
  spriteResourceUploadProps: (groupName?: string) => UploadProps
  getAssetOptions: (assets: PersonalSpaceAsset[]) => Array<{ label: string; value: string }>
  getAssetKindLabel: (kind: AssetGroupKind) => string
  getStoryboardVoiceRefs: (assetId: string) => string[]
  onRenameAsset: (assetId: string, name: string) => void
  onChangeGroupName: (assetId: string, groupName: string) => void
  onChangeDialogueText: (assetId: string, dialogueText: string) => void
  onChangeEffectVoiceLinks: (assetId: string, voiceIds: string[]) => void
  onChangeVoiceCharacterLinks: (assetId: string, characterIds: string[]) => void
  onChangeVoiceStoryboardLinks: (assetId: string, storyboardIds: string[]) => void
  onAddGroup: (kind: AssetGroupKind, name: string) => void
  onRenameGroup: (kind: AssetGroupKind, fromName: string, toName: string) => void
  onToggleGroupStar: (kind: AssetGroupKind, name: string) => void
  onDeleteGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => void
  onDeleteAsset: (assetId: string) => void | Promise<void>
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

export function PersonalMaterialsPanel({
  resourceSections,
  voiceAssets,
  characterOptions,
  storyboardOptions,
  commonResourceUploadProps,
  spriteResourceUploadProps,
  getAssetOptions,
  getAssetKindLabel,
  getStoryboardVoiceRefs,
  onRenameAsset,
  onChangeGroupName,
  onChangeDialogueText,
  onChangeEffectVoiceLinks,
  onChangeVoiceCharacterLinks,
  onChangeVoiceStoryboardLinks,
  onAddGroup,
  onRenameGroup,
  onToggleGroupStar,
  onDeleteGroup,
  onDeleteAsset,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: PersonalMaterialsPanelProps) {
  const materialSection = (section: PersonalResourceSectionConfig) => (
    <PersonalResourceSection
      key={`material-${section.kind}`}
      section={section}
      voiceAssets={voiceAssets}
      characterOptions={characterOptions}
      storyboardOptions={storyboardOptions}
      commonResourceUploadProps={commonResourceUploadProps}
      spriteResourceUploadProps={spriteResourceUploadProps}
      getAssetOptions={getAssetOptions}
      getAssetKindLabel={getAssetKindLabel}
      getStoryboardVoiceRefs={getStoryboardVoiceRefs}
      onRenameAsset={onRenameAsset}
      onChangeGroupName={onChangeGroupName}
      onChangeDialogueText={onChangeDialogueText}
      onChangeEffectVoiceLinks={onChangeEffectVoiceLinks}
      onChangeVoiceCharacterLinks={onChangeVoiceCharacterLinks}
      onChangeVoiceStoryboardLinks={onChangeVoiceStoryboardLinks}
      onAddGroup={onAddGroup}
      onRenameGroup={onRenameGroup}
      onToggleGroupStar={onToggleGroupStar}
      onDeleteGroup={onDeleteGroup}
      onDeleteAsset={(assetId) => void onDeleteAsset(assetId)}
      projectObjectStorage={projectObjectStorage}
      projectAssetManager={projectAssetManager}
      projectId={projectId}
      projectMode={projectMode}
    />
  )

  return (
    <Tabs
      className="personal-inner-tabs"
      items={[
        {
          key: 'images',
          label: '公共图片',
          children: resourceSections.filter((section) => section.kind === 'image').map(materialSection),
        },
        {
          key: 'sprites',
          label: '精灵图',
          children: resourceSections.filter((section) => section.kind === 'sprite').map(materialSection),
        },
        {
          key: 'voices',
          label: '配音',
          children: resourceSections.filter((section) => section.kind === 'voice').map(materialSection),
        },
      ]}
    />
  )
}
