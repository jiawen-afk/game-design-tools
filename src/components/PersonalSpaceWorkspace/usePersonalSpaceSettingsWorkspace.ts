import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { PersonalSpaceState } from './personalSpaceModel'
import {
  type PersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  persistPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'
import { pickPersonalSpaceDirectory } from './personalSpaceResourceActions'

interface PersonalSpaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
}

interface UsePersonalSpaceSettingsWorkspaceParams {
  storageDirectory: string
  setSpace: Dispatch<SetStateAction<PersonalSpaceState>>
  messageApi: PersonalSpaceMessageApi
}

export function usePersonalSpaceSettingsWorkspace({
  storageDirectory,
  setSpace,
  messageApi,
}: UsePersonalSpaceSettingsWorkspaceParams) {
  const [draftStorageDirectory, setDraftStorageDirectory] = useState(storageDirectory)
  const [directoryHandle, setDirectoryHandle] = useState<PersonalSpaceDirectoryHandle | null>(null)
  const [savedSettings, setSavedSettings] = useState(false)

  useEffect(() => {
    let mounted = true
    loadPersistedPersonalSpaceDirectoryHandle()
      .then((handle) => {
        if (!mounted || !handle) return
        setDirectoryHandle(handle)
        setPersonalSpaceDirectoryHandle(handle)
        if (!storageDirectory) {
          setDraftStorageDirectory(handle.name)
          setSpace((current) => ({
            ...current,
            settings: { ...current.settings, storageDirectory: handle.name },
          }))
        }
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [setSpace, storageDirectory])

  const saveSettings = () => {
    setSpace((current) => ({
      ...current,
      settings: {
        ...current.settings,
        storageDirectory: draftStorageDirectory.trim(),
      },
    }))
    setSavedSettings(true)
    window.setTimeout(() => setSavedSettings(false), 1600)
    void messageApi.success('已保存个人空间设置')
  }

  const chooseStorageDirectory = async () => {
    try {
      const handle = await pickPersonalSpaceDirectory()
      if (!handle) {
        void messageApi.warning('当前浏览器不支持授权本地目录，请继续使用路径记录模式。')
        return
      }
      setDirectoryHandle(handle)
      setPersonalSpaceDirectoryHandle(handle)
      await persistPersonalSpaceDirectoryHandle(handle)
      setDraftStorageDirectory(handle.name)
      setSpace((current) => ({
        ...current,
        settings: { ...current.settings, storageDirectory: handle.name },
      }))
      void messageApi.success('已授权资源存储目录')
    } catch {
      void messageApi.warning('未选择资源存储目录')
    }
  }

  return {
    draftStorageDirectory,
    directoryHandle,
    savedSettings,
    setDraftStorageDirectory,
    saveSettings,
    chooseStorageDirectory,
  }
}
