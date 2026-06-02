import { lazy, Suspense, useState } from 'react'
import { Button } from 'antd'
import { AppstoreOutlined, ArrowLeftOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

const MultiFrameSpriteWorkspace = lazy(() => import('./components/MultiFrameSpriteWorkspace'))

type ToolId = 'multi-frame-sprite'

const tools: Array<{
  id: ToolId
  name: string
  summary: string
  details: string
}> = [
  {
    id: 'multi-frame-sprite',
    name: '多图动作精灵工作台',
    summary: '多图去背、统一画布、逐帧对齐、预览排序并导出精灵图。',
    details: '适合处理怪物动作、角色帧图和从整张精灵图切分出的连续帧。',
  },
]

function SiteFooter() {
  return (
    <footer className="site-footer">
      <a className="footer-link" href="mailto:catmumu@outlook.com">
        <MailOutlined /> Catmumu
      </a>
      <a className="beian-link" href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer">
        <SafetyCertificateOutlined /> 浙ICP备2026016967号-1
      </a>
    </footer>
  )
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)

  if (activeTool === 'multi-frame-sprite') {
    return (
      <div className="app-shell">
        <header className="topbar">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setActiveTool(null)}>
            返回工具列表
          </Button>
          <div>
            <p className="kicker">工作台</p>
            <h1>多图动作精灵工作台</h1>
          </div>
        </header>
        <main className="tool-surface">
          <Suspense fallback={null}>
            <MultiFrameSpriteWorkspace />
          </Suspense>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="home-shell">
      <header className="home-header">
        <div>
          <p className="kicker">游戏素材制作</p>
          <h1>游戏设计工具</h1>
          <p className="home-lede">把常用素材处理流程放在一个清楚的本地工作台里。</p>
        </div>
      </header>

      <main className="home-grid">
        <section className="tool-list" aria-labelledby="tool-list-title">
          <div className="section-heading">
            <AppstoreOutlined />
            <h2 id="tool-list-title">工具列表</h2>
          </div>
          {tools.map((tool) => (
            <article className="tool-row" key={tool.id}>
              <div>
                <h3>{tool.name}</h3>
                <p>{tool.summary}</p>
              </div>
              <Button type="primary" onClick={() => setActiveTool(tool.id)}>
                打开工具
              </Button>
            </article>
          ))}
        </section>

        <aside className="tool-detail" aria-label="工具说明">
          <h2>{tools[0].name}</h2>
          <p>{tools[0].details}</p>
          <dl>
            <div>
              <dt>输入</dt>
              <dd>多张图片，或一张按网格切分的精灵图。</dd>
            </div>
            <div>
              <dt>输出</dt>
              <dd>一张 `sprite.png` 和一份 `index.json`。</dd>
            </div>
          </dl>
        </aside>
      </main>

      <SiteFooter />
    </div>
  )
}
