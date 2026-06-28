import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { packageJsonSource } from './appStructureTestHelpers.test'

test('personal space workspace structure tests live in focused files', () => {
  const source = readFileSync('src/personalSpaceWorkspaceStructure.test.ts', 'utf8')
  const packageSource = packageJsonSource()
  const shellStructurePath = 'src/personalSpaceWorkspaceShellStructure.test.ts'
  const actionsStructurePath = 'src/personalSpaceWorkspaceActionsStructure.test.ts'
  const settingsStructurePath = 'src/personalSpaceWorkspaceSettingsStructure.test.ts'
  const materialsStructurePath = 'src/personalSpaceWorkspaceMaterialsStructure.test.ts'
  const charactersStructurePath = 'src/personalSpaceWorkspaceCharactersStructure.test.ts'
  const storyboardsStructurePath = 'src/personalSpaceWorkspaceStoryboardsStructure.test.ts'
  const shellStructureSource = existsSync(shellStructurePath) ? readFileSync(shellStructurePath, 'utf8') : ''
  const actionsStructureSource = existsSync(actionsStructurePath) ? readFileSync(actionsStructurePath, 'utf8') : ''
  const settingsStructureSource = existsSync(settingsStructurePath) ? readFileSync(settingsStructurePath, 'utf8') : ''
  const materialsStructureSource = existsSync(materialsStructurePath) ? readFileSync(materialsStructurePath, 'utf8') : ''
  const charactersStructureSource = existsSync(charactersStructurePath) ? readFileSync(charactersStructurePath, 'utf8') : ''
  const storyboardsStructureSource = existsSync(storyboardsStructurePath) ? readFileSync(storyboardsStructurePath, 'utf8') : ''

  for (const path of [
    shellStructurePath,
    actionsStructurePath,
    settingsStructurePath,
    materialsStructurePath,
    charactersStructurePath,
    storyboardsStructurePath,
  ]) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/').replace(/\./g, '\\.')))
  }
  assert.doesNotMatch(source, new RegExp("test\\('" + 'project space workbench shows current project control'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space workspace delegates asset upload and export actions'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space settings save gives visible feedback'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space resource kinds are first-level tabs'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space workspace delegates character management panel'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space workspace delegates storyboard management panel'))
  assert.match(shellStructureSource, new RegExp("test\\('" + 'project space workbench shows current project control'))
  assert.match(actionsStructureSource, new RegExp("test\\('" + 'personal space workspace delegates asset upload and export actions'))
  assert.match(settingsStructureSource, new RegExp("test\\('" + 'personal space settings save gives visible feedback'))
  assert.match(materialsStructureSource, new RegExp("test\\('" + 'personal space resource kinds are first-level tabs'))
  assert.match(charactersStructureSource, new RegExp("test\\('" + 'personal space workspace delegates character management panel'))
  assert.match(storyboardsStructureSource, new RegExp("test\\('" + 'personal space workspace delegates storyboard management panel'))
})
