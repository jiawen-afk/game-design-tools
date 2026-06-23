# 当前版本参考文档

更新时间：2026-06-23  
当前版本：`0.3.3`  
当前分支：`master`

本文档记录当前版本的真实项目结构、运行形态、数据持久化方式和资产流转链路。后续引入“项目维度管理资产、项目远程数据库、项目远程对象存储、周期同步”时，应优先参考本文中的现状边界和迁移风险。

## 1. 产品定位

Game Design Tools 是一个面向 Windows 桌面端的本地游戏素材制作工作台。当前能力集中在三类素材生产和一个全局个人空间：

- 精灵图工作台：导入图片批次、整张精灵图或视频片段，完成抠图、统一画布、逐帧对齐、播放预览、排序，并导出 `sprite.png` 与 `index.json`。
- 图片处理工作台：处理单张图片，支持色键抠图、裁剪、导出 PNG/WebP/JPG/JPEG，并可通过本地 Upscayl 运行包做高清化。
- 配音工作台：连接本机 VoxCPM Gradio 服务，生成 WAV 配音，管理最近历史记录，并收藏到个人空间。
- 个人空间：全局资产空间，管理角色、剧情编排、公共图片、精灵图和配音资产，依赖用户授权的本地资源目录保存二进制文件。

当前版本没有“项目”概念；所有角色、剧情、素材、星标和收藏都进入同一个全局个人空间。

## 2. 技术栈与运行形态

核心技术：

- React `19.2.3`
- Ant Design `6.0.0`
- Vite `7.3.1`
- TypeScript `5.9.3`
- Electron `41.7.1`
- Electron Builder `26.15.2`
- JSZip `3.10.1`
- Node 内置 `node:test` 作为测试框架

主要命令：

```powershell
npm test
npm run build
npm run desktop:dev
npm run desktop:build:win
```

构建脚本：

- `npm run build` 执行 `tsc -b && vite build`。
- `npm run desktop:dev` 先构建再启动 Electron。
- `npm run desktop:build:win` 构建 Windows x64 安装版、便携版和 zip 包。
- `vite.config.ts` 使用相对路径 `base: './'`，并在 build 后复制 `scripts/deploy-voxcpm.ps1` 到 `dist/scripts`。

发布配置：

- Electron 入口是 `electron/main.cjs`。
- 产物输出目录是 `../game-design-tools-windows-x64`。
- 当前发布通道固定为 `windows-x64-latest`。

## 3. 顶层应用结构

入口文件：

- `src/main.tsx`：挂载 React，注入 Ant Design reset、全局样式和 `AppToastProvider`。
- `src/App.tsx`：应用壳、主页工具列表、全局个人空间入口、快捷键路由。
- `src/desktopApi.ts`：渲染进程可见的桌面 API 类型定义。

`App.tsx` 当前有三个工具列表项：

- `multi-frame-sprite`：精灵图工作台，快捷键 `1`
- `image-processing`：图片处理工作台，快捷键 `2`
- `voice-deployment`：配音工作台，快捷键 `3`

个人空间不是工具列表项，而是全局入口：

- `personal-space`：个人空间，快捷键 `4`
- 工具页顶部有“打开个人空间”按钮
- `Esc` 返回工具列表

这个边界已经被 `src/appStructure.test.ts` 保护。

## 4. Electron 桌面桥

渲染进程不直接访问 Node。所有本机能力通过 `window.gameDesignToolsDesktop` 暴露，类型定义在 `src/desktopApi.ts`，实现分布在：

- `electron/preload.cjs`：通过 `contextBridge.exposeInMainWorld` 暴露安全 API。
- `electron/main.cjs`：实现 IPC handler、本地文件 IO、服务管理、自动更新和 Upscayl 运行包管理。

当前桌面桥能力：

- 个人空间目录：
  - 选择授权目录
  - 注册已授权目录
  - 创建/获取目录和文件
  - 读写文件
  - 删除授权目录下的文件或目录
- 文件保存和打开：
  - 另存导出文件
  - 在文件资源管理器中打开路径
- 自动更新：
  - 获取更新状态
  - 检查更新
  - 下载后重启安装
  - 监听状态变化
- VoxCPM：
  - 检测硬件
  - 启动依赖安装脚本
  - 查询依赖状态
  - 启动/停止/重启/查询本地服务
