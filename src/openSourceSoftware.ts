export interface OpenSourceLicense {
  name: string
  url: string
}

export type OpenSourceSoftwareCategory =
  | 'desktop-media'
  | 'ai-models'
  | 'application-libraries'
  | 'build-tools'

export interface OpenSourceSoftwareItem {
  category: OpenSourceSoftwareCategory
  name: string
  usage: string
  url: string
  licenses: OpenSourceLicense[]
}

export const openSourceSoftwareCategories: Array<{
  id: OpenSourceSoftwareCategory
  label: string
}> = [
  { id: 'desktop-media', label: '桌面与媒体运行时' },
  { id: 'ai-models', label: 'AI 模型与服务' },
  { id: 'application-libraries', label: '应用库' },
  { id: 'build-tools', label: '构建工具' },
]

const standardLicenses = {
  agpl3Only: { name: 'AGPL-3.0-only', url: 'https://spdx.org/licenses/AGPL-3.0-only.html' },
  apache2: { name: 'Apache-2.0', url: 'https://spdx.org/licenses/Apache-2.0.html' },
  bsd3: { name: 'BSD-3-Clause', url: 'https://spdx.org/licenses/BSD-3-Clause.html' },
  lgpl21OrLater: { name: 'LGPL-2.1-or-later', url: 'https://spdx.org/licenses/LGPL-2.1-or-later.html' },
  mit: { name: 'MIT', url: 'https://spdx.org/licenses/MIT.html' },
} satisfies Record<string, OpenSourceLicense>

