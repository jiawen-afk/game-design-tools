import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { appSource, readSources } from './appStructureTestHelpers.test'

test('home page shows tool details directly instead of hiding them in a popover', () => {
  const source = appSource()

  assert.doesNotMatch(source, /Popover/)
  assert.match(source, /tool\.details/)
  assert.match(source, /tool\.shortcut/)
  assert.match(source, /tool\.output/)
})

test('home page exposes renamed workspaces and global project space', () => {
  const source = [
    appSource(),
    readFileSync('src/appNavigation.ts', 'utf8'),
    readFileSync('src/components/MultiFrameSpriteWorkspace/WorkspaceShell.tsx', 'utf8'),
    readFileSync('src/components/ImageProcessingWorkspace/index.tsx', 'utf8'),
    readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8'),
  ].join('\n')

  assert.match(source, /精灵图工作台/)
  assert.match(source, /图片处理工作台/)
  assert.match(source, /配音工作台/)
  assert.match(source, /项目空间/)
  assert.doesNotMatch(source, /多图动作精灵工作台/)
  assert.doesNotMatch(source, /游戏角色语音工作台/)
})

test('home page exposes image processing workspace as a first-class tool', () => {
  const source = appSource()
  const navigationSource = existsSync('src/appNavigation.ts') ? readFileSync('src/appNavigation.ts', 'utf8') : ''

  assert.match(source, /const ImageProcessingWorkspace = lazy\(\(\) => import\('\.\/components\/ImageProcessingWorkspace'\)\)/)
  assert.match(navigationSource, /export type ToolId = 'multi-frame-sprite' \| 'image-processing' \| 'voice-deployment'/)
  assert.match(navigationSource, /图片处理工作台/)
  assert.match(navigationSource, /单张图片上传、色键抠图、裁剪预览并导出常用图片格式。/)
  assert.match(source, /activeSurface === 'image-processing'\s*\?\s*<ImageProcessingWorkspace \/>/)
  assert.match(navigationSource, /export const personalSpaceShortcut = '4'/)
})

test('personal space is global navigation instead of a tool list item', () => {
  const source = appSource()
  const navigationSource = existsSync('src/appNavigation.ts') ? readFileSync('src/appNavigation.ts', 'utf8') : ''

  assert.match(navigationSource, /export type ToolId = 'multi-frame-sprite' \| 'image-processing' \| 'voice-deployment'/)
  assert.match(navigationSource, /export type ActiveSurface = ToolId \| 'personal-space'/)
  assert.doesNotMatch(navigationSource, /id: 'personal-space'/)
  assert.match(source, /打开项目空间/)
  assert.match(source, /项目工作台/)
  assert.doesNotMatch(source, /activeSurface === 'personal-space' \? '项目管理'/)
  assert.match(source, /personalSpaceShortcut/)
  assert.match(source, /event\.key === personalSpaceShortcut/)
  assert.match(source, /<kbd>\{personalSpaceShortcut\}<\/kbd>/)
})

test('app shell exposes project space instead of personal space copy', () => {
  const source = appSource()
  const workspaceSource = readSources([
    'src/components/PersonalSpaceWorkspace/index.tsx',
    'src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx',
    'src/components/PersonalSpaceWorkspace/ProjectManagementSurface.tsx',
  ])
  const managementSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx', 'utf8')
  const managementTabsSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementTabs.tsx', 'utf8')
  const projectDetailsCardSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectDetailsCard.tsx', 'utf8')
  const managementSurfaceSource = [managementSource, managementTabsSource, projectDetailsCardSource].join('\n')
  const settingsSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx', 'utf8')
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const personalSpaceIpcSource = readFileSync('electron/personalSpaceIpcHandlers.cjs', 'utf8')

  assert.match(source, /项目空间/)
  assert.match(source, /打开项目空间/)
  assert.doesNotMatch(source, /打开个人空间/)
  assert.match(workspaceSource, /项目空间/)
  assert.match(workspaceSource, /ProjectManagementPanel/)
  assert.match(workspaceSource, /切换项目空间/)
  assert.match(workspaceSource, /当前项目/)
  assert.doesNotMatch(workspaceSource, /projectSelector/)
  assert.match(managementSurfaceSource, /创建项目/)
  assert.match(managementSurfaceSource, /编辑项目/)
  assert.match(managementSurfaceSource, /删除项目/)
  assert.match(managementSurfaceSource, /本地模式/)
  assert.match(settingsSource, /资源存储目录/)
  assert.doesNotMatch(settingsSource, /创建项目/)
  assert.doesNotMatch(mainSource, /个人空间资源目录/)
  assert.doesNotMatch(personalSpaceIpcSource, /个人空间资源目录/)
  assert.doesNotMatch(personalSpaceIpcSource, /请先在个人空间中选择资源目录/)
  assert.match(personalSpaceIpcSource, /项目空间资源目录/)
})

