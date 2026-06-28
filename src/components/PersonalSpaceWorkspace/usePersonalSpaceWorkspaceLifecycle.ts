import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

import type { PersonalSpaceState } from './personalSpaceModel'
import type { PersonalSpaceActiveModule } from './personalSpaceProjectSessionActions'
import { writeProjectSpaceState } from './projectSpaceState'
import type { usePersonalSpaceSettingsWorkspace } from './usePersonalSpaceSettingsWorkspace'

type PersonalSpaceSettingsWorkspace = ReturnType<typeof usePersonalSpaceSettingsWorkspace>

interface UsePersonalSpaceWorkspaceLifecycleParams {
  activeProjectIdRef: MutableRefObject<string>
  initializeProjects: (isCancelled: () => boolean) => void | Promise<void>
  scheduleRemoteProjectSync: (space: PersonalSpaceState) => void
  setActiveModule: Dispatch<SetStateAction<PersonalSpaceActiveModule>>
  settingsWorkspace: Pick<PersonalSpaceSettingsWorkspace, 'connectionProfilesLoaded' | 'directoryHandle' | 'directoryHandleChecked'>
  space: PersonalSpaceState
  spaceRef: MutableRefObject<PersonalSpaceState>
}

export function usePersonalSpaceWorkspaceLifecycle({
  activeProjectIdRef,
  initializeProjects,
  scheduleRemoteProjectSync,
  setActiveModule,
  settingsWorkspace,
  space,
  spaceRef,
}: UsePersonalSpaceWorkspaceLifecycleParams) {
  useEffect(() => {
    let cancelled = false

    void initializeProjects(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [settingsWorkspace.connectionProfilesLoaded])

  useEffect(() => {
    spaceRef.current = space
    if (activeProjectIdRef.current) {
      writeProjectSpaceState(activeProjectIdRef.current, space)
      scheduleRemoteProjectSync(space)
    }
  }, [space])

  useEffect(() => {
    if (settingsWorkspace.directoryHandleChecked && !settingsWorkspace.directoryHandle) {
      setActiveModule('settings')
    }
  }, [settingsWorkspace.directoryHandleChecked, settingsWorkspace.directoryHandle])
}
