export type ToolId = 'multi-frame-sprite' | 'image-processing' | 'voice-deployment'
export type ActiveSurface = ToolId | 'personal-space' | 'document-knowledge'

export interface AppTool {
  id: ToolId
  name: string
  summary: string
  details: string
  input: string
  output: string
  shortcut: string
}

export const personalSpaceShortcut = '4'

export const tools: AppTool[] = [
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

export function getToolCategoryLabel(toolId: ToolId) {
  if (toolId === 'multi-frame-sprite') return '素材整理'
  if (toolId === 'image-processing') return '图片编辑'
  return '本地部署'
}

export function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}