- Upscayl：
  - 查询运行包状态
  - 下载并安装运行包
  - 执行图片高清化
  - 监听安装进度

安全边界：

- `electron/main.cjs` 用 `allowedPersonalSpaceRoots` 记录用户授权目录。
- 文件读写前会检查目标路径必须位于授权根目录内。
- 子路径名称会拒绝空值、斜杠、`.` 和 `..`。

## 5. 当前持久化位置

当前版本主要使用 `localStorage` 保存元数据和偏好，用本地授权目录保存二进制资源。

| 数据 | 位置 | Key / 路径 | 说明 |
| --- | --- | --- | --- |
| 个人空间状态 | `localStorage` | `game-design-tools.personal-space.v1` | 角色、剧情组、资产元数据、星标分组、设置 |
| 个人空间目录句柄/路径 | `localStorage` | `personal-space-directory` | 桌面版保存 native directory 的 `name/path/kind` |
| VoxCPM 配音历史 | `localStorage` | `game-design-tools.voxcpm.records.v1` | 最近 80 条生成记录 |
| 精灵工作台抠图默认值 | `localStorage` | `gameDesignTools.multiFrameSprite.matteDefaults.v1` | 色键、容差、溢色等参数 |
| 精灵工作台布局默认值 | `localStorage` | `gameDesignTools.multiFrameSprite.layoutDefaults.v1` | 画布、描边、轮廓等参数 |
| 个人空间资源文件 | 用户授权目录 | `公共图片/精灵图/配音/角色肖像/...` | 图片、音频、sprite sheet、index 文件 |
| VoxCPM 运行状态 | `%LOCALAPPDATA%\GameDesignTools\VoxCPM` | `voxcpm-config.json`、服务脚本等 | 安装脚本写入 |
| Upscayl 运行包 | `%LOCALAPPDATA%\GameDesignTools\UpscaylRuntime` | `bin/`、`models/`、manifest | 主进程下载和调用 |

当前没有远程数据库、远程对象存储、后端服务、同步队列或项目级配置。

## 6. 个人空间数据模型

核心类型位于 `src/components/PersonalSpaceWorkspace/personalSpaceModel.ts`。

当前个人空间状态：

```ts
interface PersonalSpaceState {
  settings: PersonalSpaceSettings
  assetGroups: Record<AssetGroupKind, string[]>
  starredAssetGroups: Record<AssetGroupKind, string[]>
  characters: CharacterProfile[]
  assets: PersonalSpaceAsset[]
  storyboardGroups: StoryboardGroup[]
  pendingDeletedResourcePaths: string[]
}
```

资产类型：

- `image`：公共图片、地图、场景、特效参考图、抠图结果、角色肖像等都会归一到图片资产。
- `sprite`：精灵图资产，通常包含 `sprite.png` 和 `index.json` 两个资源。
- `voice`：配音资产，通常包含一个音频资源。
- `map` 和 `effect` 仍保留在类型中，但读取时会迁移为 `image` 并补充 `地图` 或 `特效` 标签。

资产字段：

- `id`：客户端生成的资源 ID。
- `kind`：资产类型。
- `name`：显示名称。
- `groupName`：所在素材分组。
- `tags`：标签。
- `dialogueText`：配音对白文本。
- `resourcePaths`：当前可预览资源路径，多为 `blob:` URL 或 Gradio 文件 URL。
- `storageResourcePaths`：写入本地授权目录后的存储路径。
- `linkedCharacterIds`：关联角色。
- `linkedStoryboardIds`：关联剧情组。
- `linkedVoiceAssetIds`：图片特效关联的配音。
- `sourceKey`：收藏去重来源，例如配音历史或 sprite 导出哈希。

角色模型：

- `CharacterProfile` 支持角色名称、排序、星标。
- 角色可分别关联肖像、精灵图、配音。
- 新模型使用 `portraitAssets`、`spriteAssets`、`voiceAssets` 保存带顺序和备注的关联。
- 兼容旧字段 `portraitAssetIds`、`spriteAssetIds`、`voiceAssetIds`。

剧情模型：

- `StoryboardGroup` 支持剧情组名称、星标。
- 剧情组保存有序的 `voiceEntries`，每条包含 `assetId`、对白文本、顺序和备注。
- 剧情组的关联角色由已编排配音的 `linkedCharacterIds` 推导。

星标现状：

