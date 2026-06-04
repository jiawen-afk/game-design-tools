import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from 'antd'
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
  input: string
  output: string
  shortcut: string
}> = [
  {
    id: 'multi-frame-sprite',
    name: '多图动作精灵工作台',
    summary: '多图去背、统一画布、逐帧对齐、预览排序并导出精灵图。',
    details: '适合处理怪物动作、角色帧图和从整张精灵图切分出的连续帧。',
    input: '多张图片、整张精灵图或视频片段',
    output: 'Sprite Sheet ZIP、帧索引和预览排序',
    shortcut: '1',
  },
  {
    id: 'voice-deployment',
    name: '游戏角色语音工作台',
    summary: '检测本地 VoxCPM Gradio 服务连接状态，准备部署环境并调用本地语音生成接口。',
    details: '自动检测本机是否已运行 VoxCPM；未部署时提供一键准备脚本，完成后可用 gradio_client 调用本地 Gradio 服务生成语音。',
    input: '目标文本、控制描述、参考音频',
    output: 'WAV 音频（Gradio generate 接口）',
    shortcut: '2',
  },
]

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) return
      if (event.key === 'Escape' && activeTool !== null) {
        event.preventDefault()
        setActiveTool(null)
        return
      }
      if (activeTool !== null || event.altKey || event.ctrlKey || event.metaKey) return
      const matchingTool = tools.find((tool) => event.key === tool.shortcut)
      if (!matchingTool) return
      event.preventDefault()
      setActiveTool(matchingTool.id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool])

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
        <div className="home-shortcuts" aria-label="快捷键">
          <span>快捷键</span>
          <kbd>1</kbd>
          <span>精灵</span>
          <kbd>2</kbd>
          <span>语音</span>
        </div>
      </header>

      <main className="home-grid home-grid-single">
        <section className="tool-list" aria-labelledby="tool-list-title">
          <div className="section-heading">
            <AppstoreOutlined />
            <div>
              <h2 id="tool-list-title">工具列表</h2>
              <p>选择一个工作台，说明和输出范围直接显示。</p>
            </div>
          </div>
          {tools.map((tool) => (
            <article className="tool-row" key={tool.id}>
              <div className="tool-row-main">
                <span className="tool-shortcut">{tool.shortcut}</span>
                <div>
                  <div className="tool-row-title">
                    <h3>{tool.name}</h3>
                    <span>{tool.id === 'multi-frame-sprite' ? '素材整理' : '本地部署'}</span>
                  </div>
                  <p>{tool.summary}</p>
                  <p className="tool-details">{tool.details}</p>
                  <dl className="tool-meta">
                    <div>
                      <dt>输入</dt>
                      <dd>{tool.input}</dd>
                    </div>
                    <div>
                      <dt>输出</dt>
                      <dd>{tool.output}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <Button type="primary" icon={tool.id === 'voice-deployment' ? <AudioOutlined /> : undefined} onClick={() => setActiveTool(tool.id)}>
                打开工具
              </Button>
            </article>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
