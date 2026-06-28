import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('personal space model delegates asset factories and storage paths', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const assetSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssets.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceAssets'/)
  assert.match(source, /export \{[\s\S]*createPersonalSpaceAsset[\s\S]*archiveAssetForStorageDirectory[\s\S]*assetKindLabel[\s\S]*createResourceAssetFromUpload[\s\S]*\} from '\.\/personalSpaceAssets'/)
  assert.match(readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetFactory.test.ts', 'utf8'), /personal space asset kind labels are shared by workspace workflows/)
  assert.doesNotMatch(source, /function sanitizePathPart/)
  assert.doesNotMatch(source, /function groupNameForUploadedResource/)
  assert.doesNotMatch(source, /export function createPersonalSpaceAsset/)
  assert.doesNotMatch(source, /export function archiveAssetForStorageDirectory/)
  assert.doesNotMatch(source, /export function createResourceAssetFromUpload/)
  assert.doesNotMatch(readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8'), /function assetKindLabel/)
  assert.match(assetSource, /export function createPersonalSpaceAsset/)
  assert.match(assetSource, /export function archiveAssetForStorageDirectory/)
  assert.match(assetSource, /export function assetKindLabel/)
  assert.match(assetSource, /export function createResourceAssetFromUpload/)
  assert.match(assetSource, /function sanitizePathPart/)
  assert.match(assetSource, /function groupNameForUploadedResource/)
})

test('personal space model delegates storyboard operations', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const storyboardSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceStoryboards.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceStoryboards'/)
  assert.match(source, /export \{[\s\S]*addStoryboardGroup[\s\S]*assignVoiceToStoryboardGroup[\s\S]*exportStoryboardReference[\s\S]*\} from '\.\/personalSpaceStoryboards'/)
  assert.doesNotMatch(source, /export function addStoryboardGroup/)
  assert.doesNotMatch(source, /export function assignVoiceToStoryboardGroup/)
  assert.doesNotMatch(source, /export function exportStoryboardReference/)
  assert.match(storyboardSource, /export function addStoryboardGroup/)
  assert.match(storyboardSource, /export function assignVoiceToStoryboardGroup/)
  assert.match(storyboardSource, /export function unassignVoiceFromStoryboardGroup/)
  assert.match(storyboardSource, /export function getStoryboardLinkedCharacterIds/)
  assert.match(storyboardSource, /export function exportStoryboardReference/)
})

test('personal space model delegates state persistence and cloning', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const stateSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceState.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceState'/)
  assert.match(source, /export \{[\s\S]*clonePersonalSpaceState[\s\S]*readPersonalSpaceState[\s\S]*writePersonalSpaceState[\s\S]*\} from '\.\/personalSpaceState'/)
  assert.doesNotMatch(source, /export const defaultPersonalSpaceState/)
  assert.doesNotMatch(source, /export function clonePersonalSpaceState/)
  assert.doesNotMatch(source, /export function readPersonalSpaceState/)
  assert.doesNotMatch(source, /export function writePersonalSpaceState/)
  assert.match(stateSource, /export const defaultPersonalSpaceState/)
  assert.match(stateSource, /export function clonePersonalSpaceState/)
  assert.match(stateSource, /export function createPersonalSpaceId/)
})

test('personal space model delegates character operations', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const characterSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceCharacters.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceCharacters'/)
  assert.match(source, /export \{[\s\S]*addCharacterProfile[\s\S]*assignAssetToCharacterColumn[\s\S]*moveCharacterVoice[\s\S]*\} from '\.\/personalSpaceCharacters'/)
  assert.doesNotMatch(source, /export function addCharacterProfile/)
  assert.doesNotMatch(source, /export function assignAssetToCharacterColumn/)
  assert.doesNotMatch(source, /export function moveCharacterVoice/)
  assert.doesNotMatch(source, /function normalizeCharacterOrder/)
  assert.match(characterSource, /export function addCharacterProfile/)
  assert.match(characterSource, /export function assignAssetToCharacterColumn/)
  assert.match(characterSource, /export function unassignAssetFromCharacterColumn/)
  assert.match(characterSource, /export function moveCharacterVoice/)
  assert.match(characterSource, /function normalizeCharacterOrder/)
})

test('personal space model delegates asset update and delete operations', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const operationsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetOperations.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceAssetOperations'/)
  assert.match(source, /export \{[\s\S]*deletePersonalSpaceAsset[\s\S]*updatePersonalSpaceAsset[\s\S]*\} from '\.\/personalSpaceAssetOperations'/)
  assert.doesNotMatch(source, /export function updatePersonalSpaceAsset/)
  assert.doesNotMatch(source, /export function deletePersonalSpaceAsset/)
  assert.doesNotMatch(source, /normalizeAssetLinks/)
  assert.match(operationsSource, /export function updatePersonalSpaceAsset/)
  assert.match(operationsSource, /export function deletePersonalSpaceAsset/)
  assert.match(operationsSource, /normalizeAssetLinks/)
})

test('removed tag and note features do not return to project space', () => {
  const projectSpaceSource = [
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalCharacterPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceSections.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8'),
  ].join('\n')

  assert.doesNotMatch(projectSpaceSource, /关联备注/)
  assert.doesNotMatch(projectSpaceSource, /noteName/)
  assert.doesNotMatch(projectSpaceSource, /tags_json/)
  assert.doesNotMatch(projectSpaceSource, /标签/)
})
