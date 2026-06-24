export type ProjectManagementDirtySource =
  | 'projectCreation'
  | 'projectDetails'
  | 'databaseProfileDraft'
  | 'kodoProfileDraft'
  | 'remoteProjectBinding'

export type ProjectManagementDirtyState = Partial<Record<ProjectManagementDirtySource, true>>

const dirtySourceOrder: ProjectManagementDirtySource[] = [
  'projectCreation',
  'projectDetails',
  'databaseProfileDraft',
  'kodoProfileDraft',
  'remoteProjectBinding',
]

export function createCleanProjectManagementDirtyState(): ProjectManagementDirtyState {
  return {}
}

export function markProjectManagementDirty(
  state: ProjectManagementDirtyState,
  source: ProjectManagementDirtySource,
): ProjectManagementDirtyState {
  if (state[source]) return state
  return { ...state, [source]: true }
}

export function clearProjectManagementDirtySource(
  state: ProjectManagementDirtyState,
  source: ProjectManagementDirtySource,
): ProjectManagementDirtyState {
  if (!state[source]) return state
  const next = { ...state }
  delete next[source]
  return next
}

export function hasProjectManagementUnsavedChanges(state: ProjectManagementDirtyState) {
  return dirtySourceOrder.some((source) => state[source])
}

export function projectManagementDirtySignature(state: ProjectManagementDirtyState) {
  return dirtySourceOrder.filter((source) => state[source]).join('|')
}
