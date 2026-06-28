import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space resource structure tests stay split by responsibility', () => {
  const source = readFileSync('src/personalSpaceResourceStructure.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/personalSpaceResourceIoStructure.test.ts',
    'src/personalSpaceResourceUploadStructure.test.ts',
    'src/personalSpaceResourceStoryboardStructure.test.ts',
    'src/personalSpaceResourceWorkspaceStructure.test.ts',
    'src/personalSpaceModelDelegationStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'personalSpaceResourceStructure.test.ts should only keep split guards')
  for (const delegatedToken of [
    'personalSpace' + 'ResourceActions',
    'personalSpace' + 'UploadProps',
    'personalSpace' + 'StoryboardZipBuilders',
    'usePersonalSpace' + 'ProjectResources',
    'personalSpace' + 'AssetOperations',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
