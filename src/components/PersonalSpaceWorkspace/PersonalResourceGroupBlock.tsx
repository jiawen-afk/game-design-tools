import type { ReactNode } from 'react'
import type { UploadProps } from 'antd'
import { Button, Empty, Popconfirm, Tag, Upload } from 'antd'
import { StarFilled, StarOutlined, UploadOutlined } from '@ant-design/icons'

import type { AssetGroupKind, PersonalResourceSectionConfig, PersonalSpaceAsset } from './personalSpaceModel'
import { PersonalResourceGroupTransferControl } from './PersonalResourceGroupTransferControl'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'

interface PersonalResourceGroupBlockProps {
  section: PersonalResourceSectionConfig
  groupName: string
  assets: PersonalSpaceAsset[]
  selectedAssetIds: string[]
  allGroupAssetsSelected: boolean
  canDeleteGroup: boolean
  renameTo: string
  isRenamingGroup: boolean
  commonResourceUploadProps: (kind: AssetGroupKind, groupName?: string) => UploadProps
  spriteResourceUploadProps: (groupName?: string) => UploadProps
  renderAssetRecord: (item: PersonalSpaceAsset) => ReactNode
  onChangeGroupName: (assetId: string, groupName: string) => void
  onToggleGroupStar: (kind: AssetGroupKind, name: string) => void
  onDeleteGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => void
  onDeleteAsset: (assetId: string) => void
  onToggleGroupSelected: (groupName: string, assets: PersonalSpaceAsset[]) => void
  onRenameOpenChange: (open: boolean) => void
  onRenameDraftChange: (value: string) => void
  onConfirmRename: () => void
  onCancelRename: () => void
  onClearSelectedAssetIds: (groupName: string) => void
}

function EmptyBlock({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
}

export function PersonalResourceGroupBlock({
  section,
  groupName,
  assets,
  selectedAssetIds,
  allGroupAssetsSelected,
  canDeleteGroup,
  renameTo,
  isRenamingGroup,
  commonResourceUploadProps,
  spriteResourceUploadProps,
  renderAssetRecord,
  onChangeGroupName,
  onToggleGroupStar,
  onDeleteGroup,
  onDeleteAsset,
  onToggleGroupSelected,
  onRenameOpenChange,
  onRenameDraftChange,
  onConfirmRename,
  onCancelRename,
  onClearSelectedAssetIds,
}: PersonalResourceGroupBlockProps) {
  return (
    <section className="asset-group-block voice-group-block" aria-label={`${section.title}-${groupName}`}>
      <div className="asset-group-title voice-group-header">
        <div className="voice-group-actions">
          <div className="voice-group-left-actions">
            <Button
              size="small"
              type="text"
              className="star-toggle-button"
              icon={section.starredGroupNames.includes(groupName) ? <StarFilled /> : <StarOutlined />}
              aria-label={section.starredGroupNames.includes(groupName) ? '取消星标分组' : '星标分组'}
              onClick={() => onToggleGroupStar(section.kind, groupName)}
            />
            <Button
              size="small"
              type={allGroupAssetsSelected ? 'primary' : 'default'}
              disabled={assets.length === 0}
              onClick={() => onToggleGroupSelected(groupName, assets)}
            >
              {allGroupAssetsSelected ? '取消全选' : '全选'}
            </Button>
            <strong>{groupName}</strong>
            <div className="voice-group-admin-actions">
              <PersonalSpaceTextPopover
                open={isRenamingGroup}
                onOpenChange={onRenameOpenChange}
                className="group-name-rename-popover"
                value={renameTo}
                ariaLabel={`${groupName}重命名分组`}
                placeholder="新分组名"
                confirmDisabled={!renameTo.trim()}
                onValueChange={onRenameDraftChange}
                onConfirm={onConfirmRename}
                onCancel={onCancelRename}
              >
                <Button size="small" onClick={() => onRenameOpenChange(true)}>
                  重命名分组
                </Button>
              </PersonalSpaceTextPopover>
            </div>
            <Tag>{assets.length} 个</Tag>
          </div>
          <div className="voice-group-right-actions">
            <Upload {...(section.kind === 'sprite' ? spriteResourceUploadProps(groupName) : commonResourceUploadProps(section.kind, groupName))}>
              <Button size="small" icon={<UploadOutlined />}>上传到分组</Button>
            </Upload>
            <PersonalResourceGroupTransferControl
              kind={section.kind}
              groupName={groupName}
              groupNames={section.groupNames}
              selectedAssetIds={selectedAssetIds}
              allGroupAssetsSelected={allGroupAssetsSelected}
              onChangeGroupName={onChangeGroupName}
              onDeleteGroup={onDeleteGroup}
            />
            <Popconfirm
              title="删除选中资产"
              description={`将删除已选中的 ${selectedAssetIds.length} 个资产，并移除角色和剧情中的关联。`}
              okText="删除选中资产"
              cancelText="取消"
              onConfirm={() => {
                selectedAssetIds.forEach((assetId) => onDeleteAsset(assetId))
                onClearSelectedAssetIds(groupName)
              }}
            >
              <Button size="small" danger disabled={selectedAssetIds.length === 0}>删除选中资产</Button>
            </Popconfirm>
            <Popconfirm
              title="删除分组"
              description={canDeleteGroup ? '删除分组会同时删除分组下的资产。' : '至少保留一个分组。'}
              okText="删除分组"
              cancelText="取消"
              onConfirm={() => onDeleteGroup(section.kind, groupName, { deleteAssets: true })}
            >
              <Button size="small" danger disabled={!canDeleteGroup}>删除分组</Button>
            </Popconfirm>
          </div>
        </div>
      </div>
      {assets.length === 0 ? (
        <EmptyBlock description="当前分组还没有资源。" />
      ) : (
        <div className="asset-group-records resource-asset-grid">
          {assets.map(renderAssetRecord)}
        </div>
      )}
    </section>
  )
}