test('app shell delegates current project space label refresh to a focused hook', () => {
  const source = appSource()
  const hookPath = 'src/useCurrentProjectSpaceLabel.ts'

  assert.ok(existsSync(hookPath), 'current project space label hook should exist')
  const hookSource = readFileSync(hookPath, 'utf8')

  assert.match(source, /from '\.\/useCurrentProjectSpaceLabel'/)
  assert.match(source, /useCurrentProjectSpaceLabel\(activeSurface\)/)
  assert.doesNotMatch(source, /createProjectWorkspaceBootstrapper/)
  assert.doesNotMatch(source, /readActiveProjectId/)
  assert.doesNotMatch(source, /resolveEnabledProjectId/)
  assert.match(hookSource, /export function useCurrentProjectSpaceLabel/)
  assert.match(hookSource, /createProjectWorkspaceBootstrapper/)
  assert.match(hookSource, /readActiveProjectId/)
  assert.match(hookSource, /resolveEnabledProjectId/)
  assert.match(hookSource, /window\.addEventListener\('focus'/)
  assert.match(hookSource, /window\.addEventListener\('storage'/)
})

test('desktop shortcuts open tools and ignore editable targets', () => {
  const source = appSource()
  const navigationSource = existsSync('src/appNavigation.ts') ? readFileSync('src/appNavigation.ts', 'utf8') : ''

  assert.match(source, /isEditableShortcutTarget/)
  assert.match(source, /event\.key === tool\.shortcut/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(navigationSource, /HTMLInputElement/)
  assert.match(navigationSource, /HTMLTextAreaElement/)
  assert.match(navigationSource, /isContentEditable/)
})

test('app shell delegates navigation metadata and shortcut helpers', () => {
  const source = appSource()
  const navigationPath = 'src/appNavigation.ts'
  const navigationSource = existsSync(navigationPath) ? readFileSync(navigationPath, 'utf8') : ''

  assert.ok(existsSync(navigationPath), 'app navigation helper should exist')
  assert.match(source, /from '\.\/appNavigation'/)
  assert.match(source, /tools\.map/)
  assert.match(source, /getToolCategoryLabel\(tool\.id\)/)
  assert.match(source, /isEditableShortcutTarget\(event\.target\)/)
  assert.doesNotMatch(source, /const tools: Array/)
  assert.doesNotMatch(source, /function isEditableShortcutTarget/)
  assert.match(navigationSource, /export const tools/)
  assert.match(navigationSource, /export function getToolCategoryLabel/)
  assert.match(navigationSource, /export function isEditableShortcutTarget/)
})

test('app shell labels the project space entry directly and shows current project space', () => {
  const source = appSource()
  const projectLabelHookSource = readFileSync('src/useCurrentProjectSpaceLabel.ts', 'utf8')
  const workspaceShellStart = source.indexOf('if (activeSurface !== null)')
  const workspaceShellSource = source.slice(workspaceShellStart, source.indexOf('<main className="tool-surface">', workspaceShellStart))

  assert.notEqual(workspaceShellStart, -1)
  assert.match(workspaceShellSource, /className="topbar-current-project"/)
  assert.match(workspaceShellSource, /当前项目空间/)
  assert.match(source, /useCurrentProjectSpaceLabel\(activeSurface\)/)
  assert.match(projectLabelHookSource, /readActiveProjectId/)
  assert.doesNotMatch(workspaceShellSource, /打开项目空间/)
  assert.match(workspaceShellSource, />\s*项目空间\s*</)
})

test('app shell exposes generic knowledge base UI without shj-specific fields', () => {
  const source = [
    appSource(),
    readFileSync('src/components/DocumentWorkspace/DocumentHomeKnowledgeSection.tsx', 'utf8'),
  ].join('\n')

  assert.match(source, /知识库/)
  assert.doesNotMatch(source, /山海经|term_record|category_paths|site_relation|source_kind/)
})

test('app shell keeps workspace loading visible and recovers from workspace render errors', () => {
  const source = appSource()
  const boundaryPath = 'src/AppWorkspaceBoundary.tsx'
  const shellStyleSource = readFileSync('src/styles/app.shell.css', 'utf8')

  assert.ok(existsSync(boundaryPath), 'app workspace boundary should exist')
  const boundarySource = readFileSync(boundaryPath, 'utf8')

  assert.doesNotMatch(source, /<Suspense\s+fallback=\{null\}/)
  assert.match(source, /from '\.\/AppWorkspaceBoundary'/)
  assert.doesNotMatch(source, /class AppWorkspaceErrorBoundary extends Component/)
  assert.match(boundarySource, /class AppWorkspaceErrorBoundary extends Component/)
  assert.match(boundarySource, /getDerivedStateFromError/)
  assert.match(boundarySource, /componentDidCatch/)
  assert.match(boundarySource, /errorInfo/)
  assert.match(boundarySource, /错误类型/)
  assert.match(boundarySource, /错误消息/)
  assert.match(boundarySource, /JavaScript Stack/)
  assert.match(boundarySource, /React Component Stack/)
  assert.match(shellStyleSource, /workspace-error-details/)
  assert.match(shellStyleSource, /white-space:\s*pre-wrap/)
  assert.match(boundarySource, /工作台加载失败/)
  assert.match(boundarySource, /重新加载工作台/)
  assert.match(boundarySource, /返回工具列表/)
  assert.match(boundarySource, /className="workspace-loading"/)
  assert.match(source, /<AppWorkspaceErrorBoundary[\s\S]*onBack=\{\(\) => setActiveSurface\(null\)\}/)
  assert.match(source, /<Suspense fallback=\{<WorkspaceLoadingFallback \/>\}/)
})