- 角色有 `starred`。
- 剧情组有 `starred`。
- 素材分组通过 `starredAssetGroups` 星标。
- 当前没有单个资产级 `starred` 字段。

## 7. 个人空间资源文件布局

本地目录写入逻辑位于：

- `personalSpaceFileStorage.ts`
- `personalSpaceAssets.ts`
- `personalSpaceResourceActions.ts`

写入分类：

- 角色肖像：`角色肖像/{yyyy-mm-dd}/{hash}.png`
- 精灵图：`精灵图/{yyyy-mm-dd}/{hash}.png` 和 `{hash}.json`
- 配音：`配音/{yyyy-mm-dd}/{hash}.wav`
- 公共图片：`图片/{yyyy-mm-dd}/{hash}.png`

`storageResourcePaths` 保存的是以授权目录名开头的相对路径，例如：

```text
PersonalSpace/精灵图/2026-06-06/0123456789abcdef.png
```

在桌面 native directory 场景中，`PersonalSpaceDirectoryHandle` 是对 Electron IPC 的封装。读取预览时会用 `storageResourcePaths` 找到本地文件并创建临时 object URL。

## 8. 个人空间 UI 与工作流

入口：

- `src/components/PersonalSpaceWorkspace/index.tsx`

状态和编排：

- `usePersonalSpaceWorkspace.ts`：个人空间页面状态、上传、删除、导出、关联关系写回。
- `usePersonalSpaceSettingsWorkspace.ts`：目录授权、设置保存、打开目录。
- `usePersonalSpaceDirectoryAuthorization.ts`：其他工作台检查是否已授权个人空间目录。

主要面板：

- `PersonalSettingsPanel.tsx`：资源存储目录、删除内容同时删除资源、打开目录。
- `PersonalCharacterPanel.tsx`：角色创建/重命名/星标/排序/删除，关联肖像、精灵图、配音。
- `PersonalStoryboardPanel.tsx`：剧情组创建/重命名/星标/删除，导入/关联配音，拖拽排序，连续播放，导出剧情相关资产。
- `PersonalResourceSections.tsx`：公共图片、精灵图、配音三个一级素材区，支持分组、星标分组、批量选择、转移、删除、上传、关联。

当前门槛：

- 如果没有授权个人空间目录，角色、剧情编排、素材模块会被禁用。
- 用户会被导向设置模块选择授权目录。
- 收藏按钮也会被禁用或提示“请先在个人空间-设置中授权目录”。

## 9. 资产进入个人空间的路径

当前所有收藏/上传最终都会写入本地授权目录，并更新 `localStorage` 中的 `PersonalSpaceState`。

### 9.1 手动导入

来源：个人空间页面。

- 角色肖像上传：创建 `image` 资产，分组为 `角色肖像`，标签含 `肖像`，并关联到角色。
- 角色精灵图上传：要求同时选择 `.png` 和 `index.json`，创建 `sprite` 资产，并关联到角色。
- 角色配音上传：创建 `voice` 资产，并关联到角色。
- 剧情组配音上传：创建 `voice` 资产，并加入剧情组。
- 素材区上传：
  - 公共图片：`image`
  - 精灵图：`sprite`
  - 配音：`voice`

### 9.2 配音工作台收藏

来源文件：

- `VoiceDeploymentWorkspace/index.tsx`
- `voicePersonalSpaceCollector.ts`
- `voiceRecordStorage.ts`

流程：

1. VoxCPM 生成音频。
2. 生成记录写入 `game-design-tools.voxcpm.records.v1`，最多保留 80 条。
3. 用户点击“收藏到个人空间”。
4. `collectVoiceRecordToPersonalSpace` 读取音频 Blob。
5. 写入个人空间授权目录。
6. 创建 `voice` 资产并写回 `game-design-tools.personal-space.v1`。
7. 可选关联角色、特效图片或剧情组。

去重：

- 收藏时使用 `sourceKey: voice-record:{record.id}`。
- 如果已有同 `sourceKey` 的资产，会删除旧资产再写入新资产。

### 9.3 精灵图工作台收藏最终 Sprite

来源文件：

- `MultiFrameSpriteWorkspace/useSpriteExport.ts`
- `ExportPanel.tsx`

流程：

