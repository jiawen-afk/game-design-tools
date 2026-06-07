import { Alert, Button, Checkbox, Input, Space } from 'antd'
import { CheckCircleOutlined, FolderOpenOutlined, SaveOutlined } from '@ant-design/icons'

import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'

interface PersonalSettingsPanelProps {
  storageDirectory: string
  deleteResourcesWithContent: boolean
  savedSettings: boolean
  directoryHandle: PersonalSpaceDirectoryHandle | null
  onStorageDirectoryChange: (storageDirectory: string) => void
  onChooseStorageDirectory: () => void
  onOpenStorageDirectory: () => void
  onDeleteResourcesWithContentChange: (deleteResourcesWithContent: boolean) => void
  onSaveSettings: () => void
}

export function PersonalSettingsPanel({
  storageDirectory,
  deleteResourcesWithContent,
  savedSettings,
  directoryHandle,
  onStorageDirectoryChange,
  onChooseStorageDirectory,
  onOpenStorageDirectory,
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
          type={directoryHandle ? 'info' : 'warning'}
          showIcon
          title={directoryHandle ? '已授权本地资源目录' : '需要授权资源目录'}
          description={directoryHandle
            ? (
              <div className="settings-directory-actions">
                <span>收藏和上传的新资源会写入授权目录作为存储目标，并按公共图片、精灵图、配音分类管理。</span>
                <Button
                  size="small"
                  icon={<FolderOpenOutlined />}
                  disabled={!directoryHandle}
                  onClick={onOpenStorageDirectory}
                >
                  在文件资源管理器中打开
                </Button>
              </div>
            )
            : '请先选择授权目录，授权完成后即可使用角色、剧情编排和素材模块。'}
        />
      </div>
    </section>
  )
}
