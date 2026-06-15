import { useState } from 'react'
import { Button, Modal } from 'antd'
import { GithubOutlined, MailOutlined, SyncOutlined } from '@ant-design/icons'

import { openSourceSoftware } from '../openSourceSoftware'
import { useAppUpdateStatus } from './useAppUpdateStatus'

export function SiteFooter() {
  const [aboutOpen, setAboutOpen] = useState(false)
  const appUpdate = useAppUpdateStatus()
  const updateStatus = appUpdate.status

  return (
    <footer className="site-footer">
      <a className="footer-link" href="mailto:catmumu@outlook.com">
        <MailOutlined /> Catmumu
      </a>
      <span className="footer-version">当前版本 v{updateStatus.currentVersion}</span>
      <div className="footer-update">
        <span>{updateStatus.message}</span>
        {updateStatus.phase === 'downloading' ? <span>{updateStatus.downloadPercent}%</span> : null}
        <Button
          type="link"
          className="footer-update-button"
          icon={<SyncOutlined spin={updateStatus.checking || updateStatus.phase === 'downloading'} />}
          disabled={!appUpdate.canCheck}
          onClick={appUpdate.checkForUpdates}
        >
          检查更新
        </Button>
        {appUpdate.canInstall ? (
          <Button type="link" className="footer-update-button" onClick={appUpdate.installUpdate}>
            立即重启安装
          </Button>
        ) : null}
      </div>
      <Button type="link" className="footer-about-button" onClick={() => setAboutOpen(true)}>
        关于
      </Button>
      <a
        className="footer-link"
        href="https://github.com/jiawen-afk/game-design-tools"
        target="_blank"
        rel="noreferrer"
      >
        <GithubOutlined /> GitHub
      </a>
      <Modal
        open={aboutOpen}
        title="关于"
        footer={null}
        onCancel={() => setAboutOpen(false)}
      >
        <div className="open-source-list">
          {openSourceSoftware.map((item) => (
            <a key={item.name} href={item.url} target="_blank" rel="noreferrer">
              <strong>{item.name}</strong>
              <span>{item.usage}</span>
            </a>
          ))}
        </div>
      </Modal>
    </footer>
  )
}
