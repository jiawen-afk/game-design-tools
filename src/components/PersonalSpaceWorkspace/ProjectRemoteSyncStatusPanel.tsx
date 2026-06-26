import { useEffect, useState } from 'react'
import { Button, Progress, Tag } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  SyncOutlined,
  UpOutlined,
} from '@ant-design/icons'

import {
  shouldShowProjectRemoteSyncStatus,
  type ProjectRemoteSyncStatus,
  type ProjectRemoteSyncTask,
} from './projectRemoteSyncStatusModel'

interface ProjectRemoteSyncStatusPanelProps {
  status: ProjectRemoteSyncStatus
  activeProjectId?: string
  retryingProjectId?: string
  onRetryActiveProject?: () => void | Promise<void>
}

function taskStatusLabel(task: ProjectRemoteSyncTask) {
  if (task.status === 'pending') return '等待'
  if (task.status === 'syncing') return '同步中'
  if (task.status === 'succeeded') return '完成'
  return '失败'
}

function taskStatusColor(task: ProjectRemoteSyncTask) {
  if (task.status === 'succeeded') return 'success'
  if (task.status === 'failed') return 'error'
  if (task.status === 'syncing') return 'processing'
  return 'default'
}

function taskProgressStatus(task: ProjectRemoteSyncTask) {
  if (task.status === 'failed') return 'exception' as const
  if (task.status === 'succeeded') return 'success' as const
  return 'active' as const
}

export function ProjectRemoteSyncStatusPanel({
  status,
  activeProjectId = '',
  retryingProjectId = '',
  onRetryActiveProject,
}: ProjectRemoteSyncStatusPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const active = status.activeTaskCount > 0
  const latestTask = status.tasks[0]
  const hasFailedTask = status.tasks.some((task) => task.status === 'failed')

  useEffect(() => {
    if (hasFailedTask) setExpanded(true)
  }, [hasFailedTask])

  if (!shouldShowProjectRemoteSyncStatus(status)) return null

  const statusLabel = latestTask?.status === 'failed' && status.pendingUploadCount === 0
    ? '失败'
    : status.pendingUploadCount

  return (
    <aside className={`project-sync-status${expanded ? ' is-expanded' : ''}`} aria-label="同步状态">
      <Button
        className="project-sync-status-toggle"
        icon={active ? <SyncOutlined spin /> : latestTask?.status === 'failed' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>同步状态</span>
        <Tag color={active ? 'processing' : latestTask?.status === 'failed' ? 'error' : 'warning'}>
          {statusLabel}
        </Tag>
        {expanded ? <DownOutlined /> : <UpOutlined />}
      </Button>
      {expanded && (
        <div className="project-sync-status-popover">
          {status.tasks.length === 0 ? (
            <span className="field-note">暂无同步任务</span>
          ) : status.tasks.map((task) => (
            <div className="project-sync-task" key={task.projectId}>
              <div className="project-sync-task-head">
                <strong>{task.projectName}</strong>
                <div className="project-sync-task-actions">
                  <Tag color={taskStatusColor(task)}>{taskStatusLabel(task)}</Tag>
                  {task.status === 'failed' && onRetryActiveProject && (
                    <Button
                      size="small"
                      icon={<SyncOutlined />}
                      loading={Boolean(activeProjectId) && retryingProjectId === activeProjectId}
                      disabled={task.projectId !== activeProjectId || (Boolean(activeProjectId) && retryingProjectId === activeProjectId)}
                      onClick={() => void onRetryActiveProject()}
                    >
                      重试同步
                    </Button>
                  )}
                </div>
              </div>
              <Progress
                percent={task.progress}
                size="small"
                status={taskProgressStatus(task)}
                showInfo={false}
              />
              {task.errorMessage && <span className="field-note">{task.errorMessage}</span>}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
