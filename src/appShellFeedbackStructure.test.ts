import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { appStyleEntryPath, appStyleModulePaths, appStyleSources, appToastProviderSource } from './appStructureTestHelpers.test'

test('app styles stay split by shell responsibility', () => {
  const styleEntrySource = readFileSync(appStyleEntryPath, 'utf8')

  assert.equal((styleEntrySource.match(/@import/g) ?? []).length, appStyleModulePaths.length)
  assert.doesNotMatch(styleEntrySource, /^\s*(?:\.|:root\b|\*\s*\{|body\b|button\b|input\b|textarea\b|select\b|h1\b|h2\b|h3\b|p\b|@media\b|@keyframes\b)/m)
  for (const path of appStyleModulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(styleEntrySource, new RegExp(`@import './${path.split('/').pop()}'`))
  }
})

test('app shell exposes a reusable expiring toast layer', () => {
  const mainSource = readFileSync('src/main.tsx', 'utf8')
  const toastSource = appToastProviderSource()
  const appStyles = appStyleSources()

  assert.match(mainSource, /AppToastProvider/)
  assert.match(mainSource, /<AppToastProvider>[\s\S]*<App \/>[\s\S]*<\/AppToastProvider>/)
  assert.match(toastSource, /createContext/)
  assert.match(toastSource, /useAppToast/)
  assert.match(toastSource, /durationMs/)
  assert.match(toastSource, /expiresAt/)
  assert.match(toastSource, /remainingMs/)
  assert.match(toastSource, /onMouseEnter=\{\(\) => pauseToast\(toast\.id\)\}/)
  assert.match(toastSource, /onMouseLeave=\{\(\) => resumeToast\(toast\.id\)\}/)
  assert.match(toastSource, /window\.setTimeout/)
  assert.match(toastSource, /role="status"/)
  assert.match(toastSource, /aria-live="polite"/)
  assert.match(appStyles, /\.app-toast-viewport/)
  assert.match(appStyles, /right:\s*\d+px/)
  assert.match(appStyles, /bottom:\s*\d+px/)
  assert.match(appStyles, /@keyframes app-toast-in/)
  assert.match(appStyles, /translateY\(\d+px\)/)
  assert.match(appStyles, /prefers-reduced-motion:\s*reduce/)
})
