# 游戏设计工具

游戏设计工具是一个面向 Windows 桌面端的游戏素材制作工作台。它把精灵图处理、图片清理、本地配音生成和按项目管理资产集中到同一个 Electron 应用里。

[English README](README.md)

## 当前版本

- 最新发布版本：`0.5.1`
- Windows x64 安装包通过 GitHub Releases 发布。
- 稳定自动更新通道使用 `windows-x64-latest` Release。

## 核心能力

- **项目空间**：按项目管理角色、剧情编排、公共图片、精灵图和配音资产。当前启用的项目会成为新增资产和元数据的保存目标。
- **本地与远程项目模式**：本地项目使用本地 SQLite 数据库和本地对象文件；远程项目必须同时配置远程数据库和七牛 Kodo 对象存储。
- **远程数据库支持**：支持配置并验证 PostgreSQL 或 MySQL 连接，初始化项目表结构，并把设备连接配置保留在当前电脑本地。
- **远程对象存储**：支持配置并验证七牛 Kodo。项目对象按项目维度生成对象 key。
- **远程资产缓存**：远程项目列表从数据库读取元数据和封面。打开图片、播放精灵图或音频时才按需下载完整资源，并按指纹缓存。
- **自动同步与失败重试**：项目变更会自动同步到远程存储。同步失败任务会常驻右下角状态浮窗，并可在浮窗中重试。
- **精灵图工作台**：导入多张图片、整张精灵图或视频片段，完成去背、统一画布、逐帧对齐、播放预览、批量高清化处理后图片、高清化前后并排播放、排序和导出；高清化开启时导出使用高清化图片作为源图，并重新应用流程 3 的画布、布局、描边和轮廓参数。
- **图片处理工作台**：上传单张图片，进行色键抠图、裁剪、预览，可选调用本地 Upscayl 运行包高清化，并导出常用图片格式。
- **配音工作台**：连接本地 VoxCPM Gradio 服务，通过文本或参考音频生成 WAV 配音，管理历史记录，并收藏到项目空间。
- **桌面 VoxCPM 支持**：检测 Windows 硬件环境，查询依赖安装状态，运行依赖安装脚本，启动、停止和重启本地 VoxCPM 服务。

## 目标平台

- Windows 10 / Windows 11
- x64
- VoxCPM 服务推荐使用 NVIDIA GPU
- 图片和精灵图高清化使用本地 Upscayl 运行包的 GPU 加速
- VoxCPM 依赖安装流程要求 Python 3.12

## 安装使用

从 [GitHub Releases 页面](https://github.com/jiawen-afk/game-design-tools/releases) 下载 Windows x64 包，根据使用习惯选择：

- `Game Design Tools-{version}-x64-setup.exe`：安装版，可创建开始菜单和桌面快捷方式
- `Game Design Tools-{version}-x64-portable.exe`：便携版
- `Game Design Tools-{version}-x64-win.zip`：压缩包版

## 首次使用

1. 打开 **项目空间**，授权一个本地资源目录。
2. 使用默认本地项目，或进入项目管理创建新的本地项目/远程项目。
3. 远程项目必须配置并验证：
   - PostgreSQL 或 MySQL 数据库配置
   - 七牛 Kodo 对象存储配置
4. 创建或迁移远程项目前，先初始化远程数据库表结构。
5. 在项目卡片中使用 **启用** 开关，将某个项目设为当前保存目标。

远程项目面向多设备协作。数据库和 Kodo 连接配置保存在每台设备本地；项目数据本身保存在共享的远程数据库和对象存储中。

## 工作台

- **项目空间**：角色资产、肖像、精灵图、配音、剧情组、公共素材、项目设置和项目切换。
- **精灵图工作台**：去背、帧对齐、精灵图预览、帧排序、批量高清化预览、高清化前后并排播放，以及原始或高清化导出。
- **图片处理工作台**：单图清理、裁剪、抠图、可选 Upscayl 高清化流程和导出。
- **配音工作台**：VoxCPM 安装检测、本地 Gradio 服务控制、配音生成、历史记录和收藏到项目资产。

## 项目存储模型

- 本地模式使用本地 SQLite 项目数据库和本地对象文件。
- 远程模式必须同时具备远程数据库和七牛 Kodo。
- 支持本地项目迁移到远程项目；第一版不支持远程迁移回本地。
- 项目、角色、剧情、资产和资产分组删除均为硬删除。
- 远程资产读取通过项目资产管理器和缓存层完成。列表视图不应提前下载完整资源。

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

构建产物输出到：

```text
../game-design-tools-windows-x64
```

本地打包主要用于诊断。正式发布优先使用 GitHub Actions 构建。

## 发布流程

推荐发布流程：

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

工作流成功后验证：

```powershell
gh release view vX.Y.Z --repo jiawen-afk/game-design-tools
gh release view windows-x64-latest --repo jiawen-afk/game-design-tools
(Invoke-RestMethod "https://github.com/jiawen-afk/game-design-tools/releases/download/windows-x64-latest/latest.yml") -split "`n" | Select-Object -First 12
```

`latest.yml` 必须指向已发布版本。

## 项目结构

- `src/components/MultiFrameSpriteWorkspace`：精灵图、视频帧、抠图、布局、播放、批量高清化预览和导出流程
- `src/components/ImageProcessingWorkspace`：单图清理、裁剪、抠图、超分和导出流程
- `src/components/VoiceDeploymentWorkspace`：VoxCPM 安装检测、服务控制、配音生成、历史记录和项目收藏流程
- `src/components/PersonalSpaceWorkspace`：项目空间 UI、项目管理、角色、剧情编排、素材、设置、远程同步状态和项目数据编排
- `src/components/ProjectStorage`：项目数据库模型、本地/远程仓储、对象存储、迁移、资产缓存和项目资产管理器
- `electron`：桌面壳、IPC 处理、本地 SQLite 桥接、远程数据库桥接、七牛 Kodo 桥接和安全 preload bridge
- `scripts`：Windows VoxCPM 部署和服务管理脚本

## 发布前验证

发布或声明改动完成前运行：

```powershell
npm test
npm run build
git diff --check
```

## 仓库地址

GitHub: https://github.com/jiawen-afk/game-design-tools
