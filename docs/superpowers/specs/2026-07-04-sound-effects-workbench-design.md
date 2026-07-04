# 生成音效 Tab 与音效素材分类设计

日期: 2026-07-04
状态: 已确认

## 背景

配音工作台目前围绕 VoxCPM 提供本机安装、依赖检测、服务启动、服务停止、重启、配音生成、历史管理和收藏到项目空间。新增音效生成应复用这套桌面服务能力，但不能把游戏音效继续混入配音资产。

项目空间当前资产大类包含 `image`、`sprite`、`voice`，并已存在 `sound_effect` 子类型。为了让音效在筛选、分组、存储、远程同步和后续关联里保持清晰，本设计新增独立 `sound` 资产大类。

Stable Audio 3 官方 README 的模型表显示: `small-sfx` 面向音效，CPU 可用，433M，最长 120 秒；`small-music` 面向音乐，CPU 可用，433M，最长 120 秒；`medium` 面向高质量快速推理，CUDA GPU，1.4B，最长 380 秒。官方安装方式使用 `uv sync --extra ui`，快速启动示例为 `uv run python run_gradio.py --model medium`。参考: https://github.com/Stability-AI/stable-audio-3

## 目标

- 在配音工作台增加 `生成音效` Tab，保留现有 `生成配音` 流程。
- 为 Stable Audio 3 增加一键安装脚本。
- 安装后提供依赖检测、模型检测、服务检测、启动、重启、停止。
- 允许用户选择 `small-sfx`、`small-music`、`medium`，并展示每个模型的用途、硬件、参数量和最长时长。
- 生成音效后提供试听、重命名、删除、收藏。
- 收藏时写入项目空间的独立 `音效素材` 分类。
- 收藏时可以选择一个已有精灵图，建立音效与精灵图的关联。

## 非目标

- 不接入 Stability AI 云 API。
- 第一版不做 LoRA 微调、音频续写、局部重绘和批量生成。
- 第一版不做歌词、人声或角色台词合成。
- 第一版不做完整音频编辑器和时间线编排。

## 用户体验

配音工作台主体改为 Tabs:

- `生成配音`: 现有 VoxCPM 安装和配音生成能力保持原样。
- `生成音效`: 新增 Stable Audio 3 安装、服务控制、生成和历史管理。

`生成音效` Tab 内分为两个主要区域:

- 服务区: 模型选择、模型介绍、一键安装、依赖/模型检测、服务检测、启动、重启、停止、端口显示。
- 生成区: 提示词、时长、随机种子、输出名称、生成按钮、结果历史。

默认模型为 `small-sfx`。因为该 Tab 面向游戏音效，默认时长建议为 6 秒，最大时长随模型限制:

- `small-sfx`: 1 到 120 秒，推荐音效、环境声、foley、UI 音。
- `small-music`: 1 到 120 秒，推荐短音乐、loop、转场音乐。
- `medium`: 1 到 380 秒，推荐更高质量、更长音频，需要 CUDA GPU。

`medium` 选择时，界面显示 GPU 和 Flash Attention 风险提示。硬件检测没有 NVIDIA/CUDA 时，不阻止用户选择，但安装和启动状态会以警告方式说明它不是推荐路径。

## 架构

### 前端模块

在 `src/components/VoiceDeploymentWorkspace/` 内新增音效相关模块，保持现有 `index.tsx` 只负责组合:

- `VoiceWorkspaceTabs.tsx`: 承载 `生成配音` 与 `生成音效` 的 Tab 结构。
- `SoundEffectSetupPanel.tsx`: Stable Audio 3 模型选择、安装检测和服务控制。
- `SoundEffectGenerationPanel.tsx`: 提示词、时长、种子、生成按钮。
- `SoundEffectLibraryPanel.tsx`: 生成历史、试听、收藏、关联精灵图。
- `useSoundEffectWorkspace.ts`: 音效 Tab 的状态和工作流编排。
- `useStableAudioSetup.ts`: 桌面安装、检测和服务控制。
- `useSoundEffectGenerationWorkflow.ts`: 生成请求、loading、错误处理和历史写入。
- `soundEffectModel.ts`: 模型元数据、默认参数、时长限制、记录命名、请求 payload、收藏 payload。
- `soundEffectPersonalSpaceCollector.ts`: 把生成记录收藏到项目空间，并建立精灵图关联。

现有 VoxCPM 代码不迁移到音效模块，只在外层 Tab 中复用。

### 桌面运行时

新增独立 Stable Audio 3 桌面 API，而不是复用 VoxCPM IPC 名称:

- `src/desktopStableAudioRuntimeApi.ts`
- `electron/stableAudioIpcHandlers.cjs`
- `scripts/deploy-stable-audio-3.ps1`
- 安装后写入 `%LOCALAPPDATA%\GameDesignTools\StableAudio3\stable-audio-config.json`
- 安装后写入 `%LOCALAPPDATA%\GameDesignTools\bin\stable-audio-service.ps1`

