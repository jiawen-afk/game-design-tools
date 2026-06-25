import { useState } from 'react'
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

export function ProjectRemoteSyncStatusPanel({ status }: { status: ProjectRemoteSyncStatus }) {
  const [expanded, setExpanded] = useState(false)
  const active = status.activeTaskCount > 0
  const latestTask = status.tasks[0]

  if (!shouldShowProjectRemoteSyncStatus(status)) return null

  return (
    <aside className={`project-sync-status${expanded ? ' is-expanded' : ''}`} aria-label="同步状态">
      <Button
        className="project-sync-status-toggle"
        icon={active ? <SyncOutlined spin /> : latestTask?.status === 'failed' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>同步状态</span>
        <Tag color={active ? 'processing' : latestTask?.status === 'failed' ? 'error' : 'warning'}>
          {status.pendingUploadCount}
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
                <Tag color={taskStatusColor(task)}>{taskStatusLabel(task)}</Tag>
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
