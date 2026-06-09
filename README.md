# Game Design Tools

Game Design Tools is a Windows desktop workbench for game asset production. It brings sprite preparation, local voice generation, and personal asset management into one Electron app so creators can work with local files and local services without browser-only limits.

[中文文档](README.zh-CN.md)

## Highlights

- **Sprite workbench**: import image batches, sprite sheets, or video clips, remove backgrounds, align frames on a shared canvas, preview playback, sort frames, and export a `sprite.png` plus `index.json` package.
- **Voice workbench**: connect to a local VoxCPM Gradio service, generate WAV voice assets from text, clone from reference audio, manage voice history, and collect generated audio into personal space.
- **Personal space**: manage characters, storyboards, public images, sprite assets, and voice assets with local directory authorization.
- **Desktop VoxCPM support**: detect Windows hardware, query dependency installation, run dependency setup, start, stop, and restart the local VoxCPM service from the app.
- **Windows app packaging**: builds Windows 10/11 x64 installers, portable packages, and zip archives with Electron Builder.

## Target Platform

- Windows 10 / Windows 11
- x64
- NVIDIA GPU recommended for VoxCPM service acceleration
- Python 3.12 is required by the VoxCPM dependency setup flow

## Install

Download the Windows x64 package from the GitHub Releases page, then choose one of the generated artifacts:

- `Game Design Tools-0.1.0-x64-setup.exe`: installer with Start Menu and desktop shortcut options
- `Game Design Tools-0.1.0-x64-portable.exe`: portable app
- `Game Design Tools-0.1.0-x64-win.zip`: zipped desktop app

## Local Development

```powershell
npm install
npm test
npm run build
npm run desktop:dev
```

## Build Windows Packages

```powershell
npm run desktop:build:win
```

Artifacts are written to:

```text
../game-design-tools-windows-x64
```

## Project Structure

- `src/components/MultiFrameSpriteWorkspace`: sprite sheet, video frame, matte, layout, playback, and export workflows
- `src/components/VoiceDeploymentWorkspace`: VoxCPM setup, service control, voice generation, and voice collection workflows
- `src/components/PersonalSpaceWorkspace`: character, storyboard, and asset management
- `electron`: desktop shell and hardened preload bridge
- `scripts`: Windows VoxCPM deployment and service scripts

## Verification

Before publishing a package, run:

```powershell
npm test
npm run build
git diff --check
```

## Repository

GitHub: https://github.com/jiawen-afk/game-design-tools
