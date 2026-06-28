import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { packageJsonSource } from '../../appStructureTestHelpers.test'

test('image processing structure tests stay split by workspace responsibility', () => {
  const source = readFileSync('src/components/ImageProcessingWorkspace/imageProcessingStructure.test.ts', 'utf8')
  const packageSource = packageJsonSource()
  const focusedSuites = [
    'src/components/ImageProcessingWorkspace/imageProcessingLayoutStructure.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingMatteStructure.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingWorkflowStructure.test.ts',
    'src/components/ImageProcessingWorkspace/imageProcessingUpscaleStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'imageProcessingStructure.test.ts should only keep split guards')
  for (const delegatedToken of [
    'ImageProcessing' + 'Toolbar',
    'matte' + 'Enabled',
    'useImage' + 'SourceWorkspace',
    'upscale' + 'RuntimeStatus',
    'ImageCrop' + 'SelectionLayer',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
