import assert from 'node:assert/strict'
import test from 'node:test'

import { createProjectRemoteSyncQueue } from './useProjectRemoteSync'
import type { Project } from '../ProjectStorage'
import {
  countPendingUploadAssets,
  createEmptyProjectRemoteSyncStatus,
  removePendingProjectRemoteSyncTask,
  shouldShowProjectRemoteSyncStatus,
  upsertProjectRemoteSyncTask,
} from './projectRemoteSyncStatusModel'
import { createPersonalSpaceAsset, defaultPersonalSpaceState } from './personalSpaceModel'

function remoteProject(id: string, name: string): Project {
  return {
    id,
    name,
    description: '',
    mode: 'remote',
    status: 'active',
    object_key_prefix: `objects/${name}`,
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    metadata_json: null,
  }
}

test('remote sync queue preserves pending states per project when switching before debounce flush', () => {
  const queue = createProjectRemoteSyncQueue<{ marker: string }>()
  const alpha = remoteProject('project-alpha', '山海再就业')
  const beta = remoteProject('project-beta', '默认项目')

  queue.enqueue(alpha, { marker: 'alpha-edited' })
  queue.enqueue(beta, { marker: 'beta-loaded' })

  const drained = queue.drain()

  assert.deepEqual(
    drained.map((entry) => [entry.project.id, entry.state.marker]),
    [
      ['project-alpha', 'alpha-edited'],
      ['project-beta', 'beta-loaded'],
    ],
  )
})

test('remote sync queue keeps only the latest pending state for the same project', () => {
  const queue = createProjectRemoteSyncQueue<{ marker: string }>()
  const project = remoteProject('project-alpha', '山海再就业')

  queue.enqueue(project, { marker: 'first-edit' })
  queue.enqueue(project, { marker: 'latest-edit' })

  assert.deepEqual(
    queue.drain().map((entry) => [entry.project.id, entry.state.marker]),
    [['project-alpha', 'latest-edit']],
  )
})

test('remote sync queue exposes pending project tasks for the status panel', () => {
  const queue = createProjectRemoteSyncQueue()
  const alpha = remoteProject('project-alpha', '山海再就业')
  const beta = remoteProject('project-beta', '默认项目')

  const localImage = createPersonalSpaceAsset({
    kind: 'image',
    name: 'forest.png',
    resourcePaths: ['blob:forest'],
  })
  const uploadedVoice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      name: 'voice.wav',
      resourcePaths: ['objects/默认项目/audio_wav/r1.wav'],
    }),
    storageResourcePaths: ['objects/默认项目/audio_wav/r1.wav'],
  }

  queue.enqueue(alpha, { ...defaultPersonalSpaceState, assets: [localImage, uploadedVoice] })
  queue.enqueue(beta, { ...defaultPersonalSpaceState, assets: [uploadedVoice] })

  assert.deepEqual(queue.pendingTasks(), [
    { projectId: 'project-alpha', projectName: '山海再就业', status: 'pending', progress: 0, pendingAssetCount: 1 },
    { projectId: 'project-beta', projectName: '默认项目', status: 'pending', progress: 0, pendingAssetCount: 0 },
  ])
})

test('remote sync status model counts pending uploads and preserves latest project task progress', () => {
  let status = createEmptyProjectRemoteSyncStatus()

  status = upsertProjectRemoteSyncTask(status, {
    projectId: 'project-alpha',
    projectName: '山海再就业',
    status: 'pending',
    progress: 0,
    pendingAssetCount: 2,
  })
  status = upsertProjectRemoteSyncTask(status, {
    projectId: 'project-alpha',
    projectName: '山海再就业',
    status: 'syncing',
    progress: 45,
    pendingAssetCount: 2,
  })
  status = upsertProjectRemoteSyncTask(status, {
    projectId: 'project-beta',
    projectName: '默认项目',
    status: 'failed',
    progress: 100,
    pendingAssetCount: 0,
    errorMessage: '远程数据库不可用',
  })

  assert.equal(status.pendingUploadCount, 2)
  assert.equal(status.activeTaskCount, 1)
  assert.equal(shouldShowProjectRemoteSyncStatus(status), true)
  assert.deepEqual(status.tasks.map((task) => [task.projectName, task.status, task.progress, task.pendingAssetCount]), [
    ['默认项目', 'failed', 100, 0],
    ['山海再就业', 'syncing', 45, 2],
  ])

  status = removePendingProjectRemoteSyncTask(status, 'project-alpha')
  assert.equal(status.pendingUploadCount, 0)
  assert.equal(status.activeTaskCount, 0)
  assert.equal(shouldShowProjectRemoteSyncStatus(status), true)
})

