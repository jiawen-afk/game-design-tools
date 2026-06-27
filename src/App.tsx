import { Component, lazy, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { Button } from 'antd'
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  AudioOutlined,
  PictureOutlined,
  UserOutlined,
} from '@ant-design/icons'

import { SiteFooter } from './components/SiteFooter'
import { DocumentHomeKnowledgeSection } from './components/DocumentWorkspace/DocumentHomeKnowledgeSection'
import {
  createDesktopLocalProjectRepository,
  createProjectWorkspaceBootstrapper,
  readActiveProjectId,
  resolveEnabledProjectId,
} from './components/ProjectStorage'

const MultiFrameSpriteWorkspace = lazy(() => import('./components/MultiFrameSpriteWorkspace'))
const ImageProcessingWorkspace = lazy(() => import('./components/ImageProcessingWorkspace'))
const VoiceDeploymentWorkspace = lazy(() => import('./components/VoiceDeploymentWorkspace'))
const PersonalSpaceWorkspace = lazy(() => import('./components/PersonalSpaceWorkspace'))
const DocumentWorkspace = lazy(() => import('./components/DocumentWorkspace'))

type ToolId = 'multi-frame-sprite' | 'image-processing' | 'voice-deployment'
type ActiveSurface = ToolId | 'personal-space' | 'document-knowledge'

const personalSpaceShortcut = '4'
const appProjectRepository = createDesktopLocalProjectRepository()
const appProjectBootstrapper = createProjectWorkspaceBootstrapper(appProjectRepository)

interface AppWorkspaceErrorBoundaryProps {
  children: ReactNode
  onBack: () => void
  onRetry: () => void
}

interface AppWorkspaceErrorBoundaryState {
  error: Error | null
}

class AppWorkspaceErrorBoundary extends Component<AppWorkspaceErrorBoundaryProps, AppWorkspaceErrorBoundaryState> {
  state: AppWorkspaceErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppWorkspaceErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Workspace render failed', error, errorInfo)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <section className="workspace-error" role="alert" aria-labelledby="workspace-error-title">
        <div>
          <p className="kicker">工作台异常</p>
          <h2 id="workspace-error-title">工作台加载失败</h2>
          <p>当前工作区渲染时发生错误，界面已保留在可恢复状态。</p>
        </div>
        <div className="workspace-error-actions">
          <Button type="primary" onClick={this.props.onRetry}>
            重新加载工作台
          </Button>
          <Button onClick={this.props.onBack}>
            返回工具列表
          </Button>
        </div>
      </section>
    )
  }
}

function WorkspaceLoadingFallback() {
  return (
    <section className="workspace-loading" role="status" aria-live="polite">
      <div>
        <strong>正在加载工作台</strong>
        <span>准备界面和本地资源。</span>
      </div>
    </section>
  )
}

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
    name: '精灵图工作台',
    summary: '多图去背、统一画布、逐帧对齐、预览排序并导出精灵图。',
    details: '适合处理怪物动作、角色帧图和从整张精灵图切分出的连续帧。',
    input: '多张图片、整张精灵图或视频片段',
    output: 'Sprite Sheet ZIP、帧索引和预览排序',
    shortcut: '1',
  },
  {
    id: 'image-processing',
    name: '图片处理工作台',
    summary: '单张图片上传、色键抠图、裁剪预览并导出常用图片格式。',
    details: '适合先处理角色肖像、道具图和需要透明底的静态图片，再进入后续素材流程。',
    input: 'WebP、JPG、JPEG、PNG 单张图片',
    output: 'PNG、WebP、JPG、JPEG 图片',
    shortcut: '2',
  },
  {
    id: 'voice-deployment',
    name: '配音工作台',
    summary: '检测本地 VoxCPM Gradio 服务连接状态，准备部署环境并调用本地语音生成接口。',
    details: '自动检测本机是否已运行 VoxCPM；未部署时提供一键准备脚本，完成后可用 gradio_client 调用本地 Gradio 服务生成语音。',
    input: '目标文本、控制描述、参考音频',
    output: 'WAV 音频（Gradio generate 接口）',
    shortcut: '3',
  },
]

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

