import type { UploadProps } from 'antd'
import { Button, Empty, Input, Popconfirm, Select, Space, Tag, Upload } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'

import type { CommonAssetKind, PersonalSpaceAsset } from './personalSpaceModel'

export interface PersonalResourceSectionConfig {
  kind: CommonAssetKind
  title: string
  description: string
  importLabel: string
  emptyDescription: string
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
  onChangeEffectVoiceLinks: (assetId: string, voiceIds: string[]) => void
  onChangeVoiceCharacterLinks: (assetId: string, characterIds: string[]) => void
  onChangeVoiceStoryboardLinks: (assetId: string, storyboardIds: string[]) => void
  onDeleteAsset: (assetId: string) => void
}

function EmptyBlock({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
}

function splitTags(value: string) {
  return value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean)
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
  onChangeEffectVoiceLinks,
  onChangeVoiceCharacterLinks,
  onChangeVoiceStoryboardLinks,
  onDeleteAsset,
}: PersonalResourceSectionProps) {
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

        {section.assets.length === 0 ? (
          <EmptyBlock description={section.emptyDescription} />
        ) : (
          <div className="resource-list">
            {section.assets.map((item) => (
              <article className="space-record" key={item.id}>
                <div className="command-row">
                  <Input
                    value={item.name}
                    aria-label={`${section.title}名称`}
                    onChange={(event) => onRenameAsset(item.id, event.target.value)}
                  />
                  <Space>
                    <Tag>{getAssetKindLabel(item.kind)}</Tag>
                    <Popconfirm title="删除资源" description="会移除角色和剧情中的关联；勾选设置后会尝试同步删除存储目录资源。" onConfirm={() => onDeleteAsset(item.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
                <div className="form-stack">
                  <Input
                    value={item.groupName}
                    aria-label={`${section.title}分组`}
                    addonBefore="分组"
                    onChange={(event) => onChangeGroupName(item.id, event.target.value)}
                  />
                  <Input
                    value={item.tags.join('、')}
                    aria-label={`${section.title}标签`}
                    addonBefore="标签"
                    onChange={(event) => onChangeTags(item.id, splitTags(event.target.value))}
                  />
                  <span className="field-note">{item.resourcePaths.join('、') || '未绑定本地文件'}</span>
                  {item.storageResourcePaths.length > 0 && (
                    <span className="field-note">存储目标：{item.storageResourcePaths.join('、')}</span>
                  )}
                  {item.kind === 'effect' && (
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
        )}
      </section>
    </section>
  )
}