test('remote sync status keeps failed upload tasks visible while assets remain pending', () => {
  const status = upsertProjectRemoteSyncTask(createEmptyProjectRemoteSyncStatus(), {
    projectId: 'project-alpha',
    projectName: '山海再就业',
    status: 'failed',
    progress: 100,
    pendingAssetCount: 2,
    errorMessage: '对象存储上传失败',
  })

  assert.equal(status.pendingUploadCount, 2)
  assert.equal(status.activeTaskCount, 0)
  assert.equal(shouldShowProjectRemoteSyncStatus(status), true)
})

test('remote sync status keeps failed tasks visible even when no assets are pending upload', () => {
  const status = upsertProjectRemoteSyncTask(createEmptyProjectRemoteSyncStatus(), {
    projectId: 'project-alpha',
    projectName: '山海再就业',
    status: 'failed',
    progress: 100,
    pendingAssetCount: 0,
    errorMessage: '远程数据库不可用',
  })

  assert.equal(status.pendingUploadCount, 0)
  assert.equal(status.activeTaskCount, 0)
  assert.equal(shouldShowProjectRemoteSyncStatus(status), true)
})

test('remote sync status hides completed tasks when there is nothing left to upload', () => {
  const status = upsertProjectRemoteSyncTask(createEmptyProjectRemoteSyncStatus(), {
    projectId: 'project-alpha',
    projectName: '山海再就业',
    status: 'succeeded',
    progress: 100,
    pendingAssetCount: 0,
  })

  assert.equal(status.pendingUploadCount, 0)
  assert.equal(status.activeTaskCount, 0)
  assert.equal(shouldShowProjectRemoteSyncStatus(status), false)
})

test('remote sync status shows active sync tasks even when no assets are pending upload', () => {
  const status = upsertProjectRemoteSyncTask(createEmptyProjectRemoteSyncStatus(), {
    projectId: 'project-alpha',
    projectName: '山海再就业',
    status: 'syncing',
    progress: 50,
    pendingAssetCount: 0,
  })

  assert.equal(status.pendingUploadCount, 0)
  assert.equal(status.activeTaskCount, 1)
  assert.equal(shouldShowProjectRemoteSyncStatus(status), true)
})

test('pending upload asset counting ignores resources already represented by project object keys', () => {
  const localImage = createPersonalSpaceAsset({
    kind: 'image',
    name: 'forest.png',
    resourcePaths: ['blob:forest'],
  })
  const localSprite = createPersonalSpaceAsset({
    kind: 'sprite',
    name: 'hero.png',
    resourcePaths: ['blob:sprite', 'blob:index'],
  })
  const uploadedImageWithCover = {
    ...createPersonalSpaceAsset({
      kind: 'image',
      name: 'fire.png',
      resourcePaths: ['objects/项目/image_png/p1.png'],
    }),
    storageResourcePaths: ['objects/项目/image_png/p1.png'],
    coverResourcePath: 'objects/项目/image_png/c1.png',
    coverStorageResourcePath: 'objects/项目/image_png/c1.png',
  }

  assert.equal(countPendingUploadAssets({
    ...defaultPersonalSpaceState,
    assets: [localImage, localSprite, uploadedImageWithCover],
  }), 2)
})
