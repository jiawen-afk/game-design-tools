import { useEffect, useState } from 'react'

import type { Project } from '../ProjectStorage'
import {
  clearProjectManagementDirtySource,
  createCleanProjectManagementDirtyState,
  hasProjectManagementUnsavedChanges,
  markProjectManagementDirty,
  projectManagementDirtySignature,
  type ProjectManagementDirtySource,
} from './projectManagementDirtyModel'

export type { ProjectManagementDirtySource } from './projectManagementDirtyModel'

interface UseProjectManagementDirtyNavigationOptions {
  selectedProject: Project | null
  onBack: () => void
  onSelectedProjectChange: (projectId: string) => void
}

export function useProjectManagementDirtyNavigation({
  selectedProject,
  onBack,
  onSelectedProjectChange,
}: UseProjectManagementDirtyNavigationOptions) {
  const [dirtyState, setDirtyState] = useState(() => createCleanProjectManagementDirtyState())
  const [ignoredDirtySignature, setIgnoredDirtySignature] = useState('')
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [pendingProjectTabId, setPendingProjectTabId] = useState('')
  const hasUnsavedChanges = hasProjectManagementUnsavedChanges(dirtyState)
  const dirtySignature = projectManagementDirtySignature(dirtyState)
  const shouldWarnUnsavedChanges = hasUnsavedChanges && dirtySignature !== ignoredDirtySignature

  useEffect(() => {
    setDirtyState((current) => clearProjectManagementDirtySource(current, 'projectDetails'))
    setDirtyState((current) => clearProjectManagementDirtySource(current, 'remoteProjectBinding'))
    setIgnoredDirtySignature('')
  }, [selectedProject])

  useEffect(() => {
    if (!shouldWarnUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [shouldWarnUnsavedChanges])

  const markDirty = (source: ProjectManagementDirtySource) => {
    setIgnoredDirtySignature('')
    setDirtyState((current) => markProjectManagementDirty(current, source))
  }

  const clearDirtySource = (source: ProjectManagementDirtySource) => {
    setDirtyState((current) => clearProjectManagementDirtySource(current, source))
  }

  const resetAllDirtySources = () => {
    setDirtyState(createCleanProjectManagementDirtyState())
    setIgnoredDirtySignature('')
  }

  const requestBackToWorkbench = () => {
    if (!shouldWarnUnsavedChanges) {
      onBack()
      return
    }
    setPendingProjectTabId('')
    setLeaveConfirmOpen(true)
  }

  const discardChangesAndBack = () => {
    setLeaveConfirmOpen(false)
    setIgnoredDirtySignature(dirtySignature)
    onBack()
  }

  const requestProjectTabChange = (projectId: string) => {
    if (!shouldWarnUnsavedChanges) {
      resetAllDirtySources()
      onSelectedProjectChange(projectId)
      return
    }
    setPendingProjectTabId(projectId)
    setLeaveConfirmOpen(true)
  }

  const confirmDiscardAndSwitchTab = () => {
    setLeaveConfirmOpen(false)
    resetAllDirtySources()
    onSelectedProjectChange(pendingProjectTabId)
    setPendingProjectTabId('')
  }

  const confirmDiscardChanges = () => {
    if (pendingProjectTabId) {
      confirmDiscardAndSwitchTab()
      return
    }
    discardChangesAndBack()
  }

  const cancelDiscardChanges = () => {
    setLeaveConfirmOpen(false)
    setPendingProjectTabId('')
  }

  return {
    cancelDiscardChanges,
    clearDirtySource,
    confirmDiscardChanges,
    leaveConfirmOpen,
    markDirty,
    pendingProjectTabId,
    requestBackToWorkbench,
    requestProjectTabChange,
    resetAllDirtySources,
  }
}
