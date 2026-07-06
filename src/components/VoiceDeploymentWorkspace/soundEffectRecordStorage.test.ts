import test from 'node:test'
import assert from 'node:assert/strict'

import type { SoundEffectRecord } from './soundEffectModel'
import { readStoredSoundEffectRecords, writeStoredSoundEffectRecords } from './soundEffectRecordStorage'

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

function createRecord(id: string): SoundEffectRecord {
  return {
    id,
    name: `Sound ${id}`,
    createdAt: '2026-07-06T00:00:00.000Z',
    audioUrl: `blob:${id}`,
    audioPath: `D:\\sounds\\${id}.wav`,
    prompt: 'short sword slash',
    durationSeconds: 2,
    seed: 12,
    model: 'small-sfx',
  }
}

test('sound effect records persist through local storage', () => {
  const originalLocalStorage = globalThis.localStorage
  const storage = createMemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  try {
    writeStoredSoundEffectRecords([createRecord('a')])

    assert.deepEqual(readStoredSoundEffectRecords(), [createRecord('a')])
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true })
  }
})

test('sound effect record storage drops malformed records and caps history length', () => {
  const originalLocalStorage = globalThis.localStorage
  const records = Array.from({ length: 82 }, (_, index) => createRecord(String(index)))
  const storage = createMemoryStorage({
    'game-design-tools.stable-audio.records.v1': JSON.stringify([
      { nope: true },
      ...records,
    ]),
  })
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  try {
    const stored = readStoredSoundEffectRecords()

    assert.equal(stored.length, 80)
    assert.equal(stored[0].id, '0')
    assert.equal(stored[79].id, '79')
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true })
  }
})
