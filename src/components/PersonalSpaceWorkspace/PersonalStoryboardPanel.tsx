import { useMemo, useState } from 'react'
import { Avatar, Button, Empty, Input, Popconfirm, Select, Space, Tag } from 'antd'
import { DeleteOutlined, DisconnectOutlined, DownOutlined, ExportOutlined, PlusOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup, StoryboardVoiceEntry } from './personalSpaceModel'
import { PersonalAssetPreview } from './PersonalResourceSections'

type SelectOption = { label: string; value: string }

interface PersonalStoryboardPanelProps {
  storyboardGroups: StoryboardGroup[]
  newStoryboardName: string
  characters: CharacterProfile[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getStoryboardLinkedCharacterIds: (groupId: string) => string[]
  onNewStoryboardNameChange: (name: string) => void
  onCreateStoryboard: () => void
  onRenameStoryboard: (groupId: string, name: string) => void
  onExportStoryboardAsset: (groupId: string) => void
  onDeleteStoryboard: (groupId: string) => void
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
  onUnassignStoryboardVoice: (groupId: string, assetId: string) => void
  onAssignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => void
  onUpdateStoryboardVoiceText: (groupId: string, assetId: string, text: string) => void
  onUpdateStoryboardVoiceNote: (groupId: string, assetId: string, noteName: string) => void
  onReorderStoryboardVoice: (groupId: string, assetId: string, direction: 'up' | 'down') => void
  onMoveStoryboardVoice: (groupId: string, draggedAssetId: string, targetAssetId: string) => void
}

function includesKeyword(values: Array<string | undefined>, keyword: string) {
  const cleanKeyword = keyword.trim().toLowerCase()
  if (!cleanKeyword) return true
  return values.some((value) => value?.toLowerCase().includes(cleanKeyword))
}

function characterInitial(name: string) {
  return name.trim().slice(0, 1) || '?'
}

function findPortraitAsset(character: CharacterProfile, allAssets: PersonalSpaceAsset[]) {
  const portraitLink = character.portraitAssets.slice().sort((a, b) => a.order - b.order)[0]
  return portraitLink ? allAssets.find((asset) => asset.id === portraitLink.assetId) : undefined
}

function CharacterAvatar({ character, allAssets }: { character: CharacterProfile; allAssets: PersonalSpaceAsset[] }) {
  const portrait = findPortraitAsset(character, allAssets)
  const portraitPath = portrait?.resourcePaths[0]
  return (
    <Avatar
      size={34}
      src={portraitPath}
      className="storyboard-avatar"
    >
      {characterInitial(character.name)}
    </Avatar>
  )
}

function StoryboardVoiceRow({
  entry,
  groupId,
  voiceAsset,
  speaker,
  characterOptions,
  allAssets,
  onUnassignStoryboardVoice,
  onAssignStoryboardVoiceCharacter,
  onUpdateStoryboardVoiceText,
  onUpdateStoryboardVoiceNote,
  onReorderStoryboardVoice,
  onMoveStoryboardVoice,
}: {
  entry: StoryboardVoiceEntry
  groupId: string
  voiceAsset: PersonalSpaceAsset
  speaker?: CharacterProfile
  characterOptions: SelectOption[]
  allAssets: PersonalSpaceAsset[]
  onUnassignStoryboardVoice: (groupId: string, assetId: string) => void
  onAssignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => void
  onUpdateStoryboardVoiceText: (groupId: string, assetId: string, text: string) => void
  onUpdateStoryboardVoiceNote: (groupId: string, assetId: string, noteName: string) => void
  onReorderStoryboardVoice: (groupId: string, assetId: string, direction: 'up' | 'down') => void
  onMoveStoryboardVoice: (groupId: string, draggedAssetId: string, targetAssetId: string) => void
}) {
  return (
    <article
      className="storyboard-voice-row"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', voiceAsset.id)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => {
        event.preventDefault()
        const draggedAssetId = event.dataTransfer.getData('text/plain')
        if (draggedAssetId) onMoveStoryboardVoice(groupId, draggedAssetId, voiceAsset.id)
      }}
    >
      <div className="storyboard-voice-speaker">
        {speaker ? <CharacterAvatar character={speaker} allAssets={allAssets} /> : <Avatar size={34} className="storyboard-avatar">?</Avatar>}
        <Select
          size="small"
          className="storyboard-speaker-select"
          placeholder="关联角色"
          value={speaker?.id}
          options={characterOptions}
          showSearch
          optionFilterProp="label"
          onChange={(characterId) => onAssignStoryboardVoiceCharacter(groupId, voiceAsset.id, characterId)}
        />
      </div>
      <div className="storyboard-voice-main">
        <div className="storyboard-voice-meta">
          <PersonalAssetPreview asset={voiceAsset} />
          <strong>{voiceAsset.name}</strong>
          {speaker ? <span>{speaker.name}</span> : <Tag color="warning">未关联角色</Tag>}
        </div>
        <Input
          size="small"
          value={entry.noteName ?? ''}
          aria-label="关联备注"
          placeholder="关联备注"
          onChange={(event) => onUpdateStoryboardVoiceNote(groupId, voiceAsset.id, event.target.value)}
        />
        <Input
          size="small"
          value={entry.text}
          aria-label="对白文本"
          placeholder="对白文本"
          onChange={(event) => onUpdateStoryboardVoiceText(groupId, voiceAsset.id, event.target.value)}
        />
      </div>
      <Space.Compact>
        <Button size="small" icon={<UpOutlined />} onClick={() => onReorderStoryboardVoice(groupId, voiceAsset.id, 'up')} />
        <Button size="small" icon={<DownOutlined />} onClick={() => onReorderStoryboardVoice(groupId, voiceAsset.id, 'down')} />
        <Button
          size="small"
          danger
          icon={<DisconnectOutlined />}
          aria-label="取消关联配音"
          onClick={() => onUnassignStoryboardVoice(groupId, voiceAsset.id)}
        />
      </Space.Compact>
    </article>
  )
}

