import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space asset actions delegate Ant upload props to a focused module', () => {
  const assetActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetActions.ts', 'utf8')
  const uploadPropsPath = 'src/components/PersonalSpaceWorkspace/personalSpaceUploadProps.ts'

  assert.ok(existsSync(uploadPropsPath), 'personal space upload props helper should exist')
  const uploadPropsSource = readFileSync(uploadPropsPath, 'utf8')

  assert.match(assetActionsSource, /from '\.\/personalSpaceUploadProps'/)
  assert.match(assetActionsSource, /createPersonalSpaceUploadProps/)
  assert.doesNotMatch(assetActionsSource, /from 'antd'/)
  assert.doesNotMatch(assetActionsSource, /beforeUpload/)
  assert.doesNotMatch(assetActionsSource, /onChange/)
  assert.doesNotMatch(assetActionsSource, /createSpriteUploadBatch/)
  assert.match(uploadPropsSource, /from 'antd'/)
  assert.match(uploadPropsSource, /export function createPersonalSpaceUploadProps/)
  assert.match(uploadPropsSource, /beforeUpload/)
  assert.match(uploadPropsSource, /resolveSpriteUploadBatch/)
  assert.match(uploadPropsSource, /consumeSpriteUploadBatch/)
})

test('personal space asset actions delegate upload workflows to a focused module', () => {
  const assetActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetActions.ts', 'utf8')
  const uploadActionsPath = 'src/components/PersonalSpaceWorkspace/personalSpaceAssetUploadActions.ts'

  assert.ok(existsSync(uploadActionsPath), `${uploadActionsPath} should exist`)
  const uploadActionsSource = readFileSync(uploadActionsPath, 'utf8')

  assert.match(assetActionsSource, /from '\.\/personalSpaceAssetUploadActions'/)
  assert.match(assetActionsSource, /createPersonalSpaceAssetUploadActions\(/)
  assert.doesNotMatch(assetActionsSource, /const uploadCharacterPortrait = async/)
  assert.doesNotMatch(assetActionsSource, /const uploadCharacterSprite = async/)
  assert.doesNotMatch(assetActionsSource, /const uploadCharacterVoice = async/)
  assert.doesNotMatch(assetActionsSource, /const uploadStoryboardVoice = async/)
  assert.doesNotMatch(assetActionsSource, /const uploadCommonResource = async/)
  assert.doesNotMatch(assetActionsSource, /const uploadImageSprite = async/)
  assert.match(uploadActionsSource, /export function createPersonalSpaceAssetUploadActions/)
  assert.match(uploadActionsSource, /createPortraitAssetForUpload/)
  assert.match(uploadActionsSource, /createCommonResourceAssetForUpload/)
  assert.match(uploadActionsSource, /assignAssetToCharacterColumn/)
  assert.match(uploadActionsSource, /assignVoiceToStoryboardGroup/)
})

test('personal space sprite upload pickers expose png webp zip and index json', () => {
  const uploadPropsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceUploadProps.ts', 'utf8')
  const acceptUsages = uploadPropsSource.match(/accept: SPRITE_UPLOAD_ACCEPT/g) ?? []

  assert.match(uploadPropsSource, /const SPRITE_UPLOAD_ACCEPT = '\.png,\.webp,\.json,\.zip'/)
  assert.equal(acceptUsages.length, 2)
  assert.doesNotMatch(uploadPropsSource, /accept: '\.png,\.json'/)
})

test('personal space sprite upload copy mentions webp support', () => {
  const characterCardSource = readFileSync('src/components/PersonalSpaceWorkspace/CharacterProfileCard.tsx', 'utf8')
  const derivedStateSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceDerivedState.ts', 'utf8')

  assert.match(characterCardSource, /png 或 webp 和 index\.json，也可以选择包含它们的 zip/)
  assert.match(derivedStateSource, /PNG \/ WebP 与 index\.json，或包含它们的 ZIP/)
})
