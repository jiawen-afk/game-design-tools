import type { UploadProps } from 'antd'

import type { CommonAssetKind } from './personalSpaceModel'
import {
  consumeSpriteUploadBatch,
  createNullableSpriteUploadBatchTracker,
  createRecordSpriteUploadBatchTracker,
  resolveSpriteUploadBatch,
  type SpriteUploadBatchTracker,
} from './personalSpaceUploadModel'

type UploadChangeFileList = Parameters<NonNullable<UploadProps['onChange']>>[0]['fileList']

const SPRITE_UPLOAD_ACCEPT = '.png,.webp,.json,.zip'

export interface PersonalSpaceUploadPropsOptions {
  spriteUploadBatchKeyByCharacter: { current: Record<string, string> }
  imageSpriteUploadBatchKey: { current: string | null }
  uploadCharacterPortrait: (characterId: string, file: File) => Promise<void>
  uploadCharacterSprite: (characterId: string, files: File[]) => Promise<void>
  uploadCharacterVoice: (characterId: string, file: File) => Promise<void>
  uploadStoryboardVoice: (groupId: string, file: File) => Promise<void>
  uploadCommonResource: (kind: CommonAssetKind, file: File, groupName?: string) => Promise<void>
  uploadImageSprite: (files: File[], groupName?: string) => Promise<void>
}

async function handleSpriteUploadChange(
  fileList: UploadChangeFileList,
  tracker: SpriteUploadBatchTracker,
  upload: (files: File[]) => Promise<void>,
) {
  let batch = null
  try {
    batch = consumeSpriteUploadBatch(await resolveSpriteUploadBatch(fileList), tracker)
  } catch (error) {
    console.error('Failed to resolve sprite upload batch', error)
    return
  }
  if (!batch) return
  window.setTimeout(() => {
    if (tracker.current === batch.batchKey) tracker.current = ''
  }, 1000)
  void upload(batch.files)
}

export function createPersonalSpaceUploadProps(options: PersonalSpaceUploadPropsOptions) {
  const portraitUploadProps = (characterId: string): UploadProps => ({
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void options.uploadCharacterPortrait(characterId, file as File)
      return false
    },
  })

  const spriteUploadProps = (characterId: string): UploadProps => ({
    accept: SPRITE_UPLOAD_ACCEPT,
    multiple: true,
    maxCount: 2,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const tracker = createRecordSpriteUploadBatchTracker(options.spriteUploadBatchKeyByCharacter, characterId)
      void handleSpriteUploadChange(fileList, tracker, (files) => options.uploadCharacterSprite(characterId, files))
    },
  })

  const voiceUploadProps = (characterId: string): UploadProps => ({
    accept: 'audio/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void options.uploadCharacterVoice(characterId, file as File)
      return false
    },
  })

  const storyboardVoiceUploadProps = (groupId: string): UploadProps => ({
    accept: 'audio/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void options.uploadStoryboardVoice(groupId, file as File)
      return false
    },
  })

  const commonResourceUploadProps = (kind: CommonAssetKind, groupName?: string): UploadProps => ({
    accept: kind === 'map' || kind === 'image' ? 'image/*' : kind === 'voice' ? 'audio/*' : '*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void options.uploadCommonResource(kind, file as File, groupName)
      return false
    },
  })

  const imageSpriteUploadProps = (groupName?: string): UploadProps => ({
    accept: SPRITE_UPLOAD_ACCEPT,
    multiple: true,
    maxCount: 2,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const tracker = createNullableSpriteUploadBatchTracker(options.imageSpriteUploadBatchKey)
      void handleSpriteUploadChange(fileList, tracker, (files) => options.uploadImageSprite(files, groupName))
    },
  })

  return {
    commonResourceUploadProps,
    imageSpriteUploadProps,
    portraitUploadProps,
    spriteUploadProps,
    storyboardVoiceUploadProps,
    voiceUploadProps,
  }
}
