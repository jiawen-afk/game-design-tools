import { useState } from 'react'

interface RenameableItem {
  id: string
  name: string
}

export function useRenameDrafts<T extends RenameableItem>(
  onRename: (id: string, name: string) => void,
) {
  const [renamingId, setRenamingId] = useState('')
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({})

  const openRename = (item: T, open: boolean) => {
    setRenamingId(open ? item.id : '')
    setNameDrafts((drafts) => ({
      ...drafts,
      [item.id]: open ? (drafts[item.id] ?? item.name) : '',
    }))
  }

  const changeDraft = (id: string, value: string) => {
    setNameDrafts((drafts) => ({ ...drafts, [id]: value }))
  }

  const clearDraft = (id: string) => {
    setNameDrafts((drafts) => ({ ...drafts, [id]: '' }))
    setRenamingId('')
  }

  const confirmRename = (item: T) => {
    const draft = nameDrafts[item.id] ?? item.name
    if (!draft.trim()) return
    onRename(item.id, draft)
    clearDraft(item.id)
  }

  return {
    isRenaming: (id: string) => renamingId === id,
    draftFor: (item: T) => nameDrafts[item.id] ?? item.name,
    openRename,
    changeDraft,
    confirmRename,
    cancelRename: clearDraft,
  }
}