服务默认端口为 `8818`，避免和 VoxCPM 默认端口 `8808` 冲突。

安装脚本职责:

- 准备 Stable Audio 3 工作目录。
- 克隆或更新 `Stability-AI/stable-audio-3`。
- 准备 `uv` 与 Python 环境。
- 执行 `uv sync --extra ui`。
- 记录用户选择的模型 id。
- 对所选模型做一次下载/缓存准备。
- 写入服务管理脚本和配置。

服务脚本职责:

- `status`: 检测配置、仓库目录、Python/uv、依赖、所选模型缓存、端口进程。
- `start`: 启动 Stable Audio 3 本地服务。
- `restart`: 停止后重新启动。
- `stop`: 停止当前服务。

前端生成不直接依赖 Gradio 内部组件结构。服务层提供稳定的本地 HTTP 接口:

- `GET /health`: 返回当前模型、设备、是否 ready。
- `POST /generate`: 输入 prompt、duration、seed、outputName，返回音频 URL、本机路径和元数据。
- `GET /outputs/<id>.wav`: 提供生成结果试听与收藏读取。

这个本地接口由安装脚本部署的轻量 Python helper 提供，helper 使用 Stable Audio 3 官方 Python API 加载模型并生成音频。

## 数据模型

### 项目空间资产

新增资产大类:

- `CommonAssetKind`: 增加 `sound`
- `StoredAssetKind`: 增加 `sound`
- `AssetGroupKind`: 增加 `sound`
- `ProjectAssetKind`: 增加 `sound`
- `ProjectAssetGroupKind`: 增加 `sound`

`PersonalAssetSubtype` 继续使用现有 `sound_effect`。

新增默认分组:

- `assetGroups.sound`: `['默认分组']`
- `starredAssetGroups.sound`: `[]`

新增存储目录分类:

- `storageCategoryForAsset(sound)`: `音效`

新增创建函数:

- `createSoundAssetFromRecord(record)`: 创建 `kind: 'sound'`、`assetSubtype: 'sound_effect'` 的音频资产。

### 精灵图关联

本地项目空间在 `PersonalSpaceAsset` 上新增 `linkedSpriteAssetIds: string[]`。音效资产收藏并关联精灵图时，音效资产保存目标精灵图 id。

项目数据库层使用已有 `asset_relations` 表，新增关系类型:

- `sound_sprite`: `source_asset_id` 为音效资产，`target_asset_id` 为精灵图资产。

删除音效或精灵图时，需要清理相关本地 `linkedSpriteAssetIds` 和项目数据库 `asset_relations`。

## 收藏流程

1. 用户在音效历史点击 `收藏到音效素材` 或 `收藏并关联精灵图`。
2. 工作台读取当前生成结果的音频 blob。
3. 创建 `sound` 资产，写入项目空间资源目录或项目对象存储。
4. 资产进入 `音效素材` 的默认分组。
5. 如果用户选择精灵图，建立 `sound_sprite` 关联。
6. 持久化当前项目空间状态，并触发项目同步。

同一个生成记录重复收藏时，沿用现有 `sourceKey` 去重策略，以最新收藏为准。

## 错误处理

- Web 环境打开时，安装和服务按钮禁用，并提示需要 Windows 桌面应用。
- 依赖未安装时，启动服务先运行安装检测，失败则不启动。
- 所选模型未缓存时，检测结果明确说明缺少哪个模型。
- 端口不可用时，服务状态返回端口冲突信息。
- `medium` 缺少 CUDA 或 Flash Attention 时，检测显示警告，并保留安装日志路径。
- 生成失败时，历史不写入半成品，错误区显示服务返回内容。
- 收藏失败时，不丢失生成历史，并显示项目空间授权或同步错误。

## 测试计划

先按 TDD 增加失败测试，再写实现:

- `soundEffectModel.test.ts`: 模型元数据、默认模型、时长限制、payload 构造、记录命名。
- `personalSpaceSoundAssetState.test.ts`: `sound` 默认分组、创建音效资产、存储目录为 `音效`、重复收藏去重、音效关联精灵图、删除关联清理。
- `projectStorageAssetTypes.test.ts`: `sound` 资产大类和 `sound_sprite` 关系类型在项目存储类型中可表达。
- 项目 schema/row mapping 相关测试: 本地和远程项目行能保存、读取 `sound` 资产与 `sound_sprite` 关系。
- `stableAudioDesktopRuntime.test.cjs`: IPC 参数归一化、安装脚本路径解析、服务命令 action 限制。
- `desktopServiceWorkflow` 复用测试: 音效服务启动前先检测依赖，启动后等待 `/health`。
- 结构测试: `VoiceDeploymentWorkspace/index.tsx` 保持组合层，音效服务 IO 不进入页面入口。

最终验证命令:

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

前端完成后运行 dev server，用浏览器检查 `生成配音` 和 `生成音效` 两个 Tab 在桌面宽度和较窄宽度下不重叠、不溢出，按钮状态和空历史状态清晰可用。
