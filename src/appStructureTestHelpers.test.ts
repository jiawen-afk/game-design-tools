import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const appSource = () => readFileSync('src/App.tsx', 'utf8')
export const viteConfigSource = () => readFileSync('vite.config.ts', 'utf8')
export const indexHtmlSource = () => readFileSync('index.html', 'utf8')
export const siteFooterSource = () => readFileSync('src/components/SiteFooter.tsx', 'utf8')
export const openSourceSoftwareSource = () => readFileSync('src/openSourceSoftware.ts', 'utf8')
export const packageJsonSource = () => readFileSync('package.json', 'utf8')
export const appToastProviderSource = () => readFileSync('src/components/AppToastProvider.tsx', 'utf8')
export const releaseWorkflowSource = () => readFileSync('.github/workflows/windows-release.yml', 'utf8')

function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}

function listSourceFiles(root: string): string[] {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return listSourceFiles(path)
    return /\.(ts|tsx|cjs)$/.test(entry.name) ? [normalizePath(path)] : []
  })
}

export function productionSourceFiles(root: string): string[] {
  return listSourceFiles(root).filter((path) => !/\.test\.(ts|tsx|cjs)$/.test(path))
}

export function readSources(paths: string[]) {
  return paths.map((path) => readFileSync(path, 'utf8')).join('\n')
}

export function readSourceIfExists(path: string) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

export function testNamePattern(name: string) {
  return new RegExp("test\\('" + name)
}

export function assertFocusedStructureFiles(paths: string[], packageSource = packageJsonSource()) {
  for (const path of paths) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }
}

export const appStyleEntryPath = 'src/styles/app.css'
export const appStyleModulePaths = [
  'src/styles/app.base.css',
  'src/styles/app.home.css',
  'src/styles/app.tools.css',
  'src/styles/app.footer.css',
  'src/styles/app.shell.css',
  'src/styles/app.toast.css',
  'src/styles/app.responsive.css',
]

export function appStyleSources() {
  return readSources([appStyleEntryPath, ...appStyleModulePaths.filter((path) => existsSync(path))])
}

export const documentWorkspaceStyleEntryPath = 'src/components/DocumentWorkspace/documentWorkspace.css'
export const documentWorkspaceStyleModulePaths = [
  'src/components/DocumentWorkspace/documentWorkspace.base.css',
  'src/components/DocumentWorkspace/documentWorkspace.collection.css',
  'src/components/DocumentWorkspace/documentWorkspace.graphLayout.css',
  'src/components/DocumentWorkspace/documentWorkspace.filters.css',
  'src/components/DocumentWorkspace/documentWorkspace.canvas.css',
  'src/components/DocumentWorkspace/documentWorkspace.details.css',
  'src/components/DocumentWorkspace/documentWorkspace.browser.css',
  'src/components/DocumentWorkspace/documentWorkspace.responsive.css',
]

export const voiceDeploymentStyleEntryPath = 'src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css'
export const voiceDeploymentStyleModulePaths = [
  'src/components/VoiceDeploymentWorkspace/voiceDeployment.base.css',
  'src/components/VoiceDeploymentWorkspace/voiceDeployment.setup.css',
  'src/components/VoiceDeploymentWorkspace/voiceDeployment.generator.css',
  'src/components/VoiceDeploymentWorkspace/voiceDeployment.characters.css',
  'src/components/VoiceDeploymentWorkspace/voiceDeployment.library.css',
  'src/components/VoiceDeploymentWorkspace/voiceDeployment.responsive.css',
]

export const imageProcessingStyleEntryPath = 'src/components/ImageProcessingWorkspace/workspace.css'
export const imageProcessingStyleModulePaths = [
  'src/components/ImageProcessingWorkspace/imageProcessing.base.css',
  'src/components/ImageProcessingWorkspace/imageProcessing.upload.css',
  'src/components/ImageProcessingWorkspace/imageProcessing.controls.css',
  'src/components/ImageProcessingWorkspace/imageProcessing.preview.css',
  'src/components/ImageProcessingWorkspace/imageProcessing.upscale.css',
  'src/components/ImageProcessingWorkspace/imageProcessing.cropOverlay.css',
  'src/components/ImageProcessingWorkspace/imageProcessing.responsive.css',
]

export function imageProcessingStyleSources() {
  return readSources([imageProcessingStyleEntryPath, ...imageProcessingStyleModulePaths.filter((path) => existsSync(path))])
}

export const spriteWorkspaceStyleEntryPath = 'src/components/MultiFrameSpriteWorkspace/workspace.css'
export const spriteWorkspaceStyleModulePaths = [
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.videoLayout.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.upload.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.video.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.matte.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.upscale.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.playback.css',
  'src/components/MultiFrameSpriteWorkspace/spriteWorkspace.responsive.css',
]

export function spriteWorkspaceStyleSources() {
  return readSources([spriteWorkspaceStyleEntryPath, ...spriteWorkspaceStyleModulePaths.filter((path) => existsSync(path))])
}

const projectStorageIpcModulePaths = [
  'electron/projectStorageIpcHandlers.cjs',
  'electron/projectStorageIpcContext.cjs',
  'electron/projectProfileIpcHandlers.cjs',
  'electron/projectLocalRepositoryIpcHandlers.cjs',
  'electron/projectRemoteRepositoryIpcHandlers.cjs',
  'electron/projectObjectIpcHandlers.cjs',
]

export function projectStorageIpcSources() {
  return readSources(projectStorageIpcModulePaths.filter((path) => existsSync(path)))
}
