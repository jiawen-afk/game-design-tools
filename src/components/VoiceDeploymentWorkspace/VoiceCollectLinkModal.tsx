import { Modal, Select } from 'antd'

import type { VoiceCollectLinkOption } from './useVoiceCollectLinkDialog'

interface VoiceCollectLinkModalProps {
  pendingCollectLink: { targetId: string | null } | null
  collectLinkMeta: {
    title: string
    label: string
    options: VoiceCollectLinkOption[]
    empty: string
  } | null
  onConfirm: () => void
  onCancel: () => void
  onTargetChange: (targetId: string) => void
}

export function VoiceCollectLinkModal({
  pendingCollectLink,
  collectLinkMeta,
  onConfirm,
  onCancel,
  onTargetChange,
}: VoiceCollectLinkModalProps) {
  return (
    <Modal
      title={collectLinkMeta?.title}
      open={Boolean(pendingCollectLink)}
      okText="收藏并关联"
      cancelText="取消"
      okButtonProps={{ disabled: !pendingCollectLink?.targetId }}
      onOk={onConfirm}
      onCancel={onCancel}
    >
      {collectLinkMeta && (
        <div className="modal-grid">
          <label className="form-field">
            <span className="field-label">{collectLinkMeta.label}</span>
            <Select
              value={pendingCollectLink?.targetId}
              options={collectLinkMeta.options}
              placeholder={collectLinkMeta.label}
              notFoundContent={collectLinkMeta.empty}
              onChange={onTargetChange}
            />
          </label>
          <p className="field-note">会先把当前配音收藏到项目空间，再建立这条关联。</p>
        </div>
      )}
    </Modal>
  )
}