function useCurrentProjectSpaceLabel(activeSurface: ActiveSurface | null) {
  const [currentProjectSpaceLabel, setCurrentProjectSpaceLabel] = useState('未启用项目空间')

  useEffect(() => {
    if (activeSurface === null) return undefined
    let alive = true

    const refreshCurrentProject = async () => {
      const activeProjectId = readActiveProjectId()

      try {
        const projects = await appProjectBootstrapper.listProjects('')
        const currentProjectId = resolveEnabledProjectId(projects, activeProjectId)
        const currentProject = projects.find((project) => project.id === currentProjectId)
        if (alive) setCurrentProjectSpaceLabel(currentProject?.name ?? '已选择项目空间')
      } catch {
        if (alive) setCurrentProjectSpaceLabel('无法读取项目空间')
      }
    }
    const handleFocus = () => {
      void refreshCurrentProject()
    }

    void refreshCurrentProject()
    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleFocus)
    return () => {
      alive = false
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleFocus)
    }
  }, [activeSurface])

  return currentProjectSpaceLabel
}

export default function App() {
  const [activeSurface, setActiveSurface] = useState<ActiveSurface | null>(null)
  const [workspaceRetryKey, setWorkspaceRetryKey] = useState(0)
  const activeToolMeta = tools.find((tool) => tool.id === activeSurface)
  const currentProjectSpaceLabel = useCurrentProjectSpaceLabel(activeSurface)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) return
      if (event.key === 'Escape' && activeSurface !== null) {
        event.preventDefault()
        setActiveSurface(null)
        return
      }
      if (activeSurface !== null || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === personalSpaceShortcut) {
        event.preventDefault()
        setActiveSurface('personal-space')
        return
      }
      const matchingTool = tools.find((tool) => event.key === tool.shortcut)
      if (!matchingTool) return
      event.preventDefault()
      setActiveSurface(matchingTool.id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeSurface])

  if (activeSurface !== null) {
      const activeWorkspace = activeSurface === 'multi-frame-sprite'
        ? <MultiFrameSpriteWorkspace />
        : activeSurface === 'image-processing'
          ? <ImageProcessingWorkspace />
          : activeSurface === 'voice-deployment'
            ? <VoiceDeploymentWorkspace />
            : activeSurface === 'document-knowledge'
              ? <DocumentWorkspace />
              : <PersonalSpaceWorkspace />
    const surfaceTitle = activeSurface === 'personal-space'
      ? '项目空间'
      : activeSurface === 'document-knowledge'
        ? '知识库'
        : activeToolMeta?.name
    const surfaceKicker = activeSurface === 'personal-space'
      ? '项目工作台'
      : activeSurface === 'document-knowledge'
        ? '项目知识库'
        : '工作台'

    return (
      <div className="app-shell">
        <header className="topbar">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setActiveSurface(null)}>
            返回工具列表
          </Button>
          <div className="topbar-title">
            <p className="kicker">{surfaceKicker}</p>
            <h1>{surfaceTitle}</h1>
            <div className="topbar-current-project" aria-label="当前项目空间">
              <span>当前项目空间</span>
              <strong>{currentProjectSpaceLabel}</strong>
            </div>
          </div>
          {activeSurface !== 'personal-space' && (
            <Button className="topbar-space" icon={<UserOutlined />} onClick={() => setActiveSurface('personal-space')}>
              项目空间
            </Button>
          )}
        </header>
        <main className="tool-surface">
          <AppWorkspaceErrorBoundary
            key={`${activeSurface}:${workspaceRetryKey}`}
            onBack={() => setActiveSurface(null)}
            onRetry={() => setWorkspaceRetryKey((current) => current + 1)}
          >
            <Suspense fallback={<WorkspaceLoadingFallback />}>
              {activeWorkspace}
            </Suspense>
          </AppWorkspaceErrorBoundary>
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
        <div className="home-actions">
          <div className="home-shortcuts" aria-label="快捷键">
            <span>快捷键</span>
            <kbd>1</kbd>
            <span>精灵</span>
            <kbd>2</kbd>
            <span>图片</span>
            <kbd>3</kbd>
            <span>配音</span>
            <kbd>{personalSpaceShortcut}</kbd>
            <span>项目空间</span>
          </div>
          <Button icon={<UserOutlined />} onClick={() => setActiveSurface('personal-space')}>
            打开项目空间
          </Button>
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
                    <span>{tool.id === 'multi-frame-sprite' ? '素材整理' : tool.id === 'image-processing' ? '图片编辑' : '本地部署'}</span>
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
              <Button
                type="primary"
                icon={tool.id === 'voice-deployment' ? <AudioOutlined /> : tool.id === 'image-processing' ? <PictureOutlined /> : undefined}
                onClick={() => setActiveSurface(tool.id)}
              >
                打开工具
              </Button>
            </article>
          ))}
        </section>
        <DocumentHomeKnowledgeSection onOpen={() => setActiveSurface('document-knowledge')} />
      </main>

      <SiteFooter />
    </div>
  )
}
