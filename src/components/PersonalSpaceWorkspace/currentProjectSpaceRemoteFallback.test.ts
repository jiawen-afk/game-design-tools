import test from 'node:test'
import assert from 'node:assert/strict'

import { loadProjectSpaceStateFromStorage } from './currentProjectSpacePersistence'
import { createPersonalSpaceAsset, defaultPersonalSpaceState } from './personalSpaceModel'
import { writeProjectSpaceState } from './projectSpaceState'
import { createMemoryStorage } from './currentProjectSpacePersistenceTestHelpers.test'

test('project space loader returns cached remote state and named warning when remote export fails', async () => {
  const storage = createMemoryStorage()
  const cachedAsset = createPersonalSpaceAsset({ kind: 'voice', name: 'cached.wav' })
  writeProjectSpaceState('p1', { ...defaultPersonalSpaceState, assets: [cachedAsset] }, storage)

  const warnings: string[] = []
  const result = await loadProjectSpaceStateFromStorage({
    projectId: 'p1',
    project: {
      id: 'p1',
      name: '山海再就业',
      description: '',
      mode: 'remote',
      status: 'active',
      object_key_prefix: 'objects/山海再就业',
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
      metadata_json: null,
    },
    fallbackState: defaultPersonalSpaceState,
    storage,
    remoteRepository: {
      exportProjectRows: async () => {
        throw new Error('项目 p1 缺少远程数据库配置，请在项目管理中重新保存远程数据库连接。')
      },
    },
    localRepository: {
      importProjectRows: async () => {},
      exportProjectRows: async () => null,
    },
    onRemoteProjectLoaded: () => {},
    onWarning: (message) => warnings.push(message),
  })

  assert.deepEqual(result?.assets.map((asset) => asset.name), ['cached.wav'])
  assert.deepEqual(warnings, [
    '远程项目数据读取失败，已使用本地项目缓存：项目“山海再就业”缺少远程数据库配置，请在项目管理中重新保存远程数据库连接。',
  ])
})
