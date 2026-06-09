# 游戏设计工具

游戏设计工具是一个面向 Windows 桌面端的本地素材制作工作台。它把精灵图处理、本地配音生成、个人空间资产管理放到同一个 Electron 应用里，减少浏览器权限和 Web 环境限制，让素材、目录授权和本地 VoxCPM 服务管理都留在电脑上完成。

[English README](README.md)

## 核心能力

- **精灵图工作台**：导入多张图片、整张精灵图或视频片段，完成去背、统一画布、逐帧对齐、播放预览、排序和导出。
- **配音工作台**：连接本地 VoxCPM Gradio 服务，通过文本和参考音频生成 WAV 配音，管理历史记录，并收藏到个人空间。
- **个人空间**：集中管理角色、剧情编排、公共图片、精灵图和配音资产，支持本地目录授权和资源归档。
- **桌面 VoxCPM 支持**：检测硬件环境，查询依赖安装状态，运行依赖安装脚本，启动、停止和重启本地 VoxCPM 服务。
- **Windows 安装包**：使用 Electron Builder 构建 Windows 10/11 x64 安装版、便携版和 zip 包。

## 目标平台

- Windows 10 / Windows 11
- x64
- VoxCPM 服务推荐使用 NVIDIA GPU
- VoxCPM 依赖安装流程要求 Python 3.12

## 安装使用

从 GitHub Releases 下载 Windows x64 包，根据使用习惯选择：

- `Game Design Tools-0.1.0-x64-setup.exe`：安装版，可创建开始菜单和桌面快捷方式
- `Game Design Tools-0.1.0-x64-portable.exe`：便携版
- `Game Design Tools-0.1.0-x64-win.zip`：压缩包版

首次使用建议：

1. 打开个人空间，授权一个本地资源目录。
2. 使用精灵图工作台整理并导出 sprite sheet，或收藏到个人空间。
3. 使用配音工作台检测本机环境，安装 VoxCPM 依赖并启动本地服务。
4. 将生成的配音、精灵图和角色、剧情编排建立关联。

## 本地开发

```powershell
npm install
npm test
npm run build
npm run desktop:dev
```

## 构建 Windows 安装包

```powershell
npm run desktop:build:win
```

构建产物输出到：

```text
../game-design-tools-windows-x64
```

## 项目结构

- `src/components/MultiFrameSpriteWorkspace`：精灵图、视频帧、抠图、布局、播放和导出流程
- `src/components/VoiceDeploymentWorkspace`：VoxCPM 安装检测、服务控制、配音生成和收藏流程
- `src/components/PersonalSpaceWorkspace`：角色、剧情编排和资产管理
- `electron`：桌面壳和安全 preload bridge
- `scripts`：Windows VoxCPM 部署和服务管理脚本

## 发布前验证

```powershell
npm test
npm run build
git diff --check
```

## 仓库地址

GitHub: https://github.com/jiawen-afk/game-design-tools
