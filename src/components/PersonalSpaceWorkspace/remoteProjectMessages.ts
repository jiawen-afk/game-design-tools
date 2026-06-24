import type { Project } from '../ProjectStorage'

function stripErrorPrefix(message: string) {
  return message.replace(/^Error:\s*/, '')
}

export function formatRemoteProjectReadError(error: unknown, project?: Pick<Project, 'id' | 'name'> | null) {
  const message = stripErrorPrefix(error instanceof Error ? error.message : String(error))
  if (!project?.id || !project.name) return message
  return message.replace(
    new RegExp(`项目\\s+${project.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+缺少远程数据库配置`),
    `项目“${project.name}”缺少远程数据库配置`,
  )
}
