import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  productionSourceFiles,
  readSources,
} from './appStructureTestHelpers.test'

test('personal space focused structure tests live in focused files', () => {
  const source = readFileSync('src/personalSpaceStructure.test.ts', 'utf8')
  const workspaceStructurePath = 'src/personalSpaceWorkspaceStructure.test.ts'
  const resourceStructurePath = 'src/personalSpaceResourceStructure.test.ts'
  const resourceIoStructurePath = 'src/personalSpaceResourceIoStructure.test.ts'
  const resourceUploadStructurePath = 'src/personalSpaceResourceUploadStructure.test.ts'
  const resourceStoryboardStructurePath = 'src/personalSpaceResourceStoryboardStructure.test.ts'
  const resourceWorkspaceStructurePath = 'src/personalSpaceResourceWorkspaceStructure.test.ts'
  const modelDelegationStructurePath = 'src/personalSpaceModelDelegationStructure.test.ts'
  const materialsStructurePath = 'src/personalSpaceWorkspaceMaterialsStructure.test.ts'
  const charactersStructurePath = 'src/personalSpaceWorkspaceCharactersStructure.test.ts'
  const storyboardsStructurePath = 'src/personalSpaceWorkspaceStoryboardsStructure.test.ts'
  const workspaceStructureSource = existsSync(workspaceStructurePath)
    ? readFileSync(workspaceStructurePath, 'utf8')
    : ''
  const resourceStructureSource = existsSync(resourceStructurePath)
    ? readFileSync(resourceStructurePath, 'utf8')
    : ''
  const resourceIoStructureSource = existsSync(resourceIoStructurePath)
    ? readFileSync(resourceIoStructurePath, 'utf8')
    : ''
  const resourceUploadStructureSource = existsSync(resourceUploadStructurePath)
    ? readFileSync(resourceUploadStructurePath, 'utf8')
    : ''
  const resourceStoryboardStructureSource = existsSync(resourceStoryboardStructurePath)
    ? readFileSync(resourceStoryboardStructurePath, 'utf8')
    : ''
  const resourceWorkspaceStructureSource = existsSync(resourceWorkspaceStructurePath)
    ? readFileSync(resourceWorkspaceStructurePath, 'utf8')
    : ''
  const modelDelegationStructureSource = existsSync(modelDelegationStructurePath)
    ? readFileSync(modelDelegationStructurePath, 'utf8')
    : ''
  const materialsStructureSource = existsSync(materialsStructurePath)
    ? readFileSync(materialsStructurePath, 'utf8')
    : ''
  const charactersStructureSource = existsSync(charactersStructurePath)
    ? readFileSync(charactersStructurePath, 'utf8')
    : ''
  const storyboardsStructureSource = existsSync(storyboardsStructurePath)
    ? readFileSync(storyboardsStructurePath, 'utf8')
    : ''

  assert.ok(existsSync(workspaceStructurePath), `${workspaceStructurePath} should exist`)
  assert.ok(existsSync(resourceStructurePath), `${resourceStructurePath} should exist`)
  assert.ok(existsSync(resourceIoStructurePath), `${resourceIoStructurePath} should exist`)
  assert.ok(existsSync(resourceUploadStructurePath), `${resourceUploadStructurePath} should exist`)
  assert.ok(existsSync(resourceStoryboardStructurePath), `${resourceStoryboardStructurePath} should exist`)
  assert.ok(existsSync(resourceWorkspaceStructurePath), `${resourceWorkspaceStructurePath} should exist`)
  assert.ok(existsSync(modelDelegationStructurePath), `${modelDelegationStructurePath} should exist`)
  assert.ok(existsSync(materialsStructurePath), `${materialsStructurePath} should exist`)
  assert.ok(existsSync(charactersStructurePath), `${charactersStructurePath} should exist`)
  assert.ok(existsSync(storyboardsStructurePath), `${storyboardsStructurePath} should exist`)
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space resource kinds are first-level tabs'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space workspace delegates character management panel'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'personal space storyboard export delegates zip resource'))
  assert.match(workspaceStructureSource, new RegExp("test\\('" + 'personal space workspace structure tests live in focused files'))
  assert.match(resourceStructureSource, new RegExp("test\\('" + 'personal space resource structure tests stay split by responsibility'))
  assert.match(resourceIoStructureSource, new RegExp("test\\('" + 'personal space workspace delegates resource IO'))
  assert.match(resourceUploadStructureSource, new RegExp("test\\('" + 'personal space asset actions delegate Ant upload props'))
  assert.match(resourceStoryboardStructureSource, new RegExp("test\\('" + 'personal space storyboard export delegates zip resource'))
  assert.match(resourceWorkspaceStructureSource, new RegExp("test\\('" + 'personal space workspace delegates page state'))
  assert.match(modelDelegationStructureSource, new RegExp("test\\('" + 'personal space model delegates asset factories'))
  assert.match(materialsStructureSource, new RegExp("test\\('" + 'personal space resource kinds are first-level tabs'))
  assert.match(charactersStructureSource, new RegExp("test\\('" + 'personal space workspace delegates character management panel'))
  assert.match(storyboardsStructureSource, new RegExp("test\\('" + 'personal space workspace delegates storyboard management panel'))
})
