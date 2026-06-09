import { useState } from 'react'
import { Button, Modal } from 'antd'
import { GithubOutlined, MailOutlined } from '@ant-design/icons'

import { openSourceSoftware } from '../openSourceSoftware'

export function SiteFooter() {
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <footer className="site-footer">
      <a className="footer-link" href="mailto:catmumu@outlook.com">
        <MailOutlined /> Catmumu
      </a>
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
