import { useState } from 'react'
import { Button, Empty, Input, Modal } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'

import type { PersonalSpaceAsset } from './personalSpaceModel'
import { includesKeyword } from './personalSpaceSearch'

export function CharacterAssetPicker({
  assets,
  actionLabel,
  confirmLabel,
  searchLabel,
  searchPlaceholder,
  emptyDescription,
  emptyThumb,
  detailForAsset,
  onConfirm,
}: {
  assets: PersonalSpaceAsset[]
  actionLabel: string
  confirmLabel: string
  searchLabel: string
  searchPlaceholder: string
  emptyDescription: string
  emptyThumb: string
  detailForAsset: (asset: PersonalSpaceAsset) => string
  onConfirm: (assetId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const filteredAssets = assets.filter((asset) => includesKeyword([asset.name, asset.dialogueText, asset.tags.join('、')], search))
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId)

  const confirmAsset = () => {
    if (!selectedAssetId) return
    onConfirm(selectedAssetId)
    setExpanded(false)
    setSearch('')
    setSelectedAssetId(null)
  }

  const closePicker = () => {
    setExpanded(false)
    setSearch('')
    setSelectedAssetId(null)
  }

  return (
    <div className="character-asset-picker">
      <Button icon={<PlusOutlined />} onClick={() => setExpanded(true)}>{actionLabel}</Button>
      <Modal
        open={expanded}
        title={actionLabel}
        onCancel={closePicker}
        footer={[
          <Button key="cancel" onClick={closePicker}>取消</Button>,
          <Button key="confirm" type="primary" disabled={!selectedAssetId} onClick={confirmAsset}>
            {confirmLabel}
          </Button>,
        ]}
      >
        <div className="character-portrait-picker-panel character-asset-picker-modal-body">
          <div className="portrait-picker-input-wrap">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              value={search}
              aria-label={searchLabel}
              placeholder={searchPlaceholder}
              onClick={() => setExpanded(true)}
              onFocus={() => setExpanded(true)}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="portrait-picker-popover">
              {filteredAssets.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
              ) : filteredAssets.map((asset) => (
                <button
                  type="button"
                  className={`portrait-picker-option${asset.id === selectedAssetId ? ' is-selected' : ''}`}
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                >
                  <span className="portrait-picker-thumb">
                    {asset.kind !== 'voice' && asset.resourcePaths[0] ? <img src={asset.resourcePaths[0]} alt="" /> : emptyThumb}
                  </span>
                  <span className="portrait-picker-main">
                    <strong>{asset.name}</strong>
                    <span>{detailForAsset(asset)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="portrait-picker-actions">
            <span className="field-note">{selectedAsset ? `已选：${selectedAsset.name}` : '选择素材后确认关联。'}</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