export const openSourceSoftware: OpenSourceSoftwareItem[] = [
  {
    category: 'desktop-media',
    name: 'Electron',
    usage: 'Windows 桌面应用运行时与原生桥接',
    url: 'https://www.electronjs.org/',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'desktop-media',
    name: 'Upscayl',
    usage: '图片、精灵图和视频帧的 GPU 超分运行包与模型',
    url: 'https://github.com/upscayl/upscayl',
    licenses: [standardLicenses.agpl3Only],
  },
  {
    category: 'desktop-media',
    name: 'NCNN / Vulkan',
    usage: 'Upscayl 本地 GPU 推理基础',
    url: 'https://github.com/Tencent/ncnn',
    licenses: [standardLicenses.bsd3],
  },
  {
    category: 'desktop-media',
    name: 'FFmpeg / FFprobe',
    usage: '固定 LGPL shared 构建，用于媒体探测、转码、Theora/Vorbis OGV 输出与压缩',
    url: 'https://github.com/BtbN/FFmpeg-Builds',
    licenses: [standardLicenses.lgpl21OrLater],
  },
  {
    category: 'desktop-media',
    name: 'libwebp',
    usage: '通过 cwebp 导出 WebP 图片',
    url: 'https://chromium.googlesource.com/webm/libwebp/',
    licenses: [standardLicenses.bsd3],
  },
  {
    category: 'desktop-media',
    name: 'oxipng',
    usage: '无损优化 PNG 导出文件',
    url: 'https://github.com/shssoichiro/oxipng',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'ai-models',
    name: 'BiRefNet HR-Matting',
    usage: '图片和精灵图的本地 AI 抠图模型',
    url: 'https://huggingface.co/ZhengPeng7/BiRefNet_HR-matting',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'ai-models',
    name: 'VoxCPM',
    usage: '本地配音生成、声音设计与参考音频克隆',
    url: 'https://github.com/OpenBMB/VoxCPM',
    licenses: [standardLicenses.apache2],
  },
  {
    category: 'ai-models',
    name: 'Gradio',
    usage: 'VoxCPM 本地服务界面与 API 通信',
    url: 'https://github.com/gradio-app/gradio',
    licenses: [standardLicenses.apache2],
  },
  {
    category: 'ai-models',
    name: 'Stable Audio 3 inference code',
    usage: '本地音效、环境声和短音乐生成服务',
    url: 'https://github.com/Stability-AI/stable-audio-3',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'ai-models',
    name: 'Stable Audio 3 model weights',
    usage: '受限模型仓库中的生成模型权重；适用不同于推理代码的模型条款',
    url: 'https://huggingface.co/stabilityai/stable-audio-3-small-sfx',
    licenses: [
      {
        name: 'Stability AI Community License',
        url: 'https://huggingface.co/stabilityai/stable-audio-3-small-sfx/blob/main/LICENSE.md',
      },
      {
        name: 'Gemma Terms of Use',
        url: 'https://huggingface.co/stabilityai/stable-audio-3-small-sfx/blob/main/LICENSE_GEMMA.md',
      },
    ],
  },
  {
    category: 'ai-models',
    name: 'PyTorch',
    usage: 'BiRefNet、VoxCPM 与 Stable Audio 3 的本地推理基础',
    url: 'https://pytorch.org/',
    licenses: [standardLicenses.bsd3],
  },
  {
    category: 'ai-models',
    name: 'Hugging Face Hub',
    usage: 'AI 模型访问、下载与本地缓存',
    url: 'https://github.com/huggingface/huggingface_hub',
    licenses: [standardLicenses.apache2],
  },
  {
    category: 'application-libraries',
    name: 'React',
    usage: '界面渲染与状态驱动视图',
    url: 'https://react.dev/',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'React DOM',
    usage: 'Electron 渲染进程 DOM 入口',
    url: 'https://react.dev/reference/react-dom',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'Ant Design',
    usage: '基础 UI 组件库',
    url: 'https://ant.design/',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'Ant Design Icons',
    usage: '界面操作图标',
    url: 'https://ant.design/components/icon/',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'Apache ECharts',
    usage: '文档知识图谱等数据可视化',
    url: 'https://echarts.apache.org/',
    licenses: [standardLicenses.apache2],
  },
  {
    category: 'application-libraries',
    name: 'WaveSurfer.js',
    usage: '配音与音频编辑工作流中的波形显示',
    url: 'https://wavesurfer.xyz/',
    licenses: [standardLicenses.bsd3],
  },
  {
    category: 'application-libraries',
    name: 'JSZip',
    usage: '素材导出 ZIP 打包',
    url: 'https://stuk.github.io/jszip/',
    licenses: [
      {
        name: 'MIT OR GPL-3.0-or-later',
        url: 'https://github.com/Stuk/jszip/blob/main/LICENSE.markdown',
      },
    ],
  },
  {
    category: 'application-libraries',
    name: 'Electron Updater',
    usage: 'Windows 稳定通道更新检测、下载与安装',
    url: 'https://www.electron.build/auto-update.html',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'sql.js',
    usage: '本地项目空间 SQLite 数据库',
    url: 'https://sql.js.org/',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'mysql2',
    usage: '远程 MySQL 项目数据库连接',
    url: 'https://github.com/sidorares/node-mysql2',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'node-postgres',
    usage: '远程 PostgreSQL 项目数据库连接',
    url: 'https://node-postgres.com/',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'Qiniu Node.js SDK',
    usage: '远程项目的七牛 Kodo 对象存储',
    url: 'https://github.com/qiniu/nodejs-sdk',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'application-libraries',
    name: 'yauzl',
    usage: '运行包与导出工具 ZIP 解压',
    url: 'https://github.com/thejoshwolfe/yauzl',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'build-tools',
    name: 'Vite',
    usage: 'Electron 渲染进程构建工具',
    url: 'https://vite.dev/',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'build-tools',
    name: 'Vite React Plugin',
    usage: 'Vite 的 React 转换与开发支持',
    url: 'https://github.com/vitejs/vite-plugin-react',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'build-tools',
    name: 'TypeScript',
    usage: '类型系统与编译检查',
    url: 'https://www.typescriptlang.org/',
    licenses: [standardLicenses.apache2],
  },
  {
    category: 'build-tools',
    name: 'tsx',
    usage: 'TypeScript 测试运行器',
    url: 'https://tsx.is/',
    licenses: [standardLicenses.mit],
  },
  {
    category: 'build-tools',
    name: 'Electron Builder',
    usage: 'Windows x64 安装包、便携包与 ZIP 打包',
    url: 'https://www.electron.build/',
    licenses: [standardLicenses.mit],
  },
]