function StoryboardVoicePicker({
  groupId,
  voiceAssets,
  expanded,
  search,
  onSearchChange,
  onExpand,
  onAssignVoiceToStoryboard,
}: {
  groupId: string
  voiceAssets: PersonalSpaceAsset[]
  expanded: boolean
  search: string
  onSearchChange: (value: string) => void
  onExpand: () => void
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
}) {
  const filteredVoiceAssets = voiceAssets.filter((asset) => includesKeyword([asset.name, asset.dialogueText, asset.tags.join('、')], search))
  return (
    <div className="storyboard-voice-picker">
      <span className="field-label">导入配音</span>
      <Input
        size="small"
        allowClear
        prefix={<SearchOutlined />}
        placeholder="搜索配音"
        value={search}
        onFocus={onExpand}
        onClick={onExpand}
        onChange={(event) => {
          onExpand()
          onSearchChange(event.target.value)
        }}
      />
      {expanded && (
        <div className="voice-picker-popover">
          {filteredVoiceAssets.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的配音" />
          ) : filteredVoiceAssets.map((asset) => (
            <button
              type="button"
              className="voice-picker-option"
              key={asset.id}
              onClick={() => onAssignVoiceToStoryboard(groupId, asset.id)}
            >
              <strong>{asset.name}</strong>
              <span>{asset.dialogueText || asset.tags.join('、') || '未填写台词'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PersonalStoryboardPanel({
  storyboardGroups,
  newStoryboardName,
  characters,
  voiceAssets,
  allAssets,
  getStoryboardLinkedCharacterIds,
  onNewStoryboardNameChange,
  onCreateStoryboard,
  onRenameStoryboard,
  onExportStoryboardAsset,
  onDeleteStoryboard,
  onAssignVoiceToStoryboard,
  onUnassignStoryboardVoice,
  onAssignStoryboardVoiceCharacter,
  onUpdateStoryboardVoiceText,
  onUpdateStoryboardVoiceNote,
  onReorderStoryboardVoice,
  onMoveStoryboardVoice,
}: PersonalStoryboardPanelProps) {
  const [voiceSearch, setVoiceSearch] = useState('')
  const [expandedVoicePickerGroupId, setExpandedVoicePickerGroupId] = useState<string | null>(null)
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters])
  const voiceById = useMemo(() => new Map(voiceAssets.map((asset) => [asset.id, asset])), [voiceAssets])
  const characterOptions = characters.map((character) => ({ label: character.name, value: character.id }))

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
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有剧情分组。创建后可导入配音、填写对白文本，并按组导出剧情编排资产。" />
      ) : (
        <div className="form-stack">
          {storyboardGroups.map((item) => {
            const linkedCharacterIds = getStoryboardLinkedCharacterIds(item.id)
            return (
            <article className="space-record" key={item.id}>
              <div className="command-row">
                <Input
                  value={item.name}
                  aria-label="剧情组名称"
                  onChange={(event) => onRenameStoryboard(item.id, event.target.value)}
                />
                <div className="storyboard-header-actions">
                  <StoryboardVoicePicker
                    groupId={item.id}
                    voiceAssets={voiceAssets}
                    expanded={expandedVoicePickerGroupId === item.id}
                    search={voiceSearch}
                    onSearchChange={setVoiceSearch}
                    onExpand={() => setExpandedVoicePickerGroupId(item.id)}
                    onAssignVoiceToStoryboard={onAssignVoiceToStoryboard}
                  />
                  <Button size="small" icon={<ExportOutlined />} onClick={() => onExportStoryboardAsset(item.id)}>导出参考资产</Button>
                  <Popconfirm title="删除剧情组" description="会移除素材中关联到该剧情组的关系。" onConfirm={() => onDeleteStoryboard(item.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>
              <span className="field-note">关联角色 {linkedCharacterIds.length} · 配音 {item.voiceAssetIds.length}</span>
              <div className="storyboard-arranger">
                <aside className="storyboard-character-pane" aria-label="关联角色">
                  <span className="field-label">关联角色</span>
                  <div className="storyboard-character-list">
                    {linkedCharacterIds
                      .map((characterId) => characterById.get(characterId))
                      .filter((character): character is CharacterProfile => Boolean(character))
                      .map((character) => (
                        <div className="storyboard-character-item" key={character.id}>
                          <CharacterAvatar character={character} allAssets={allAssets} />
                          <span>{character.name}</span>
                        </div>
                      ))}
                    {linkedCharacterIds.length === 0 && (
                      <span className="field-note">导入的配音关联角色后会显示在这里。</span>
                    )}
                  </div>
                </aside>
                <div className="storyboard-voice-pane">
                  <div className="storyboard-voice-list">
                    {[...item.voiceEntries].sort((a, b) => a.order - b.order).map((entry) => {
                      const voiceAsset = voiceById.get(entry.assetId)
                      if (!voiceAsset || !includesKeyword([voiceAsset.name, entry.text, voiceAsset.dialogueText], voiceSearch)) return null
                      const speaker = voiceAsset.linkedCharacterIds
                        .map((characterId) => characterById.get(characterId))
                        .find((character): character is CharacterProfile => Boolean(character))
                      return (
                        <StoryboardVoiceRow
                          key={entry.assetId}
                          entry={entry}
                          groupId={item.id}
                          voiceAsset={voiceAsset}
                          speaker={speaker}
                          characterOptions={characterOptions}
                          allAssets={allAssets}
                          onUnassignStoryboardVoice={onUnassignStoryboardVoice}
                          onAssignStoryboardVoiceCharacter={onAssignStoryboardVoiceCharacter}
                          onUpdateStoryboardVoiceText={onUpdateStoryboardVoiceText}
                          onUpdateStoryboardVoiceNote={onUpdateStoryboardVoiceNote}
                          onReorderStoryboardVoice={onReorderStoryboardVoice}
                          onMoveStoryboardVoice={onMoveStoryboardVoice}
                        />
                      )
                    })}
                  </div>
                  {item.voiceEntries.length === 0 && (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有导入配音。选择配音素材后即可编排多名角色对白。" />
                  )}
                </div>
              </div>
            </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
