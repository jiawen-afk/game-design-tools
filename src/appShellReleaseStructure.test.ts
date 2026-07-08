import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { packageJsonSource, releaseWorkflowSource, viteConfigSource } from './appStructureTestHelpers.test'

test('release version strings are derived from package metadata instead of duplicated literals', () => {
  const mainSource = readFileSync('electron/main.cjs', 'utf8')
  const appUpdateIpcSource = readFileSync('electron/appUpdateIpcHandlers.cjs', 'utf8')
  const fallbackSource = readFileSync('src/components/useAppUpdateStatus.ts', 'utf8')
  const metadataSource = readFileSync('src/appReleaseMetadata.ts', 'utf8')
  const workflowSource = releaseWorkflowSource()
  const readmeSource = readFileSync('README.md', 'utf8')
  const chineseReadmeSource = readFileSync('README.zh-CN.md', 'utf8')

  assert.match(metadataSource, /import packageJson from '\.\.\/package\.json'/)
  assert.match(metadataSource, /export const appVersion = packageJson\.version/)
  assert.match(metadataSource, /export const appReleaseTag = 'windows-x64-latest'/)
  assert.doesNotMatch(metadataSource, /appVersion\}-windows-x64-latest/)
  assert.match(fallbackSource, /from '\.\.\/appReleaseMetadata'/)
  assert.match(fallbackSource, /currentVersion: appVersion/)
  assert.match(fallbackSource, /channel: appReleaseTag/)
  assert.match(appUpdateIpcSource, /function getPackageVersion\(\)/)
  assert.match(appUpdateIpcSource, /function getAppReleaseTag\(\)/)
  assert.doesNotMatch(`${mainSource}\n${appUpdateIpcSource}`, /v\d+\.\d+\.\d+-windows-x64-latest/)
  assert.doesNotMatch(`${mainSource}\n${appUpdateIpcSource}`, /getPackageVersion\(\)\}-windows-x64-latest/)
  assert.match(workflowSource, /\$package = Get-Content package\.json/)
  assert.match(workflowSource, /\$version = \$package\.version/)
  assert.match(workflowSource, /\$releaseTag = "windows-x64-latest"/)
  assert.doesNotMatch(workflowSource, /v\$version-windows-x64-latest/)
  assert.match(workflowSource, /\$productName = \$package\.build\.productName/)
  assert.match(workflowSource, /\$releaseProductName = \$productName -replace '\\s\+', '-'/)
  assert.match(workflowSource, /\$releaseUploadDir = New-Item -ItemType Directory/)
  assert.match(workflowSource, /\$artifacts = @\(/)
  assert.match(workflowSource, /\$files = \$artifacts \| ForEach-Object \{ \$_.Target \}/)
  assert.doesNotMatch(workflowSource, /0\.2\.0-x64/)
  assert.match(readmeSource, /Game Design Tools-\{version\}-x64-setup\.exe/)
  assert.match(chineseReadmeSource, /Game Design Tools-\{version\}-x64-setup\.exe/)
  assert.doesNotMatch(readmeSource, /Game Design Tools-\d+\.\d+\.\d+-x64/)
  assert.doesNotMatch(chineseReadmeSource, /Game Design Tools-\d+\.\d+\.\d+-x64/)
})

test('production build publishes only Windows desktop deployment scripts under /scripts', () => {
  const source = viteConfigSource()

  assert.match(source, /copyDeploymentScripts/)
  assert.match(source, /dist\/scripts/)
  assert.match(source, /deploy-voxcpm\.ps1/)
  assert.doesNotMatch(source, /deploy-voxcpm\.sh/)
})

test('production build uses relative asset paths for Electron file loading', () => {
  const source = viteConfigSource()

  assert.match(source, /base:\s*'\.\/'/)
})

test('production build splits chart dependencies instead of raising chunk warning limit', () => {
  const source = viteConfigSource()

  assert.match(source, /manualChunks\(id\)/)
  assert.match(source, /id\.includes\('\/echarts\/'\)/)
  assert.match(source, /id\.includes\('\/zrender\/'\)/)
  assert.match(source, /return 'chart-vendor'/)
  assert.doesNotMatch(source, /chunkSizeWarningLimit/)
})

test('Windows desktop package uses Electron with x64 installer and portable targets', () => {
  const pkg = JSON.parse(packageJsonSource())

  assert.equal(pkg.main, 'electron/main.cjs')
  assert.equal(pkg.scripts.dev, undefined)
  assert.equal(pkg.scripts.preview, undefined)
  assert.match(pkg.scripts['desktop:build:win'], /npm run build/)
  assert.match(pkg.scripts['desktop:build:win'], /electron-builder --win --x64/)
  assert.ok(pkg.devDependencies.electron)
  assert.ok(pkg.devDependencies['electron-builder'])
  assert.equal(pkg.build.appId, 'com.linjiawen.game-design-tools')
  assert.deepEqual(pkg.build.win.target.map((target: { target: string }) => target.target), ['nsis', 'portable', 'zip'])
  assert.match(pkg.build.artifactName, /\$\{arch\}/)
})

test('Windows desktop package includes CommonJS sources required by Electron runtime modules', () => {
  const pkg = JSON.parse(packageJsonSource())
  const packagedFiles = pkg.build.files.join('\n')
  const electronSchemaSources = [
    'electron/projectLocalSchema.cjs',
    'electron/projectRemoteSchema.cjs',
    'electron/projectSchemaAsset.cjs',
    'electron/projectSchemaCore.cjs',
    'electron/projectSchemaDocument.cjs',
  ].map((path) => readFileSync(path, 'utf8')).join('\n')

  assert.match(electronSchemaSources, /require\('\.\.\/src\/components\/ProjectStorage\/projectSchemaShared\.cjs'\)/)
  assert.match(packagedFiles, /src\/components\/ProjectStorage\/projectSchema\*Shared\.cjs/)
})
