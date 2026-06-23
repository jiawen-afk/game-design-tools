import test from 'node:test'
import assert from 'node:assert/strict'

import {
  activeProjectStorageKey,
  clearActiveProjectId,
  readActiveProjectId,
  resolveEnabledProjectId,
  writeActiveProjectId,
} from './projectActiveProject'
import type { Project } from './projectStorageTypes'

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

const project = (id: string): Project => ({
  id,
  name: id,
  description: '',
  mode: 'local',
  status: 'active',
  object_key_prefix: `objects/${id}`,
  created_at: '2026-06-23T00:00:00.000Z',
  updated_at: '2026-06-23T00:00:00.000Z',
  metadata_json: null,
})

test('active project id persists locally and can be cleared', () => {
  const storage = createMemoryStorage()

  writeActiveProjectId('p1', storage)
  assert.equal(storage.getItem(activeProjectStorageKey), 'p1')
  assert.equal(readActiveProjectId(storage), 'p1')

  clearActiveProjectId(storage)
  assert.equal(readActiveProjectId(storage), '')
})

test('enabled project resolution prefers persisted id and auto-enables only single project fallback', () => {
  assert.equal(resolveEnabledProjectId([project('p1')], ''), 'p1')
  assert.equal(resolveEnabledProjectId([project('p1'), project('p2')], ''), '')
  assert.equal(resolveEnabledProjectId([project('p1'), project('p2')], 'p2'), 'p2')
  assert.equal(resolveEnabledProjectId([project('p1'), project('p2')], 'missing'), '')
})