1. 可见帧合成为 sprite sheet。
2. 生成 `sprite.png` Blob。
3. 生成 `index.json`，包含帧尺寸、sheet 尺寸、fps、播放模式和每帧坐标。
4. 导出 ZIP 时通过桌面保存文件能力保存 `sprite_export.zip`。
5. 收藏时写入授权目录，并创建 `sprite` 资产。
6. 可选“收藏并关联角色”，会把新资产关联到角色的精灵图栏。

去重：

- 使用 `sprite-export:{hash}` 作为 `sourceKey`。
- hash 基于画布尺寸、列数、fps、播放模式和可见帧信息。

### 9.4 精灵图工作台收藏抠图任务组

来源文件：

- `MultiFrameSpriteWorkspace/useMattePipeline.ts`
- `MatteWorkspacePanel.tsx`

流程：

1. 每个导入批次、sprite 切片或视频帧批次形成一个抠图任务组。
2. 任务组确认抠图完成后，可导出组图片。
3. 可点击“收藏到个人空间”。
4. 每帧抠图结果逐张写入授权目录。
5. 每张图片创建一个 `image` 资产，标签包含 `抠图` 和任务组名称。

### 9.5 图片处理工作台导出

来源文件：

- `ImageProcessingWorkspace/useImageProcessingWorkspace.ts`
- `ImageExportPanel.tsx`

当前只支持导出到文件，不支持收藏到个人空间。

流程：

1. 上传单张图片。
2. 可切换色键抠图。
3. 可裁剪。
4. 可配置导出格式和尺寸。
5. 可选启用 Upscayl 高清化预览。
6. 点击“导出当前图片”后通过桌面保存文件能力保存。

## 10. 各工作台边界

### 10.1 精灵图工作台

目录：`src/components/MultiFrameSpriteWorkspace`

架构：

- `index.tsx` 只组合面板和 controller。
- `useSpriteWorkspaceController.ts` 组合各业务 hook。
- `useFrameWorkspaceState.ts` 管理帧列表、选择、排序。
- `useUploadWorkspace.ts` 和 `useVideoWorkspace.ts` 管理图片、精灵图、视频导入。
- `useMattePipeline.ts` 管理色键抠图、合成队列、批处理、抠图组导出/收藏。
- `useLayoutWorkspace.ts` 管理画布尺寸、布局参数、缩放、参考线。
- `usePlaybackWorkspace.ts` 管理播放列表、帧显示、排序。
- `useSpriteExport.ts` 管理最终 sprite sheet 导出和收藏。
- `*Model.ts`、`model.ts`、`imagePipeline.ts`、`videoFramePipeline.ts` 保存纯逻辑和浏览器图像处理逻辑。

关键输出：

- `sprite_export.zip`
- `sprite.png`
- `index.json`
- 个人空间 `sprite` 资产
- 个人空间 `image` 抠图资产

### 10.2 图片处理工作台

目录：`src/components/ImageProcessingWorkspace`

架构：

- `index.tsx` 保持页面组合，左侧 Tabs 控制区，右侧结果预览区。
- `useImageProcessingWorkspace.ts` 管理所有状态和 workflow。
- `imageProcessingModel.ts` 保存裁剪、导出尺寸、格式、缩放、预览变换等纯逻辑。
- `imageProcessingPipeline.ts` 封装加载图片、色键抠图、裁剪预览和 canvas 导出。
- `imageUpscaleModel.ts` 保存 Upscayl 模型、参数和 CLI 参数逻辑。

关键输出：

- 单张处理后图片。
- 当前版本不写入个人空间。

### 10.3 配音工作台

目录：`src/components/VoiceDeploymentWorkspace`

架构：

- `index.tsx` 组合服务连接、生成面板、记录面板和收藏关联弹窗。
- `useVoiceDeploymentSetup.ts` 管理端口检测、硬件检测、依赖安装、服务控制。
- `useVoiceGenerationWorkflow.ts` 管理生成参数、参考音频上传、Gradio 生成请求和历史记录创建。
- `voiceDeploymentService.ts` 封装 Gradio HTTP 调用和 SSE 结果解析。
- `voiceDeploymentModel.ts` 保存硬件评估、模型元数据、payload 构建、记录命名等纯逻辑。
- `voiceRecordStorage.ts` 管理配音历史 localStorage。
- `voicePersonalSpaceCollector.ts` 管理配音记录收藏到个人空间。

关键输出：

- VoxCPM 生成的 WAV 音频。
- 最近 80 条本地历史记录。
- 个人空间 `voice` 资产。

