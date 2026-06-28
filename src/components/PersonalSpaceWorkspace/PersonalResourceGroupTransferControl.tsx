import { useState } from 'react'
import { Button, Dropdown, Modal, Select, Space } from 'antd'
import { DownOutlined } from '@ant-design/icons'

import type { AssetGroupKind } from './personalSpaceModel'

interface PersonalResourceGroupTransferControlProps {
  kind: AssetGroupKind
  groupName: string
  groupNames: string[]
  selectedAssetIds: string[]
  allGroupAssetsSelected: boolean
  onChangeGroupName: (assetId: string, groupName: string) => void
  onDeleteGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => void
}

export function PersonalResourceGroupTransferControl({
  kind,
  groupName,
  groupNames,
  selectedAssetIds,
  allGroupAssetsSelected,
  onChangeGroupName,
  onDeleteGroup,
}: PersonalResourceGroupTransferControlProps) {
  const [transferTo, setTransferTo] = useState('')
  const transferOptions = groupNames.filter((group) => group !== groupName).map((group) => ({ label: group, value: group }))
  const confirmTransferAndDeleteGroup = () => {
    Modal.confirm({
      title: '转移资产并删除分组',
      content: '会先将资产转移到目标分组，然后删除当前分组。',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        onDeleteGroup(kind, groupName, { transferToGroup: transferTo })
        setTransferTo('')
      },
    })
  }

  return (
    <Space.Compact className="voice-group-transfer-actions">
      <Select
        size="small"
        value={transferTo || undefined}
        options={transferOptions}
        placeholder="转移到"
        aria-label={`${groupName}转移资产目标分组`}
        onChange={setTransferTo}
      />
      <Button
        size="small"
        disabled={!transferTo || selectedAssetIds.length === 0}
        onClick={() => {
          selectedAssetIds.forEach((assetId) => onChangeGroupName(assetId, transferTo))
          setTransferTo('')
        }}
      >
        转移资产
      </Button>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'transfer-and-delete',
              label: '转移并删除该分组',
              disabled: !transferTo || selectedAssetIds.length === 0 || !allGroupAssetsSelected,
              danger: true,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'transfer-and-delete') confirmTransferAndDeleteGroup()
          },
        }}
      >
        <Button
          size="small"
          disabled={!transferTo || selectedAssetIds.length === 0 || !allGroupAssetsSelected}
          icon={<DownOutlined />}
          aria-label="展开转移资产更多操作"
        />
      </Dropdown>
    </Space.Compact>
  )
}
