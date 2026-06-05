import { Alert, Button, Checkbox, Input, Space } from 'antd'
import { CheckCircleOutlined, FolderOpenOutlined, SaveOutlined } from '@ant-design/icons'

import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'

interface PersonalSettingsPanelProps {
  storageDirectory: string
  deleteResourcesWithContent: boolean
  savedSettings: boolean
  directoryHandle: PersonalSpaceDirectoryHandle | null
  pendingDeletedResourcePaths: string[]
  onStorageDirectoryChange: (storageDirectory: string) => void
  onChooseStorageDirectory: () => void
  onDeleteResourcesWithContentChange: (deleteResourcesWithContent: boolean) => void
  onSaveSettings: () => void
}

export function PersonalSettingsPanel({
  storageDirectory,
  deleteResourcesWithContent,
  savedSettings,
  directoryHandle,
  pendingDeletedResourcePaths,
  onStorageDirectoryChange,
  onChooseStorageDirectory,
  onDeleteResourcesWithContentChange,
  onSaveSettings,
}: PersonalSettingsPanelProps) {
  return (
    <section className="space-panel">
      <div className="form-stack">
        <label className="form-field">
          <span className="field-label">资源存储目录</span>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              prefix={<FolderOpenOutlined />}
              value={storageDirectory}
              onChange={(event) => onStorageDirectoryChange(event.target.value)}
              placeholder="例如 D:\\GameAssets\\PersonalSpace"
            />
            <Button icon={<FolderOpenOutlined />} onClick={onChooseStorageDirectory}>
              选择授权目录
            </Button>
          </Space.Compact>
        </label>

        <Checkbox
          checked={deleteResourcesWithContent}
          onChange={(event) => onDeleteResourcesWithContentChange(event.target.checked)}
        >
          删除内容同时删除资源
        </Checkbox>

        <Button
          type="primary"
          icon={savedSettings ? <CheckCircleOutlined /> : <SaveOutlined />}
          onClick={onSaveSettings}
        >
          {savedSettings ? '已保存' : '保存设置'}
        </Button>

        <Alert
          type="info"
          showIcon
          title={directoryHandle ? '已授权本地资源目录' : '未授权目录时使用路径记录模式'}
          description={directoryHandle
            ? '收藏和上传的新资源会写入授权目录，并按角色肖像、角色精灵图、配音素材、特效素材、地图素材分类。'
            : '可以手动填写目录路径生成存储目标；点击选择授权目录后，支持浏览器文件系统写入和删除。'}
        />

        {pendingDeletedResourcePaths.length > 0 && (
          <Alert
            type="warning"
            showIcon
            title="待删除资源路径"
            description={pendingDeletedResourcePaths.join('、')}
          />
        )}
      </div>
    </section>
  )
}