### 10.4 个人空间

目录：`src/components/PersonalSpaceWorkspace`

架构：

- `index.tsx` 组合各 Tab 和面板。
- `usePersonalSpaceWorkspace.ts` 是当前个人空间 workflow 中心。
- `personalSpaceModel.ts` 是类型和 barrel export。
- `personalSpaceState.ts` 管理 localStorage 读写、默认状态和迁移归一。
- `personalSpaceAssets.ts` 管理资产创建、命名、哈希和存储路径。
- `personalSpaceCharacters.ts` 管理角色操作。
- `personalSpaceStoryboards.ts` 管理剧情组操作。
- `personalSpaceAssetGroups.ts` 管理素材分组和分组星标。
- `personalSpaceAssetOperations.ts` 管理资产更新、删除和收藏去重。
- `personalSpaceFileStorage.ts` 封装内存/桌面目录句柄、资源写入、读取、删除。
- `personalSpaceResourceActions.ts` 处理上传、导出 ZIP、删除资源等 IO workflow。

关键输出：

- 全局个人空间元数据。
- 本地授权目录内的资产文件。
- 剧情组相关 ZIP 导出。

## 11. 测试与架构守卫

测试命令：

```powershell
npm test
```

测试入口由 `package.json` 固定列出：

- `src/appStructure.test.ts`
- `ImageProcessingWorkspace` 模型测试
- `MultiFrameSpriteWorkspace` 模型测试
- `VoiceDeploymentWorkspace` 模型与收藏测试
- `PersonalSpaceWorkspace` 模型与文件存储测试

`appStructure.test.ts` 不是普通单元测试，而是架构守卫。它通过读取源码文本保护以下规则：

- 个人空间是全局入口，不是工具列表项。
- 工作台入口组件保持轻量，不直接承担 IO 和复杂 workflow。
- 个人空间模型拆分到 state、assets、characters、storyboards、groups、operations。
- 个人空间页面委托给 hook 和 action/storage 文件处理副作用。
- 桌面 bridge 必须存在并被个人空间、VoxCPM、Upscayl 使用。
- Web 时代的 `showDirectoryPicker` / `indexedDB` 等浏览器目录能力不应作为主路径回归。
- 图片处理工作台布局、高清化、导出行为保持当前结构。
- 配音工作台服务、记录、收藏、生成 workflow 保持分层。
- 精灵图布局、抠图、视频预览、指针交互保持拆分。

后续项目化改造如果改变边界，应同步更新或新增结构测试。

## 12. 当前版本限制

对后续需求最重要的限制如下：

- 没有项目维度，所有数据都是全局个人空间。
- 没有远程数据库，个人空间元数据只在 localStorage。
- 没有远程对象存储，资源文件只在本地授权目录或临时 `blob:` URL。
- 没有同步机制、同步状态、冲突处理、失败重试或增量队列。
- 没有服务端 schema，也没有数据库初始化脚本。
- 没有 PostgreSQL、MySQL、七牛云 Kodo SDK 或相关依赖。
- 没有密钥/连接串管理 UI。
- 没有资产级星标，只有角色、剧情组、素材分组星标。
- 多处收藏路径直接读写 `readPersonalSpaceState` / `writePersonalSpaceState`，没有统一 repository 层。
- 多处收藏路径直接调用 `writeAssetResourcesToDirectory`，没有统一 object storage adapter。
- `resourcePaths` 仍大量保存临时可预览路径；真正持久文件路径在 `storageResourcePaths`。

## 13. 后续项目化改造落点

引入项目维度时，建议优先建立以下抽象，再迁移具体工作台：

1. Project domain

   当前 `PersonalSpaceState` 是全局单例。后续需要新增 `Project`、`ProjectSettings`、`ProjectConnectionProfile` 等模型，并确定当前活跃项目。现有个人空间可以迁移为默认项目。

2. Metadata repository

   当前元数据读写直接调用 localStorage。后续应把 `readPersonalSpaceState` / `writePersonalSpaceState` 背后的实现替换为项目级 repository，支持 local fallback、PostgreSQL、MySQL。

3. Object storage adapter

   当前资源写入只面向本地目录。后续应建立统一接口，例如 `putObject`、`getObjectUrl`、`deleteObject`、`listObjects`，第一版实现七牛云 Kodo，本地目录保留为开发/离线 adapter。

