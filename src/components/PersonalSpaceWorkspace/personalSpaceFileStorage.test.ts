import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space file storage tests stay split by storage responsibility', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceFileStorage.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/PersonalSpaceWorkspace/personalSpaceFileResourceWrite.test.ts',
    'src/components/PersonalSpaceWorkspace/personalSpaceFileUploadStorage.test.ts',
    'src/components/PersonalSpaceWorkspace/personalSpaceFileResourceDelete.test.ts',
    'src/components/PersonalSpaceWorkspace/personalSpaceFileStoryboardExport.test.ts',
    'src/components/PersonalSpaceWorkspace/personalSpaceDirectoryHandlePersistence.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'personalSpaceFileStorage.test.ts should only keep split guards')
  for (const delegatedToken of [
    'writeAsset' + 'ResourcesToDirectory',
    'createSprite' + 'AssetForUpload',
    'deleteStored' + 'ResourceFiles',
    'exportStoryboard' + 'VoiceAssetsToTarget',
    'persistPersonalSpace' + 'DirectoryHandle',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
