import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space model tests live in focused files', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const assetFactoryPath = 'src/components/PersonalSpaceWorkspace/personalSpaceAssetFactory.test.ts'
  const assetStatePath = 'src/components/PersonalSpaceWorkspace/personalSpaceAssetState.test.ts'
  const characterPath = 'src/components/PersonalSpaceWorkspace/personalSpaceCharacterModel.test.ts'
  const storyboardPath = 'src/components/PersonalSpaceWorkspace/personalSpaceStoryboardModel.test.ts'
  const persistencePath = 'src/components/PersonalSpaceWorkspace/personalSpacePersistenceModel.test.ts'
  const assetFactorySource = existsSync(assetFactoryPath) ? readFileSync(assetFactoryPath, 'utf8') : ''
  const assetStateSource = existsSync(assetStatePath) ? readFileSync(assetStatePath, 'utf8') : ''
  const characterSource = existsSync(characterPath) ? readFileSync(characterPath, 'utf8') : ''
  const storyboardSource = existsSync(storyboardPath) ? readFileSync(storyboardPath, 'utf8') : ''
  const persistenceSource = existsSync(persistencePath) ? readFileSync(persistencePath, 'utf8') : ''

  for (const path of [assetFactoryPath, assetStatePath, characterPath, storyboardPath, persistencePath]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }
  assert.match(packageSource, /src\/components\/PersonalSpaceWorkspace\/personalSpaceAssetFactory\.test\.ts/)
  assert.match(packageSource, /src\/components\/PersonalSpaceWorkspace\/personalSpaceAssetState\.test\.ts/)
  assert.match(packageSource, /src\/components\/PersonalSpaceWorkspace\/personalSpaceCharacterModel\.test\.ts/)
  assert.match(packageSource, /src\/components\/PersonalSpaceWorkspace\/personalSpaceStoryboardModel\.test\.ts/)
  assert.match(packageSource, /src\/components\/PersonalSpaceWorkspace\/personalSpacePersistenceModel\.test\.ts/)
  assert.doesNotMatch(source, new RegExp("test\\('" + 'creates personal space voice asset'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space derived state groups assets'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'character profiles can be created'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'storyboard groups can be created'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'stored personal space state migrates legacy'))
  assert.match(assetFactorySource, new RegExp("test\\('" + 'creates personal space voice asset'))
  assert.match(assetStateSource, new RegExp("test\\('" + 'personal space derived state groups assets'))
  assert.match(characterSource, new RegExp("test\\('" + 'character profiles can be created'))
  assert.match(storyboardSource, new RegExp("test\\('" + 'storyboard groups can be created'))
  assert.match(persistenceSource, new RegExp("test\\('" + 'stored personal space state migrates legacy'))
})

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
