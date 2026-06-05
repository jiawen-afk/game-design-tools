import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = () => readFileSync('src/App.tsx', 'utf8')
const viteConfigSource = () => readFileSync('vite.config.ts', 'utf8')

test('home page shows tool details directly instead of hiding them in a popover', () => {
  const source = appSource()

  assert.doesNotMatch(source, /Popover/)
  assert.match(source, /tool\.details/)
  assert.match(source, /tool\.shortcut/)
  assert.match(source, /tool\.output/)
})

test('desktop shortcuts open tools and ignore editable targets', () => {
  const source = appSource()

  assert.match(source, /isEditableShortcutTarget/)
  assert.match(source, /event\.key === tool\.shortcut/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /HTMLInputElement/)
  assert.match(source, /HTMLTextAreaElement/)
  assert.match(source, /isContentEditable/)
})

test('production build publishes deployment scripts under /scripts', () => {
  const source = viteConfigSource()

  assert.match(source, /copyDeploymentScripts/)
  assert.match(source, /dist\/scripts/)
  assert.match(source, /deploy-voxcpm\.ps1/)
  assert.match(source, /deploy-voxcpm\.sh/)
})
