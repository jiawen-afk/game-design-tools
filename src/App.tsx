import { lazy, Suspense, useState } from 'react'
import { Button, Popover } from 'antd'
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  AudioOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'

const MultiFrameSpriteWorkspace = lazy(() => import('./components/MultiFrameSpriteWorkspace'))
const VoiceDeploymentWorkspace = lazy(() => import('./components/VoiceDeploymentWorkspace'))

type ToolId = 'multi-frame-sprite' | 'voice-deployment'

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
  {
    id: 'voice-deployment',
    name: '游戏语音生成工作台',
    summary: '检测本机显卡与显存，填写本地模型地址，并生成 VoxCPM 本地部署命令。',
    details: '适合把 VoxCPM 部署到本机，优先支持 Docker，也提供直接部署命令，方便后续按本地地址调用。',
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
  const activeToolMeta = tools.find((tool) => tool.id === activeTool)

  if (activeTool !== null && activeToolMeta) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setActiveTool(null)}>
            返回工具列表
          </Button>
          <div>
            <p className="kicker">工作台</p>
            <h1>{activeToolMeta.name}</h1>
          </div>
        </header>
        <main className="tool-surface">
          <Suspense fallback={null}>
            {activeTool === 'multi-frame-sprite' ? <MultiFrameSpriteWorkspace /> : <VoiceDeploymentWorkspace />}
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

      <main className="home-grid home-grid-single">
        <section className="tool-list" aria-labelledby="tool-list-title">
          <div className="section-heading">
            <AppstoreOutlined />
            <h2 id="tool-list-title">工具列表</h2>
          </div>
          {tools.map((tool) => (
            <Popover
              key={tool.id}
              title={tool.name}
              content={<p className="tool-popover-copy">{tool.details}</p>}
              placement="right"
              trigger="hover"
            >
              <article className="tool-row">
                <div>
                  <h3>{tool.name}</h3>
                  <p>{tool.summary}</p>
                </div>
                <Button type="primary" icon={tool.id === 'voice-deployment' ? <AudioOutlined /> : undefined} onClick={() => setActiveTool(tool.id)}>
                  打开工具
                </Button>
              </article>
            </Popover>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
