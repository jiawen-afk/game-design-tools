import { useState } from 'react'
import { Button, Modal } from 'antd'
import { GithubOutlined, MailOutlined, SyncOutlined } from '@ant-design/icons'

import { openSourceSoftware, openSourceSoftwareCategories } from '../openSourceSoftware'
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
        width={760}
        onCancel={() => setAboutOpen(false)}
      >
        <p className="open-source-intro">
          以下列出本应用使用的主要第三方运行时、模型、直接依赖和构建工具；完整 npm 依赖请查阅 package.json 与 package-lock.json。
        </p>
        <div className="open-source-list">
          {openSourceSoftwareCategories.map((category) => (
            <section className="open-source-category" key={category.id}>
              <h3>{category.label}</h3>
              <div className="open-source-category-items">
                {openSourceSoftware
                  .filter((item) => item.category === category.id)
                  .map((item) => (
                    <article className="open-source-item" key={item.name}>
                      <a className="open-source-project" href={item.url} target="_blank" rel="noreferrer">
                        <strong>{item.name}</strong>
                      </a>
                      <span>{item.usage}</span>
                      <span className="open-source-licenses">
                        许可证：
                        {item.licenses.map((license, index) => (
                          <a
                            className="open-source-license"
                            href={license.url}
                            key={`${item.name}-${license.name}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {index > 0 ? `；${license.name}` : license.name}
                          </a>
                        ))}
                      </span>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </Modal>
    </footer>
  )
}
