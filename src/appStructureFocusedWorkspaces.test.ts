import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  assertFocusedStructureFiles,
  readSourceIfExists,
  testNamePattern,
} from './appStructureTestHelpers.test'

test('personal space structure tests live in a focused file', () => {
  const source = readFileSync('src/appStructure.test.ts', 'utf8')
  const personalSpaceStructurePath = 'src/personalSpaceStructure.test.ts'
  const personalSpaceWorkspaceStructurePath = 'src/personalSpaceWorkspaceStructure.test.ts'
  const personalSpaceResourceStructurePath = 'src/personalSpaceResourceStructure.test.ts'
  const personalSpaceResourceIoStructurePath = 'src/personalSpaceResourceIoStructure.test.ts'
  const personalSpaceResourceUploadStructurePath = 'src/personalSpaceResourceUploadStructure.test.ts'
  const personalSpaceResourceStoryboardStructurePath = 'src/personalSpaceResourceStoryboardStructure.test.ts'
  const personalSpaceResourceWorkspaceStructurePath = 'src/personalSpaceResourceWorkspaceStructure.test.ts'
  const personalSpaceModelDelegationStructurePath = 'src/personalSpaceModelDelegationStructure.test.ts'
  const personalSpaceWorkspaceMaterialsStructurePath = 'src/personalSpaceWorkspaceMaterialsStructure.test.ts'
  const personalSpaceWorkspaceCharactersStructurePath = 'src/personalSpaceWorkspaceCharactersStructure.test.ts'

  assertFocusedStructureFiles([
    personalSpaceStructurePath,
    personalSpaceWorkspaceStructurePath,
    personalSpaceResourceStructurePath,
    personalSpaceResourceIoStructurePath,
    personalSpaceResourceUploadStructurePath,
    personalSpaceResourceStoryboardStructurePath,
    personalSpaceResourceWorkspaceStructurePath,
    personalSpaceModelDelegationStructurePath,
    personalSpaceWorkspaceMaterialsStructurePath,
    personalSpaceWorkspaceCharactersStructurePath,
  ])
  assert.doesNotMatch(source, testNamePattern('personal space resource kinds are first-level tabs'))
  assert.doesNotMatch(source, testNamePattern('personal space workspace delegates character management panel'))
  assert.doesNotMatch(source, testNamePattern('personal space model delegates asset factories'))
  assert.match(readSourceIfExists(personalSpaceStructurePath), testNamePattern('personal space focused structure tests live in focused files'))
  assert.match(readSourceIfExists(personalSpaceWorkspaceStructurePath), testNamePattern('personal space workspace structure tests live in focused files'))
  assert.match(readSourceIfExists(personalSpaceResourceStructurePath), testNamePattern('personal space resource structure tests stay split by responsibility'))
  assert.match(readSourceIfExists(personalSpaceResourceStoryboardStructurePath), testNamePattern('personal space storyboard export delegates zip resource'))
  assert.match(readSourceIfExists(personalSpaceModelDelegationStructurePath), testNamePattern('personal space model delegates asset factories'))
  assert.match(readSourceIfExists(personalSpaceWorkspaceMaterialsStructurePath), testNamePattern('personal space resource kinds are first-level tabs'))
  assert.match(readSourceIfExists(personalSpaceWorkspaceCharactersStructurePath), testNamePattern('personal space workspace delegates character management panel'))
})

test('voice deployment structure tests live in a focused file', () => {
  const source = readFileSync('src/appStructure.test.ts', 'utf8')
  const voiceDeploymentStructurePath = 'src/voiceDeploymentStructure.test.ts'
  const voiceDeploymentStructureSource = readSourceIfExists(voiceDeploymentStructurePath)

  assertFocusedStructureFiles([voiceDeploymentStructurePath])
  assert.doesNotMatch(source, testNamePattern('voice deployment styles stay split'))
  assert.doesNotMatch(source, testNamePattern('voice deployment workspace delegates connected generation panel'))
  assert.doesNotMatch(source, testNamePattern('voice deployment workspace delegates deployment setup state'))
  assert.match(voiceDeploymentStructureSource, testNamePattern('voice deployment structure tests stay split by workspace responsibility'))
  assert.doesNotMatch(voiceDeploymentStructureSource, testNamePattern('voice deployment styles stay split'))
  assert.doesNotMatch(voiceDeploymentStructureSource, testNamePattern('voice deployment workspace delegates connected generation panel'))
  assert.doesNotMatch(voiceDeploymentStructureSource, testNamePattern('voice deployment workspace delegates deployment setup state'))
})