4. Sync queue

   当前写入是同步覆盖 localStorage。周期同步需要记录 dirty 状态、lastSyncedAt、remoteVersion、operation log 或 revision。删除资源时已有 `pendingDeletedResourcePaths`，可以作为同步队列雏形参考，但需要扩展到所有 CRUD。

5. Project-aware collection service

   当前收藏入口散落在：

   - `voicePersonalSpaceCollector.ts`
   - `useSpriteExport.ts`
   - `useMattePipeline.ts`
   - `usePersonalSpaceWorkspace.ts`

   后续应统一到项目资产收藏服务，工作台只提交“我要收藏的资产输入和资源 Blob”，由服务负责写数据库、写对象存储、创建关系、去重和同步状态。

6. Desktop bridge expansion

   如果数据库连接、Kodo 上传、密钥存储不适合暴露在渲染进程，应通过 `desktopApi.ts`、`preload.cjs`、`main.cjs` 增加受控 IPC。尤其是数据库连接串、Kodo AK/SK、bucket 配置不应在普通 UI 代码中散落。

7. Schema and initialization

   PostgreSQL/MySQL 初始化表结构应与 TypeScript 模型保持映射。当前推荐至少覆盖：

   - projects
   - project_settings
   - assets
   - asset_resources
   - asset_groups
   - characters
   - character_asset_links
   - storyboard_groups
   - storyboard_voice_entries
   - asset_relations
   - sync_operations 或 sync_state

8. Migration path

   当前 localStorage key 是 `game-design-tools.personal-space.v1`。项目化时需要提供一次迁移：

   - 读取全局个人空间状态。
   - 创建默认项目。
   - 把角色、剧情组、素材、分组、星标迁移到默认项目。
   - 把本地 `storageResourcePaths` 映射为对象存储 key 或本地资源引用。
   - 保留失败回滚或备份导出能力。

## 14. 未来需求影响面清单

实现“创建项目、按项目维度管理资产”会影响：

- `src/App.tsx`：全局入口和活跃项目选择入口。
- `PersonalSpaceWorkspace` 全模块：所有 state/action/model 都需要 project scope。
- `VoiceDeploymentWorkspace`：收藏配音、个人空间快照、角色选择、历史记录关联。
- `MultiFrameSpriteWorkspace`：sprite 收藏、抠图组收藏、角色关联弹窗。
- `ImageProcessingWorkspace`：如果新增收藏图片，也需要进入项目资产服务。
- `desktopApi.ts`、`electron/preload.cjs`、`electron/main.cjs`：远程配置、密钥、数据库/对象存储能力。
- `src/appStructure.test.ts`：新增项目化边界守卫。
- README / 产品文档：安装、配置远程数据库和对象存储说明。

实现“项目远程数据库，支持 PostgreSQL/MySQL，并初始化表结构”会影响：

- 新增数据库连接配置模型。
- 新增数据库 adapter。
- 新增初始化/迁移 SQL。
- 新增连接测试、初始化状态、错误提示 UI。
- 新增服务层测试，至少覆盖 schema 生成、初始化幂等、连接配置校验。

实现“项目远程对象存储，第一版七牛云 Kodo”会影响：

- 新增 Kodo 配置模型。
- 新增对象存储 adapter。
- 新增上传、下载/预览 URL、删除、失败重试。
- 替换 `writeAssetResourcesToDirectory` 在收藏路径中的直接使用。
- 处理资源 key、bucket、域名、访问权限、上传 token 或 AK/SK 安全边界。

实现“周期性同步数据”会影响：

- 新增同步调度器。
- 新增同步状态 UI。
- 新增本地 dirty 标记和远端版本字段。
- 新增冲突策略。
- 新增失败队列、重试、手动立即同步。
- 删除资源时从 `pendingDeletedResourcePaths` 扩展为通用 pending operation。

## 15. 建议的迁移原则

- 不要直接把远程数据库调用塞进 UI 面板。
- 不要让多个工作台各自实现 Kodo 上传。
- 不要让 `PersonalSpaceState` 同时承担全局个人空间和项目空间两个语义。
- 优先让当前全局个人空间迁移成“默认项目”，降低用户数据丢失风险。
- 保持现有模型纯函数可测试，把 IO 放到 service/storage/actions 层。
- 每新增一个跨模块边界，都应补 `appStructure.test.ts` 或模型测试。

