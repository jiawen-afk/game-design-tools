import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import type { UploadFile, UploadProps } from 'antd'

import {
  createWorkspaceId,
  loadImage,
  makeFrameFromFile,
  revokeSpriteSlicePreviews,
  splitSpriteSheetToPreviews,
} from './imagePipeline'
import type { MatteDefaults } from './matteModel'
import {
  buildUploadFileKey,
  filterNewUploadFiles,
  getInitialMatteFrameIds,
  getNextMatteGroupName,
} from './model'
import type { FrameItem, SpriteSheetDraft, SpriteSlicePreview } from './types'

export interface UseUploadWorkspaceParams {
  frames: FrameItem[]
  framesRef: React.RefObject<FrameItem[]>
  matteDefaults: MatteDefaults
  appendFrames: (frames: FrameItem[]) => void
  scheduleMatte: (id: string) => void
}

export type UploadWorkspaceViewModel = ReturnType<typeof useUploadWorkspace>

export function useUploadWorkspace({
  frames,
  framesRef,
  matteDefaults,
  appendFrames,
  scheduleMatte,
}: UseUploadWorkspaceParams) {
  const [spriteSheetDraft, setSpriteSheetDraft] = useState<SpriteSheetDraft | null>(null)
  const [spriteRows, setSpriteRows] = useState(4)
  const [spriteColumns, setSpriteColumns] = useState(4)
  const [spriteSlices, setSpriteSlices] = useState<SpriteSlicePreview[]>([])
  const [spriteProcessing, setSpriteProcessing] = useState(false)
  const pendingUploadKeysRef = useRef(new Set<string>())

  useEffect(() => {
    return () => {
      if (spriteSheetDraft) URL.revokeObjectURL(spriteSheetDraft.sourceUrl)
    }
  }, [spriteSheetDraft])

  useEffect(() => {
    return () => revokeSpriteSlicePreviews(spriteSlices)
  }, [spriteSlices])

  useEffect(() => {
    let alive = true
    if (!spriteSheetDraft) {
      setSpriteSlices([])
      return () => {
        alive = false
      }
    }
    setSpriteProcessing(true)
    void splitSpriteSheetToPreviews(spriteSheetDraft, spriteRows, spriteColumns)
      .then((previews) => {
        if (!alive) {
          revokeSpriteSlicePreviews(previews)
          return
        }
        setSpriteSlices(previews)
      })
      .catch((e) => {
        if (alive) {
          setSpriteSlices([])
          message.error(`精灵图切分失败：${String(e)}`)
        }
      })
      .finally(() => {
        if (alive) setSpriteProcessing(false)
      })
    return () => {
      alive = false
    }
  }, [spriteColumns, spriteRows, spriteSheetDraft])

  const handleUploadChange: UploadProps['onChange'] = ({ fileList }) => {
    const incoming: File[] = []
    for (const item of fileList) {
      const file = item.originFileObj
      if (file) incoming.push(file as File)
    }
    const existingKeys = new Set(framesRef.current.map((item) => buildUploadFileKey(item.file)))
    const nextFiles = filterNewUploadFiles(incoming, {
      existingKeys,
      pendingKeys: pendingUploadKeysRef.current,
    })
    if (nextFiles.length === 0) return
    nextFiles.forEach((file) => pendingUploadKeysRef.current.add(buildUploadFileKey(file)))
    const existingFrameCount = framesRef.current.length
    const group = {
      id: createWorkspaceId(),
      name: getNextMatteGroupName(framesRef.current, 'imageBatch'),
      kind: 'imageBatch' as const,
    }
    void Promise.all(nextFiles.map((file) => makeFrameFromFile(file, matteDefaults, group))).then((created) => {
      appendFrames(created)
      getInitialMatteFrameIds({
        existingFrameCount,
        createdIds: created.map((item) => item.id),
      }).forEach((id) => scheduleMatte(id))
    }).catch((e) => {
      message.error(`添加图片失败：${String(e)}`)
    }).finally(() => {
      nextFiles.forEach((file) => pendingUploadKeysRef.current.delete(buildUploadFileKey(file)))
    })
  }

  const handleSpriteSheetUpload = async (file: File) => {
    const sourceUrl = URL.createObjectURL(file)
    setSpriteSheetDraft(null)
    setSpriteSlices([])
    setSpriteProcessing(false)
    try {
      const img = await loadImage(sourceUrl)
      setSpriteSheetDraft({
        file,
        sourceUrl,
        sourceName: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    } catch (e) {
      URL.revokeObjectURL(sourceUrl)
      message.error(`精灵图读取失败：${String(e)}`)
    }
  }

  const clearSpriteSheetDraft = () => {
    setSpriteSheetDraft(null)
    setSpriteSlices([])
    setSpriteProcessing(false)
  }

  const confirmSpriteSheetSplit = async () => {
    if (spriteSlices.length === 0) return
    setSpriteProcessing(true)
    try {
      const files = spriteSlices.map((slice) => new File([slice.blob], slice.name, { type: 'image/png' }))
      const existingFrameCount = framesRef.current.length
      const group = {
        id: createWorkspaceId(),
        name: getNextMatteGroupName(framesRef.current, 'spriteSheet'),
        kind: 'spriteSheet' as const,
      }
      const created = await Promise.all(files.map((file) => makeFrameFromFile(file, matteDefaults, group)))
      appendFrames(created)
      getInitialMatteFrameIds({
        existingFrameCount,
        createdIds: created.map((item) => item.id),
      }).forEach((id) => scheduleMatte(id))
      message.success(`已添加 ${created.length} 帧到流程 2`)
    } catch (e) {
      message.error(`添加切分帧失败：${String(e)}`)
    } finally {
      setSpriteProcessing(false)
    }
  }

  const uploadFileList: UploadFile[] = frames.map((item) => ({
    uid: item.id,
    name: item.sourceName,
    status: 'done',
    originFileObj: item.file as UploadFile['originFileObj'],
  }))

  return {
    spriteSheetDraft,
    spriteRows,
    setSpriteRows,
    spriteColumns,
    setSpriteColumns,
    spriteSlices,
    spriteProcessing,
    uploadFileList,
    handleUploadChange,
    handleSpriteSheetUpload,
    clearSpriteSheetDraft,
    confirmSpriteSheetSplit,
  }
}
