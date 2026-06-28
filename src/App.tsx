import { lazy, Suspense, useEffect, useState } from 'react'
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
import { AppWorkspaceErrorBoundary, WorkspaceLoadingFallback } from './AppWorkspaceBoundary'
import {
  getToolCategoryLabel,
  isEditableShortcutTarget,
  personalSpaceShortcut,
  tools,
  type ActiveSurface,
} from './appNavigation'
import { useCurrentProjectSpaceLabel } from './useCurrentProjectSpaceLabel'

const MultiFrameSpriteWorkspace = lazy(() => import('./components/MultiFrameSpriteWorkspace'))
const ImageProcessingWorkspace = lazy(() => import('./components/ImageProcessingWorkspace'))
const VoiceDeploymentWorkspace = lazy(() => import('./components/VoiceDeploymentWorkspace'))
const PersonalSpaceWorkspace = lazy(() => import('./components/PersonalSpaceWorkspace'))
const DocumentWorkspace = lazy(() => import('./components/DocumentWorkspace'))

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
                    <span>{getToolCategoryLabel(tool.id)}</span>
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
