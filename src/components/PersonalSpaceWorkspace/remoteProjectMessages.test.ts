import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatRemoteProjectListError,
  formatRemoteProjectReadError,
} from './remoteProjectMessages'
import {
  formatCurrentProjectSpaceSyncWarning,
  showCurrentProjectSpaceSyncWarning,
} from './projectSpacePersistenceMessages'

test('remote project read error replaces project id with project name', () => {
  const message = formatRemoteProjectReadError(
    new Error('项目 mqqnacr9_35nbizeh9p 缺少远程数据库配置，请在项目管理中重新保存远程数据库连接。'),
    { id: 'mqqnacr9_35nbizeh9p', name: '默认项目' },
  )

  assert.equal(message, '项目“默认项目”缺少远程数据库配置，请在项目管理中重新保存远程数据库连接。')
})

test('remote project read error preserves unrelated messages without Error prefix', () => {
  const message = formatRemoteProjectReadError(
    'Error: 远程数据库连接超时',
    { id: 'p1', name: '默认项目' },
  )

  assert.equal(message, '远程数据库连接超时')
})

test('remote project list error has a shared prefix and strips Error prefix', () => {
  assert.equal(
    formatRemoteProjectListError(new Error('连接失败')),
    '无法读取远程项目列表：连接失败',
  )
  assert.equal(
    formatRemoteProjectListError('Error: 数据库配置不存在'),
    '无法读取远程项目列表：数据库配置不存在',
  )
})

test('project space sync warning formats unknown errors consistently', () => {
  assert.equal(
    formatCurrentProjectSpaceSyncWarning(new Error('远程数据库断开')),
    '已保存到本地项目缓存，但同步项目存储失败：远程数据库断开',
  )
  assert.equal(
    formatCurrentProjectSpaceSyncWarning('Kodo 上传失败'),
    '已保存到本地项目缓存，但同步项目存储失败：Kodo 上传失败',
  )
})

test('project space sync warning delegates to the provided message api', () => {
  const warnings: string[] = []
  const result = showCurrentProjectSpaceSyncWarning({
    warning(content) {
      warnings.push(content)
      return 'shown'
    },
  }, new Error('对象存储配置缺失'))

  assert.equal(result, 'shown')
  assert.deepEqual(warnings, ['已保存到本地项目缓存，但同步项目存储失败：对象存储配置缺失'])
})
