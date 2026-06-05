import { useMemo, useState } from 'react'

import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import type { VoiceCollectLinkTarget } from './voicePersonalSpaceCollector'

interface PendingVoiceCollectLink {
  record: VoiceGenerationRecord
  target: VoiceCollectLinkTarget
  targetId: string | null
}

export interface VoiceCollectLinkOption {
  label: string
  value: string
}

export interface UseVoiceCollectLinkDialogParams {
  characterLinkOptions: VoiceCollectLinkOption[]
  effectLinkOptions: VoiceCollectLinkOption[]
  storyboardLinkOptions: VoiceCollectLinkOption[]
  onConfirm: (record: VoiceGenerationRecord, link: { target: VoiceCollectLinkTarget; targetId: string }) => void
  onOpen?: () => void
}

export function useVoiceCollectLinkDialog({
  characterLinkOptions,
  effectLinkOptions,
  storyboardLinkOptions,
  onConfirm,
  onOpen,
}: UseVoiceCollectLinkDialogParams) {
  const [pendingCollectLink, setPendingCollectLink] = useState<PendingVoiceCollectLink | null>(null)

  const openCollectLinkDialog = (record: VoiceGenerationRecord, target: VoiceCollectLinkTarget) => {
    onOpen?.()
    setPendingCollectLink({ record, target, targetId: null })
  }

  const closeCollectLinkDialog = () => {
    setPendingCollectLink(null)
  }

  const updateCollectLinkTargetId = (targetId: string) => {
    setPendingCollectLink((current) => (current ? { ...current, targetId } : current))
  }

  const confirmCollectLink = () => {
    if (!pendingCollectLink?.targetId) return
    onConfirm(pendingCollectLink.record, {
      target: pendingCollectLink.target,
      targetId: pendingCollectLink.targetId,
    })
    setPendingCollectLink(null)
  }

  const collectLinkMeta = useMemo(() => {
    if (pendingCollectLink?.target === 'character') {
      return {
        title: '收藏并关联角色',
        label: '选择角色',
        options: characterLinkOptions,
        empty: '个人空间还没有角色。请先在个人空间创建角色。',
      }
    }
    if (pendingCollectLink?.target === 'effect') {
      return {
        title: '收藏并关联特效',
        label: '选择特效素材',
        options: effectLinkOptions,
        empty: '个人空间还没有特效素材。请先在个人空间导入特效素材。',
      }
    }
    if (pendingCollectLink?.target === 'storyboard') {
      return {
        title: '收藏并关联剧情',
        label: '选择剧情组',
        options: storyboardLinkOptions,
        empty: '个人空间还没有剧情组。请先在个人空间创建剧情编排。',
      }
    }
    return null
  }, [characterLinkOptions, effectLinkOptions, pendingCollectLink?.target, storyboardLinkOptions])

  return {
    pendingCollectLink,
    collectLinkMeta,
    openCollectLinkDialog,
    closeCollectLinkDialog,
    updateCollectLinkTargetId,
    confirmCollectLink,
  }
}
