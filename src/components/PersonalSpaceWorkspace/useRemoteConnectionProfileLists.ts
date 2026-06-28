import { useEffect, useState } from 'react'

import {
  getDesktopApi,
  type ProjectConnectionProfileSummary,
} from '../../desktopApi'

interface RemoteConnectionProfileListsMessageApi {
  warning: (content: string) => void
}

export function useRemoteConnectionProfileLists(messageApi: RemoteConnectionProfileListsMessageApi) {
  const [connectionProfilesLoaded, setConnectionProfilesLoaded] = useState(false)
  const [databaseProfiles, setDatabaseProfiles] = useState<ProjectConnectionProfileSummary[]>([])
  const [kodoProfiles, setKodoProfiles] = useState<ProjectConnectionProfileSummary[]>([])
  const [selectedDatabaseProfileId, setSelectedDatabaseProfileId] = useState('')
  const [selectedKodoProfileId, setSelectedKodoProfileId] = useState('')

  useEffect(() => {
    let mounted = true
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      setConnectionProfilesLoaded(true)
      return () => { mounted = false }
    }

    setConnectionProfilesLoaded(false)
    void (async () => {
      const [nextDatabaseProfiles, nextKodoProfiles] = await Promise.all([
        desktopApi.listProjectConnectionProfiles('database'),
        desktopApi.listProjectConnectionProfiles('qiniu_kodo'),
      ])
      if (!mounted) return
      setDatabaseProfiles(nextDatabaseProfiles)
      setKodoProfiles(nextKodoProfiles)
      setSelectedDatabaseProfileId((current) => current || nextDatabaseProfiles[0]?.id || '')
      setSelectedKodoProfileId((current) => current || nextKodoProfiles[0]?.id || '')
    })().catch(() => {
      if (mounted) void messageApi.warning('无法读取远程项目连接配置')
    }).finally(() => {
      if (mounted) setConnectionProfilesLoaded(true)
    })

    return () => { mounted = false }
  }, [messageApi])

  return {
    connectionProfilesLoaded,
    databaseProfiles,
    kodoProfiles,
    selectedDatabaseProfileId,
    selectedKodoProfileId,
    setDatabaseProfiles,
    setKodoProfiles,
    setSelectedDatabaseProfileId,
    setSelectedKodoProfileId,
  }
}
