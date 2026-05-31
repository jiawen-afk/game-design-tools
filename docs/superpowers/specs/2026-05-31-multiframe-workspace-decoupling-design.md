# MultiFrameSpriteWorkspace 状态模型解耦设计

## 背景

`src/components/MultiFrameSpriteWorkspace/index.tsx` 当前同时承担页面编排、帧集合管理、抠图与合成调度、视频提帧、布局拖拽、辅助线、播放、导出和弹窗状态。文件体积接近两千行，跨流程状态互相引用，后续添加能力时容易把入口组件继续推大。

项目已经有一批聚焦的模型和视图组件，例如 `playbackModel.ts`、`layoutModel.ts`、`videoModel.ts`、`VideoUploadPanel.tsx`、`PlaybackPanel.tsx`、`MatteFrameCard.tsx`。这次解耦延续现有方向，不引入新的状态库，不改变外部路由和用户流程。

## 目标

- 将 `index.tsx` 收敛为页面编排层。
- 把核心状态按业务流程拆到专用 hook 或小模块中。
- 让帧集合成为明确的核心资产，其他流程通过回调追加、更新、消费帧。
- 保持现有 UI 行为不变，避免视觉重设计。
- 用测试锁住结构边界和关键纯逻辑，降低重构风险。

## 非目标

- 不引入 Redux、Zustand 或其他第三方状态库。
- 不重写视频提帧、抠图算法或导出格式。
- 不调整页面视觉风格。
- 不清理与本次解耦无关的样式和业务命名。

## 模块边界

### `useFrameWorkspaceState`

负责 `frames`、`activeId`、帧选择、排序、隐藏、删除、清空和 URL 清理入口。它是其他 hook 与页面组件共享帧数据的唯一来源。

### `useMattePipeline`

负责抠图默认参数、单帧抠图调度、合成调度、颜色采样和参数应用。它消费帧集合更新能力，但不拥有帧集合本身。

### `useLayoutWorkspace`

负责公共画布参数、当前帧布局、拖拽缩放、滚轮缩放、辅助线和布局默认值保存。它消费当前帧和帧集合更新能力。

### `useVideoWorkspace`

负责视频草稿、片段范围、提帧进度、预览播放、统一裁剪和确认添加视频帧。它只在确认添加时向帧集合输出新帧。

### `usePlaybackWorkspace`

负责播放列表、播放游标、播放模式、选择播放、批量隐藏和预览帧选择。它消费帧集合和帧更新能力。

### `useSpriteExport`

负责导出状态、导出前校验、sprite sheet canvas 生成和 ZIP 下载。它消费可见已合成帧，不修改帧集合。

## 数据流

帧集合是核心数据源。上传图片、精灵图切分和视频提帧最终都生成 `FrameItem[]`，再交给帧集合 hook 追加。抠图和布局通过帧集合提供的更新接口修改单帧。播放和导出只消费派生出来的可见帧、已合成帧和播放帧 ID。

异步副作用归属到最接近的 hook：抠图与合成定时器归 `useMattePipeline`，视频 object URL 和提帧清理归 `useVideoWorkspace`，播放 interval 归 `usePlaybackWorkspace`，导出下载 URL 归 `useSpriteExport`。

## 测试策略

- 先新增结构性测试，让测试在缺少新 hook 边界时失败。
- 继续保留现有模型测试，确保纯函数行为不因迁移改变。
- 对新抽出的纯 helper 添加单元测试。
- 对浏览器副作用保持薄封装，第一轮不构造复杂 DOM mock。
- 最终运行 `npm test` 和 `npm run build` 验证。

## 风险与处理

- `framesRef` 被多个异步流程使用。迁移时保留 ref 同步语义，避免闭包读到旧帧。
- object URL 清理容易遗漏。迁移时每个拥有 URL 的 hook 都提供 unmount 清理。
- 播放、抠图、合成定时器可能互相影响。迁移时先移动原逻辑，不改变调度间隔。
- `index.tsx` props 胶水会短期偏多。优先建立边界，再在后续小步压缩 props。
