import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { appSource, indexHtmlSource, openSourceSoftwareSource, packageJsonSource, siteFooterSource } from './appStructureTestHelpers.test'

test('site footer is app-only and does not load web telemetry or filing content', () => {
  const source = siteFooterSource()
  const html = indexHtmlSource()

  assert.doesNotMatch(html, /busuanzi/i)
  assert.doesNotMatch(source, /busuanzi/i)
  assert.doesNotMatch(source, /使用人数/)
  assert.doesNotMatch(source, /浙ICP备/)
})

test('site footer exposes an about dialog with the project open source software list', () => {
  const source = appSource()
  const footerSource = siteFooterSource()
  const softwareSource = openSourceSoftwareSource()

  assert.match(source, /from '\.\/components\/SiteFooter'/)
  assert.doesNotMatch(source, /function SiteFooter/)
  assert.match(footerSource, /关于/)
  assert.match(footerSource, /GithubOutlined/)
  assert.match(footerSource, /https:\/\/github\.com\/jiawen-afk\/game-design-tools/)
  assert.match(footerSource, /target="_blank"/)
  assert.match(footerSource, /rel="noreferrer"/)
  assert.match(footerSource, /<Modal/)
  assert.match(footerSource, /openSourceSoftware/)
  assert.match(footerSource, /open-source-list/)
  assert.match(softwareSource, /export const openSourceSoftware/)
  assert.match(softwareSource, /export const openSourceSoftwareCategories/)
  assert.match(softwareSource, /licenses:/)
  for (const name of [
    'Upscayl',
    'NCNN',
    'FFmpeg',
    'libwebp',
    'oxipng',
    'BiRefNet',
    'VoxCPM',
    'Gradio',
    'Stable Audio 3',
    'PyTorch',
    'Hugging Face Hub',
    'React',
    'React DOM',
    'Ant Design',
    'Ant Design Icons',
    'Apache ECharts',
    'WaveSurfer',
    'JSZip',
    'Electron Updater',
    'sql.js',
    'mysql2',
    'node-postgres',
    'Qiniu Node.js SDK',
    'yauzl',
    'Vite',
    'Vite React Plugin',
    'TypeScript',
    'tsx',
    'Electron',
    'Electron Builder',
  ]) {
    assert.match(softwareSource, new RegExp(name))
  }
  for (const license of [
    'MIT',
    'Apache-2.0',
    'BSD-3-Clause',
    'AGPL-3.0-only',
    'LGPL-2.1-or-later',
    'Stability AI Community License',
    'Gemma Terms of Use',
  ]) {
    assert.match(softwareSource, new RegExp(license))
  }
  assert.match(footerSource, /open-source-category/)
  assert.match(footerSource, /open-source-license/)
  assert.match(footerSource, /license\.url/)
  assert.match(footerSource, /license\.name/)
  assert.doesNotMatch(softwareSource, /Busuanzi/)
  assert.match(softwareSource, /https:\/\/github\.com\/OpenBMB\/VoxCPM/)
})

test('desktop client exposes version and auto update controls through the footer', () => {
  const footerSource = siteFooterSource()
  const desktopAppUpdateApiSource = readFileSync('src/desktopAppUpdateApi.ts', 'utf8')
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const appUpdateIpcSource = readFileSync('electron/appUpdateIpcHandlers.cjs', 'utf8')
  const packageSource = packageJsonSource()

  assert.match(packageSource, /"electron-updater"/)
  assert.match(mainSource, /registerAppUpdateIpcHandlers/)
  assert.match(appUpdateIpcSource, /autoUpdater/)
  assert.match(appUpdateIpcSource, /app-update:get-status/)
  assert.match(appUpdateIpcSource, /app-update:check/)
  assert.match(appUpdateIpcSource, /app-update:install/)
  assert.match(appUpdateIpcSource, /app-update:status/)
  assert.match(mainSource, /screen/)
  assert.match(mainSource, /getPrimaryDisplay\(\)\.workAreaSize/)
  assert.match(mainSource, /Math\.max\(1600,\s*Math\.min\(1600,\s*workAreaSize\.width - 48\)\)/)
  assert.match(mainSource, /Math\.max\(1000,\s*Math\.min\(1000,\s*workAreaSize\.height - 48\)\)/)
  assert.doesNotMatch(mainSource, /minWidth:\s*1600/)
  assert.doesNotMatch(mainSource, /minHeight:\s*1000/)
  assert.match(appUpdateIpcSource, /getAppReleaseTag\(\)/)
  assert.match(appUpdateIpcSource, /provider:\s*'generic'/)
  assert.match(appUpdateIpcSource, /releases\/download\/\$\{appUpdateStatus\.channel\}/)
  assert.match(appUpdateIpcSource, /return 'windows-x64-latest'/)
  assert.match(preloadSource, /getAppUpdateStatus/)
  assert.match(preloadSource, /checkForAppUpdates/)
  assert.match(preloadSource, /installAppUpdate/)
  assert.match(preloadSource, /onAppUpdateStatus/)
  assert.match(desktopAppUpdateApiSource, /DesktopAppUpdateStatus/)
  assert.match(desktopAppUpdateApiSource, /getAppUpdateStatus/)
  assert.match(desktopAppUpdateApiSource, /checkForAppUpdates/)
  assert.match(desktopAppUpdateApiSource, /installAppUpdate/)
  assert.match(desktopAppUpdateApiSource, /onAppUpdateStatus/)
  assert.match(footerSource, /当前版本/)
  assert.match(footerSource, /检查更新/)
  assert.match(footerSource, /立即重启安装/)
  assert.match(footerSource, /useAppUpdateStatus/)
  assert.match(footerSource, /downloadPercent\}%/)
  assert.doesNotMatch(appUpdateIpcSource, /正在下载更新 \$\{Math\.round\(percent\)\}%。/)
})

test('bilingual readmes describe the 0.7.0 runtime and Godot workflows', () => {
  const englishReadme = readFileSync('README.md', 'utf8')
  const chineseReadme = readFileSync('README.zh-CN.md', 'utf8')

  for (const source of [englishReadme, chineseReadme]) {
    assert.match(source, /0\.7\.0/)
    assert.match(source, /Upscayl/)
    assert.match(source, /FFmpeg/)
    assert.match(source, /FFprobe/)
    assert.match(source, /BiRefNet/)
    assert.match(source, /VoxCPM/)
    assert.match(source, /Stable Audio 3/)
    assert.match(source, /Godot 4\.6/)
    assert.match(source, /package-lock\.json/)
  }
})
