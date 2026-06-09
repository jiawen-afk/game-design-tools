import { useState } from 'react'
import { Button, Modal } from 'antd'
import { GithubOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

import { openSourceSoftware } from '../openSourceSoftware'

export function SiteFooter() {
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <footer className="site-footer">
      <a className="footer-link" href="mailto:catmumu@outlook.com">
        <MailOutlined /> Catmumu
      </a>
      <a className="beian-link" href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer">
        <SafetyCertificateOutlined /> 浙ICP备2026016967号-1
      </a>
      <span>
        使用人数：<span id="busuanzi_site_uv">加载中</span> 人
      </span>
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
      <span className="footer-web-notice">
        Web 端因功能受限已暂停更新，建议前往 GitHub 下载客户端。
      </span>
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
