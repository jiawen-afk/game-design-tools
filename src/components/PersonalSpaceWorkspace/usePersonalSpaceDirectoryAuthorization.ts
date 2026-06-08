import { useEffect, useState } from 'react'

import {
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'

export const personalSpaceDirectoryRequiredMessage = '请先在个人空间-设置中授权目录'

export function usePersonalSpaceDirectoryAuthorization() {
  const [personalSpaceCollectEnabled, setPersonalSpaceCollectEnabled] = useState(() => Boolean(getPersonalSpaceDirectoryHandle()))

  useEffect(() => {
    let alive = true
    void (async () => {
      const current = getPersonalSpaceDirectoryHandle()
      if (current) {
        if (alive) setPersonalSpaceCollectEnabled(true)
        return
      }
      const persisted = await loadPersistedPersonalSpaceDirectoryHandle()
      if (persisted) {
        setPersonalSpaceDirectoryHandle(persisted)
      }
      if (alive) setPersonalSpaceCollectEnabled(Boolean(persisted))
    })().catch(() => {
      if (alive) setPersonalSpaceCollectEnabled(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return {
    personalSpaceCollectEnabled,
    personalSpaceCollectDisabledReason: personalSpaceCollectEnabled ? undefined : personalSpaceDirectoryRequiredMessage,
  }
}
