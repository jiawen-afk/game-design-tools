import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('app structure tests share file readers and source aggregation helpers', () => {
  const source = readFileSync('src/appStructureFocusedSuites.test.ts', 'utf8')
  const helperPath = 'src/appStructureTestHelpers.test.ts'
  const helperSource = existsSync(helperPath) ? readFileSync(helperPath, 'utf8') : ''

  assert.ok(existsSync(helperPath), `${helperPath} should exist`)
  assert.match(source, /from '\.\/appStructureTestHelpers\.test'/)
  assert.doesNotMatch(source, new RegExp('function ' + 'listSourceFiles'))
  assert.doesNotMatch(source, new RegExp('function ' + 'productionSourceFiles'))
  assert.doesNotMatch(source, new RegExp('function ' + 'readSources'))
  assert.match(helperSource, new RegExp('export function ' + 'productionSourceFiles'))
  assert.match(helperSource, new RegExp('export function ' + 'readSources'))
  assert.match(helperSource, new RegExp('export function ' + 'projectStorageIpcSources'))
})
