import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('desktop remote project repository proxy tests stay split by responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectRemoteRepositoryProxy.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ProjectStorage/projectRemoteRepositoryProxyProject.test.ts',
    'src/components/ProjectStorage/projectRemoteRepositoryProxyDocument.test.ts',
    'src/components/ProjectStorage/projectRemoteRepositoryProxyProfile.test.ts',
    'src/components/ProjectStorage/projectRemoteRepositoryProxyMissingProfile.test.ts',
    'src/components/ProjectStorage/projectRemoteRepositoryProxyErrors.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectRemoteRepositoryProxy.test.ts should only keep split guards')
  for (const delegatedToken of [
    'listRemote' + 'Projects',
    'replaceRemote' + 'DocumentGraph',
    'current-device' + '-db',
    '缺少远程' + '数据库配置',
    '远程数据库' + '连接失败',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
