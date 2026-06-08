import type { MouseEvent } from 'react'
import { useMemo, useState } from 'react'
import { Button, Empty, Input, Modal } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'

import type { PersonalSpaceAsset } from './personalSpaceModel'
import { includesKeyword } from './personalSpaceSearch'

export function StoryboardVoicePicker({
  groupId,
  voiceAssets,
  onAssignVoiceToStoryboard,
}: {
  groupId: string
  voiceAssets: PersonalSpaceAsset[]
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedVoiceAssetIds, setSelectedVoiceAssetIds] = useState<string[]>([])
  const [lastSelectedVoiceAssetId, setLastSelectedVoiceAssetId] = useState<string | null>(null)
  const filteredVoiceAssets = voiceAssets.filter((asset) => includesKeyword([asset.name, asset.dialogueText, asset.tags.join('、')], search))
  const selectedVoiceAssetIdSet = useMemo(() => new Set(selectedVoiceAssetIds), [selectedVoiceAssetIds])
  const selectedVoiceAssets = selectedVoiceAssetIds
    .map((assetId) => voiceAssets.find((asset) => asset.id === assetId))
    .filter((asset): asset is PersonalSpaceAsset => Boolean(asset))

  const closePicker = () => {
    setOpen(false)
    setSearch('')
    setSelectedVoiceAssetIds([])
    setLastSelectedVoiceAssetId(null)
  }

  const confirmVoice = () => {
    if (selectedVoiceAssetIds.length === 0) return
    selectedVoiceAssetIds.forEach((assetId) => onAssignVoiceToStoryboard(groupId, assetId))
    closePicker()
  }

  const selectVoiceAsset = (assetId: string, event: MouseEvent<HTMLButtonElement>) => {
    const filteredAssetIds = filteredVoiceAssets.map((asset) => asset.id)
    setSelectedVoiceAssetIds((current) => {
      if (event.shiftKey && lastSelectedVoiceAssetId) {
        const anchorIndex = filteredAssetIds.indexOf(lastSelectedVoiceAssetId)
        const targetIndex = filteredAssetIds.indexOf(assetId)
        if (anchorIndex >= 0 && targetIndex >= 0) {
          const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex]
          const rangeAssetIds = filteredAssetIds.slice(start, end + 1)
          if (event.altKey || event.ctrlKey || event.metaKey) return Array.from(new Set([...current, ...rangeAssetIds]))
          return rangeAssetIds
        }
      }
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return current.includes(assetId) ? current.filter((item) => item !== assetId) : [...current, assetId]
      }
      return [assetId]
    })
    setLastSelectedVoiceAssetId(assetId)
  }

  return (
    <div className="storyboard-voice-picker">
      <Button size="small" icon={<PlusOutlined />} onClick={() => setOpen(true)}>关联配音</Button>
      <Modal
        open={open}
        title="关联配音"
        onCancel={closePicker}
        footer={[
          <Button key="cancel" onClick={closePicker}>取消</Button>,
          <Button key="confirm" type="primary" disabled={selectedVoiceAssetIds.length === 0} onClick={confirmVoice}>
            确认关联{selectedVoiceAssetIds.length > 1 ? ` ${selectedVoiceAssetIds.length} 个` : ''}配音
          </Button>,
        ]}
      >
        <div className="storyboard-voice-picker-modal">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索配音"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="voice-picker-popover">
            {filteredVoiceAssets.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的配音" />
            ) : filteredVoiceAssets.map((asset) => (
              <button
                type="button"
                className={`voice-picker-option${selectedVoiceAssetIdSet.has(asset.id) ? ' is-selected' : ''}`}
                key={asset.id}
                onClick={(event) => selectVoiceAsset(asset.id, event)}
              >
                <strong>{asset.name}</strong>
                <span>{asset.dialogueText || asset.tags.join('、') || '未填写台词'}</span>
              </button>
            ))}
          </div>
          <span className="field-note">
            {selectedVoiceAssets.length > 0
              ? `已选 ${selectedVoiceAssets.length} 个：${selectedVoiceAssets.map((asset) => asset.name).join('、')}`
              : '选择配音后确认关联。Alt 可增减选择，Shift 可连续选择。'}
          </span>
        </div>
      </Modal>
    </div>
  )
}
