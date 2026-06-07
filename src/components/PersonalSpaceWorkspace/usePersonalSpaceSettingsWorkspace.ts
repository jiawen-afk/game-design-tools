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

function storageDirectoryFileUrl(storageDirectory: string) {
  const clean = storageDirectory.trim()
  if (!clean) return ''
  if (/^file:\/\//i.test(clean)) return clean
  const normalized = clean.replace(/\\/g, '/')
  if (/^[a-zA-Z]:\//.test(normalized)) return `file:///${encodeURI(normalized)}`
  if (normalized.startsWith('//')) return `file:${encodeURI(normalized)}`
  if (normalized.startsWith('/')) return `file://${encodeURI(normalized)}`
  return ''
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
    void messageApi.success('已保存个人空间设置')
  }

  const chooseStorageDirectory = async () => {
    try {
      const handle = await pickPersonalSpaceDirectory()
      if (!handle) {
        setDirectoryHandleChecked(true)
        void messageApi.warning('当前浏览器不支持授权本地目录，无法启用个人空间素材管理。')
        return
      }
      setDirectoryHandle(handle)
      setDirectoryHandleChecked(true)
      setPersonalSpaceDirectoryHandle(handle)
      await persistPersonalSpaceDirectoryHandle(handle)
      setDraftStorageDirectory(handle.name)
      setSpace((current) => ({
        ...current,
        settings: { ...current.settings, storageDirectory: handle.name },
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
    const fileUrl = storageDirectoryFileUrl(draftStorageDirectory)
    if (!fileUrl) {
      void messageApi.warning('当前浏览器只提供授权目录名称，无法直接打开文件资源管理器。请在资源管理器中手动打开该目录。')
      return
    }
    const opened = window.open(fileUrl, '_blank', 'noopener,noreferrer')
    if (!opened) void messageApi.warning('浏览器已拦截打开本地目录，请允许弹窗后重试。')
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
  }
}