test('sprite workspace structure tests live in focused files', () => {
  const source = readFileSync('src/appStructure.test.ts', 'utf8')
  const spriteWorkspaceStructurePath = 'src/spriteWorkspaceStructure.test.ts'
  const spriteWorkspaceCoreStructurePath = 'src/spriteWorkspaceCoreStructure.test.ts'
  const spriteWorkspaceLayoutStructurePath = 'src/spriteWorkspaceLayoutStructure.test.ts'
  const spriteWorkspaceMatteStructurePath = 'src/spriteWorkspaceMatteStructure.test.ts'
  const spriteWorkspaceVideoStructurePath = 'src/spriteWorkspaceVideoStructure.test.ts'
  const spriteWorkspaceUploadStructurePath = 'src/spriteWorkspaceUploadStructure.test.ts'

  assertFocusedStructureFiles([
    spriteWorkspaceStructurePath,
    spriteWorkspaceCoreStructurePath,
    spriteWorkspaceLayoutStructurePath,
    spriteWorkspaceMatteStructurePath,
    spriteWorkspaceVideoStructurePath,
    spriteWorkspaceUploadStructurePath,
  ])
  assert.doesNotMatch(source, testNamePattern('sprite image pipeline delegates browser'))
  assert.doesNotMatch(source, testNamePattern('matte pipeline delegates composed frame queue'))
  assert.doesNotMatch(source, testNamePattern('video processing owns one-in-n frame stride'))
  assert.match(readSourceIfExists(spriteWorkspaceStructurePath), testNamePattern('sprite workspace structure suite stays split by responsibility'))
  assert.match(readSourceIfExists(spriteWorkspaceCoreStructurePath), testNamePattern('sprite image pipeline delegates browser'))
  assert.match(readSourceIfExists(spriteWorkspaceMatteStructurePath), testNamePattern('matte pipeline delegates composed frame queue'))
  assert.match(readSourceIfExists(spriteWorkspaceVideoStructurePath), testNamePattern('video processing owns one-in-n frame stride'))
  assert.match(readSourceIfExists(spriteWorkspaceUploadStructurePath), testNamePattern('sprite workspace upload defaults to one asset'))
})

test('document structure tests live in a focused file', () => {
  const source = readFileSync('src/appStructure.test.ts', 'utf8')
  const documentStructurePath = 'src/documentStructure.test.ts'
  const documentWorkspaceBoundaryStructurePath = 'src/documentWorkspaceBoundaryStructure.test.ts'
  const documentWorkspaceStyleStructurePath = 'src/documentWorkspaceStyleStructure.test.ts'
  const documentGraphStructurePath = 'src/documentGraphStructure.test.ts'
  const documentKnowledgeImportStructurePath = 'src/documentKnowledgeImportStructure.test.ts'

  assertFocusedStructureFiles([
    documentStructurePath,
    documentWorkspaceBoundaryStructurePath,
    documentWorkspaceStyleStructurePath,
    documentGraphStructurePath,
    documentKnowledgeImportStructurePath,
  ])
  assert.doesNotMatch(source, testNamePattern('document knowledge workspace keeps panels free'))
  assert.doesNotMatch(source, testNamePattern('document graph view model delegates focused responsibilities'))
  assert.doesNotMatch(source, testNamePattern('document graph canvas routes graph node clicks'))
  assert.match(readSourceIfExists(documentStructurePath), testNamePattern('document structure tests stay split by document responsibility'))
  assert.match(readSourceIfExists(documentWorkspaceBoundaryStructurePath), testNamePattern('document knowledge workspace keeps panels free'))
  assert.match(readSourceIfExists(documentWorkspaceStyleStructurePath), testNamePattern('document workspace styles stay split'))
  assert.match(readSourceIfExists(documentGraphStructurePath), testNamePattern('document graph view model delegates focused responsibilities'))
  assert.match(readSourceIfExists(documentGraphStructurePath), testNamePattern('document graph canvas routes graph node clicks'))
  assert.match(readSourceIfExists(documentKnowledgeImportStructurePath), testNamePattern('shj graph import adapter delegates parsing'))
})
