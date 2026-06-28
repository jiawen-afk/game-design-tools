import { useState } from 'react'
import { Button, Empty, Input, Tooltip } from 'antd'
import { QuestionCircleOutlined, UserAddOutlined } from '@ant-design/icons'

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <QuestionCircleOutlined className="help-icon" aria-label={text} />
    </Tooltip>
  )
}

interface VoiceCharacterSelectorProps {
  characters: Array<{ id: string; name: string }>
  selectedCharacterId: string | null
  onCharacterSelect: (id: string | null) => void
  onCharacterCreate: (name: string) => void
}

export function VoiceCharacterSelector({
  characters,
  selectedCharacterId,
  onCharacterSelect,
  onCharacterCreate,
}: VoiceCharacterSelectorProps) {
  const [keyword, setKeyword] = useState('')
  const [newCharacterName, setNewCharacterName] = useState('')
  const normalizedKeyword = keyword.trim().toLowerCase()
  const filteredCharacters = normalizedKeyword
    ? characters.filter((character) => character.name.toLowerCase().includes(normalizedKeyword))
    : characters
  const createCharacter = () => {
    const trimmedName = newCharacterName.trim()
    if (!trimmedName) return
    onCharacterCreate(trimmedName)
    setNewCharacterName('')
    setKeyword('')
  }

  return (
    <aside className="voice-character-selector">
      <div className="panel-title compact">
        <h3>关联角色</h3>
        <HelpTip text="选择角色后，本次生成的音频记录名称会自动带上角色名。" />
      </div>
      <Input
        value={keyword}
        placeholder="搜索角色"
        allowClear
        onChange={(event) => setKeyword(event.target.value)}
      />
      <div className="voice-character-list" role="listbox" aria-label="选择生成语音角色">
        {filteredCharacters.length > 0 ? filteredCharacters.map((character) => (
          <button
            key={character.id}
            type="button"
            className={character.id === selectedCharacterId ? 'is-selected' : ''}
            aria-selected={character.id === selectedCharacterId}
            onClick={() => onCharacterSelect(character.id)}
          >
            {character.name}
          </button>
        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配角色" />}
      </div>
      <div className="voice-character-create">
        <Input
          value={newCharacterName}
          placeholder="快捷创建角色"
          allowClear
          onChange={(event) => setNewCharacterName(event.target.value)}
          onPressEnter={createCharacter}
        />
        <Button
          size="small"
          icon={<UserAddOutlined />}
          disabled={!newCharacterName.trim()}
          onClick={createCharacter}
        >
          创建
        </Button>
      </div>
      {selectedCharacterId && (
        <div className="voice-character-selected">
          <Button size="small" onClick={() => onCharacterSelect(null)}>
            取消选择
          </Button>
        </div>
      )}
    </aside>
  )
}
