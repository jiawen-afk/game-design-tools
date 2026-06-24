export interface ProjectDeviceBinding {
  databaseProfileId: string
  storageProfileId: string
}

const projectDeviceBindingsStorageKey = 'game-design-tools.project-space.device-bindings.v1'

function readBindings(storage: Storage): Record<string, ProjectDeviceBinding> {
  try {
    const raw = storage.getItem(projectDeviceBindingsStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function isValidBinding(value: ProjectDeviceBinding | undefined): value is ProjectDeviceBinding {
  return Boolean(value?.databaseProfileId?.trim() && value?.storageProfileId?.trim())
}

export function readProjectDeviceBinding(projectId: string, storage: Storage = localStorage) {
  const binding = readBindings(storage)[projectId]
  return isValidBinding(binding) ? { ...binding } : null
}

export function writeProjectDeviceBinding(
  projectId: string,
  binding: ProjectDeviceBinding,
  storage: Storage = localStorage,
) {
  if (!projectId || !isValidBinding(binding)) return
  const bindings = readBindings(storage)
  bindings[projectId] = {
    databaseProfileId: binding.databaseProfileId.trim(),
    storageProfileId: binding.storageProfileId.trim(),
  }
  storage.setItem(projectDeviceBindingsStorageKey, JSON.stringify(bindings))
}

export function clearProjectDeviceBinding(projectId: string, storage: Storage = localStorage) {
  const bindings = readBindings(storage)
  delete bindings[projectId]
  storage.setItem(projectDeviceBindingsStorageKey, JSON.stringify(bindings))
}
