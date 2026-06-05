import type { UploadProps } from 'antd'
import { Button, Empty, Input, Popconfirm, Select, Space, Upload } from 'antd'
import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined, UploadOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'

interface PersonalCharacterPanelProps {
  characters: CharacterProfile[]
  newCharacterName: string
  portraitAssets: PersonalSpaceAsset[]
  spriteAssets: PersonalSpaceAsset[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getAssetOptions: (assets: PersonalSpaceAsset[]) => Array<{ label: string; value: string }>
  getStoryboardVoiceRefs: (assetId: string) => string[]
  getPortraitUploadProps: (characterId: string) => UploadProps
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
  onReorderCharacterVoice: (characterId: string, assetId: string, direction: 'up' | 'down') => void
}

function splitTags(value: string) {
  return value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean)
}

export function PersonalCharacterPanel({
  characters,
  newCharacterName,
  portraitAssets,
  spriteAssets,
  voiceAssets,
  allAssets,
  getAssetOptions,
  getStoryboardVoiceRefs,
  getPortraitUploadProps,
  onNewCharacterNameChange,
  onCreateCharacter,
  onRenameCharacter,
  onReorderCharacter,
  onDeleteCharacter,
  onAssignAsset,
  onReorderCharacterVoice,
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
                  <Upload {...getPortraitUploadProps(item.id)}>
                    <Button icon={<UploadOutlined />}>上传肖像</Button>
                  </Upload>
                  <Select
                    placeholder="关联肖像资源"
                    options={getAssetOptions(portraitAssets)}
                    onChange={(assetId) => onAssignAsset(item.id, assetId, 'portrait', ['肖像'])}
                  />
                  {item.portraitAssets.map((link) => (
                    <Input
                      key={link.assetId}
                      addonBefore={allAssets.find((asset) => asset.id === link.assetId)?.name ?? '肖像'}
                      value={link.tags.join('、')}
                      aria-label="角色肖像标签"
                      onChange={(event) => onAssignAsset(item.id, link.assetId, 'portrait', splitTags(event.target.value))}
                    />
                  ))}
                </div>
                <div className="space-column">
                  <strong>角色精灵图</strong>
                  <Select
                    placeholder="关联精灵图资源"
                    options={getAssetOptions(spriteAssets)}
                    onChange={(assetId) => onAssignAsset(item.id, assetId, 'sprite', ['站立'])}
                  />
                  {item.spriteAssets.map((link) => (
                    <Input
                      key={link.assetId}
                      addonBefore={allAssets.find((asset) => asset.id === link.assetId)?.name ?? '精灵图'}
                      value={link.tags.join('、')}
                      aria-label="角色精灵图标签"
                      placeholder="站立、上走、下走、左走、右走、奔跑、互动、攻击、施法、受伤、死亡"
                      onChange={(event) => onAssignAsset(item.id, link.assetId, 'sprite', splitTags(event.target.value))}
                    />
                  ))}
                </div>
                <div className="space-column">
                  <strong>角色配音</strong>
                  <Select
                    placeholder="关联配音资源"
                    options={getAssetOptions(voiceAssets)}
                    onChange={(assetId) => onAssignAsset(item.id, assetId, 'voice', ['角色配音'])}
                  />
                  {item.voiceAssets.map((link) => (
                    <div className="form-stack" key={link.assetId}>
                      <div className="command-row">
                        <Input
                          addonBefore={allAssets.find((asset) => asset.id === link.assetId)?.name ?? '配音'}
                          value={link.tags.join('、')}
                          aria-label="角色配音标签"
                          onChange={(event) => onAssignAsset(item.id, link.assetId, 'voice', splitTags(event.target.value))}
                        />
                        <Space>
                          <Button size="small" icon={<UpOutlined />} onClick={() => onReorderCharacterVoice(item.id, link.assetId, 'up')} />
                          <Button size="small" icon={<DownOutlined />} onClick={() => onReorderCharacterVoice(item.id, link.assetId, 'down')} />
                        </Space>
                      </div>
                      <span className="field-note">剧情顺序：{getStoryboardVoiceRefs(link.assetId).join('、') || '未关联剧情组'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
