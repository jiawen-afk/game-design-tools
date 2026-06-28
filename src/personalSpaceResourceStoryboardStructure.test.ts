import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space storyboard export delegates zip resource, builder, and target responsibilities', () => {
  const assetActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetActions.ts', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.ts', 'utf8')
  const facadePath = 'src/components/PersonalSpaceWorkspace/personalSpaceStoryboardExportActions.ts'
  const zipResourcesPath = 'src/components/PersonalSpaceWorkspace/personalSpaceStoryboardZipResources.ts'
  const zipBuildersPath = 'src/components/PersonalSpaceWorkspace/personalSpaceStoryboardZipBuilders.ts'
  const exportTargetPath = 'src/components/PersonalSpaceWorkspace/personalSpaceStoryboardExportTarget.ts'

  for (const path of [zipResourcesPath, zipBuildersPath, exportTargetPath]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  const facadeSource = readFileSync(facadePath, 'utf8')
  const zipResourcesSource = readFileSync(zipResourcesPath, 'utf8')
  const zipBuildersSource = readFileSync(zipBuildersPath, 'utf8')
  const exportTargetSource = readFileSync(exportTargetPath, 'utf8')

  assert.match(assetActionsSource, /exportStoryboardAssetToTarget/)
  assert.match(actionsSource, /personalSpaceStoryboardExportActions/)
  assert.doesNotMatch(actionsSource, /JSZip/)
  assert.doesNotMatch(actionsSource, /storyboard\.json/)
  assert.match(facadeSource, /from '\.\/personalSpaceStoryboardZipBuilders'/)
  assert.match(facadeSource, /from '\.\/personalSpaceStoryboardExportTarget'/)
  assert.doesNotMatch(facadeSource, /JSZip/)
  assert.doesNotMatch(facadeSource, /readProjectAssetResourceBlob/)
  assert.doesNotMatch(facadeSource, /writeBlobFileToDirectory/)
  assert.doesNotMatch(facadeSource, /saveFile/)
  assert.match(zipResourcesSource, /export interface ProjectResourceReadOptions/)
  assert.match(zipResourcesSource, /function readExportAssetResourceBlob/)
  assert.match(zipResourcesSource, /export async function addAssetsToZip/)
  assert.match(zipResourcesSource, /readProjectAssetResourceBlob/)
  assert.match(zipResourcesSource, /buildProjectAssetResourceRef/)
  assert.match(zipBuildersSource, /JSZip/)
  assert.match(zipBuildersSource, /storyboard\.json/)
  assert.match(zipBuildersSource, /exportStoryboardReference/)
  assert.match(zipBuildersSource, /export async function buildStoryboardZip/)
  assert.match(zipBuildersSource, /export async function buildStoryboardVoiceAssetsZip/)
  assert.match(zipBuildersSource, /export async function buildStoryboardCharacterAssetsZip/)
  assert.match(zipBuildersSource, /addAssetsToZip/)
  assert.match(exportTargetSource, /writeBlobFileToDirectory/)
  assert.match(exportTargetSource, /getDesktopApi/)
  assert.match(exportTargetSource, /export async function exportZipToTarget/)
})
