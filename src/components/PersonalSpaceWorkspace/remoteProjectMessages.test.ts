import test from 'node:test'
import assert from 'node:assert/strict'

import { formatRemoteProjectReadError } from './remoteProjectMessages'

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
