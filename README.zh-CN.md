# 游戏设计工具

游戏设计工具是一个面向 Windows 桌面端的游戏素材制作与管理工作台。它把精灵图处理、图片清理、本地配音与音效生成、视频转换、文档知识和按项目存储集中到同一个 Electron 应用中。

[English README](README.md)

## 当前版本

- 最新发布版本：`0.7.1`
- Windows x64 安装包通过 GitHub Releases 发布。
- 稳定自动更新通道使用 `windows-x64-latest` Release。

## 核心能力

- **项目空间**：按项目管理角色、剧情编排、公共图片、精灵图、配音、音效和文档。当前启用的项目是新增资产和元数据的保存目标。
- **本地与远程项目**：本地项目使用 SQLite 和本地对象文件；远程项目必须同时配置 PostgreSQL/MySQL 与七牛 Kodo 对象存储。
- **远程资产按需读取**：列表优先加载元数据和封面；打开或播放时才下载完整资源，并按指纹缓存。
- **自动同步与恢复**：项目变更自动同步；失败任务保留在状态面板中，可从那里重试。
- **精灵图工作台**：导入多图、整张精灵图或视频片段，使用色键或 BiRefNet 去背，统一画布、预览动画、批量高清化并导出精灵图包。
- **图片处理工作台**：批量管理图片，裁剪、色键/BiRefNet 抠图、结果预览、Upscayl GPU 高清化并导出常见格式。
- **视频处理工作台**：按百分比或目标分辨率缩放，使用 Upscayl GPU 超分，通过 Theora 质量/目标大小模式压缩，并导出 Godot 4.6 可用的 `.ogv`。
- **配音工作台**：安装和控制本地 VoxCPM Gradio 服务，生成或克隆 WAV 配音，编辑音频、管理历史并收藏到项目空间。
- **音效生成**：本地安装 Stable Audio 3，使用所选模型生成游戏音效、环境声、短音乐和循环段。
- **文档知识**：导入结构化知识、搜索记录、浏览图谱关系，并把集合保存在当前项目中。

## 目标平台与运行时

- Windows 10 或 Windows 11，x64
- VoxCPM、Stable Audio 3、BiRefNet 和 Upscayl 加速推荐使用 NVIDIA GPU
- 本地 AI 服务安装流程需要 Python 3.12
- 图片、精灵图和视频工作台进行 GPU 超分时，**必须安装 Upscayl GPU**
- 视频工作台使用 **FFmpeg 和 FFprobe** 完成媒体探测、解码、压缩与 OGV 输出

应用会从各工作台的安装入口准备受支持的运行包。Upscayl 缓存到 `%LOCALAPPDATA%\GameDesignTools\UpscaylRuntime`；固定版本的 FFmpeg/FFprobe 包校验后缓存到 `%LOCALAPPDATA%\GameDesignTools\VideoRuntime`。运行包有效时，重新打开应用会直接复用，不会重复下载。

## 安装使用

