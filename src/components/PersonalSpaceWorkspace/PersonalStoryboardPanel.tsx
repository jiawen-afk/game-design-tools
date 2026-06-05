import { Button, Empty, Input, Popconfirm, Select, Space } from 'antd'
import { DeleteOutlined, DownOutlined, ExportOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons'

import type { PersonalSpaceAsset, StoryboardGroup } from './personalSpaceModel'

type SelectOption = { label: string; value: string }

interface PersonalStoryboardPanelProps {
  storyboardGroups: StoryboardGroup[]
  newStoryboardName: string
  characterOptions: SelectOption[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getAssetOptions: (assets: PersonalSpaceAsset[]) => SelectOption[]
  onNewStoryboardNameChange: (name: string) => void
  onCreateStoryboard: () => void
  onRenameStoryboard: (groupId: string, name: string) => void
  onCopyStoryboardReference: (groupId: string) => void
  onExportStoryboardAsset: (groupId: string) => void
  onDeleteStoryboard: (groupId: string) => void
  onSetStoryboardCharacters: (groupId: string, characterIds: string[]) => void
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
  onUpdateStoryboardVoiceText: (groupId: string, assetId: string, text: string) => void
  onReorderStoryboardVoice: (groupId: string, assetId: string, direction: 'up' | 'down') => void
}

export function PersonalStoryboardPanel({
  storyboardGroups,
  newStoryboardName,
  characterOptions,
  voiceAssets,
  allAssets,
  getAssetOptions,
  onNewStoryboardNameChange,
  onCreateStoryboard,
  onRenameStoryboard,
  onCopyStoryboardReference,
  onExportStoryboardAsset,
  onDeleteStoryboard,
  onSetStoryboardCharacters,
  onAssignVoiceToStoryboard,
  onUpdateStoryboardVoiceText,
  onReorderStoryboardVoice,
}: PersonalStoryboardPanelProps) {
  return (
    <section className="space-panel">
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={newStoryboardName}
          onChange={(event) => onNewStoryboardNameChange(event.target.value)}
          onPressEnter={onCreateStoryboard}
          placeholder="新剧情分组名称"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateStoryboard}>创建剧情组</Button>
      </Space.Compact>
      <strong>剧情分组</strong>
      {storyboardGroups.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有剧情分组。创建后可导入角色、导入配音、填写对白文本，并按组导出剧情编排资产。" />
      ) : (
        <div className="form-stack">
          {storyboardGroups.map((item) => (
            <article className="space-record" key={item.id}>
              <div className="command-row">
                <Input
                  value={item.name}
                  aria-label="剧情组名称"
                  onChange={(event) => onRenameStoryboard(item.id, event.target.value)}
                />
                <Space>
                  <Button size="small" icon={<ExportOutlined />} onClick={() => onCopyStoryboardReference(item.id)}>复制参考资产</Button>
                  <Button size="small" icon={<ExportOutlined />} onClick={() => onExportStoryboardAsset(item.id)}>导出参考资产</Button>
                  <Popconfirm title="删除剧情组" description="会移除素材中关联到该剧情组的关系。" onConfirm={() => onDeleteStoryboard(item.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              <span className="field-note">角色 {item.characterIds.length} · 配音 {item.voiceAssetIds.length}</span>
              <div className="form-stack">
                <label className="form-field">
                  <span className="field-label">导入角色</span>
                  <Select
                    mode="multiple"
                    value={item.characterIds}
                    options={characterOptions}
                    onChange={(characterIds) => onSetStoryboardCharacters(item.id, characterIds)}
                  />
                </label>
                <label className="form-field">
                  <span className="field-label">导入配音</span>
                  <Select
                    placeholder="选择配音素材"
                    options={getAssetOptions(voiceAssets)}
                    onChange={(assetId) => onAssignVoiceToStoryboard(item.id, assetId)}
                  />
                </label>
                {[...item.voiceEntries].sort((a, b) => a.order - b.order).map((entry) => (
                  <div className="command-row" key={entry.assetId}>
                    <label className="form-field">
                      <span className="field-label">对白文本 #{entry.order + 1} · {allAssets.find((asset) => asset.id === entry.assetId)?.name ?? '配音'}</span>
                      <Input.TextArea
                        rows={2}
                        value={entry.text}
                        aria-label="对白文本"
                        placeholder="对白文本"
                        onChange={(event) => onUpdateStoryboardVoiceText(item.id, entry.assetId, event.target.value)}
                      />
                    </label>
                    <Space>
                      <Button size="small" icon={<UpOutlined />} onClick={() => onReorderStoryboardVoice(item.id, entry.assetId, 'up')} />
                      <Button size="small" icon={<DownOutlined />} onClick={() => onReorderStoryboardVoice(item.id, entry.assetId, 'down')} />
                    </Space>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
