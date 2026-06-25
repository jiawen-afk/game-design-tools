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
import { getDesktopApi } from '../../desktopApi'
import { useRemoteConnectionProfilesWorkspace } from './useRemoteConnectionProfilesWorkspace'

export type {
  DatabaseProfileDraft,
  DraftTestState,
  KodoProfileDraft,
  ProfileEditMode,
} from './projectRemoteProfileDraftModel'

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
  const [directoryHandleChecked, setDirectoryHandleChecked] = useState(false)
  const [savedSettings, setSavedSettings] = useState(false)
  const remoteConnectionProfiles = useRemoteConnectionProfilesWorkspace(messageApi)

  useEffect(() => {
    let mounted = true
    loadPersistedPersonalSpaceDirectoryHandle()
      .then((handle) => {
        if (!mounted || !handle) return
        setDirectoryHandle(handle)
        setPersonalSpaceDirectoryHandle(handle)
        if (!storageDirectory) {
          setDraftStorageDirectory(handle.path ?? handle.name)
          setSpace((current) => ({
            ...current,
            settings: { ...current.settings, storageDirectory: handle.path ?? handle.name },
          }))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setDirectoryHandleChecked(true)
      })
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
    void messageApi.success('已保存项目空间设置')
  }

  const chooseStorageDirectory = async () => {
    try {
      const handle = await pickPersonalSpaceDirectory()
      if (!handle) {
        setDirectoryHandleChecked(true)
        void messageApi.warning('当前桌面运行时不可用，无法启用项目空间素材管理。')
        return
      }
      setDirectoryHandle(handle)
      setDirectoryHandleChecked(true)
      setPersonalSpaceDirectoryHandle(handle)
      await persistPersonalSpaceDirectoryHandle(handle)
      setDraftStorageDirectory(handle.path ?? handle.name)
      setSpace((current) => ({
        ...current,
        settings: { ...current.settings, storageDirectory: handle.path ?? handle.name },
      }))
      void messageApi.success('已授权资源存储目录')
    } catch {
      setDirectoryHandleChecked(true)
      void messageApi.warning('未选择资源存储目录')
    }
  }

  const openStorageDirectory = () => {
    if (!directoryHandle) {
      void messageApi.warning('请先选择授权目录')
      return
    }
    const desktopPath = directoryHandle.path ?? draftStorageDirectory
    const desktopApi = getDesktopApi()
    if (desktopApi && desktopPath) {
      void desktopApi.openPath(desktopPath).catch(() => {
        void messageApi.warning('无法打开资源目录，请检查目录是否仍然存在。')
      })
      return
    }
    void messageApi.warning('当前桌面运行时不可用，无法打开资源目录。')
  }

  return {
    draftStorageDirectory,
    directoryHandle,
    directoryHandleChecked,
    savedSettings,
    setDraftStorageDirectory,
    saveSettings,
    chooseStorageDirectory,
    openStorageDirectory,
    ...remoteConnectionProfiles,
  }
}