从 [GitHub Releases 页面](https://github.com/jiawen-afk/game-design-tools/releases) 下载 Windows x64 包：

- `Game Design Tools-{version}-x64-setup.exe`：安装版
- `Game Design Tools-{version}-x64-portable.exe`：便携版
- `Game Design Tools-{version}-x64-win.zip`：压缩包版

## 首次使用

1. 打开 **项目空间**，授权一个本地资源目录。
2. 使用默认本地项目，或进入项目管理创建本地/远程项目。
3. 远程项目必须配置并验证：
   - PostgreSQL 或 MySQL 数据库配置；
   - 七牛 Kodo 对象存储配置。
4. 创建或迁移远程项目前先初始化远程数据库表结构。
5. 启用一个项目，使其成为当前保存目标。

远程连接配置保存在每台设备本地；共享项目数据和对象继续保存在远程数据库与对象存储中。

## 工作台

- **项目空间**：角色、肖像、精灵图、配音/音效、剧情组、公共素材、设置、远程同步状态和项目切换。
- **精灵图工作台**：上传与切分、色键/BiRefNet 抠图、统一画布、描边/轮廓合成、播放、排序、批量 Upscayl 预览和精灵图导出。
- **图片处理工作台**：逐图参数、裁剪、色键/BiRefNet 抠图、Upscayl GPU 处理、预览和导出。
- **视频处理工作台**：串行批量缩放、GPU 超分、Theora 压缩、Vorbis/静音、帧率控制、导出目录记忆，以及 Godot 4.6 原生 OGV 导出。
- **配音工作台**：VoxCPM 安装、本地 Gradio 服务控制、配音生成/克隆、音频编辑、Stable Audio 3 音效生成、历史记录和项目收藏。
- **文档知识工作台**：项目级集合、SHJ 图谱导入、搜索、分类筛选、图谱浏览和节点详情。

## AI 与媒体运行时安装

- **Upscayl GPU**：执行高清化任务前，从相应工作台安装运行包；支持的界面可设置 GPU、模型、分块大小、线程配置和 TTA。
- **BiRefNet**：从抠图安装面板安装依赖与 `ZhengPeng7/BiRefNet_HR-matting` 模型，然后启动本地服务。
- **VoxCPM**：选择模型，安装本地服务依赖，并从配音工作台控制 Gradio 服务。
- **Stable Audio 3**：选择模型；需要时先在 Hugging Face 同意模型仓库条款，再安装依赖并启动本地生成服务。
- **FFmpeg/FFprobe**：从视频工具栏安装固定版本、带校验的 LGPL shared 构建；安装会重试批准的下载线路，并在验证后原子替换运行包。

## Godot 4.6 视频工作流

视频工作台固定写入 Ogg 容器、Theora `yuv420p` 视频和可选 Vorbis 音频。它不会输出 H.264、H.265、AV1、VP9、MP4、MKV 或 WebM，因为目标是 Godot 4.6 原生 `VideoStreamTheora` 播放。

1. 使用快捷键 `4` 打开 **视频处理工作台**。
2. 安装固定版本的 FFmpeg/FFprobe 运行包。
3. 启用 GPU 超分前安装 **Upscayl GPU**。
4. 导入一个或多个视频并选择导出目录；视频工作台会记住最近授权的目录。
5. 设置缩放百分比/分辨率、压缩模式、目标帧率、音频模式和可选 Upscayl 高级参数。
6. 启动队列。任务串行执行；单项失败不会阻止后续任务。
7. 把生成的 `.ogv` 加入 Godot 4.6 项目，并赋值给 `VideoStreamPlayer.stream`。

在相近画质下，Theora 的压缩效率低于现代编码器。本工作流优先保证 Godot 原生兼容和本地播放可预测性。帧率验证会结合时长与帧数容差；可解释的元数据差异会给出警告，不再严格阻止能够正常播放的输出。

仓库提供可选的无界面冒烟项目 `test-fixtures/godot-video-smoke`。把生成文件复制为 `test-fixtures/godot-video-smoke/sample.ogv`，然后运行：

```powershell
godot --headless --path test-fixtures/godot-video-smoke --script res://video_smoke.gd --quit-after 120 -- res://sample.ogv
```

只有 Godot 将文件识别为 `VideoStreamTheora` 且 `VideoStreamPlayer` 开始播放时，冒烟测试才通过。

## 项目存储模型

- 本地模式使用本地 SQLite 项目数据库和本地对象文件。
- 远程模式必须同时具备远程数据库和七牛 Kodo。
- 支持本地项目迁移到远程项目；不支持远程迁移回本地。
- 项目、角色、剧情、资产和资产分组删除均为永久删除。
- 远程完整资源通过项目资产管理器和指纹缓存读取。

## 第三方软件

应用的 **关于** 窗口列出本项目使用的主要桌面/媒体运行时、AI 模型与服务、直接应用依赖和构建工具。每项均提供用途、项目主页和适用的许可证链接。完整 npm 依赖图以 `package.json`、`package-lock.json` 和各软件包元数据为准。

代码许可证与模型权重许可证并不等同。例如 Stable Audio 3 推理代码采用 MIT，模型权重则适用 Stability AI Community License，并可能包含额外的 Gemma 条款。下载或分发模型资产前，请阅读“关于”窗口中的对应链接。

视频运行包使用固定的 LGPL shared FFmpeg 构建。软件许可证不能代替编码器专利判断：如果产品分发或商业使用 H.265/HEVC 等可能受专利约束的编码器，使用者仍需根据自身产品和所在地区评估授权义务。本工具的 Godot OGV 工作流不输出 H.265。

## 本地开发

```powershell
npm install
npm test
npm run build
npm run desktop:dev
```

## 本地构建 Windows 安装包

```powershell
npm run desktop:build:win
```

产物写入 `../game-design-tools-windows-x64`。本地打包主要用于诊断；正式发布优先使用 GitHub Actions。

## 发布流程

```powershell
npm test
npm run build
git diff --check
git push origin master
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin vX.Y.Z
gh workflow run windows-release.yml --repo jiawen-afk/game-design-tools --ref master -f tag=vX.Y.Z
gh run watch <run-id> --repo jiawen-afk/game-design-tools --exit-status
```

工作流成功后，核对版本化 Release、`windows-x64-latest` 和其中的 `latest.yml` 更新元数据。

## 项目结构

- `src/components/MultiFrameSpriteWorkspace`：精灵图上传、视频帧、抠图、布局、播放、批量高清化和导出
- `src/components/ImageProcessingWorkspace`：批量图片清理、裁剪、抠图、高清化、预览和导出
- `src/components/VideoProcessingWorkspace`：视频缩放、GPU 超分、压缩、串行队列、导出目录记忆、验证和 OGV 导出
- `src/components/VoiceDeploymentWorkspace`：VoxCPM、音频编辑、Stable Audio 3、历史记录和项目收藏
- `src/components/DocumentWorkspace`：项目文档集合、图谱导入、浏览、筛选、搜索和节点操作
- `src/components/PersonalSpaceWorkspace`：项目空间 UI、项目管理、资产、设置和远程同步状态
- `src/components/ProjectStorage`：本地/远程仓储、对象存储、迁移、资产缓存和文档持久化
- `electron`：桌面壳、IPC、运行时、本地 SQLite、远程数据库、七牛 Kodo 和安全 preload bridge
- `scripts`：VoxCPM、BiRefNet、Stable Audio 3 和图片编码器的 Windows 部署/服务脚本

## 发布前验证

发布或声明完成前运行：

```powershell
npm test
npm run build
git diff --check
```

## 仓库地址

GitHub: https://github.com/jiawen-afk/game-design-tools
