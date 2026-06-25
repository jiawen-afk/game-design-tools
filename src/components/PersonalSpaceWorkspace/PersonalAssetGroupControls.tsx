import { useState } from 'react'

import type { AssetGroupKind } from './personalSpaceModel'
import { CreateNamePopoverButton } from './CreateNamePopoverButton'
import { useCreateNamePopover } from './useCreateNamePopover'

interface PersonalAssetGroupControlsProps {
  kind: AssetGroupKind
  onAddGroup: (kind: AssetGroupKind, name: string) => void
}

export function PersonalAssetGroupControls({
  kind,
  onAddGroup,
}: PersonalAssetGroupControlsProps) {
  const [newGroupName, setNewGroupName] = useState('')
  const createGroup = useCreateNamePopover({
    value: newGroupName,
    onValueChange: setNewGroupName,
    onConfirm: (name) => {
      onAddGroup(kind, name)
      setNewGroupName('')
    },
  })

  return (
    <div className="asset-group-controls">
      <CreateNamePopoverButton
        open={createGroup.open}
        onOpenChange={createGroup.onOpenChange}
        className="group-create-popover"
        value={newGroupName}
        ariaLabel="新分组名称"
        placeholder="新分组名称"
        buttonText="创建分组"
        onValueChange={setNewGroupName}
        onConfirm={createGroup.confirmCreateName}
        onCancel={createGroup.cancelCreateName}
      />
    </div>
  )
}
