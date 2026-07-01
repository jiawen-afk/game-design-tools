import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from 'antd'

interface AppWorkspaceErrorBoundaryProps {
  children: ReactNode
  onBack: () => void
  onRetry: () => void
}

interface AppWorkspaceErrorBoundaryState {
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class AppWorkspaceErrorBoundary extends Component<AppWorkspaceErrorBoundaryProps, AppWorkspaceErrorBoundaryState> {
  state: AppWorkspaceErrorBoundaryState = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): AppWorkspaceErrorBoundaryState {
    return { error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Workspace render failed', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (!this.state.error) return this.props.children
    const { error, errorInfo } = this.state
    const errorName = error.name || 'Error'
    const errorMessage = error.message || String(error)
    const errorStack = error.stack || '无 JavaScript stack'
    const componentStack = errorInfo?.componentStack || '无 React component stack'

    return (
      <section className="workspace-error" role="alert" aria-labelledby="workspace-error-title">
        <div>
          <p className="kicker">工作台异常</p>
          <h2 id="workspace-error-title">工作台加载失败</h2>
          <p>当前工作区渲染时发生错误，界面已保留在可恢复状态。</p>
          <div className="workspace-error-details">
            <dl>
              <div>
                <dt>错误类型</dt>
                <dd>{errorName}</dd>
              </div>
              <div>
                <dt>错误消息</dt>
                <dd>{errorMessage}</dd>
              </div>
            </dl>
            <details open>
              <summary>JavaScript Stack</summary>
              <pre>{errorStack}</pre>
            </details>
            <details open>
              <summary>React Component Stack</summary>
              <pre>{componentStack}</pre>
            </details>
          </div>
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

export function WorkspaceLoadingFallback() {
  return (
    <section className="workspace-loading" role="status" aria-live="polite">
      <div>
        <strong>正在加载工作台</strong>
        <span>准备界面和本地资源。</span>
      </div>
    </section>
  )
}
