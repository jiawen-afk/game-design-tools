import assert from 'node:assert/strict'
import test from 'node:test'

import { createProjectRemoteSyncQueue } from './useProjectRemoteSync'
import type { Project } from '../ProjectStorage'

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
